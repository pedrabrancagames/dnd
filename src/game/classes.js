/**
 * Sistema de Classes - Habilidades Especiais e Passivas
 */

import { gameState } from './state.js';
import { rollDamage, rollAttack, getModifier } from '../lib/dice.js';

/**
 * Definições das 4 classes jogáveis
 */
export const CLASS_DEFINITIONS = {
    warrior: {
        id: 'warrior',
        name: 'Guerreiro',
        namePt: 'Guerreiro',
        icon: '⚔️',
        description: 'Tanque com alto HP e provocação',
        hpPerLevel: 12,
        primaryStat: 'str',
        savingThrows: ['str', 'con'],
        weapons: ['sword', 'axe', 'hammer'],
        ability: {
            id: 'taunt',
            name: 'Provocação',
            namePt: 'Provocação',
            description: 'Força o monstro a atacar você por 5 segundos',
            cooldown: 15000, // 15 segundos
            manaCost: 0,
            execute: executeTaunt
        },
        passive: {
            id: 'last_stand',
            name: 'Última Resistência',
            namePt: 'Última Resistência',
            description: '+2 AC quando HP < 50%',
            apply: applyLastStand
        }
    },

    mage: {
        id: 'mage',
        name: 'Mage',
        namePt: 'Mago',
        icon: '🔮',
        description: 'Alto dano mágico em área',
        hpPerLevel: 6,
        primaryStat: 'int',
        savingThrows: ['int', 'wis'],
        weapons: ['staff', 'orb'],
        ability: {
            id: 'meteor',
            name: 'Meteor',
            namePt: 'Meteoro',
            description: 'Causa 4d6 de dano em área',
            cooldown: 30000, // 30 segundos
            manaCost: 20,
            execute: executeMeteor
        },
        passive: {
            id: 'arcane_power',
            name: 'Poder Arcano',
            namePt: 'Poder Arcano',
            description: '+20% dano mágico contra inimigos com debuff',
            apply: applyArcanePower
        }
    },

    archer: {
        id: 'archer',
        name: 'Archer',
        namePt: 'Arqueiro',
        icon: '🏹',
        description: 'Críticos devastadores',
        hpPerLevel: 8,
        primaryStat: 'dex',
        savingThrows: ['dex', 'int'],
        weapons: ['bow', 'crossbow'],
        ability: {
            id: 'arrow_rain',
            name: 'Arrow Rain',
            namePt: 'Chuva de Flechas',
            description: 'Dispara múltiplas flechas causando 2d6 cada',
            cooldown: 20000, // 20 segundos
            manaCost: 10,
            execute: executeArrowRain
        },
        passive: {
            id: 'deadly_aim',
            name: 'Mira Mortal',
            namePt: 'Mira Mortal',
            description: '+50% dano crítico',
            apply: applyDeadlyAim
        }
    },

    cleric: {
        id: 'cleric',
        name: 'Cleric',
        namePt: 'Clérigo',
        icon: '✨',
        description: 'Suporte e cura',
        hpPerLevel: 8,
        primaryStat: 'wis',
        savingThrows: ['wis', 'cha'],
        weapons: ['mace', 'shield'],
        ability: {
            id: 'mass_heal',
            name: 'Mass Heal',
            namePt: 'Cura em Área',
            description: 'Cura 3d6 + WIS mod de HP',
            cooldown: 25000, // 25 segundos
            manaCost: 15,
            execute: executeMassHeal
        },
        passive: {
            id: 'holy_aura',
            name: 'Aura Sagrada',
            namePt: 'Aura Sagrada',
            description: 'Regenera 1 HP a cada 5 segundos em combate',
            apply: applyHolyAura
        }
    }
};

/**
 * Retorna a definição de classe
 * @param {string} classId 
 * @returns {Object|null}
 */
export function getClassDefinition(classId) {
    return CLASS_DEFINITIONS[classId] || null;
}

/**
 * Retorna todas as classes disponíveis
 * @returns {Object[]}
 */
export function getAllClasses() {
    return Object.values(CLASS_DEFINITIONS);
}

// ========== EXECUÇÃO DE HABILIDADES ==========

/**
 * Usa a habilidade especial da classe
 * @returns {{success: boolean, message: string, result?: Object}}
 */
export function useClassAbility() {
    if (!gameState.player || !gameState.inCombat) {
        return { success: false, message: 'Não está em combate' };
    }

    const player = gameState.player;
    const classDef = getClassDefinition(player.class);

    if (!classDef) {
        return { success: false, message: 'Classe inválida' };
    }

    const ability = classDef.ability;

    // Verifica cooldown
    const now = Date.now();
    const lastUsed = gameState.abilityCooldowns?.[ability.id] || 0;
    const remaining = (lastUsed + ability.cooldown) - now;

    if (remaining > 0) {
        return {
            success: false,
            message: `${ability.namePt} em cooldown (${Math.ceil(remaining / 1000)}s)`
        };
    }

    // Verifica mana
    if (ability.manaCost > 0 && player.currentMana < ability.manaCost) {
        return { success: false, message: 'Mana insuficiente' };
    }

    // Executa habilidade
    const result = ability.execute(player);

    if (result.success) {
        // Gasta mana
        if (ability.manaCost > 0) {
            player.currentMana -= ability.manaCost;
        }

        // Aplica cooldown
        if (!gameState.abilityCooldowns) gameState.abilityCooldowns = {};
        gameState.abilityCooldowns[ability.id] = now;
    }

    return result;
}

