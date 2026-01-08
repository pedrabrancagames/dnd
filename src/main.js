/**
 * D&D AR Adventure - Main Entry Point (Refactored)
 * 
 * Este arquivo foi refatorado para delegar responsabilidades a módulos especializados:
 * - combat-ui.js: UI de combate AR
 * - exploration-ui.js: UI de exploração e eventos
 * - inventory-ui.js: UI de inventário
 * - character-ui.js: UI de personagem
 * - poi-ui.js: UI de POIs
 */

import './styles/main.css';
import './styles/event-modal.css';
import './styles/poi-styles.css';

// Libs e utilitários
import { checkCompatibility, renderIncompatibleScreen } from './lib/compatibility.js';
import { signIn, signUp, getSession, getPlayer, createPlayer, onAuthStateChange } from './lib/supabase.js';
import { getCurrentPosition, startWatching, onPositionChange } from './lib/gps.js';
import { getCellId, getCellBiome } from './lib/cells.js';
import { preloadSounds, playSuccessSound } from './lib/audio-manager.js';
import geofenceManager from './lib/geofence.js';

// Game state e lógica
import { gameState, setPlayer, setScreen, endCombat, updateDerivedStats, performRest } from './game/state.js';
import { spendAttributePoint } from './game/progression.js';
import { initInventory } from './game/inventory.js';
import { initMap as initGameMap, getMapInstance, updatePOIVisualState } from './game/map-manager.js';
import { CAMPAIGNS, generateTestPOIs } from './data/campaigns.js';
import { initAdminPanel, getCustomPOIs, hasCustomPOIs } from './game/admin-poi.js';
import { initProgress, setTotalPOIsGetter, updateProgressUI } from './game/campaign-progress.js';
import { isARSessionActive, endARSession } from './ar/ar-manager.js';
import { endExplorationAR, isExplorationARActive } from './ar/ar-exploration.js';

// Módulos de UI
import {
    startARCombat,
    updateARHUD,
    handleAttack,
    handleSpell,
    handleItem,
    handleFlee,
    handleDodge,
    setCombatUINavigation,
    setupCombatListeners
} from './ui/combat-ui.js';

import {
    handleExplore,
    cancelExplorationAR,
    showEventModal,
    setExplorationUINavigation
} from './ui/exploration-ui.js';

import {
    openInventoryScreen,
    updateInventoryScreen,
    setInventoryUINavigation
} from './ui/inventory-ui.js';

import {
    openCharacterScreen,
    updateCharacterScreen,
    setCharacterUINavigation
} from './ui/character-ui.js';

import {
    showPOINotification,
    hidePOINotification,
    handlePOIInteraction,
    setPOIUICallbacks,
    setupPOIGlobalInteraction
} from './ui/poi-ui.js';

// Sistema de Campanhas
import { initCampaign, registerCampaignKill } from './game/campaign-manager.js';
import { initWorldState } from './game/world-state.js';
import { initCampaignUI, setCampaignUINavigation, openCampaignPanel } from './ui/campaign-ui.js';

// ========== FUNÇÕES DE NAVEGAÇÃO ==========

/**
 * Volta para a tela do mapa e força recálculo do tamanho do Leaflet
 */
function goToMap() {
    setScreen('map');
    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
    updateMapHUD();
}

/**
 * Atualiza o HUD do mapa
 */
function updateMapHUD() {
    if (!gameState.player) return;

    const hpElem = document.getElementById('map-hp-value');
    const manaElem = document.getElementById('map-mana-value');
    const levelElem = document.getElementById('map-level');
    const hpFill = document.getElementById('map-hp-fill');
    const manaFill = document.getElementById('map-mana-fill');

    if (hpElem) hpElem.textContent = `${gameState.player.currentHp}/${gameState.player.maxHp}`;
    if (manaElem) manaElem.textContent = `${gameState.player.currentMana}/${gameState.player.maxMana}`;
    if (levelElem) levelElem.textContent = `Nv ${gameState.player.level}`;

    const hpPercent = (gameState.player.currentHp / gameState.player.maxHp) * 100;
    const manaPercent = (gameState.player.currentMana / gameState.player.maxMana) * 100;

    if (hpFill) hpFill.style.width = `${hpPercent}%`;
    if (manaFill) manaFill.style.width = `${manaPercent}%`;
}

