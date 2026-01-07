/**
 * Sistema de Exploração e Eventos
 * Com suporte a armadilhas, mímicos e detecção de perigo
 */

import { EXPLORATION_EVENTS, TRAP_CONFIG, getRandomEvent } from '../data/events.js';
import { gameState, addXP } from './state.js';
import { rollSkillCheck, rollDamage } from '../lib/dice.js';
import { addItemToInventory } from './inventory.js';
import { playSuccessSound, playFailSound, playChestOpenSound } from '../lib/audio-manager.js';
import {
    TRAP_TYPES,
    generateChestTrap,
    detectDanger,
    applyTrapEffects,
    attemptDisarm
} from './identification.js';
import { getMonsterById, createMonsterInstance } from '../data/monsters.js';

// Estado da exploração atual
let currentExplorationState = {
    event: null,
    trap: null,
    trapDetected: false,
    trapRevealed: false,
    isMimic: false
};

/**
 * Gera um evento aleatório baseado na célula
 * @param {string} cellId 
 * @returns {Object|null} Evento ou null se nada encontrado
 */
export function generateExplorationEvent(cellId) {
    // Chance de 40% de encontrar algo
    if (Math.random() > 0.4) {
        return null;
    }

    // Seleciona evento aleatório
    const event = getRandomEvent();

    // Se o evento pode ter armadilha, gera uma
    if (event.canBeTrapped && Math.random() < (event.trapChance || 0.3)) {
        const playerLevel = gameState.player?.level || 1;
        const trap = generateChestTrap(playerLevel);

        // Verifica se é mímico (alguns eventos têm chance extra)
        if (event.mimicChance && trap.id !== 'none' && Math.random() < event.mimicChance) {
            currentExplorationState.trap = TRAP_TYPES.mimic;
            currentExplorationState.isMimic = true;
        } else {
            currentExplorationState.trap = trap;
            currentExplorationState.isMimic = trap.id === 'mimic';
        }
    } else {
        currentExplorationState.trap = null;
        currentExplorationState.isMimic = false;
    }

    currentExplorationState.event = event;
    currentExplorationState.trapDetected = false;
    currentExplorationState.trapRevealed = false;

    // Faz teste passivo de Insight se houver armadilha
    if (currentExplorationState.trap && currentExplorationState.trap.id !== 'none') {
        const passiveCheck = detectDanger(currentExplorationState.trap, true);
        currentExplorationState.trapDetected = passiveCheck.detected;
    }

    return {
        ...event,
        hasTrap: currentExplorationState.trap && currentExplorationState.trap.id !== 'none',
        trapHint: currentExplorationState.trapDetected ? currentExplorationState.trap.hint : null,
        isSuspicious: currentExplorationState.trapDetected
    };
}

/**
 * Obtém opções formatadas para o evento (com dica de perigo se detectado)
 * @param {Object} event 
 * @returns {Array} Opções formatadas
 */
export function getEventOptions(event) {
    if (!event || !event.options) return [];

    return event.options.map((opt, index) => {
        let label = opt.label;
        let description = '';

        // Se perigo detectado e é opção de detecção, adiciona info
        if (opt.isDetection && currentExplorationState.trapDetected) {
            description = '⚠️ Seus instintos alertam para perigo!';
        }

        // Se armadilha revelada, mostra quais opções são seguras
        if (currentExplorationState.trapRevealed) {
            if (opt.triggersTrap) {
                label = `⚠️ ${label} (ARMADILHA!)`;
            } else if (opt.canDisarmTrap) {
                label = `🔧 ${label} (Desarmar)`;
            }
        }

        return {
            ...opt,
            index,
            label,
            description,
            isSafe: !opt.triggersTrap || currentExplorationState.trapRevealed
        };
    });
}

/**
 * Resolve um evento de exploração
 * @param {Object} event 
 * @param {number} selectedOptionIndex 
 * @returns {Promise<Object>} Resultado da tentativa
 */