/**
 * Verifica cooldown restante da habilidade de classe
 * @returns {number} segundos restantes (0 se pronta)
 */
export function getAbilityCooldownRemaining() {
    if (!gameState.player) return 0;

    const classDef = getClassDefinition(gameState.player.class);
    if (!classDef) return 0;

    const ability = classDef.ability;
    const now = Date.now();
    const lastUsed = gameState.abilityCooldowns?.[ability.id] || 0;
    const remaining = (lastUsed + ability.cooldown) - now;

    return Math.max(0, Math.ceil(remaining / 1000));
}

// ========== IMPLEMENTAÇÕES DAS HABILIDADES ==========

function executeTaunt(player) {
    // Provocação: força o monstro a atacar o jogador
    if (!gameState.currentMonster) {
        return { success: false, message: 'Nenhum monstro' };
    }

    gameState.currentMonster.taunted = true;
    gameState.currentMonster.tauntExpires = Date.now() + 5000;

    return {
        success: true,
        message: 'Monstro provocado!',
        result: { duration: 5 }
    };
}

function executeMeteor(player) {
    if (!gameState.currentMonster) {
        return { success: false, message: 'Nenhum monstro' };
    }

    const intMod = getModifier(player.int);
    const damage = rollDamage('4d6').total + intMod;

    gameState.currentMonster.currentHp -= damage;

    return {
        success: true,
        message: `Meteoro causou ${damage} de dano!`,
        result: { damage, type: 'fire' }
    };
}

function executeArrowRain(player) {
    if (!gameState.currentMonster) {
        return { success: false, message: 'Nenhum monstro' };
    }

    const dexMod = getModifier(player.dex);
    const arrows = 3; // 3 flechas
    let totalDamage = 0;

    for (let i = 0; i < arrows; i++) {
        const arrowDamage = rollDamage('2d6').total;
        totalDamage += arrowDamage;
    }

    totalDamage += dexMod;
    gameState.currentMonster.currentHp -= totalDamage;

    return {
        success: true,
        message: `Chuva de Flechas causou ${totalDamage} de dano!`,
        result: { damage: totalDamage, arrows }
    };
}

function executeMassHeal(player) {
    const wisMod = getModifier(player.wis);
    const healAmount = rollDamage('3d6').total + wisMod;

    const oldHp = player.currentHp;
    player.currentHp = Math.min(player.maxHp, player.currentHp + healAmount);
    const actualHeal = player.currentHp - oldHp;

    return {
        success: true,
        message: `Curou ${actualHeal} HP!`,
        result: { healAmount: actualHeal }
    };
}

// ========== APLICAÇÃO DE PASSIVAS ==========

/**
 * Aplica bônus passivo da classe ao cálculo
 * @param {string} context - 'ac', 'damage', 'critical', 'heal'
 * @param {number} baseValue 
 * @param {Object} options - contexto adicional
 * @returns {number} valor modificado
 */
export function applyPassiveBonus(context, baseValue, options = {}) {
    if (!gameState.player) return baseValue;

    const player = gameState.player;
    const classDef = getClassDefinition(player.class);

    if (!classDef) return baseValue;

    return classDef.passive.apply(player, context, baseValue, options);
}

function applyLastStand(player, context, baseValue, options) {
    // +2 AC quando HP < 50%
    if (context === 'ac') {
        const hpPercent = player.currentHp / player.maxHp;
        if (hpPercent < 0.5) {
            return baseValue + 2;
        }
    }
    return baseValue;
}

function applyArcanePower(player, context, baseValue, options) {
    // +20% dano mágico contra inimigos com debuff
    if (context === 'magic_damage') {
        const monster = gameState.currentMonster;
        if (monster && (monster.debuffed || monster.taunted)) {
            return Math.floor(baseValue * 1.2);
        }
    }
    return baseValue;
}

function applyDeadlyAim(player, context, baseValue, options) {
    // +50% dano crítico
    if (context === 'critical_damage') {
        return Math.floor(baseValue * 1.5);
    }
    return baseValue;
}

function applyHolyAura(player, context, baseValue, options) {
    // Regenera 1 HP a cada 5 segundos (aplicado externamente)
    // Esta passiva é aplicada via timer, não modifica valores
    return baseValue;
}

/**
 * Inicia regeneração de HP para Clérigo
 */
let holyAuraInterval = null;

export function startHolyAuraRegen() {
    if (holyAuraInterval) clearInterval(holyAuraInterval);

    if (!gameState.player || gameState.player.class !== 'cleric') return;

    holyAuraInterval = setInterval(() => {
        if (!gameState.inCombat || !gameState.player) {
            clearInterval(holyAuraInterval);
            return;
        }

        if (gameState.player.currentHp < gameState.player.maxHp) {
            gameState.player.currentHp = Math.min(
                gameState.player.maxHp,
                gameState.player.currentHp + 1
            );
        }
    }, 5000);
}

export function stopHolyAuraRegen() {
    if (holyAuraInterval) {
        clearInterval(holyAuraInterval);
        holyAuraInterval = null;
    }
}
