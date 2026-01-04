/**
 * Sistema de Progressão - XP e Níveis
 */

import { gameState } from './state.js';

/**
 * Calcula XP necessário para um nível específico
 * Fórmula: nível × 100 × 1.5
 * @param {number} level 
 * @returns {number}
 */
export function getXPForLevel(level) {
    if (level <= 1) return 0;
    return Math.floor(level * 100 * 1.5);
}

/**
 * Calcula XP total necessário do nível 1 até um nível específico
 * @param {number} level 
 * @returns {number}
 */
export function getTotalXPForLevel(level) {
    let total = 0;
    for (let i = 2; i <= level; i++) {
        total += getXPForLevel(i);
    }
    return total;
}

/**
 * Calcula o nível baseado no XP total
 * @param {number} totalXP 
 * @returns {number}
 */
export function getLevelFromXP(totalXP) {
    let level = 1;
    let xpNeeded = 0;

    while (level < 20) {
        xpNeeded += getXPForLevel(level + 1);
        if (totalXP < xpNeeded) break;
        level++;
    }

    return level;
}

/**
 * Calcula progresso percentual para o próximo nível
 * @param {number} currentXP 
 * @param {number} currentLevel 
 * @returns {number} 0-100
 */
export function getXPProgress(currentXP, currentLevel) {
    if (currentLevel >= 20) return 100;

    const xpForCurrentLevel = getTotalXPForLevel(currentLevel);
    const xpForNextLevel = getTotalXPForLevel(currentLevel + 1);
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    const xpProgress = currentXP - xpForCurrentLevel;

    return Math.min(100, Math.floor((xpProgress / xpNeeded) * 100));
}

/**
 * Calcula pontos de atributo disponíveis baseado no nível
 * +1 ponto a cada 2 níveis (níveis 2, 4, 6, 8...)
 * @param {number} level 
 * @returns {number}
 */
export function getAttributePointsForLevel(level) {
    return Math.floor(level / 2);
}

/**
 * Adiciona XP ao jogador e verifica level up
 * @param {number} xpAmount 
 * @returns {{
 *   newXP: number,
 *   newLevel: number,
 *   leveledUp: boolean,
 *   levelsGained: number,
 *   newAttributePoints: number
 * }}
 */
export function grantXP(xpAmount) {
    if (!gameState.player) return null;

    const player = gameState.player;
    const oldLevel = player.level;
    const oldAttributePoints = getAttributePointsForLevel(oldLevel);

    // Adiciona XP
    player.xp += xpAmount;

    // Calcula novo nível
    const newLevel = getLevelFromXP(player.xp);
    const leveledUp = newLevel > oldLevel;
    const levelsGained = newLevel - oldLevel;

    if (leveledUp) {
        player.level = newLevel;

        // Atualiza stats derivados
        updateStatsForLevel(player);
    }

    // Calcula novos pontos de atributo
    const totalAttributePoints = getAttributePointsForLevel(newLevel);
    const newAttributePoints = totalAttributePoints - oldAttributePoints;

    if (newAttributePoints > 0) {
        player.attributePoints = (player.attributePoints || 0) + newAttributePoints;
    }

    return {
        newXP: player.xp,
        newLevel: player.level,
        leveledUp,
        levelsGained,
        newAttributePoints
    };
}

/**
 * Atualiza stats derivados quando o jogador sobe de nível
 * @param {Object} player 
 */
function updateStatsForLevel(player) {
    // HP por classe
    const hpPerLevel = {
        warrior: 12,
        mage: 6,
        archer: 8,
        cleric: 8
    };

    const baseHP = hpPerLevel[player.class] || 8;
    const conMod = Math.floor((player.con - 10) / 2);

    // HP máximo = (HP base + mod CON) × nível
    const oldMaxHP = player.maxHp;
    player.maxHp = (baseHP + conMod) * player.level;

    // Cura a diferença de HP ganho
    const hpGained = player.maxHp - oldMaxHP;
    player.currentHp = Math.min(player.maxHp, player.currentHp + hpGained);

    // Mana máximo = INT × 2 + nível × 3
    const oldMaxMana = player.maxMana;
    player.maxMana = player.int * 2 + player.level * 3;

    // Restaura mana ganho
    const manaGained = player.maxMana - oldMaxMana;
    player.currentMana = Math.min(player.maxMana, player.currentMana + manaGained);
}

/**
 * Gasta um ponto de atributo para aumentar um atributo
 * @param {string} attribute - 'str', 'dex', 'con', 'int', 'wis', 'cha'
 * @returns {boolean} sucesso
 */
export function spendAttributePoint(attribute) {
    if (!gameState.player) return false;

    const player = gameState.player;
    const validAttributes = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

    if (!validAttributes.includes(attribute)) return false;
    if (!player.attributePoints || player.attributePoints <= 0) return false;
    if (player[attribute] >= 20) return false; // Máximo de D&D

    player[attribute] += 1;
    player.attributePoints -= 1;

    // Recalcula stats derivados se necessário
    if (attribute === 'con') {
        updateStatsForLevel(player);
    } else if (attribute === 'int') {
        player.maxMana = player.int * 2 + player.level * 3;
        player.currentMana = Math.min(player.maxMana, player.currentMana);
    }

    return true;
}

/**
 * Tabela de XP por nível para referência
 */
export const XP_TABLE = Array.from({ length: 20 }, (_, i) => ({
    level: i + 1,
    xpNeeded: getXPForLevel(i + 1),
    xpTotal: getTotalXPForLevel(i + 1),
    attributePoints: getAttributePointsForLevel(i + 1)
}));
