/**
 * Sistema de Magias
 */

export const SPELLS = {
    // MAGO
    fireBolt: {
        id: 'fireBolt',
        name: 'Fire Bolt',
        class: 'mage',
        level: 0,
        type: 'attack',
        damage: '1d10',
        cost: 0, // Cantrip
        description: 'Lança um raio de fogo no inimigo.'
    },
    magicMissile: {
        id: 'magicMissile',
        name: 'Magic Missile',
        class: 'mage',
        level: 1,
        type: 'damage',
        damage: '3d4+3',
        cost: 5,
        autoHit: true,
        description: '3 dardos mágicos que acertam automaticamente.'
    },
    shield: {
        id: 'shield',
        name: 'Shield',
        class: 'mage',
        level: 1,
        type: 'buff',
        effect: 'ac_bonus',
        value: 5,
        duration: 1, // 1 rodada
        cost: 5,
        reaction: true,
        description: '+5 de AC até seu próximo turno.'
    },

    // CLÉRIGO
    sacredFlame: {
        id: 'sacredFlame',
        name: 'Sacred Flame',
        class: 'cleric',
        level: 0,
        type: 'save_dex',
        damage: '1d8',
        cost: 0,
        description: 'Chama radiante que desce sobre o inimigo (Dex Save).'
    },
    cureWounds: {
        id: 'cureWounds',
        name: 'Cure Wounds',
        class: 'cleric',
        level: 1,
        type: 'heal',
        heal: '1d8', // + wis mod (calculado no uso)
        cost: 5,
        description: 'Cura um aliado tocado.'
    },
    guidingBolt: {
        id: 'guidingBolt',
        name: 'Guiding Bolt',
        class: 'cleric',
        level: 1,
        type: 'attack',
        damage: '4d6',
        effect: 'advantage_next',
        cost: 5,
        description: 'Raio de luz. Próximo ataque contra o alvo tem vantagem.'
    }
};

/**
 * Obtém magias disponíveis para uma classe
 * @param {string} playerClass
 * @returns {Array}
 */
export function getSpellsByClass(playerClass) {
    return Object.values(SPELLS).filter(spell => spell.class === playerClass);
}
