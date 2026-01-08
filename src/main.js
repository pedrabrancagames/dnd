/**
 * D&D AR Adventure - Main Entry Point
 */

import './styles/main.css';
import './styles/event-modal.css';
// Leaflet CSS agora é carregado via CDN no index.html ou importado pelo map-manager
// import 'leaflet/dist/leaflet.css'; 

import { checkCompatibility, renderIncompatibleScreen } from './lib/compatibility.js';
import { signIn, signUp, getSession, getPlayer, createPlayer, onAuthStateChange } from './lib/supabase.js';
import { getCurrentPosition, startWatching, onPositionChange, getLastPosition } from './lib/gps.js';
import { getCellId, getNearbyCells, getCellBiome, getCellCenter } from './lib/cells.js';
import { getMonstersByBiome, getMonstersByCR, selectRandomMonster, createMonsterInstance, getMonsterById } from './data/monsters.js';
import { gameState, setPlayer, setScreen, startCombat, endCombat, getClassIcon, updateDerivedStats, performRest } from './game/state.js';
import { playerAttack, monsterAttack, isMonsterDefeated, isPlayerDefeated, castDamageSpell, useHealingPotion, attemptFlee, playerDodge } from './game/combat.js';
import { generateExplorationEvent, resolveEvent } from './game/exploration.js';
import { generateLoot, getRarityColor, getItemById } from './data/items.js';
import { startARSession, endARSession, showMonsterDamageEffect, showMonsterDeathEffect, isARSessionActive, showEquippedWeapon, animateWeaponAttack } from './ar/ar-manager.js';
import { startExplorationAR, endExplorationAR, isExplorationARSupported, isExplorationARActive, showSuccessEffect, showFailureEffect } from './ar/ar-exploration.js';
import { grantXP, getXPProgress, getXPForLevel, getTotalXPForLevel, spendAttributePoint } from './game/progression.js';
import { getClassDefinition, useClassAbility, getAbilityCooldownRemaining } from './game/classes.js';
import { initInventory, addItemToInventory, equipItem, unequipItem, useItem, getInventoryWithDetails, getEquippedItem, recalculateEquipmentStats } from './game/inventory.js';
import { rollD20Animation } from './ar/dice-animation.js';
import { recordMonsterKill, getDefeatedMonsters, updatePlayer } from './lib/supabase.js';
import {
    preloadSounds,
    playAttackSound,
    playMonsterGrowl,
    playDodgeSound,
    playSuccessSound,
    playFailSound,
    playChestOpenSound,
    playLevelUpSound,
    playClickSound
} from './lib/audio-manager.js';

// Novos módulos de Mapa e Campanha
import { initMap as initGameMap } from './game/map-manager.js';
import geofenceManager from './lib/geofence.js';
import { CAMPAIGNS, generateTestPOIs } from './data/campaigns.js';
import { initAdminPanel, getCustomPOIs, hasCustomPOIs } from './game/admin-poi.js';

// Estado local
let monsterMarkers = [];

/**
 * Volta para a tela do mapa e força recálculo do tamanho do Leaflet
 */
function goToMap() {
    setScreen('map');
    // Força Leaflet a recalcular tamanho após a tela ficar visível
    // A função initGameMap já cuida da instância do mapa, 
    // mas se precisarmos de acesso direto podemos exportar do manager
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
    updateMapHUD();
}

/**
 * Inicializa a aplicação
 */
async function init() {
    console.log('🎮 Iniciando D&D AR Adventure...');

    try {
        // IMPORTANTE: Setup de listeners ANTES de qualquer verificação
        // para garantir que botões funcionem mesmo em telas de erro
        setupUIListeners();
        setupAuthListeners();

        // Pré-carrega sons
        preloadSounds();

        updateLoadingStatus('Verificando compatibilidade...');
        console.log('⏳ Iniciando verificação de compatibilidade...');

        // 1. Verificação de compatibilidade (com timeout global de 10s)
        let compatibility;
        try {
            compatibility = await Promise.race([
                checkCompatibility(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
            ]);
        } catch (e) {
            console.error('❌ Timeout ou erro na verificação de compatibilidade:', e);
            // Se der timeout, assume que é compatível e continua
            compatibility = { passed: true, results: [] };
        }

        console.log('✅ Verificação concluída:', compatibility);

        if (!compatibility.passed) {
            console.warn('❌ Dispositivo incompatível');
            renderIncompatibleScreen(compatibility.results);
            setScreen('incompatible');
            return;
        }

        console.log('✅ Dispositivo compatível');
        updateLoadingStatus('Verificando sessão...');

        // 2. Verificar sessão existente
        console.log('⏳ Verificando sessão...');
        const { session, user } = await getSession();
        console.log('✅ Sessão verificada:', session ? 'ativa' : 'nenhuma');

        if (session && user) {
            console.log('✅ Sessão encontrada:', user.email);
            gameState.user = user;

            // Busca dados do jogador
            console.log('⏳ Buscando dados do jogador...');
            const { player } = await getPlayer(user.id);
            console.log('✅ Jogador:', player ? player.name : 'não existe');

            if (player) {
                setPlayer(player);
                await initMap();
            } else {
                setScreen('character');
            }
        } else {
            console.log('ℹ️ Sem sessão ativa');
            setScreen('login');
        }

        // 3. Configurações finais
        setupCompass();

        // 4. Observar mudanças de autenticação
        onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                gameState.user = null;
                gameState.player = null;
                setScreen('login');
            }
        });

        console.log('✅ Inicialização completa!');

    } catch (error) {
        console.error('❌ Erro fatal na inicialização:', error);
        // Mostra erro visível na tela para debug mobile
        const errorMsg = `Erro: ${error.message || error}\n\nStack: ${error.stack || 'N/A'}`;
        updateLoadingStatus(errorMsg);

        // Tenta ir para login mesmo assim após 5 segundos
        setTimeout(() => setScreen('login'), 5000);
    }
}

/**
 * Mostra notificação de POI encontrado
 * @param {Object} poi 
 */
