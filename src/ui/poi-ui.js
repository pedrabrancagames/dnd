/**
 * POI UI Module
 * Gerencia a interface de Pontos de Interesse
 */

import { gameState } from '../game/state.js';
import { startExplorationAR, endExplorationAR, showSuccessEffect } from '../ar/ar-exploration.js';
import { showARMessage } from '../ar/ar-manager.js';
import { performRest } from '../game/state.js';
import {
    getMonsterById,
    getMonstersByCR,
    selectRandomMonster,
    createMonsterInstance
} from '../data/monsters.js';
import { startDialogue, createSimpleDialogue, SAMPLE_DIALOGUES } from '../game/dialogue-system.js';
import { completePOI, updateProgressUI } from '../game/campaign-progress.js';
import { updatePOIVisualState } from '../game/map-manager.js';
import { playMonsterGrowl } from '../lib/audio-manager.js';
import geofenceManager from '../lib/geofence.js';

// Callbacks
let goToMapCallback = null;
let startARCombatCallback = null;

/**
 * Configura callbacks de navegação
 */
export function setPOIUICallbacks(goToMap, startARCombat) {
    goToMapCallback = goToMap;
    startARCombatCallback = startARCombat;
}

/**
 * Mostra notificação de POI encontrado
 * @param {Object} poi 
 */
export function showPOINotification(poi) {
    const notif = document.getElementById('poi-notification');
    if (!notif) return;

    const iconElem = document.getElementById('poi-notif-icon');
    const nameElem = document.getElementById('poi-notif-name');
    const descElem = document.getElementById('poi-notif-desc');

    if (iconElem) iconElem.textContent = poi.icon;
    if (nameElem) nameElem.textContent = poi.name;
    if (descElem) descElem.textContent = poi.description;

    const actionBtn = document.getElementById('poi-action-btn');
    const closeBtn = document.getElementById('poi-close-btn');

    // Configura texto do botão baseado no tipo
    let actionText = 'Interagir';
    if (poi.type === 'combat' || poi.type === 'boss') actionText = '⚔️ Lutar';
    else if (poi.type === 'clue') actionText = '🔍 Investigar';
    else if (poi.type === 'npc') actionText = '🗣️ Falar';

    if (actionBtn) {
        actionBtn.textContent = actionText;

        // Configura ação
        actionBtn.onclick = () => {
            handlePOIInteraction(poi);
            hidePOINotification();
        };
    }

    if (closeBtn) {
        closeBtn.onclick = () => {
            hidePOINotification();
        };
    }

    notif.classList.remove('hidden');
}

/**
 * Esconde notificação de POI
 */
export function hidePOINotification() {
    const notif = document.getElementById('poi-notification');
    if (notif) notif.classList.add('hidden');
}

/**
 * Lida com interação em um POI
 */
export function handlePOIInteraction(poi) {
    console.log('Interagindo com:', poi.name);

    if (poi.type === 'npc') {
        // Usa sistema de diálogos
        startNPCDialogue(poi);
    }
    else if (poi.type === 'clue') {
        // Inicia exploração AR para encontrar objeto
        const mapScreen = document.getElementById('map-screen');
        const arScreen = document.getElementById('exploration-ar-screen');
        if (mapScreen) mapScreen.classList.remove('active');
        if (arScreen) arScreen.classList.add('active');

        startExplorationAR({
            event: { id: 'magic_glyph', name: poi.name },
            onFound: () => showARMessage('Objeto localizado! Toque para investigar.'),
            onClick: () => {
                showSuccessEffect();
                setTimeout(() => {
                    alert(`🔎 Você investigou ${poi.name} e encontrou pistas interessantes!`);
                    completePOI(poi.id, 'clue');
                    updateProgressUI();
                    updatePOIVisualState(poi.id);
                    endExplorationAR(); // Fecha AR após sucesso
                }, 1000);
            },
            onEnd: () => {
                console.log('Exploração AR encerrada');
                if (arScreen) arScreen.classList.remove('active');
                if (goToMapCallback) goToMapCallback();
            }
        });
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
 * Inicia diálogo com NPC
 */
function startNPCDialogue(poi) {
    // Callback para marcar como completo após diálogo
    const onDialogueComplete = () => {
        completePOI(poi.id, 'npc');
        updateProgressUI();
        updatePOIVisualState(poi.id);
    };

    // Verifica se o POI tem um dialogueId configurado
    if (poi.dialogueId && SAMPLE_DIALOGUES[poi.dialogueId]) {
        // Usa diálogo pré-definido
        startDialogue(poi.dialogueId, (dialogue) => {
            console.log('[NPC] Diálogo concluído:', dialogue.id);
            onDialogueComplete();
        });
    } else if (poi.dialogueText) {
        // Usa texto customizado do POI
        const dialogue = createSimpleDialogue(
            poi.name,
            poi.icon || '👤',
            poi.dialogueText
        );
        startDialogue(dialogue, () => {
            console.log('[NPC] Diálogo simples concluído');
            onDialogueComplete();
        });
    } else {
        // Fallback: diálogo genérico
        const dialogue = createSimpleDialogue(
            poi.name,
            poi.icon || '👤',
            `Olá, aventureiro! Bem-vindo a ${poi.name}. Que bons ventos o trazem aqui?`
        );
        startDialogue(dialogue, () => {
            console.log('[NPC] Diálogo genérico concluído');
            onDialogueComplete();
        });
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

    // Salva referência ao POI para marcar como completo após vitória
    monster.poiId = poi.id;
    monster.poiType = poi.type;

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
        if (startARCombatCallback) startARCombatCallback();
    }, 500);
}

/**
 * Função global para interagir com POI a partir do popup do mapa
 */
export function setupPOIGlobalInteraction() {
    window.interactWithPOIById = (poiId) => {
        const poi = geofenceManager.activePOIs.find(p => p.id === poiId);
        if (poi) {
            console.log('[POI] Interação via popup:', poi.name);
            handlePOIInteraction(poi);
        } else {
            console.error('[POI] POI não encontrado:', poiId);
        }
    };
}
