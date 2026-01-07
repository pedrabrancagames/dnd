/**
 * Sistema de Exploração e Eventos
 */

import { EXPLORATION_EVENTS } from '../data/events.js';
import { gameState, addXP } from './state.js';
import { rollSkillCheck } from '../lib/dice.js';
import { addItemToInventory } from './inventory.js';
import { playSuccessSound, playFailSound, playChestOpenSound } from '../lib/audio-manager.js';

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
    const eventIndex = Math.floor(Math.random() * EXPLORATION_EVENTS.length);
    return EXPLORATION_EVENTS[eventIndex];
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

    // Calcula bonificador da perícia
    // Pega do player.skills ou calcula na hora se não existir (fallback)
    let skillMod = 0;
    if (player.skills && player.skills[option.skill] !== undefined) {
        skillMod = player.skills[option.skill];
    } else {
        // Fallback: Tenta pegar atributo base (ex: athletics -> str)
        const attrMap = {
            athletics: player.strMod,
            investigation: player.intMod,
            arcana: player.intMod,
            survival: player.wisMod,
            perception: player.wisMod,
            religion: player.intMod,
            insight: player.wisMod
        };
        skillMod = attrMap[option.skill] || 0;
    }

    const roll = rollSkillCheck(skillMod, option.dc);

    if (roll.success) {
        // Aplica recompensas
        let rewardMessage = '';
        const success = event.success;

        if (success.type === 'loot') {
            playChestOpenSound(); // Som de baú
            for (const item of success.items) {
                await addItemToInventory(item, 1);
            }
            rewardMessage = 'Você encontrou itens!';
        } else if (success.type === 'mana') {
            player.currentMana = Math.min(player.maxMana, player.currentMana + success.value);
            rewardMessage = `Recuperou ${success.value} Mana.`;
        } else if (success.type === 'heal_all') {
            player.currentHp = player.maxHp;
            player.currentMana = player.maxMana;
            rewardMessage = 'Sua vida e mana foram restauradas!';
        } else if (success.type === 'buff') {
            // TODO: Implementar buffs temporários reais
            rewardMessage = `Buff ${success.buff.name} ativado!`;
        }

        if (success.xp) {
            const xpRes = addXP(success.xp);
            rewardMessage += ` +${success.xp} XP`;
            if (xpRes.leveledUp) rewardMessage += ' (LEVEL UP!)';
        }

        playSuccessSound(); // Som de sucesso
        return {
            success: true,
            roll: roll.total,
            natural: roll.natural,
            message: `${option.successMsg} ${rewardMessage}`
        };

    } else {
        // Aplica penalidades
        let failMessage = '';
        const failure = event.failure;

        if (failure.type === 'damage') {
            // Rola dano simples (ex: '1d4' -> parse manual simples ou usar rollDamage se importar lib)
            // Vamos simplificar e assumir dano fixo ou simples
            const dmgVal = parseInt(failure.value.split('d')[1] || 4); // Pega max do dado como estimativa ou faz aleatorio simples
            const dmg = Math.floor(Math.random() * dmgVal) + 1;

            player.currentHp = Math.max(0, player.currentHp - dmg);
            failMessage = `Sofreu ${dmg} de dano.`;
        } else {
            failMessage = 'Nada de útil foi encontrado.';
        }

        playFailSound(); // Som de falha
        return {
            success: false,
            roll: roll.total,
            natural: roll.natural,
            message: `${option.failMsg} ${failMessage}`
        };
    }
}