function showPOINotification(poi) {
    const notif = document.getElementById('poi-notification');
    if (!notif) return;

    document.getElementById('poi-notif-icon').textContent = poi.icon;
    document.getElementById('poi-notif-name').textContent = poi.name;
    document.getElementById('poi-notif-desc').textContent = poi.description;

    const actionBtn = document.getElementById('poi-action-btn');
    const closeBtn = document.getElementById('poi-close-btn');

    // Configura texto do botão baseado no tipo
    let actionText = 'Interagir';
    if (poi.type === 'combat' || poi.type === 'boss') actionText = '⚔️ Lutar';
    else if (poi.type === 'clue') actionText = '🔍 Investigar';
    else if (poi.type === 'npc') actionText = '🗣️ Falar';

    actionBtn.textContent = actionText;

    // Configura ação
    actionBtn.onclick = () => {
        handlePOIInteraction(poi);
        hidePOINotification();
    };

    closeBtn.onclick = () => {
        hidePOINotification();
    };

    notif.classList.remove('hidden');
}

/**
 * Esconde notificação de POI
 */
function hidePOINotification() {
    const notif = document.getElementById('poi-notification');
    if (notif) notif.classList.add('hidden');
}

/**
 * Lida com interação em um POI
 */
function handlePOIInteraction(poi) {
    console.log('Interagindo com:', poi.name);

    if (poi.type === 'npc') {
        // Por enquanto, mostra diálogo simples
        alert(`🗣️ ${poi.name}: "Olá, aventureiro! Tenho uma missão para você..."`);
    }
    else if (poi.type === 'clue') {
        // Inicia exploração AR para encontrar objeto
        startExplorationAR();
    }
    else if (poi.type === 'combat' || poi.type === 'boss') {
        // Inicia combate real!
        startPOICombat(poi);
    }
    else if (poi.type === 'sanctuary') {
        // Santuário - oferece descanso
        const rest = confirm('🏠 Você encontrou um santuário. Deseja descansar?');
        if (rest) {
            const result = performRest('long');
            alert(result.message);
        }
    }
}

/**
 * Inicia combate a partir de um POI
 * @param {Object} poi 
 */
function startPOICombat(poi) {
    console.log(`⚔️ Iniciando combate do POI: ${poi.name}`);

    // Determina qual monstro usar
    let monsterTemplate = null;

    if (poi.monsterId) {
        // POI tem monstro específico
        monsterTemplate = getMonsterById(poi.monsterId);
    }

    if (!monsterTemplate) {
        // Fallback: seleciona monstro aleatório baseado no nível do jogador
        const playerLevel = gameState.player?.level || 1;
        const maxCR = poi.type === 'boss' ? playerLevel : playerLevel / 2;
        const pool = getMonstersByCR(maxCR);

        if (pool.length > 0) {
            monsterTemplate = selectRandomMonster(pool);
        } else {
            console.error('Nenhum monstro disponível para este combate');
            alert('❌ Erro: Nenhum inimigo encontrado neste local.');
            return;
        }
    }

    // Cria instância do monstro
    const monster = createMonsterInstance(monsterTemplate, poi.id);

    // Se for boss, aumenta HP
    if (poi.type === 'boss') {
        monster.isBoss = true;
        monster.maxHp = Math.floor(monster.maxHp * 1.5);
        monster.currentHp = monster.maxHp;
    }

    // Define como monstro atual e inicia combate
    gameState.currentMonster = monster;

    // Mostra notificação de encontro e vai para combate
    playMonsterGrowl();

    // Pequeno delay para drama e depois inicia AR
    setTimeout(() => {
        startARCombat();
    }, 500);
}

/**
 * Função global para interagir com POI a partir do popup do mapa
 * Chamada pelo onclick do botão no popup
 */
window.interactWithPOI = (poiDataEncoded) => {
    try {
        const poi = JSON.parse(decodeURIComponent(poiDataEncoded));
        console.log('[POI] Interação via popup:', poi.name);
        handlePOIInteraction(poi);
    } catch (e) {
        console.error('[POI] Erro ao decodificar POI:', e);
    }
};

function setupCompass() {
    const compassArrow = document.querySelector('.compass-arrow');
    const compass = document.getElementById('compass');

    if (!compassArrow) return;

    // Verifica se DeviceOrientationEvent precisa de permissão (iOS 13+)
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iOS 13+ precisa de permissão
        compass?.addEventListener('click', async () => {
            try {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission === 'granted') {
                    startCompassUpdates(compassArrow);
                }
            } catch (err) {
                console.error('Erro ao solicitar permissão de orientação:', err);
            }
        });
    } else {
        // Android e outros navegadores
        startCompassUpdates(compassArrow);
    }
}

/**
 * Inicia atualizações da bússola
 * @param {HTMLElement} compassArrow
 */
function startCompassUpdates(compassArrow) {
    window.addEventListener('deviceorientationabsolute', (event) => {
        if (event.alpha !== null) {
            // alpha é a rotação em relação ao norte (0-360)
            const heading = event.alpha;
            compassArrow.style.transform = `rotate(${heading}deg)`;
        }
    }, true);

    // Fallback para deviceorientation se absolute não estiver disponível
    window.addEventListener('deviceorientation', (event) => {
        if (event.webkitCompassHeading !== undefined) {
            // Safari/iOS
            const heading = event.webkitCompassHeading;
            compassArrow.style.transform = `rotate(${-heading}deg)`;
        } else if (event.alpha !== null) {
            // Android Chrome
            const heading = 360 - event.alpha;
            compassArrow.style.transform = `rotate(${heading}deg)`;
        }
    }, true);
}

/**
 * Atualiza o status de loading
 * @param {string} message
 */
function updateLoadingStatus(message) {
    const statusEl = document.getElementById('loading-status');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

/**
 * Configura listeners de autenticação
 */
function setupAuthListeners() {
    // Tabs de login/registro
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;

            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            document.getElementById(`${tab}-form`).classList.add('active');
        });
    });

    // Formulário de login
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        errorEl.textContent = 'Entrando...';

        const { user, error } = await signIn(email, password);

        if (error) {
            errorEl.textContent = error;
            return;
        }

        gameState.user = user;

        const { player } = await getPlayer(user.id);

        if (player) {
            setPlayer(player);
            await initMap();
        } else {
            setScreen('character');
        }
    });

    // Formulário de registro
    document.getElementById('register-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const errorEl = document.getElementById('register-error');

        errorEl.textContent = 'Criando conta...';

        const { user, error } = await signUp(email, password, name);

        if (error) {
            errorEl.textContent = error;
            return;
        }

        gameState.user = user;
        setScreen('character');
    });
}

