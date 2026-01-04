/**
 * Sistema de Combate
 * Implementa regras de D&D simplificadas para AR
 */

import { rollAttack, rollDamage, getModifier } from '../lib/dice.js';
import { gameState, recordAction, isOnCooldown, damagePlayer, getClassDamage } from './state.js';

/**
 * Resultado de um ataque
 * @typedef {Object} AttackResult
 * @property {boolean} hit
 * @property {number} damage
 * @property {boolean} isCritical
 * @property {boolean} isFumble
 * @property {number} natural
 * @property {string} message
 */

/**
 * Executa um ataque do jogador contra o monstro atual
 * @returns {AttackResult|null}
 */
export function playerAttack() {
    if (!gameState.player || !gameState.currentMonster) {
        return null;
    }

    if (isOnCooldown()) {
        return null;
    }

    const player = gameState.player;
    const monster = gameState.currentMonster;

    // Rola ataque
    const attackResult = rollAttack(player.attackMod, monster.ac);

    let damage = 0;
    let message = '';

    if (attackResult.hit) {
        // Calcula dano
        const baseDamage = getClassDamage(player.class);
        const damageMod = player.class === 'mage' ? player.intMod :
            player.class === 'archer' ? player.dexMod : player.strMod;

        const damageResult = rollDamage(`${baseDamage}+${damageMod}`, attackResult.isCritical);
        damage = damageResult.total;

        // Aplica dano ao monstro
        monster.currentHp = Math.max(0, monster.currentHp - damage);

        if (attackResult.isCritical) {
            message = `CRÍTICO! ${damage} de dano!`;
        } else {
            message = `Acertou! ${damage} de dano`;
        }
    } else {
        if (attackResult.isFumble) {
            message = 'Falha crítica!';
        } else {
            message = 'Errou!';
        }
    }

    recordAction();

    return {
        hit: attackResult.hit,
        damage,
        isCritical: attackResult.isCritical,
        isFumble: attackResult.isFumble,
        natural: attackResult.natural,
        message
    };
}

/**
 * Executa um ataque do monstro contra o jogador
 * @returns {AttackResult|null}
 */
export function monsterAttack() {
    if (!gameState.player || !gameState.currentMonster) {
        return null;
    }

    const monster = gameState.currentMonster;
    const player = gameState.player;

    // Monstro tem modificador baseado em seu CR
    const monsterMod = Math.floor(monster.ac / 3);

    const attackResult = rollAttack(monsterMod, player.ac);

    let damage = 0;
    let message = '';

    if (attackResult.hit) {
        const damageResult = rollDamage(monster.damage, attackResult.isCritical);
        damage = damageResult.total;

        const died = damagePlayer(damage);

        if (attackResult.isCritical) {
            message = `${monster.name} acerta um CRÍTICO! ${damage} de dano!`;
        } else {
            message = `${monster.name} te acerta! ${damage} de dano`;
        }

        if (died) {
            message += ' Você foi derrotado!';
        }
    } else {
        message = `${monster.name} erra o ataque!`;
    }

    return {
        hit: attackResult.hit,
        damage,
        isCritical: attackResult.isCritical,
        isFumble: attackResult.isFumble,
        natural: attackResult.natural,
        message
    };
}

/**
 * Usa uma magia de dano
 * @param {string} spellId 
 * @returns {Object|null}
 */
export function castDamageSpell(spellId) {
    if (!gameState.player || !gameState.currentMonster) {
        return null;
    }

    if (isOnCooldown()) {
        return null;
    }

    const player = gameState.player;
    const monster = gameState.currentMonster;

    // Definição de magias básicas
    const spells = {
        fireBolt: { name: 'Fire Bolt', damage: '1d10', manaCost: 5, type: 'fire' },
        iceShard: { name: 'Ice Shard', damage: '1d8', manaCost: 5, type: 'ice' },
        lightning: { name: 'Lightning', damage: '2d8', manaCost: 10, type: 'lightning' }
    };

    const spell = spells[spellId];
    if (!spell) return null;

    if (player.currentMana < spell.manaCost) {
        return { success: false, message: 'Mana insuficiente!' };
    }

    player.currentMana -= spell.manaCost;

    // Magias usam INT para acertar e dano
    const attackResult = rollAttack(player.intMod + player.proficiencyBonus, monster.ac);

    let damage = 0;
    let message = '';

    if (attackResult.hit) {
        const damageResult = rollDamage(`${spell.damage}+${player.intMod}`, attackResult.isCritical);
        damage = damageResult.total;

        // Verifica vulnerabilidades
        if (monster.vulnerabilities && monster.vulnerabilities.includes(spell.type)) {
            damage *= 2;
            message = `FRAQUEZA! ${spell.name} causa ${damage} de dano!`;
        } else if (monster.immunities && monster.immunities.includes(spell.type)) {
            damage = 0;
            message = `${monster.name} é IMUNE a ${spell.type}!`;
        } else {
            message = attackResult.isCritical
                ? `CRÍTICO! ${spell.name} causa ${damage} de dano!`
                : `${spell.name} causa ${damage} de dano!`;
        }

        monster.currentHp = Math.max(0, monster.currentHp - damage);
    } else {
        message = `${spell.name} erra o alvo!`;
    }

    recordAction();

    return {
        success: true,
        hit: attackResult.hit,
        damage,
        spellType: spell.type,
        message
    };
}

/**
 * Usa poção de cura
 * @returns {Object}
 */
export function useHealingPotion() {
    if (!gameState.player) {
        return { success: false, message: 'Erro' };
    }

    if (isOnCooldown()) {
        return { success: false, message: 'Aguarde o cooldown' };
    }

    // TODO: Verificar inventário
    const healAmount = rollDamage('2d4+2', false).total;

    const oldHp = gameState.player.currentHp;
    gameState.player.currentHp = Math.min(
        gameState.player.maxHp,
        gameState.player.currentHp + healAmount
    );
    const actualHeal = gameState.player.currentHp - oldHp;

    recordAction();

    return {
        success: true,
        healAmount: actualHeal,
        message: `+${actualHeal} HP`
    };
}

/**
 * Verifica se o monstro foi derrotado
 * @returns {boolean}
 */
export function isMonsterDefeated() {
    return gameState.currentMonster && gameState.currentMonster.currentHp <= 0;
}

/**
 * Verifica se o jogador foi derrotado
 * @returns {boolean}
 */
export function isPlayerDefeated() {
    return gameState.player && gameState.player.currentHp <= 0;
}

/**
 * Tenta fugir do combate
 * @returns {{success: boolean, message: string}}
 */
export function attemptFlee() {
    if (!gameState.player || !gameState.currentMonster) {
        return { success: false, message: 'Erro' };
    }

    // 50% de chance de fugir, +5% por ponto de DEX mod
    const fleeChance = 0.5 + (gameState.player.dexMod * 0.05);
    const success = Math.random() < fleeChance;

    if (success) {
        return { success: true, message: 'Você fugiu do combate!' };
    } else {
        // Monstro ganha ataque de oportunidade
        const counterAttack = monsterAttack();
        return {
            success: false,
            message: `Falha ao fugir! ${counterAttack?.message || ''}`
        };
    }
}