/**
 * Atualiza o status de loading
 */
function updateLoadingStatus(message) {
    const statusEl = document.getElementById('loading-status');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

// ========== HANDLER DE VITÓRIA ==========

import { recordMonsterKill, updatePlayer } from './lib/supabase.js';
import { grantXP } from './game/progression.js';
import { addItemToInventory } from './game/inventory.js';
import { generateLoot, getRarityColor } from './data/items.js';

async function handleVictory() {
    if (!gameState.currentMonster || !gameState.player) return;

    const monster = gameState.currentMonster;

    // Encerra sessão AR
    if (isARSessionActive()) {
        await endARSession();
    }

    // Registra morte (Persistência)
    if (gameState.currentCell) {
        recordMonsterKill(gameState.currentCell, monster.id)
            .catch(err => console.error("Erro ao salvar kill:", err));
    }

    // Registra kill para a campanha ativa
    registerCampaignKill(monster);

    // Remove do mapa localmente
    const mapRef = getMapInstance();
    const markerIndex = gameState.nearbyMonsters.findIndex(m => m.id === monster.id);
    if (markerIndex !== -1) {
        gameState.nearbyMonsters.splice(markerIndex, 1);
    }

    // Se o monstro estava associado a um POI, marca como completo
    if (monster.poiId) {
        console.log(`[Victory] Completando POI de combate: ${monster.poiId}`);
        const { completePOI } = await import('./game/campaign-progress.js');
        completePOI(monster.poiId, monster.poiType || 'combat');
        updateProgressUI();
        updatePOIVisualState(monster.poiId);
    }

    // Adiciona XP
    let xpResult = null;
    try {
        xpResult = await grantXP(monster.xp);
    } catch (e) {
        console.error("Erro ao dar XP:", e);
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
    for (const lootItem of loot) {
        if (lootItem.type === 'gold') {
            gameState.player.gold = (gameState.player.gold || 0) + lootItem.amount;
            if (gameState.player.id) {
                try {
                    await updatePlayer(gameState.player.id, { gold: gameState.player.gold });
                } catch (err) {
                    console.error("Erro ao salvar ouro:", err);
                }
            }
        } else if (lootItem.item) {
            try {
                await addItemToInventory(lootItem.item.id, 1);
            } catch (err) {
                console.error("Erro ao adicionar loot:", err);
            }
        }
    }

    // Atualiza tela de vitória
    const xpGained = document.getElementById('xp-gained');
    if (xpGained) {
        xpGained.textContent = `+${monster.xp} XP${xpResult?.leveledUp ? ` (Level Up! Nível ${xpResult.newLevel})` : ''}`;
    }

    const lootGrid = document.getElementById('loot-items');
    if (lootGrid) {
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
    }

    setScreen('victory');
}

async function handleDefeat() {
    if (isARSessionActive()) {
        await endARSession();
    }
    setScreen('defeat');
}

// ========== CONFIGURAÇÃO INICIAL ==========

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
            document.getElementById(`${tab}-form`)?.classList.add('active');
        });
    });

    // Formulário de login
    document.getElementById('login-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');

        if (errorEl) errorEl.textContent = 'Entrando...';

        const { user, error } = await signIn(email, password);

        if (error) {
            if (errorEl) errorEl.textContent = error;
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

        if (errorEl) errorEl.textContent = 'Criando conta...';

        const { user, error } = await signUp(email, password, name);

        if (error) {
            if (errorEl) errorEl.textContent = error;
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
            const createBtn = document.getElementById('create-character-btn');
            if (createBtn) createBtn.disabled = false;
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
            setPlayer(playerData);
        } else {
            setPlayer(player);
        }

        await initMap();
    });

    // Botão entrar em AR
    document.getElementById('enter-ar-btn')?.addEventListener('click', () => {
        if (!gameState.currentMonster) return;
        startARCombat(handleVictory, handleDefeat, goToMap);
    });

    // Configura listeners de combate (importados do módulo)
    setupCombatListeners();

    // Exploração
    document.getElementById('explore-btn')?.addEventListener('click', handleExplore);
    document.getElementById('close-event-btn')?.addEventListener('click', async () => {
        document.getElementById('event-screen')?.classList.remove('active');
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
 * Configura bússola
 */
function setupCompass() {
    const compassArrow = document.getElementById('compass-arrow');
    if (!compassArrow) return;

    if ('DeviceOrientationEvent' in window) {
        // iOS requer permissão
        if (typeof DeviceOrientationEvent.requestPermission === 'function') {
            document.body.addEventListener('click', async () => {
                try {
                    const permission = await DeviceOrientationEvent.requestPermission();
                    if (permission === 'granted') {
                        startCompassUpdates(compassArrow);
                    }
                } catch (e) {
                    console.warn('Permissão de orientação negada:', e);
                }
            }, { once: true });
        } else {
            startCompassUpdates(compassArrow);
        }
    }
}

function startCompassUpdates(compassArrow) {
    window.addEventListener('deviceorientationabsolute', (e) => {
        if (e.alpha !== null) {
            compassArrow.style.transform = `rotate(${360 - e.alpha}deg)`;
        }
    });

    window.addEventListener('deviceorientation', (e) => {
        if (e.webkitCompassHeading !== undefined) {
            compassArrow.style.transform = `rotate(${e.webkitCompassHeading}deg)`;
        } else if (e.alpha !== null) {
            compassArrow.style.transform = `rotate(${360 - e.alpha}deg)`;
        }
    });
}

// ========== INICIALIZAÇÃO DO MAPA ==========

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

    // 3. Inicializa sistema de progresso
    initProgress();

    // 3.5. Inicia a campanha ativa
    initCampaign();

    // 4. Configura POIs
    let poisToLoad = [];
    if (hasCustomPOIs()) {
        console.log('📍 Usando POIs customizados do Admin...');
        poisToLoad = getCustomPOIs();
    } else {
        console.log('📍 Nenhum POI customizado. Gerando POIs de teste ao redor do jogador...');
        poisToLoad = generateTestPOIs(position.lat, position.lng);
    }
    geofenceManager.loadPOIs(poisToLoad);

    // 5. Configura getter de total de POIs para o progresso
    setTotalPOIsGetter(() => geofenceManager.activePOIs.length);
    updateProgressUI();

    // 6. Registra Listeners de Geofence
    geofenceManager.onGeofenceEvent((event, poi, distance) => {
        console.log(`[Geofence] Evento: ${event} em ${poi.name} (${Math.round(distance)}m)`);

        if (event === 'enter') {
            showPOINotification(poi);
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
            playSuccessSound();
        } else if (event === 'exit') {
            hidePOINotification();
        }
    });

    // 7. Inicia monitoramento
    geofenceManager.startMonitoring();

    // 8. Inicializa o Mapa Visual
    initGameMap();

    // 9. Lógica de posição
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

// ========== INICIALIZAÇÃO ==========

async function init() {
    console.log('🎮 Iniciando D&D AR Adventure (Refactored)...');

    try {
        // Configura navegação para os módulos
        setCombatUINavigation(setScreen);
        setExplorationUINavigation(setScreen, goToMap);
        setInventoryUINavigation(setScreen);
        setCharacterUINavigation(setScreen);
        setPOIUICallbacks(goToMap, () => startARCombat(handleVictory, handleDefeat, goToMap));
        setupPOIGlobalInteraction();

        // Sistema de Campanhas
        setCampaignUINavigation(setScreen, goToMap);
        initWorldState();
        initCampaignUI();

        // Setup de listeners
        setupUIListeners();
        setupAuthListeners();

        // Pré-carrega sons
        preloadSounds();

        updateLoadingStatus('Verificando compatibilidade...');
        console.log('⏳ Iniciando verificação de compatibilidade...');

        // 1. Verificação de compatibilidade
        let compatibility;
        try {
            compatibility = await Promise.race([
                checkCompatibility(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
            ]);
        } catch (e) {
            console.error('❌ Timeout ou erro na verificação de compatibilidade:', e);
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
        const errorMsg = `Erro: ${error.message || error}\n\nStack: ${error.stack || 'N/A'}`;
        updateLoadingStatus(errorMsg);
        setTimeout(() => setScreen('login'), 5000);
    }
}

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);