/**
 * Configura listeners de UI
 */
function setupUIListeners() {
    // Seleção de classe
    document.querySelectorAll('.class-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.class-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('create-character-btn').disabled = false;
        });
    });

    // Criar personagem
    document.getElementById('character-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedClass = document.querySelector('.class-btn.selected')?.dataset.class;
        if (!selectedClass || !gameState.user) return;

        const playerData = {
            id: gameState.user.id,
            name: gameState.user.user_metadata?.name || 'Aventureiro',
            class: selectedClass,
            level: 1,
            xp: 0,
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10,
            gold: 0
        };

        // Bônus por classe
        switch (selectedClass) {
            case 'warrior':
                playerData.str = 14;
                playerData.con = 12;
                break;
            case 'mage':
                playerData.int = 14;
                playerData.wis = 12;
                break;
            case 'archer':
                playerData.dex = 14;
                playerData.wis = 12;
                break;
            case 'cleric':
                playerData.wis = 14;
                playerData.cha = 12;
                break;
        }

        const { player, error } = await createPlayer(playerData);

        if (error) {
            console.error('Erro ao criar personagem:', error);
            // Fallback: usar dados locais
            setPlayer(playerData);
        } else {
            setPlayer(player);
        }

        await initMap();
    });

    // Botão entrar em AR
    document.getElementById('enter-ar-btn')?.addEventListener('click', () => {
        if (!gameState.currentMonster) return;
        startARCombat();
    });

    // Botões de ação AR
    document.getElementById('attack-btn')?.addEventListener('click', handleAttack);
    document.getElementById('spell-btn')?.addEventListener('click', handleSpell);
    document.getElementById('item-btn')?.addEventListener('click', handleItem);
    document.getElementById('item-btn')?.addEventListener('click', handleItem);
    document.getElementById('item-btn')?.addEventListener('click', handleItem);
    document.getElementById('flee-btn')?.addEventListener('click', handleFlee);
    document.getElementById('dodge-btn')?.addEventListener('click', handleDodge);

    // Exploração
    // Exploração
    document.getElementById('explore-btn')?.addEventListener('click', handleExplore);
    document.getElementById('close-event-btn')?.addEventListener('click', async () => {
        document.getElementById('event-screen').classList.remove('active');
        // Se estiver em AR, encerra e volta para o mapa
        if (isExplorationARActive()) {
            await endExplorationAR();
        }
        goToMap();
    });

    // Cancelar exploração AR
    document.getElementById('cancel-exploration-btn')?.addEventListener('click', cancelExplorationAR);

    // Botão continuar (vitória)
    document.getElementById('continue-btn')?.addEventListener('click', () => {
        endCombat();
        goToMap();
    });

    // Botão respawn (derrota)
    document.getElementById('respawn-btn')?.addEventListener('click', () => {
        // Penalidade de XP
        if (gameState.player) {
            const xpPenalty = Math.floor(gameState.player.xp * 0.1);
            gameState.player.xp = Math.max(0, gameState.player.xp - xpPenalty);
            gameState.player.currentHp = gameState.player.maxHp;
            gameState.player.currentMana = gameState.player.maxMana;
        }

        endCombat();
        goToMap();
    });

    // Botão inventário
    document.getElementById('inventory-btn')?.addEventListener('click', () => {
        openInventoryScreen();
    });

    // Botão personagem
    document.getElementById('character-btn')?.addEventListener('click', () => {
        openCharacterScreen();
    });

    // Fechar inventário
    document.getElementById('close-inventory-btn')?.addEventListener('click', () => {
        goToMap();
    });

    // Fechar personagem
    document.getElementById('close-character-btn')?.addEventListener('click', () => {
        goToMap();
    });

    // Botões de atributo
    document.querySelectorAll('.attr-up-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const attr = btn.dataset.attr;
            if (spendAttributePoint(attr)) {
                updateCharacterScreen();
            }
        });
    });

    // Botões de descanso
    document.getElementById('rest-short-btn')?.addEventListener('click', () => {
        const result = performRest('short');
        alert(result.message);
        updateCharacterScreen();
    });

    document.getElementById('rest-long-btn')?.addEventListener('click', () => {
        const result = performRest('long');
        alert(result.message);
        updateCharacterScreen();
    });
}

/**
 * Inicializa o mapa
 */
async function initMap() {
    console.log('🗺️ Inicializando Mapa e Campanha...');
    setScreen('map');
    updateMapHUD();

    // 1. Obtém posição inicial
    const position = await getCurrentPosition(true);
    if (!position) {
        console.error('Não foi possível obter a localização');
        return;
    }

    // 2. Inicializa o painel de Admin
    initAdminPanel();

    // 3. Configura POIs (prioriza customizados, senão usa teste)
    let poisToLoad = [];
    if (hasCustomPOIs()) {
        console.log('📍 Usando POIs customizados do Admin...');
        poisToLoad = getCustomPOIs();
    } else {
        console.log('📍 Nenhum POI customizado. Gerando POIs de teste ao redor do jogador...');
        poisToLoad = generateTestPOIs(position.lat, position.lng);
    }
    geofenceManager.loadPOIs(poisToLoad);

    // 3. Registra Listeners de Geofence ANTES de iniciar monitoramento
    geofenceManager.onGeofenceEvent((event, poi, distance) => {
        console.log(`[Geofence] Evento: ${event} em ${poi.name} (${Math.round(distance)}m)`);

        if (event === 'enter') {
            showPOINotification(poi);

            // Vibração se suportado
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            playSuccessSound();
        } else if (event === 'exit') {
            hidePOINotification();
        }
    });

    // 4. Agora inicia o monitoramento (os listeners já estão prontos)
    geofenceManager.startMonitoring();

    // 5. Inicializa o Mapa Visual
    initGameMap();

    // 6. Lógica de monstros aleatórios
    startWatching(true);

    onPositionChange((coords) => {
        const newCellId = getCellId(coords.lat, coords.lng);
        if (gameState.currentCell?.id !== newCellId) {
            gameState.currentCell = {
                id: newCellId,
                biome: getCellBiome(newCellId, coords.lat, coords.lng)
            };
        }
    });

    console.log('✅ Mapa inicializado com POIs de campanha!');
}

