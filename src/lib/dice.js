/**
 * Sistema de Rolagem de Dados D&D
 */

/**
 * Rola um dado de N lados
 * @param {number} sides - Número de lados do dado
 * @returns {number}
 */
export function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

/**
 * Rola múltiplos dados
 * @param {number} count - Quantidade de dados
 * @param {number} sides - Lados por dado
 * @returns {number[]}
 */
export function rollDice(count, sides) {
    const rolls = [];
    for (let i = 0; i < count; i++) {
        rolls.push(rollDie(sides));
    }
    return rolls;
}

/**
 * Parse e rola uma notação de dado D&D
 * @param {string} notation - Ex: "2d6+3", "1d20", "3d8-2"
 * @returns {{total: number, rolls: number[], modifier: number, natural: number|null, isCritical: boolean, isFumble: boolean}}
 */
export function roll(notation) {
    const match = notation.match(/^(\d+)?d(\d+)([+-]\d+)?$/i);

    if (!match) {
        throw new Error(`Notação de dado inválida: ${notation}`);
    }

    const count = parseInt(match[1] || '1', 10);
    const sides = parseInt(match[2], 10);
    const modifier = parseInt(match[3] || '0', 10);

    const rolls = rollDice(count, sides);
    const subtotal = rolls.reduce((sum, roll) => sum + roll, 0);
    const total = subtotal + modifier;

    // Para d20, rastreia rolagem natural para crítico/falha
    const natural = count === 1 && sides === 20 ? rolls[0] : null;
    const isCritical = natural === 20;
    const isFumble = natural === 1;

    return {
        total,
        rolls,
        modifier,
        natural,
        isCritical,
        isFumble
    };
}

/**
 * Rola um teste de ataque
 * @param {number} attackMod - Modificador de ataque
 * @param {number} targetAC - AC do alvo
 * @returns {{hit: boolean, total: number, natural: number, isCritical: boolean, isFumble: boolean}}
 */
export function rollAttack(attackMod, targetAC) {
    const result = roll('1d20');
    const total = result.total + attackMod;

    // Crítico sempre acerta, falha crítica sempre erra
    let hit = false;
    if (result.isCritical) {
        hit = true;
    } else if (result.isFumble) {
        hit = false;
    } else {
        hit = total >= targetAC;
    }

    return {
        hit,
        total,
        natural: result.natural,
        isCritical: result.isCritical,
        isFumble: result.isFumble
    };
}

/**
 * Rola dano
 * @param {string} damageNotation - Ex: "1d8+3"
 * @param {boolean} isCritical - Dobra os dados em crítico
 * @returns {{total: number, rolls: number[], baseDamage: number}}
 */
export function rollDamage(damageNotation, isCritical = false) {
    const match = damageNotation.match(/^(\d+)?d(\d+)([+-]\d+)?$/i);

    if (!match) {
        throw new Error(`Notação de dano inválida: ${damageNotation}`);
    }

    let count = parseInt(match[1] || '1', 10);
    const sides = parseInt(match[2], 10);
    const modifier = parseInt(match[3] || '0', 10);

    // Crítico dobra a quantidade de dados
    if (isCritical) {
        count *= 2;
    }

    const rolls = rollDice(count, sides);
    const baseDamage = rolls.reduce((sum, r) => sum + r, 0);
    const total = baseDamage + modifier;

    return {
        total: Math.max(0, total), // Dano mínimo de 0
        rolls,
        baseDamage
    };
}

/**
 * Rola um saving throw
 * @param {number} saveMod - Modificador do save
 * @param {number} dc - Dificuldade
 * @returns {{success: boolean, total: number, natural: number}}
 */
export function rollSave(saveMod, dc) {
    const result = roll('1d20');
    const total = result.total + saveMod;

    return {
        success: total >= dc,
        total,
        natural: result.natural
    };
}

/**
 * Calcula modificador de atributo D&D
 * @param {number} score - Valor do atributo (1-30)
 * @returns {number}
 */
export function getModifier(score) {
    return Math.floor((score - 10) / 2);
}

/**
 * Rola iniciativa
 * @param {number} dexMod - Modificador de Destreza
 * @returns {number}
 */
export function rollInitiative(dexMod) {
    return roll('1d20').total + dexMod;
}
