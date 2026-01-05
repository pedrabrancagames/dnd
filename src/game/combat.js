/**
 * Sistema de Combate
 * Implementa regras de D&D simplificadas para AR
 */

import { rollAttack, rollDamage, rollSave, getModifier } from '../lib/dice.js';
import { gameState, recordAction, isOnCooldown, damagePlayer } from './state.js';
import { getEquippedWeaponDamage } from './inventory.js';
import { getClassDefinition } from './classes.js';

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

    // Obtém dados da arma equipada
    const weaponData = getEquippedWeaponDamage();
    // Ex: { damage: '1d8', type: 'slashing', bonus: 1 }

    // Determina atributo de ataque baseado na classe/arma
    // Por simplificação: Mago uses INT, Archer uses DEX, Warrior/Cleric uses STR (unless Finesse, but keeping simple)
    let attackStat = player.strMod;
    if (player.class === 'mage') attackStat = player.intMod;
    if (player.class === 'archer') attackStat = player.dexMod; // Bows use DEX

    const attackBonus = attackStat + player.proficiencyBonus + (weaponData.bonus || 0);

    // Rola ataque
    const attackResult = rollAttack(attackBonus, monster.ac);

    let damage = 0;
    let message = '';

    if (attackResult.hit) {
        // Calcula dano
        // Constrói notação: "1d8 + STR + WeaponBonus"
        // Se houver bonusDamage (ex: Flame Tongue), adiciona depois

        let damageMod = attackStat + (weaponData.bonus || 0);
        const damageInput = `${weaponData.damage}+${damageMod}`;

        const damageRoll = rollDamage(damageInput, attackResult.isCritical);
        let totalDamage = damageRoll.total;

        // Dano extra da arma (fogo, etc)
        if (weaponData.bonusDamage) {
            const extraRoll = rollDamage(weaponData.bonusDamage, attackResult.isCritical);
            totalDamage += extraRoll.total;
            // Nota: Se o tipo for diferente, deveria calcular separado, mas por simplicidade somamos
            // Idealmente: calculateDamage para base e extra separados.
        }

        // Aplica resistências/vulnerabilidades
        const finalDamage = calculateDamage(totalDamage, weaponData.type, monster);
        damage = finalDamage.amount;

        monster.currentHp = Math.max(0, monster.currentHp - damage);

        if (attackResult.isCritical) {
            message = `CRÍTICO! ${damage} de dano (${finalDamage.typeDisplay})!`;
        } else {
            message = `Acertou! ${damage} de dano (${finalDamage.typeDisplay})`;
        }

        if (finalDamage.factor === 2) message += " (Vulnerável!)";
        if (finalDamage.factor === 0.5) message += " (Resistente!)";
        if (finalDamage.factor === 0) message += " (Imune!)";

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
 * Calcula dano considerando resistências e vulnerabilidades
 * @param {number} amount 
 * @param {string} type 
 * @param {Object} target 
 * @returns {{amount: number, factor: number, typeDisplay: string}}
 */
function calculateDamage(amount, type, target) {
    let factor = 1;

    if (target.immunities?.includes(type)) {
        factor = 0;
    } else if (target.vulnerabilities?.includes(type)) {
        factor = 2;
    } else if (target.resistances?.includes(type)) {
        factor = 0.5;
    }

    return {
        amount: Math.floor(amount * factor),
        factor,
        typeDisplay: translateDamageType(type)
    };
}

function translateDamageType(type) {
    const map = {
        slashing: 'Cortante',
        piercing: 'Perfurante',
        bludgeoning: 'Concussão',
        fire: 'Fogo',
        cold: 'Gelo',
        lightning: 'Raio',
        poison: 'Veneno',
        radiant: 'Radiante',
        necrotic: 'Necrótico'
    };
    return map[type] || type;
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

    // Monstro tem modificador baseado em seu CR se não especificado
    // Mas monsters.js tem dano fixo? "1d6+2"
    // Vamos assumir hit bonus = floor(CR * 2) + 2 se não tiver
    // Na verdade, vamos simplificar: Monster Hit Bonus ~ AC/2 - 2

    // Melhor: Criaremos um valor arbitrário baseado no CR se não existir
    const attackBonus = Math.floor(monster.cr * 2) + 3;

    const attackResult = rollAttack(attackBonus, player.ac);

    let damage = 0;
    let message = '';

    if (attackResult.hit) {
        const damageResult = rollDamage(monster.damage, attackResult.isCritical);
        damage = damageResult.total;

        // TODO: Player resistances (from Armor/Racial)
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
 * Definição de Magias
 */
const SPELLS = {
    fireBolt: {
        id: 'fireBolt',
        name: 'Fire Bolt',
        type: 'attack', // Attack Roll
        damage: '1d10',
        damageType: 'fire',
        manaCost: 0, // Cantrip
        scaleWithLevel: true // 2d10 at lvl 5, etc - TODO
    },
    magicMissile: {
        id: 'magicMissile',
        name: 'Magic Missile',
        type: 'auto', // Auto hit
        damage: '3d4+3',
        damageType: 'force',
        manaCost: 10
    },
    iceShard: {
        id: 'iceShard',
        name: 'Ice Shard',
        type: 'attack',
        damage: '1d8',
        damageType: 'cold',
        manaCost: 5
    },
    fireball: {
        id: 'fireball',
        name: 'Fireball',
        type: 'save',
        saveAttr: 'dex', // Dexterity Save
        damage: '8d6',
        damageType: 'fire',
        manaCost: 30,
        halfOnSave: true
    },
    cureWounds: {
        id: 'cureWounds',
        name: 'Cure Wounds',
        type: 'heal',
        heal: '1d8',
        manaCost: 10
    }
};

/**
 * Usa uma magia
 * @param {string} spellId 
 * @returns {Object|null}
 */
export function castSpell(spellId) {
    if (!gameState.player || !gameState.currentMonster) {
        return null; // Alguns spells podem ser usados fora de combate, mas por enquanto exige target
    }

    if (isOnCooldown()) {
        return { success: false, message: 'Aguarde o cooldown' };
    }

    const player = gameState.player;
    const monster = gameState.currentMonster;
    const spell = SPELLS[spellId];

    if (!spell) return { success: false, message: 'Magia desconhecida' };

    if (player.currentMana < spell.manaCost) {
        return { success: false, message: 'Mana insuficiente!' };
    }

    player.currentMana -= spell.manaCost;

    // Spellcasting mod (INT for Mage, WIS for Cleric)
    let spellMod = player.intMod;
    if (player.class === 'cleric') spellMod = player.wisMod;

    let result = { success: true, message: '' };

    // Lógica por tipo de magia
    if (spell.type === 'attack') {
        const attackResult = rollAttack(spellMod + player.proficiencyBonus, monster.ac);

        if (attackResult.hit) {
            const dmgRoll = rollDamage(`${spell.damage}+${spellMod}`, attackResult.isCritical);
            const final = calculateDamage(dmgRoll.total, spell.damageType, monster);

            monster.currentHp = Math.max(0, monster.currentHp - final.amount);

            result.message = `${spell.name}: ${final.amount} dano (${final.typeDisplay})`;
            if (attackResult.isCritical) result.message = `CRÍTICO! ${result.message}`;
        } else {
            result.message = `${spell.name} errou!`;
        }

    } else if (spell.type === 'auto') {
        // Auto hit (Magic Missile)
        const dmgRoll = rollDamage(spell.damage); // Usually no mod added to MM damage
        const final = calculateDamage(dmgRoll.total, spell.damageType, monster);

        monster.currentHp = Math.max(0, monster.currentHp - final.amount);
        result.message = `${spell.name}: ${final.amount} dano (Infalível)`;

    } else if (spell.type === 'save') {
        // Saving Throw
        // DC = 8 + prof + mod
        const dc = 8 + player.proficiencyBonus + spellMod;

        // Monster rolls save
        // Monster save mod?? Assuming flat Ability Mod from (10 + CR) approximation or specific
        // Simplification: Monster Save Mod = floor(CR/2)
        const monsterSaveMod = Math.floor(monster.cr / 2); // Very rough, ideally monster has stats

        const saveResult = rollSave(monsterSaveMod, dc);

        let dmgRoll = rollDamage(spell.damage);
        let finalDamage = dmgRoll.total;

        if (saveResult.success) {
            if (spell.halfOnSave) finalDamage = Math.floor(finalDamage / 2);
            else finalDamage = 0;
            result.message = `${monster.name} resistiu ao ${spell.name}! (${finalDamage} dano)`;
        } else {
            result.message = `${monster.name} falhou contra ${spell.name}! (${finalDamage} dano)`;
        }

        const final = calculateDamage(finalDamage, spell.damageType, monster);
        monster.currentHp = Math.max(0, monster.currentHp - final.amount);

    } else if (spell.type === 'heal') {
        const healRoll = rollDamage(`${spell.heal}+${spellMod}`);
        const oldHp = player.currentHp;
        player.currentHp = Math.min(player.maxHp, player.currentHp + healRoll.total);
        result.message = `Curou ${player.currentHp - oldHp} HP`;
    }

    recordAction();
    return result;
}

// Wrapper for compatibility if needed, or replace usages
export const castDamageSpell = castSpell;

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

    // TODO: Verificar inventário (consumir item)
    // Por enquanto, infinito para teste ou se tiver no inventário
    // Idealmente chamar inventory.useItem

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