/**
 * Atualiza o HUD do mapa
 */
function updateMapHUD() {
    if (!gameState.player) return;

    const player = gameState.player;

    document.getElementById('player-name').textContent = player.name;
    document.getElementById('player-level').textContent = `Nível ${player.level}`;
    document.getElementById('player-avatar').innerHTML = `<img src="${getClassIcon(player.class)}" alt="Classe" class="avatar-icon-img">`;
}

/**
 * Spawna monstros nas células próximas
 * @param {number} lat 
 * @param {number} lng 
 */
/**
 * Spawna monstros nas células próximas
 * @param {number} lat 
 * @param {number} lng 
 */
async function spawnMonstersInNearby(lat, lng) {
    const currentCellId = getCellId(lat, lng);
    const nearbyCells = getNearbyCells(currentCellId, 2);

    // Remove marcadores antigos
    monsterMarkers.forEach(marker => {
        if (map) map.removeLayer(marker);
    });
    monsterMarkers = [];
    gameState.nearbyMonsters = [];

    // Busca tabela de monstros mortos
    const { killedMonsters } = await getDefeatedMonsters(nearbyCells);

    // Spawna monstros em cada célula
    nearbyCells.forEach(cellId => {
        if (cellId === currentCellId) return; // Não spawna na célula do jogador

        // Usa hash do cellId como seed para consistência
        const hash = hashCode(cellId + Date.now().toString().slice(0, -4));
        if (Math.abs(hash) % 3 !== 0) return; // ~33% de chance de ter monstro

        const biome = getCellBiome(cellId, lat, lng);
        const maxCR = gameState.player ? gameState.player.level / 2 : 1;

        let pool = getMonstersByBiome(biome).filter(m => m.cr <= maxCR);
        if (pool.length === 0) {
            pool = getMonstersByCR(maxCR);
        }

        if (pool.length === 0) return;

        const template = selectRandomMonster(pool);

        // Verifica se já matou este monstro (Combinação Célula + ID Monstro)
        // Isso é uma aproximação. Se o mesmo tipo de monstro spawnar na mesma célula, 
        // ele será considerado "morto" se houver registro recente.
        const isDead = killedMonsters?.some(k =>
            k.cell_id === cellId && k.monster_id === template.id
        );

        if (isDead) {
            // Monstro morto recentemente (banco), não spawna
            return;
        }

        // Verifica duplicidade local e estado de HP
        const existingMonster = gameState.nearbyMonsters.find(m => m.cellId === cellId);
        if (existingMonster && existingMonster.currentHp <= 0) {
            // Se já existe e tá morto (0 HP), não spawna de novo e garante limpeza
            const idx = gameState.nearbyMonsters.indexOf(existingMonster);
            if (idx > -1) gameState.nearbyMonsters.splice(idx, 1);
            return;
        }

        const monster = createMonsterInstance(template, cellId);

        gameState.nearbyMonsters.push(monster);

        // Cria marcador no mapa
        const cellCenter = getCellCenter(cellId);

        if (map) {
            const monsterIcon = L.divIcon({
                className: `monster-marker ${monster.isBoss ? 'boss' : ''}`,
                html: monster.emoji,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });

            const marker = L.marker([cellCenter.lat, cellCenter.lng], { icon: monsterIcon })
                .addTo(map)
                .on('click', () => selectMonster(monster));

            monsterMarkers.push(marker);
        }
    });
}

/**
 * Seleciona um monstro para combate
 * @param {Object} monster 
 */
function selectMonster(monster) {
    gameState.currentMonster = monster;

    const panel = document.getElementById('monster-panel');
    panel.classList.remove('hidden');

    document.getElementById('monster-name').textContent = `${monster.emoji} ${monster.name}`;
    document.getElementById('monster-hp').textContent = `HP: ${monster.currentHp}/${monster.maxHp}`;
    document.getElementById('monster-level').textContent = `AC: ${monster.ac}`;
}

/**
 * Inicia combate em AR
 */
async function startARCombat() {
    if (!gameState.currentMonster) return;

    // Esconde painel de monstro
    document.getElementById('monster-panel')?.classList.add('hidden');

    // Inicia o combate primeiro
    startCombat(gameState.currentMonster);
    setScreen('ar');
    updateARHUD();

    // Tenta iniciar sessão AR (opcional, o combate funciona sem ela)
    const arStarted = await startARSession({
        monsterId: gameState.currentMonster?.templateId,
        onPlaced: async () => {
            console.log('✅ Monstro posicionado em AR');

            // Carrega e exibe a arma equipada do jogador
            const equippedWeapon = getEquippedItem('weapon');
            if (equippedWeapon?.modelPath) {
                console.log('⚔️ Carregando arma equipada:', equippedWeapon.namePt);
                await showEquippedWeapon(equippedWeapon.modelPath);
            }
        },
        onEnd: () => {
            console.log('ℹ️ Sessão AR encerrada - combate continua em modo 2D');
            // Não volta ao mapa automaticamente - o combate continua
        }
    });

    if (!arStarted) {
        console.warn('⚠️ Modo AR não disponível, usando interface 2D');
    }

    // Mostra mensagem de início de combate
    showARMessage('Seu turno! Escolha uma ação.');
}

/**
 * Atualiza o HUD de AR
 */
function updateARHUD() {
    if (!gameState.player || !gameState.currentMonster) return;

    const player = gameState.player;
    const monster = gameState.currentMonster;

    // HP/Mana do jogador
    const hpPercent = (player.currentHp / player.maxHp) * 100;
    const manaPercent = (player.currentMana / player.maxMana) * 100;

    document.getElementById('ar-hp-fill').style.width = `${hpPercent}%`;
    document.getElementById('ar-hp-value').textContent = `${player.currentHp}/${player.maxHp}`;
    document.getElementById('ar-mana-fill').style.width = `${manaPercent}%`;
    document.getElementById('ar-mana-value').textContent = `${player.currentMana}/${player.maxMana}`;

    // HP do monstro
    const monsterHpPercent = (monster.currentHp / monster.maxHp) * 100;
    document.getElementById('ar-monster-name').textContent = `${monster.emoji} ${monster.name}`;
    document.getElementById('ar-monster-hp-fill').style.width = `${monsterHpPercent}%`;
}