export async function resolveEvent(event, selectedOptionIndex) {
    const option = event.options[selectedOptionIndex];
    const player = gameState.player;

    if (!player) return { success: false, message: 'Jogador não encontrado' };

    // ========== OPÇÃO DE DETECÇÃO (Insight/Perception) ==========
    if (option.isDetection) {
        return await handleDetectionOption(event, option);
    }

    // ========== OPÇÃO ARRISCADA (beber poção sem identificar, etc) ==========
    if (option.isRisky && event.riskyOutcomes) {
        return await handleRiskyOption(event, option);
    }

    // Calcula bonificador da perícia
    let skillMod = getSkillModifier(option.skill);

    const roll = rollSkillCheck(skillMod, option.dc);

    if (roll.success) {
        // ========== VERIFICA ARMADILHA ==========
        if (option.triggersTrap && currentExplorationState.trap &&
            currentExplorationState.trap.id !== 'none' && !currentExplorationState.trapRevealed) {
            return await handleTrapTriggered(event, option, roll);
        }

        // ========== TENTA DESARMAR ==========
        if (option.canDisarmTrap && currentExplorationState.trap &&
            currentExplorationState.trap.id !== 'none') {
            const disarmResult = attemptDisarm(currentExplorationState.trap);
            if (!disarmResult.success && disarmResult.triggeredTrap) {
                return await handleTrapTriggered(event, option, roll);
            } else if (disarmResult.success) {
                currentExplorationState.trap = null;
                // Continua para pegar loot
            }
        }

        // ========== SUCESSO NORMAL ==========
        return await handleSuccessfulEvent(event, option, roll);

    } else {
        // ========== FALHA ==========
        return await handleFailedEvent(event, option, roll);
    }
}

/**
 * Lida com opção de detecção (Insight ativo)
 */
async function handleDetectionOption(event, option) {
    if (!currentExplorationState.trap || currentExplorationState.trap.id === 'none') {
        return {
            success: true,
            isDetection: true,
            message: 'Você examina cuidadosamente... parece seguro.',
            trapFound: false
        };
    }

    // Teste ativo de Insight
    const detectionResult = detectDanger(currentExplorationState.trap, false);

    if (detectionResult.detected) {
        currentExplorationState.trapRevealed = true;

        let warningMsg = detectionResult.hint || 'Você sente perigo!';

        if (currentExplorationState.isMimic) {
            warningMsg = '⚠️ MÍMICO! O baú está VIVO! Você pode atacar primeiro ou fugir!';
        }

        playSuccessSound();
        return {
            success: true,
            isDetection: true,
            roll: detectionResult.roll,
            natural: detectionResult.natural,
            dc: detectionResult.dc,
            message: warningMsg,
            trapFound: true,
            trapType: currentExplorationState.trap.namePt,
            isMimic: currentExplorationState.isMimic,
            canAttackFirst: currentExplorationState.isMimic,
            canDisarm: !currentExplorationState.isMimic
        };
    } else {
        playFailSound();
        return {
            success: false,
            isDetection: true,
            roll: detectionResult.roll,
            natural: detectionResult.natural,
            dc: detectionResult.dc,
            message: 'Você não detecta nada de anormal... mas ainda pode haver perigo.',
            trapFound: false
        };
    }
}

/**
 * Lida com armadilha ativada
 */
