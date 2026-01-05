/**
 * Estado Global do Jogo
 */

import { getModifier } from '../lib/dice.js';

/**
 * @typedef {Object} GameState
 * @property {string|null} currentScreen
 * @property {Object|null} user
 * @property {Object|null} player
 * @property {Object|null} currentMonster
 * @property {boolean} inCombat
 * @property {Object|null} currentCell
 */

/** @type {GameState} */
export const gameState = {
    currentScreen: 'loading',
    user: null,
    player: null,
    currentMonster: null,
    inCombat: false,
    currentCell: null,
    nearbyMonsters: [],
    lastActionTime: 0,
    actionCooldown: 2000, // 2 segundos
    lastRestTime: { short: 0, long: 0 },
    restCooldowns: { short: 5 * 60 * 1000, long: 30 * 60 * 1000 } // 5min short, 30min long
};

/**
 * Atualiza o estado do jogador
 * @param {Object} playerData 
 */
export function setPlayer(playerData) {
    gameState.player = playerData;
    updateDerivedStats();
}

/**
 * Atualiza stats derivados do jogador
 */
export function updateDerivedStats() {
    if (!gameState.player) return;

    const p = gameState.player;

    // Calcula modificadores
    p.strMod = getModifier(p.str);
    p.dexMod = getModifier(p.dex);
    p.conMod = getModifier(p.con);
    p.intMod = getModifier(p.int);
    p.wisMod = getModifier(p.wis);
    p.chaMod = getModifier(p.cha);

    // Calcula HP máximo baseado na classe
    const classHpDice = {
        warrior: 12,
        mage: 6,
        archer: 8,
        cleric: 8
    };
    const hpDie = classHpDice[p.class] || 8;
    p.maxHp = hpDie + (p.conMod * p.level) + ((hpDie / 2 + 1) * (p.level - 1));

    // Se HP atual não definido, começa no máximo
    if (p.currentHp === undefined || p.currentHp === null) {
        p.currentHp = p.maxHp;
    }

    // Mana baseada em INT
    p.maxMana = (p.int * 2) + (p.level * 3);
    if (p.currentMana === undefined || p.currentMana === null) {
        p.currentMana = p.maxMana;
    }

    // AC base (sem armadura)
    p.ac = 10 + p.dexMod + (p.armorBonus || 0);

    // Bônus de proficiência
    p.proficiencyBonus = Math.ceil(p.level / 4) + 1;

    // Modificador de ataque baseado na classe
    if (p.class === 'mage') {
        p.attackMod = p.intMod + p.proficiencyBonus;
    } else if (p.class === 'archer') {
        p.attackMod = p.dexMod + p.proficiencyBonus;
    } else {
        p.attackMod = p.strMod + p.proficiencyBonus;
    }
}

/**
 * Verifica se uma ação está em cooldown
 * @returns {boolean}
 */
export function isOnCooldown() {
    return Date.now() - gameState.lastActionTime < gameState.actionCooldown;
}

/**
 * Registra que uma ação foi executada
 */
export function recordAction() {
    gameState.lastActionTime = Date.now();
}

/**
 * Tempo restante de cooldown em ms
 * @returns {number}
 */
export function getCooldownRemaining() {
    const elapsed = Date.now() - gameState.lastActionTime;
    return Math.max(0, gameState.actionCooldown - elapsed);
}

/**
 * Muda a tela atual
 * @param {string} screenId 
 */
export function setScreen(screenId) {
    // Esconde todas as telas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Mostra a tela desejada
    const targetScreen = document.getElementById(`${screenId}-screen`);
    if (targetScreen) {
        targetScreen.classList.add('active');
        gameState.currentScreen = screenId;
    }
}

/**
 * Inicia um combate
 * @param {Object} monster 
 */
export function startCombat(monster) {
    gameState.currentMonster = monster;
    gameState.inCombat = true;
    gameState.lastActionTime = 0; // Reseta cooldown
}

/**
 * Finaliza o combate
 */
export function endCombat() {
    gameState.currentMonster = null;
    gameState.inCombat = false;
}

/**
 * Aplica dano ao jogador
 * @param {number} damage 
 * @returns {boolean} true se jogador morreu
 */
export function damagePlayer(damage) {
    if (!gameState.player) return false;

    gameState.player.currentHp = Math.max(0, gameState.player.currentHp - damage);
    return gameState.player.currentHp <= 0;
}