/**
 * Mostra popup de dano
 * @param {number} damage 
 * @param {string} type 
 * @param {boolean} isCritical 
 */
function showDamagePopup(damage, type = 'normal', isCritical = false) {
    const container = document.getElementById('damage-popups');
    if (!container) return;

    const popup = document.createElement('div');
    popup.className = `damage-popup ${type} ${isCritical ? 'critical' : ''}`;
    popup.textContent = type === 'miss' ? 'MISS' : (type === 'heal' ? `+${damage}` : `-${damage}`);

    // Posição aleatória no centro
    popup.style.left = `${40 + Math.random() * 20}%`;
    popup.style.top = `${30 + Math.random() * 20}%`;

    container.appendChild(popup);

    setTimeout(() => popup.remove(), 1000);
}

/**
 * Mostra mensagem no AR
 * @param {string} message 
 */
function showARMessage(message) {
    const container = document.getElementById('ar-messages');
    if (!container) return;

    const msg = document.createElement('div');
    msg.className = 'ar-message';
    msg.textContent = message;

    container.appendChild(msg);

    setTimeout(() => msg.remove(), 1500);
}

/**
 * Executa turno do monstro (após ação do jogador)
 */
function executeMonsterTurn() {
    if (!gameState.inCombat || !gameState.currentMonster) return;
    if (isMonsterDefeated()) return;

    // Delay maior para o player ver o resultado do seu próprio ataque antes
    setTimeout(() => {
        if (!gameState.inCombat || !gameState.currentMonster) return;
        if (isMonsterDefeated()) return;

        // 1. Avisa ataque
        showARMessage(`${gameState.currentMonster.emoji} ${gameState.currentMonster.name} vai atacar!`);

        // 2. Calcula resultado (rolagem "server-side")
        const result = monsterAttack();

        if (result) {
            // 3. Pequeno delay e rola o dado
            setTimeout(() => {
                showARMessage(`🎲 d20: ${result.natural}`);

                try {
                    rollD20Animation(result.natural, () => {
                        // 4. Callback pós-animação: Aplica efeitos visuais
                        if (result.hit) {
                            showDamagePopup(result.damage, result.isCritical ? 'critical' : 'normal', result.isCritical);

                            if (result.isCritical) {
                                showARMessage(`CRÍTICO! Sofreu ${result.damage} dano!`);
                            } else {
                                showARMessage(`Acertado! Sofreu ${result.damage} dano`);
                            }
                        } else {
                            showDamagePopup(0, 'miss');
                            showARMessage('Esquivou!');
                        }

                        updateARHUD();

                        // 5. Verifica derrota ou passa a vez
                        if (isPlayerDefeated()) {
                            handleDefeat();
                        } else {
                            setTimeout(() => {
                                showARMessage("Sua vez!");
                            }, 1000);
                        }
                    });
                } catch (e) {
                    // Fallback
                    console.error("Erro animação monstro", e);
                    if (result.hit) showDamagePopup(result.damage, 'normal');
                    updateARHUD();
                }
            }, 1000);
        }
    }, 1500);
}

/**
 * Handler de ataque do jogador
 */
let isAttacking = false;

function handleAttack() {
    console.log('🗡️ handleAttack chamado');

    if (isAttacking) {
        console.log('🗡️ Já está atacando, ignorando');
        return;
    }

    const result = playerAttack();
    console.log('🗡️ Resultado do ataque:', result);

    if (!result) {
        console.log('🗡️ Ataque retornou null - sem combate ativo?');
        showARMessage('Nenhum combate ativo!');
        return;
    }

    isAttacking = true;

    // Mostra o resultado do dado primeiro
    showARMessage(`🎲 d20: ${result.natural}`);

    // Tenta animação do dado, com fallback
    try {
        rollD20Animation(result.natural, () => {
            processAttackResult(result);
        });
    } catch (e) {
        console.error('🎲 Erro na animação do dado:', e);
        // Fallback: processa resultado sem animação
        setTimeout(() => processAttackResult(result), 500);
    }
}

/**
 * Processa o resultado do ataque após animação
 */
function processAttackResult(result) {
    isAttacking = false;

    if (result.hit) {
        showDamagePopup(result.damage, result.isCritical ? 'critical' : 'fire', result.isCritical);
        showMonsterDamageEffect(result.damage, result.isCritical);
        animateWeaponAttack(); // Anima a arma 3D
        playAttackSound(result.damageType || 'slashing'); // Som de ataque
        if (result.isCritical) {
            showARMessage('CRÍTICO! Dano dobrado!');
        } else {
            showARMessage(`Acertou! ${result.damage} de dano`);
        }
    } else {
        showDamagePopup(0, 'miss');
        if (result.isFumble) {
            showARMessage('Falha Crítica!');
        } else {
            showARMessage('Errou!');
        }
    }

    updateARHUD();

    if (isMonsterDefeated()) {
        showMonsterDeathEffect();
        setTimeout(handleVictory, 1200);
    } else {
        executeMonsterTurn();
    }
}

/**
 * Handler de magia
 */
function handleSpell() {
    if (!gameState.player) return;

    // Seleciona cantrip baseado na classe
    let spellId = 'fireBolt'; // Default (Mage)
    if (gameState.player.class === 'cleric') spellId = 'sacredFlame';

    const result = castDamageSpell(spellId);
    if (!result) return;

    if (!result.success) {
        showARMessage(result.message || 'Falha ao lançar');
        return;
    }

    showARMessage(result.message);

    // Verifica vitória ou passa turno
    if (isMonsterDefeated()) {
        showMonsterDeathEffect();
        setTimeout(handleVictory, 1200);
    } else {
        executeMonsterTurn();
    }
}

/**
 * Handler de Dodge
 */
function handleDodge() {
    console.log('🛡️ handleDodge chamado');
    if (isAttacking) return;

    const result = playerDodge();
    if (!result.success) {
        showARMessage(result.message);
        return;
    }

    playDodgeSound(); // Som de esquiva
    showARMessage(result.message);
    executeMonsterTurn();
}



/**
 * Handler de item
 */
function handleItem() {
    const result = useHealingPotion();
    if (!result.success) {
        showARMessage(result.message);
        return;
    }

    showDamagePopup(result.healAmount, 'heal');
    showARMessage(`Curou ${result.healAmount} HP!`);
    updateARHUD();

    // Usar item gasta um turno
    executeMonsterTurn();
}

