/**
 * D&D AR Adventure - Main Entry Point
 */

import './styles/main.css';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { checkCompatibility, renderIncompatibleScreen } from './lib/compatibility.js';
import { signIn, signUp, getSession, getPlayer, createPlayer, onAuthStateChange } from './lib/supabase.js';
import { getCurrentPosition, startWatching, onPositionChange } from './lib/gps.js';
import { getCellId, getNearbyCells, getCellBiome, getCellCenter } from './lib/cells.js';
import { getMonstersByBiome, getMonstersByCR, selectRandomMonster, createMonsterInstance } from './data/monsters.js';
import { gameState, setPlayer, setScreen, startCombat, endCombat, getClassIcon, updateDerivedStats, performRest } from './game/state.js';
import { playerAttack, monsterAttack, isMonsterDefeated, isPlayerDefeated, castDamageSpell, useHealingPotion, attemptFlee, playerDodge } from './game/combat.js';
import { generateExplorationEvent, resolveEvent } from './game/exploration.js';
import { generateLoot, getRarityColor, getItemById } from './data/items.js';
import { startARSession, endARSession, showMonsterDamageEffect, showMonsterDeathEffect, isARSessionActive } from './ar/ar-manager.js';
import { grantXP, getXPProgress, getXPForLevel, getTotalXPForLevel, spendAttributePoint } from './game/progression.js';
import { getClassDefinition, useClassAbility, getAbilityCooldownRemaining } from './game/classes.js';
import { initInventory, addItemToInventory, equipItem, unequipItem, useItem, getInventoryWithDetails, getEquippedItem, recalculateEquipmentStats } from './game/inventory.js';
import { rollD20Animation } from './ar/dice-animation.js';
import { recordMonsterKill, getDefeatedMonsters, updatePlayer } from './lib/supabase.js';

// Leaflet map instance
let map = null;
let playerMarker = null;
let monsterMarkers = [];

/**
 * Volta para a tela do mapa e força recálculo do tamanho do Leaflet
 */
function goToMap() {
    setScreen('map');
    // Força Leaflet a recalcular tamanho após a tela ficar visível
    setTimeout(() => {
        if (map) {
            map.invalidateSize();
        }
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
 * Configura a bússola para rotacionar com a orientação do dispositivo
 */
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
    document.getElementById('explore-btn')?.addEventListener('click', handleExplore);
    document.getElementById('close-event-btn')?.addEventListener('click', () => {
        document.getElementById('event-screen').classList.remove('active');
    });

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
    setScreen('map');

    // Obtém posição inicial
    const position = await getCurrentPosition(true);

    if (!position) {
        console.error('Não foi possível obter a localização');
        return;
    }

    // Inicializa o Leaflet
    const mapContainer = document.getElementById('map-container');

    if (!map) {
        map = L.map(mapContainer, {
            zoomControl: false,
            attributionControl: false
        }).setView([position.lat, position.lng], 18);

        // Tile layer dark
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19
        }).addTo(map);

        // Marcador do jogador
        const playerIcon = L.divIcon({
            className: 'player-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        playerMarker = L.marker([position.lat, position.lng], { icon: playerIcon }).addTo(map);
    }

    // Atualiza HUD
    updateMapHUD();

    // Spawn monstros iniciais
    spawnMonstersInNearby(position.lat, position.lng);

    // Começa a monitorar posição
    startWatching(true);
    onPositionChange((coords) => {
        if (map && playerMarker) {
            playerMarker.setLatLng([coords.lat, coords.lng]);
            map.panTo([coords.lat, coords.lng]);

            // Atualiza célula atual e spawna monstros
            const newCellId = getCellId(coords.lat, coords.lng);
            if (gameState.currentCell?.id !== newCellId) {
                gameState.currentCell = {
                    id: newCellId,
                    biome: getCellBiome(newCellId, coords.lat, coords.lng)
                };
                spawnMonstersInNearby(coords.lat, coords.lng);
            }
        }
    });
}

/**
 * Atualiza o HUD do mapa
 */
function updateMapHUD() {
    if (!gameState.player) return;

    const player = gameState.player;

    document.getElementById('player-name').textContent = player.name;
    document.getElementById('player-level').textContent = `Nível ${player.level}`;
    document.getElementById('player-avatar').textContent = getClassIcon(player.class);
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
        onPlaced: () => {
            console.log('✅ Monstro posicionado em AR');
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
 * Handler de Exploração
 */
let currentEvent = null;

function handleExplore() {
    if (!gameState.currentCell) {
        alert("Você precisa estar localizável para explorar!");
        return;
    }

    const event = generateExplorationEvent(gameState.currentCell);

    if (!event) {
        alert("Você procura por toda parte, mas não encontra nada.");
        return;
    }

    showEventModal(event);
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
    if (icon) icon.textContent = event.emoji || '📦';

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

    const result = await resolveEvent(currentEvent, index);

    const optionsDiv = document.getElementById('event-options');
    const closeBtn = document.getElementById('close-event-btn');

    if (!optionsDiv) return;

    // Mostra resultado
    optionsDiv.innerHTML = `
        <div class="event-result ${result.success ? 'success' : 'failure'}" style="padding: 1rem; text-align: center;">
            <h3 style="color: ${result.success ? '#4ade80' : '#f87171'};">${result.success ? 'Sucesso!' : 'Falha!'}</h3>
            <p style="margin: 1rem 0;">${result.message}</p>
            <p style="font-size: 0.9rem; opacity: 0.7;">Rolagem: ${result.natural} (Total: ${result.roll})</p>
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
        const icons = {
            weapon: '⚔️',
            armor: '🛡️',
            accessory: '💍',
            consumable: '🧪'
        };
        div.textContent = icons[invItem.item.type] || '📦';

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
    document.getElementById('char-class-icon').textContent = getClassIcon(player.class);
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