async function handleTrapTriggered(event, option, roll) {
    const trap = currentExplorationState.trap;

    // Se for mímico, inicia combate
    if (trap.id === 'mimic' || currentExplorationState.isMimic) {
        return {
            success: false,
            trapTriggered: true,
            isMimic: true,
            roll: roll.total,
            natural: roll.natural,
            message: '📦💀 O BAÚ ABRE UMA BOCA CHEIA DE DENTES! É UM MÍMICO!',
            triggersCombat: true,
            monster: createMimicEncounter()
        };
    }

    // Aplica efeitos da armadilha
    const trapResult = applyTrapEffects(trap);

    let message = `⚠️ ARMADILHA! ${trap.description}`;

    if (trapResult.damage > 0) {
        message += ` Você sofreu ${trapResult.damage} de dano ${trapResult.damageType}!`;
    }

    if (trapResult.goldLost > 0) {
        message += ` Perdeu ${trapResult.goldLost} ouro!`;
    }

    if (trapResult.effects.length > 0) {
        const effectNames = trapResult.effects.map(e => e.type).join(', ');
        message += ` Efeito: ${effectNames}`;
    }

    playFailSound();

    // Ainda pode tentar abrir o baú depois
    return {
        success: false,
        trapTriggered: true,
        roll: roll.total,
        natural: roll.natural,
        message: message,
        damage: trapResult.damage,
        damageType: trapResult.damageType,
        effects: trapResult.effects,
        canContinue: true // Pode tentar de novo
    };
}

/**
 * Lida com opção arriscada
 */
async function handleRiskyOption(event, option) {
    const outcomes = event.riskyOutcomes;
    const totalWeight = outcomes.reduce((sum, o) => sum + o.weight, 0);
    let random = Math.random() * totalWeight;

    let selectedOutcome = outcomes[0];
    for (const outcome of outcomes) {
        random -= outcome.weight;
        if (random <= 0) {
            selectedOutcome = outcome;
            break;
        }
    }

    // Aplica o resultado
    const player = gameState.player;
    let effectMessage = selectedOutcome.message;

    switch (selectedOutcome.type) {
        case 'heal':
            player.currentHp = Math.min(player.maxHp, player.currentHp + selectedOutcome.value);
            playSuccessSound();
            break;

        case 'damage':
            const dmg = rollDamageValue(selectedOutcome.value);
            player.currentHp = Math.max(0, player.currentHp - dmg);
            effectMessage += ` (${dmg} dano)`;
            playFailSound();
            break;

        case 'mana':
            player.currentMana = Math.min(player.maxMana, player.currentMana + selectedOutcome.value);
            playSuccessSound();
            break;

        case 'buff':
            if (!gameState.playerBuffs) gameState.playerBuffs = [];
            gameState.playerBuffs.push({
                ...selectedOutcome.buff,
                expires: Date.now() + (selectedOutcome.duration || 60000)
            });
            playSuccessSound();
            break;

        case 'hallucination':
            playFailSound();
            break;
    }

    return {
        success: selectedOutcome.type !== 'damage' && selectedOutcome.type !== 'hallucination',
        isRisky: true,
        message: effectMessage,
        outcome: selectedOutcome
    };
}

/**
 * Lida com sucesso no evento
 */
async function handleSuccessfulEvent(event, option, roll) {
    let rewardMessage = '';
    const success = event.success;

    if (success.type === 'loot') {
        playChestOpenSound();

        // Adiciona itens
        if (success.items) {
            for (const item of success.items) {
                // Itens encontrados podem vir não identificados
                const needsId = event.requiresIdentification || false;
                await addItemToInventory(item, 1, { identified: !needsId });
            }
            rewardMessage = 'Você encontrou itens!';
        }

        // Adiciona ouro
        if (success.gold) {
            const goldAmount = typeof success.gold === 'object'
                ? Math.floor(Math.random() * (success.gold.max - success.gold.min + 1)) + success.gold.min
                : success.gold;
            gameState.player.gold = (gameState.player.gold || 0) + goldAmount;
            rewardMessage += ` +${goldAmount} ouro!`;
        }

    } else if (success.type === 'mana') {
        gameState.player.currentMana = Math.min(gameState.player.maxMana, gameState.player.currentMana + success.value);
        rewardMessage = `Recuperou ${success.value} Mana.`;

    } else if (success.type === 'heal_all') {
        gameState.player.currentHp = gameState.player.maxHp;
        gameState.player.currentMana = gameState.player.maxMana;
        rewardMessage = 'Sua vida e mana foram restauradas!';

    } else if (success.type === 'buff') {
        if (!gameState.playerBuffs) gameState.playerBuffs = [];
        gameState.playerBuffs.push({
            ...success.buff,
            expires: Date.now() + (success.buff.duration || 60000)
        });
        rewardMessage = `Buff ${success.buff.name} ativado!`;
    }

    if (success.xp) {
        const xpRes = addXP(success.xp);
        rewardMessage += ` +${success.xp} XP`;
        if (xpRes.leveledUp) rewardMessage += ' (LEVEL UP!)';
    }

    playSuccessSound();
    return {
        success: true,
        roll: roll.total,
        natural: roll.natural,
        message: `${option.successMsg} ${rewardMessage}`
    };
}