/**
 * Handler de fuga
 */
async function handleFlee() {
    const result = attemptFlee();

    showARMessage(result.message);

    if (result.success) {
        // Tenta encerrar sessão AR com segurança
        try {
            if (isARSessionActive()) {
                await endARSession();
            }
        } catch (e) {
            console.error("Erro ao encerrar AR na fuga:", e);
        }

        setScreen('map-screen');
        endCombat();

        // Volta para o mapa usando a função correta
        setTimeout(() => goToMap(), 1000);
    } else {
        updateARHUD();

        if (isPlayerDefeated()) {
            clearInterval(monsterTurnInterval);
            handleDefeat();
        }
    }
}

/**
 * Handler de Exploração com AR Interativo
 */
let currentEvent = null;
let explorationStartTime = null;

async function handleExplore() {
    if (!gameState.currentCell) {
        alert("Você precisa estar localizável para explorar!");
        return;
    }

    // Gera o evento primeiro para saber o que procurar
    const event = generateExplorationEvent(gameState.currentCell);

    if (!event) {
        alert("Você procura por toda parte, mas não encontra nada.");
        return;
    }

    currentEvent = event;

    // Verifica se AR está disponível
    const arSupported = await isExplorationARSupported();

    if (arSupported) {
        // Inicia exploração em AR
        startExplorationARMode(event);
    } else {
        // Fallback: modo 2D tradicional
        showEventModal(event);
    }
}

/**
 * Inicia o modo de exploração AR
 */
async function startExplorationARMode(event) {
    // Mostra tela de exploração AR
    setScreen('exploration-ar');

    // Atualiza instruções com base no evento
    const instructionText = document.getElementById('exploration-instruction-text');
    const instructionIcon = document.getElementById('exploration-icon');

    if (instructionText) {
        instructionText.textContent = getExplorationInstruction(event);
    }
    if (instructionIcon) {
        instructionIcon.textContent = event.emoji || '🔍';
    }

    // Esconde info do objeto inicialmente
    document.getElementById('exploration-object-info')?.classList.add('hidden');

    explorationStartTime = Date.now();

    // Inicia sessão AR de exploração
    const arStarted = await startExplorationAR({
        event: event,
        onFound: (object) => {
            onExplorationObjectFound(event, object);
        },
        onClick: (eventData) => {
            onExplorationObjectClicked(eventData);
        },
        onEnd: () => {
            console.log('ℹ️ Sessão AR de exploração encerrada');
        }
    });

    if (!arStarted) {
        console.warn('⚠️ Modo AR não disponível, usando interface 2D');
        showEventModal(event);
    }
}

/**
 * Retorna instrução personalizada para cada tipo de evento
 */
function getExplorationInstruction(event) {
    const instructions = {
        'ancient_chest': 'Procure um baú antigo ao seu redor...',
        'magic_glyph': 'Procure um símbolo mágico brilhante...',
        'monster_tracks': 'Procure rastros no chão...',
        'abandoned_shrine': 'Procure um santuário abandonado...'
    };
    return instructions[event.id] || 'Procure algo interessante...';
}

/**
 * Callback quando o objeto de exploração é encontrado em AR
 */
function onExplorationObjectFound(event, object) {
    console.log('✅ Objeto de exploração encontrado:', event.title);

    // Atualiza instruções
    const instructionText = document.getElementById('exploration-instruction-text');
    if (instructionText) {
        instructionText.textContent = 'Objeto encontrado! Toque para interagir.';
    }

    // Mostra info do objeto
    const objectInfo = document.getElementById('exploration-object-info');
    const objectIcon = document.getElementById('found-object-icon');
    const objectTitle = document.getElementById('found-object-title');
    const objectDesc = document.getElementById('found-object-desc');

    if (objectInfo) {
        objectInfo.classList.remove('hidden');
    }
    if (objectIcon) {
        objectIcon.textContent = event.emoji || '📦';
    }
    if (objectTitle) {
        objectTitle.textContent = event.title;
    }
    if (objectDesc) {
        objectDesc.textContent = 'Toque no objeto para escolher uma ação';
    }
}

/**
 * Callback quando o objeto de exploração é clicado em AR
 */
async function onExplorationObjectClicked(event) {
    console.log('🖱️ Objeto clicado:', event.title);

    // NÃO encerra a sessão AR aqui. 
    // Mantemos o AR rodando no fundo e mostramos o modal por cima.

    // Mostra modal de opções (agora como overlay)
    showEventModal(event);
}

/**
 * Cancela a exploração AR e volta ao mapa
 */
async function cancelExplorationAR() {
    await endExplorationAR();
    currentEvent = null;
    goToMap();
}

function showEventModal(event) {
    currentEvent = event;
    const modal = document.getElementById('event-screen');
    const title = document.getElementById('event-title');
    const desc = document.getElementById('event-description');
    const icon = document.getElementById('event-icon');
    const optionsDiv = document.getElementById('event-options');
    const closeBtn = document.getElementById('close-event-btn');

    if (!modal || !title || !desc || !optionsDiv) return;

    title.textContent = event.title;
    desc.textContent = event.description;

    // Usa imagem se disponível, senão emoji
    // Usa imagem se disponível, senão emoji
    if (icon) {
        if (event.image && event.image.trim() !== '') {
            // Cria a imagem com fallback para evitar ícone quebrado
            icon.innerHTML = `<img src="${event.image}" alt="${event.title}" class="event-icon-img" onerror="this.style.display='none';this.parentElement.textContent='${event.emoji || '📦'}'">`;
        } else {
            icon.textContent = event.emoji || '📦';
        }
    }

    if (closeBtn) {
        closeBtn.style.display = 'none';
        closeBtn.classList.add('hidden');
    }
    optionsDiv.innerHTML = '';

    event.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'event-option-btn';
        btn.innerHTML = `
            <span class="option-label">${opt.label}</span>
            <span class="option-dc">CD ${opt.dc}</span>
        `;
        btn.onclick = () => handleEventOption(index);
        optionsDiv.appendChild(btn);
    });

    modal.classList.add('active');
}