/**
 * Cura o jogador
 * @param {number} amount 
 */
export function healPlayer(amount) {
    if (!gameState.player) return;

    gameState.player.currentHp = Math.min(
        gameState.player.maxHp,
        gameState.player.currentHp + amount
    );
}

/**
 * Gasta mana
 * @param {number} amount 
 * @returns {boolean} true se tinha mana suficiente
 */
export function spendMana(amount) {
    if (!gameState.player) return false;

    if (gameState.player.currentMana >= amount) {
        gameState.player.currentMana -= amount;
        return true;
    }
    return false;
}

/**
 * Adiciona XP ao jogador
 * @param {number} xp 
 * @returns {{leveledUp: boolean, newLevel: number}}
 */
export function addXP(xp) {
    if (!gameState.player) return { leveledUp: false, newLevel: 1 };

    gameState.player.xp += xp;

    // Calcula XP necessário para próximo nível
    const xpForNextLevel = gameState.player.level * 100 * 1.5;

    if (gameState.player.xp >= xpForNextLevel) {
        gameState.player.level++;
        gameState.player.xp -= xpForNextLevel;
        updateDerivedStats();
        return { leveledUp: true, newLevel: gameState.player.level };
    }

    return { leveledUp: false, newLevel: gameState.player.level };
}

/**
 * Obtém ícone da classe
 * @param {string} playerClass 
 * @returns {string}
 */
export function getClassIcon(playerClass) {
    const icons = {
        warrior: '⚔️',
        mage: '🔮',
        archer: '🏹',
        cleric: '✨'
    };
    return icons[playerClass] || '⚔️';
}

/**
 * Obtém dano base da classe
 * @param {string} playerClass 
 * @returns {string}
 */
export function getClassDamage(playerClass) {
    const damages = {
        warrior: '1d8',
        mage: '1d6',
        archer: '1d6',
        cleric: '1d6'
    };
    return damages[playerClass] || '1d6';
}

/**
 * Realiza um descanso (curto ou longo)
 * @param {'short'|'long'} type 
 * @returns {{success: boolean, message: string}}
 */
export function performRest(type) {
    if (!gameState.player) return { success: false, message: 'Jogador não encontrado' };
    if (gameState.inCombat) return { success: false, message: 'Não pode descansar em combate!' };

    const now = Date.now();
    const lastRest = gameState.lastRestTime[type] || 0;
    const cooldown = gameState.restCooldowns[type];
    const remaining = (lastRest + cooldown) - now;

    if (remaining > 0) {
        const min = Math.ceil(remaining / 60000);
        return { success: false, message: `Aguarde ${min} min para descansar novamente.` };
    }

    const player = gameState.player;
    let recoveredHp = 0;
    let recoveredMana = 0;

    if (type === 'short') {
        // Recupera 50% do HP máximo
        const healAmount = Math.floor(player.maxHp * 0.5);
        const oldHp = player.currentHp;
        player.currentHp = Math.min(player.maxHp, player.currentHp + healAmount);
        recoveredHp = player.currentHp - oldHp;

        // Short rest recupera um pouco de mana (Warlock style? Ou geral?)
        // Vamos dar 10% mana
        const manaAmount = Math.floor(player.maxMana * 0.1);
        const oldMana = player.currentMana;
        player.currentMana = Math.min(player.maxMana, player.currentMana + manaAmount);
        recoveredMana = player.currentMana - oldMana;

        gameState.lastRestTime.short = now;

    } else if (type === 'long') {
        // Recupera tudo
        const oldHp = player.currentHp;
        player.currentHp = player.maxHp;
        recoveredHp = player.currentHp - oldHp;

        const oldMana = player.currentMana;
        player.currentMana = player.maxMana;
        recoveredMana = player.currentMana - oldMana;

        gameState.lastRestTime.long = now;
        // Long rest também reseta short rest cooldown? Geralmente sim, mas vamos manter separado por simplicidade
    }

    // Salvar no DB? Idealmente sim, o loop principal deve persistir o estado periodicamente.

    return {
        success: true,
        message: `Descanso ${type === 'short' ? 'Curto' : 'Longo'} concluído. +${recoveredHp} HP, +${recoveredMana} Mana.`
    };
}