/**
 * Lida com falha no evento
 */
async function handleFailedEvent(event, option, roll) {
    let failMessage = '';
    const failure = event.failure;

    if (failure.type === 'damage') {
        const dmg = rollDamageValue(failure.value);
        gameState.player.currentHp = Math.max(0, gameState.player.currentHp - dmg);
        failMessage = `Sofreu ${dmg} de dano.`;
    } else {
        failMessage = 'Nada de útil foi encontrado.';
    }

    playFailSound();
    return {
        success: false,
        roll: roll.total,
        natural: roll.natural,
        message: `${option.failMsg} ${failMessage}`
    };
}

/**
 * Cria um encontro com mímico para combate
 */
function createMimicEncounter() {
    const mimicTemplate = getMonsterById('mimic');
    if (!mimicTemplate) {
        console.error('Mímico não encontrado no banco de monstros!');
        return null;
    }

    return createMonsterInstance(mimicTemplate, 'trap_mimic');
}

/**
 * Inicia combate surpresa contra mímico
 * @returns {Object} Dados do monstro para combate
 */
export function initMimicCombat() {
    const mimic = createMimicEncounter();
    if (!mimic) return null;

    // Jogador detectou = ataca primeiro
    // Jogador não detectou = mímico ataca primeiro
    mimic.playerHasAdvantage = currentExplorationState.trapRevealed;
    mimic.monsterHasAdvantage = !currentExplorationState.trapRevealed;

    return mimic;
}

/**
 * Limpa o estado da exploração atual
 */
export function clearExplorationState() {
    currentExplorationState = {
        event: null,
        trap: null,
        trapDetected: false,
        trapRevealed: false,
        isMimic: false
    };
}

/**
 * Obtém o estado atual da exploração
 */
export function getExplorationState() {
    return { ...currentExplorationState };
}

// ========== HELPERS ==========

function getSkillModifier(skill) {
    const player = gameState.player;
    if (!player) return 0;

    if (player.skills && player.skills[skill] !== undefined) {
        return player.skills[skill];
    }

    // Fallback para modificador de atributo
    const attrMap = {
        athletics: player.strMod,
        acrobatics: player.dexMod,
        investigation: player.intMod,
        arcana: player.intMod,
        survival: player.wisMod,
        perception: player.wisMod,
        religion: player.intMod,
        insight: player.wisMod,
        medicine: player.wisMod
    };

    return attrMap[skill] || 0;
}

function rollDamageValue(diceNotation) {
    if (!diceNotation) return 0;

    const parts = diceNotation.match(/(\d+)d(\d+)(?:\+(\d+))?/);
    if (!parts) return parseInt(diceNotation) || 0;

    const numDice = parseInt(parts[1]);
    const dieSize = parseInt(parts[2]);
    const bonus = parseInt(parts[3]) || 0;

    let total = bonus;
    for (let i = 0; i < numDice; i++) {
        total += Math.floor(Math.random() * dieSize) + 1;
    }

    return total;
}