async function handleEventOption(index) {
    if (!currentEvent) return;

    const option = currentEvent.options[index];
    const optionsDiv = document.getElementById('event-options');
    const closeBtn = document.getElementById('close-event-btn');

    if (!optionsDiv) return;

    // Esconde opções e mostra animação de dado
    optionsDiv.innerHTML = `
        <div class="dice-rolling-container" style="text-align: center; padding: 2rem;">
            <div style="font-size: 3rem; animation: dice-spin 0.5s linear infinite;">🎲</div>
            <p style="margin-top: 1rem; color: var(--color-text-secondary);">Rolando ${option.skill}...</p>
        </div>
    `;

    // Aguarda um momento para mostrar animação do dado
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Resolve o evento
    const result = await resolveEvent(currentEvent, index);

    // Mostra a animação do dado com o resultado
    try {
        await new Promise((resolve) => {
            rollD20Animation(result.natural, resolve);
        });
    } catch (e) {
        console.error('Erro na animação do dado:', e);
    }

    // Aguarda um momento antes de mostrar resultado
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mostra resultado com estilo melhorado
    optionsDiv.innerHTML = `
        <div class="event-result ${result.success ? 'success' : 'failure'}" style="padding: 1.5rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${result.success ? '✅' : '❌'}</div>
            <h3 style="color: ${result.success ? '#4ade80' : '#f87171'}; font-size: 1.5rem; margin-bottom: 0.5rem;">
                ${result.success ? 'Sucesso!' : 'Falha!'}
            </h3>
            <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 0.75rem; margin: 1rem 0;">
                <p style="font-size: 1.2rem; color: var(--color-accent-gold); margin: 0;">🎲 ${result.natural}</p>
                <p style="font-size: 0.85rem; opacity: 0.7; margin: 0.25rem 0 0 0;">Total: ${result.roll} vs CD ${option.dc}</p>
            </div>
            <p style="margin: 1rem 0; line-height: 1.5;">${result.message}</p>
        </div>
    `;

    if (closeBtn) {
        closeBtn.style.display = 'block';
        closeBtn.classList.remove('hidden');
    }
}

/**
 * Handler de vitória
 */
async function handleVictory() {
    if (!gameState.currentMonster || !gameState.player) return;

    const monster = gameState.currentMonster;

    // Encerra sessão AR
    if (isARSessionActive()) {
        await endARSession();
    }

    // Registra morte (Persistência)
    if (gameState.currentCell) {
        // Enfire and forget para não travar UI
        recordMonsterKill(gameState.currentCell, monster.id)
            .catch(err => console.error("Erro ao salvar kill:", err));
    }

    // Remove do mapa localmente
    const markerIndex = gameState.nearbyMonsters.findIndex(m => m.id === monster.id);
    if (markerIndex !== -1) {
        gameState.nearbyMonsters.splice(markerIndex, 1);
        if (monsterMarkers[markerIndex]) {
            map.removeLayer(monsterMarkers[markerIndex]);
            monsterMarkers.splice(markerIndex, 1);
        }
    }

    // Adiciona XP
    let xpResult = null;
    try {
        xpResult = await grantXP(monster.xp);
    } catch (e) {
        console.error("Erro ao dar XP:", e);
        // Fallback local se falhar
        xpResult = { newXP: gameState.player.xp + monster.xp, leveledUp: false };
    }

    // Sempre atualiza stats derivados após vitória
    updateDerivedStats();

    // Inicializa inventário se necessário
    initInventory();

    // Gera loot
    const lootTable = monster.isBoss ? 'boss' : monster.xp > 100 ? 'rare' : 'common';
    const loot = generateLoot(lootTable);

    // Adiciona loot ao inventário
    // Adiciona loot ao inventário (com await para garantir persistência)
    for (const lootItem of loot) {
        if (lootItem.type === 'gold') {
            gameState.player.gold = (gameState.player.gold || 0) + lootItem.amount;
            // Persiste o ouro imediatamente
            if (gameState.player.id) {
                try {
                    await updatePlayer(gameState.player.id, { gold: gameState.player.gold });
                } catch (err) {
                    console.error("Erro ao salvar ouro:", err);
                }
            }
        } else if (lootItem.item) {
            try {
                const success = await addItemToInventory(lootItem.item.id, 1);
                if (!success) console.warn("Falha ao salvar item:", lootItem.item.name);
            } catch (err) {
                console.error("Erro ao adicionar loot:", err);
            }
        }
    }

    // Atualiza tela de vitória
    document.getElementById('xp-gained').textContent = `+${monster.xp} XP${xpResult.leveledUp ? ` (Level Up! Nível ${xpResult.newLevel})` : ''}`;

    const lootGrid = document.getElementById('loot-items');
    lootGrid.innerHTML = '';

    loot.forEach(item => {
        const div = document.createElement('div');
        div.className = 'loot-item';

        if (item.type === 'gold') {
            div.textContent = `💰 ${item.amount}`;
            div.style.borderColor = 'var(--color-accent-gold)';
        } else if (item.item) {
            div.textContent = '📦';
            div.style.borderColor = getRarityColor(item.item.rarity);
            div.title = item.item.namePt;
        }

        lootGrid.appendChild(div);
    });

    setScreen('victory');
}

/**
 * Handler de derrota
 */
async function handleDefeat() {
    // Encerra sessão AR
    if (isARSessionActive()) {
        await endARSession();
    }
    setScreen('defeat');
}

function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}

// ========== TELA DE INVENTÁRIO ==========

/**
 * Abre a tela de inventário
 */
function openInventoryScreen() {
    initInventory();
    updateInventoryScreen();
    setScreen('inventory');
}

/**
 * Atualiza a tela de inventário
 */
function updateInventoryScreen() {
    if (!gameState.player) return;

    // Atualiza slots equipados
    const weaponSlot = document.getElementById('equipped-weapon');
    const armorSlot = document.getElementById('equipped-armor');
    const accessorySlot = document.getElementById('equipped-accessory');

    const equippedWeapon = getEquippedItem('weapon');
    const equippedArmor = getEquippedItem('armor');
    const equippedAccessory = getEquippedItem('accessory');

    weaponSlot.textContent = equippedWeapon?.namePt || 'Vazio';
    armorSlot.textContent = equippedArmor?.namePt || 'Vazio';
    accessorySlot.textContent = equippedAccessory?.namePt || 'Vazio';

    // Atualiza grid de itens
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';

    const inventory = getInventoryWithDetails();

    inventory.forEach(invItem => {
        const div = document.createElement('div');
        div.className = 'inventory-item';
        div.style.borderColor = getRarityColor(invItem.item.rarity);
        div.dataset.instanceId = invItem.id;

        // Ícone baseado no tipo
        // Ícone baseado no tipo ou específico do item
        const icons = {
            weapon: '⚔️',
            armor: '🛡️',
            accessory: '💍',
            consumable: '🧪'
        };

        const itemIcon = invItem.item.icon || icons[invItem.item.type] || '📦';

        if (invItem.item.image) {
            div.innerHTML = `<img src="${invItem.item.image}" alt="${invItem.item.name}" class="item-icon-img" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                             <span class="item-icon-emoji" style="display:none">${itemIcon}</span>`;
        } else {
            div.innerHTML = `<span class="item-icon-emoji">${itemIcon}</span>`;
        }


        if (invItem.quantity > 1) {
            const qty = document.createElement('span');
            qty.className = 'quantity';
            qty.textContent = invItem.quantity;
            div.appendChild(qty);
        }

        div.addEventListener('click', () => selectInventoryItem(invItem));
        grid.appendChild(div);
    });
}

let selectedInventoryItem = null;

/**
 * Seleciona um item no inventário
 */
function selectInventoryItem(invItem) {
    selectedInventoryItem = invItem;

    // Destaca item selecionado
    document.querySelectorAll('.inventory-item').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-instance-id="${invItem.id}"]`)?.classList.add('selected');

    // Mostra detalhes
    const details = document.getElementById('item-details');
    details.classList.remove('hidden');

    document.getElementById('item-name').textContent = invItem.item.namePt || invItem.item.name;
    document.getElementById('item-name').style.color = getRarityColor(invItem.item.rarity);
    document.getElementById('item-description').textContent = invItem.item.effect || '';

    const stats = document.getElementById('item-stats');
    stats.innerHTML = '';

    if (invItem.item.damage) {
        stats.innerHTML += `<div>Dano: ${invItem.item.damage}</div>`;
    }
    if (invItem.item.acBonus) {
        stats.innerHTML += `<div>AC: +${invItem.item.acBonus}</div>`;
    }
    // Mostra botões apropriados
    const equipBtn = document.getElementById('equip-item-btn');
    const useBtn = document.getElementById('use-item-btn');
    const unequipBtn = document.getElementById('unequip-item-btn');

    if (invItem.item.type === 'consumable') {
        equipBtn.style.display = 'none';
        if (unequipBtn) unequipBtn.style.display = 'none';
        useBtn.style.display = 'block';
        useBtn.onclick = () => {
            const result = useItem(invItem.id);
            if (result.success) {
                showARMessage(result.message);
                updateInventoryScreen();
            }
        };
    } else {
        useBtn.style.display = 'none';

        if (invItem.equipped) {
            equipBtn.style.display = 'none';
            if (unequipBtn) {
                unequipBtn.style.display = 'block';
                unequipBtn.classList.remove('hidden'); // Garante que a classe não esconda
                unequipBtn.onclick = async () => {
                    const result = await unequipItem(invItem.slot);
                    if (result.success) {
                        updateInventoryScreen();
                        // Atualiza seleção para refletir estado
                        selectInventoryItem(invItem);
                    }
                };
            }
        } else {
            equipBtn.style.display = 'block';
            if (unequipBtn) {
                unequipBtn.style.display = 'none';
                unequipBtn.classList.add('hidden');
            }
            equipBtn.onclick = async () => {
                const result = await equipItem(invItem.id);
                if (result.success) {
                    updateInventoryScreen();
                    selectInventoryItem(invItem);
                }
            };
        }
    }
}

// ========== TELA DE PERSONAGEM ==========

/**
 * Abre a tela de personagem
 */
function openCharacterScreen() {
    updateCharacterScreen();
    setScreen('character-panel');
}

/**
 * Atualiza a tela de personagem
 */
function updateCharacterScreen() {
    if (!gameState.player) return;

    const player = gameState.player;
    const classDef = getClassDefinition(player.class);

    // Info básica
    document.getElementById('char-class-icon').innerHTML = `<img src="${getClassIcon(player.class)}" alt="Classe" class="char-class-icon-img">`;
    document.getElementById('char-name').textContent = player.name;
    document.getElementById('char-class').textContent = classDef?.namePt || player.class;
    document.getElementById('char-level').textContent = `Nível ${player.level} `;

    // Barra de XP
    const xpProgress = getXPProgress(player.xp, player.level);
    const xpNeeded = getXPForLevel(player.level + 1);
    const xpCurrent = player.xp - getTotalXPForLevel(player.level);

    // Atualiza ouro
    const goldElem = document.getElementById('char-gold');
    if (goldElem) {
        goldElem.textContent = player.gold || 0;
    }

    document.getElementById('xp-fill').style.width = `${xpProgress}% `;
    document.getElementById('xp-text').textContent = `${xpCurrent} / ${xpNeeded} XP`;

    // Atributos
    document.getElementById('attr-str').textContent = player.str;
    document.getElementById('attr-dex').textContent = player.dex;
    document.getElementById('attr-con').textContent = player.con;
    document.getElementById('attr-int').textContent = player.int;
    document.getElementById('attr-wis').textContent = player.wis;
    document.getElementById('attr-cha').textContent = player.cha;

    // Pontos de atributo
    const points = player.attributePoints || 0;
    document.getElementById('attribute-points').textContent = points > 0 ? `(${points} pontos)` : '';

    // Mostra/esconde botões de +
    document.querySelectorAll('.attr-up-btn').forEach(btn => {
        btn.classList.toggle('visible', points > 0);
    });

    // Stats derivados
    document.getElementById('char-hp').textContent = `${player.currentHp}/${player.maxHp}`;
    document.getElementById('char-mana').textContent = `${player.currentMana}/${player.maxMana}`;
    document.getElementById('char-ac').textContent = player.ac;
    document.getElementById('char-attack').textContent = `+${player.attackMod}`;

    // Habilidade de classe
    if (classDef) {
        document.querySelector('#class-ability .ability-name').textContent = classDef.ability.namePt;
        document.querySelector('#class-ability .ability-desc').textContent = classDef.ability.description;
    }
}

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);
