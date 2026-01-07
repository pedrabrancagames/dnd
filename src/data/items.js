/**
 * Definição de Itens
 * Baseado no Dungeon Master's Guide (PRD linhas 199-251)
 */

/**
 * @typedef {Object} Item
 * @property {string} id
 * @property {string} name
 * @property {string} namePt
 * @property {string} type - 'weapon', 'armor', 'accessory', 'consumable'
 * @property {string} rarity - 'common', 'uncommon', 'rare', 'epic', 'legendary'
 * @property {string} [damage] - Para armas
 * @property {number} [acBonus] - Para armaduras
 * @property {string} [effect] - Efeito especial
 * @property {number} [value] - Valor em ouro
 */

/** @type {Item[]} */
export const items = [
    // Armas Comuns
    {
        id: 'shortsword',
        name: 'Shortsword',
        namePt: 'Espada Curta',
        type: 'weapon',
        rarity: 'common',
        damage: '1d6',
        damageType: 'slashing',
        value: 10,
        modelPath: '/assets/models/weapon_shortsword.glb',
        icon: '🗡️',
        image: '/icons/items/weapon_shortsword.png'
    },
    {
        id: 'longsword',
        name: 'Longsword',
        namePt: 'Espada Longa',
        type: 'weapon',
        rarity: 'common',
        damage: '1d8',
        damageType: 'slashing',
        value: 15,
        modelPath: '/assets/models/weapon_longsword.glb',
        icon: '⚔️',
        image: '/icons/items/weapon_longsword.png'
    },
    {
        id: 'dagger',
        name: 'Dagger',
        namePt: 'Adaga',
        type: 'weapon',
        rarity: 'common',
        damage: '1d4',
        damageType: 'piercing',
        value: 2,
        modelPath: '/assets/models/weapon_dagger.glb',
        icon: '🔪',
        image: '/icons/items/weapon_dagger.png'
    },
    {
        id: 'shortbow',
        name: 'Shortbow',
        namePt: 'Arco Curto',
        type: 'weapon',
        rarity: 'common',
        damage: '1d6',
        damageType: 'piercing',
        value: 25,
        modelPath: '/assets/models/weapon_bow.glb',
        icon: '🏹',
        image: '/icons/items/weapon_bow.png'
    },
    {
        id: 'staff',
        name: 'Quarterstaff',
        namePt: 'Cajado',
        type: 'weapon',
        rarity: 'common',
        damage: '1d6',
        damageType: 'bludgeoning',
        value: 5,
        modelPath: '/assets/models/weapon_staff.glb',
        icon: '🦯',
        image: '/icons/items/weapon_staff.png'
    },
    {
        id: 'mace',
        name: 'Mace',
        namePt: 'Maça',
        type: 'weapon',
        rarity: 'common',
        damage: '1d6',
        damageType: 'bludgeoning',
        value: 5,
        modelPath: '/assets/models/weapon_mace.glb',
        icon: '🔨',
        image: '/icons/items/weapon_mace.png'
    },

    // Armas Mágicas
    {
        id: 'longsword_plus1',
        name: 'Longsword +1',
        namePt: 'Espada Longa +1',
        type: 'weapon',
        rarity: 'uncommon',
        damage: '1d8+1',
        damageType: 'slashing',
        attackBonus: 1,
        value: 500,
        modelPath: '/assets/models/weapon_longsword.glb',
        icon: '⚔️✨',
        image: '/icons/items/weapon_longsword_plus1.png'
    },
    {
        id: 'flame_tongue',
        name: 'Flame Tongue',
        namePt: 'Língua de Chama',
        type: 'weapon',
        rarity: 'rare',
        damage: '1d8',
        bonusDamage: '2d6',
        bonusDamageType: 'fire',
        damageType: 'slashing',
        effect: 'Adiciona 2d6 de dano de fogo',
        value: 5000,
        modelPath: '/assets/models/weapon_longsword.glb',
        icon: '🔥',
        image: '/icons/items/weapon_flame_tongue.png'
    },
    {
        id: 'sunblade',
        name: 'Sunblade',
        namePt: 'Lâmina Solar',
        type: 'weapon',
        rarity: 'rare',
        damage: '1d8+2',
        bonusDamage: '2d6',
        bonusDamageType: 'radiant',
        damageType: 'radiant',
        effect: '+2d6 radiante contra mortos-vivos',
        attackBonus: 2,
        value: 8000,
        modelPath: '/assets/models/weapon_longsword.glb',
        icon: '☀️',
        image: '/icons/items/weapon_sunblade.png'
    },

    // Armaduras
    {
        id: 'leather_armor',
        name: 'Leather Armor',
        namePt: 'Armadura de Couro',
        type: 'armor',
        rarity: 'common',
        acBonus: 1,
        value: 10,
        icon: '🧥',
        image: '/icons/items/armor_leather.png'
    },
    {
        id: 'chain_mail',
        name: 'Chain Mail',
        namePt: 'Cota de Malha',
        type: 'armor',
        rarity: 'common',
        acBonus: 4,
        value: 75,
        icon: '⛓️',
        image: '/icons/items/armor_chain.png'
    },
    {
        id: 'plate_armor',
        name: 'Plate Armor',
        namePt: 'Armadura de Placas',
        type: 'armor',
        rarity: 'uncommon',
        acBonus: 6,
        value: 1500,
        icon: '🛡️',
        image: '/icons/items/armor_plate.png'
    },
    {
        id: 'armor_plus1',
        name: 'Armor +1',
        namePt: 'Armadura +1',
        type: 'armor',
        rarity: 'rare',
        acBonus: 5,
        effect: 'Armadura mágica',
        value: 4000,
        icon: '🛡️✨',
        image: '/icons/items/armor_plus1.png'
    },

    // Escudos
    {
        id: 'shield',
        name: 'Shield',
        namePt: 'Escudo',
        type: 'armor',
        slot: 'offhand',
        rarity: 'common',
        acBonus: 2,
        value: 10,
        modelPath: '/assets/models/shield_basic.glb',
        icon: '🛡️',
        image: '/icons/items/armor_shield.png'
    },

    // Acessórios
    {
        id: 'ring_protection',
        name: 'Ring of Protection',
        namePt: 'Anel de Proteção',
        type: 'accessory',
        rarity: 'rare',
        acBonus: 1,
        effect: '+1 AC e Saving Throws',
        value: 3500,
        icon: '💍',
        image: '/icons/items/acc_ring.png'
    },
    {
        id: 'cloak_protection',
        name: 'Cloak of Protection',
        namePt: 'Manto de Proteção',
        type: 'accessory',
        rarity: 'uncommon',
        acBonus: 1,
        effect: '+1 AC e Saving Throws',
        value: 1500,
        icon: '🧥',
        image: '/icons/items/acc_cloak.png'
    },
    {
        id: 'boots_speed',
        name: 'Boots of Speed',
        namePt: 'Botas de Velocidade',
        type: 'accessory',
        rarity: 'rare',
        effect: 'Dobra velocidade',
        value: 4000,
        icon: '👢',
        image: '/icons/items/acc_boots.png'
    },
    {
        id: 'gauntlets_ogre',
        name: 'Gauntlets of Ogre Power',
        namePt: 'Manoplas de Força de Ogro',
        type: 'accessory',
        rarity: 'uncommon',
        effect: 'STR vira 19',
        setStr: 19,
        value: 2000,
        icon: '🥊',
        image: '/icons/items/acc_gauntlets.png'
    },

    // Consumíveis
    {
        id: 'potion_healing',
        name: 'Potion of Healing',
        namePt: 'Poção de Cura',
        type: 'consumable',
        rarity: 'common',
        effect: 'Cura 2d4+2 HP',
        healDice: '2d4+2',
        value: 50,
        icon: '🍷',
        image: '/icons/items/potion_healing.png'
    },
    {
        id: 'potion_healing_greater',
        name: 'Potion of Greater Healing',
        namePt: 'Poção de Cura Maior',
        type: 'consumable',
        rarity: 'uncommon',
        effect: 'Cura 4d4+4 HP',
        healDice: '4d4+4',
        value: 200,
        icon: '⚗️',
        image: '/icons/items/potion_greater.png'
    },
    {
        id: 'potion_healing_superior',
        name: 'Potion of Superior Healing',
        namePt: 'Poção de Cura Superior',
        type: 'consumable',
        rarity: 'rare',
        effect: 'Cura 8d4+8 HP',
        healDice: '8d4+8',
        value: 500,
        icon: '🧪',
        image: '/icons/items/potion_superior.png'
    },
    {
        id: 'potion_heroism',
        name: 'Potion of Heroism',
        namePt: 'Poção de Heroísmo',
        type: 'consumable',
        rarity: 'rare',
        effect: '10 HP temporário + vantagem em saves',
        tempHp: 10,
        value: 300,
        icon: '🍺',
        image: '/icons/items/potion_heroism.png'
    },
    {
        id: 'scroll_fireball',
        name: 'Scroll of Fireball',
        namePt: 'Pergaminho de Bola de Fogo',
        type: 'consumable',
        rarity: 'rare',
        effect: 'Conjura Fireball (8d6 fogo)',
        spellDamage: '8d6',
        spellType: 'fire',
        value: 400,
        icon: '📜',
        image: '/icons/items/scroll_fire.png'
    }
];

/**
 * Tabela de loot por raridade de monstro
 */
export const lootTables = {
    common: [
        { itemId: 'potion_healing', weight: 30 },
        { itemId: 'dagger', weight: 20 },
        { itemId: 'leather_armor', weight: 10 },
        { gold: { min: 1, max: 10 }, weight: 40 }
    ],
    uncommon: [
        { itemId: 'potion_healing', weight: 25 },
        { itemId: 'potion_healing_greater', weight: 10 },
        { itemId: 'longsword', weight: 15 },
        { itemId: 'chain_mail', weight: 10 },
        { gold: { min: 10, max: 50 }, weight: 40 }
    ],
    rare: [
        { itemId: 'potion_healing_greater', weight: 20 },
        { itemId: 'longsword_plus1', weight: 10 },
        { itemId: 'cloak_protection', weight: 5 },
        { gold: { min: 50, max: 200 }, weight: 65 }
    ],
    boss: [
        { itemId: 'potion_healing_superior', weight: 20 },
        { itemId: 'flame_tongue', weight: 5 },
        { itemId: 'sunblade', weight: 3 },
        { itemId: 'ring_protection', weight: 7 },
        { gold: { min: 200, max: 1000 }, weight: 65 }
    ]
};

/**
 * Busca item por ID
 * @param {string} id 
 * @returns {Item|undefined}
 */
export function getItemById(id) {
    return items.find(i => i.id === id);
}

/**
 * Filtra itens por tipo
 * @param {string} type 
 * @returns {Item[]}
 */
export function getItemsByType(type) {
    return items.filter(i => i.type === type);
}

/**
 * Gera loot aleatório
 * @param {string} tableKey - 'common', 'uncommon', 'rare', 'boss'
 * @returns {Object[]}
 */
export function generateLoot(tableKey) {
    const table = lootTables[tableKey] || lootTables.common;
    const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);

    const loot = [];

    // Rola 1-3 itens
    const rolls = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < rolls; i++) {
        let random = Math.random() * totalWeight;

        for (const entry of table) {
            random -= entry.weight;
            if (random <= 0) {
                if (entry.itemId) {
                    loot.push({
                        type: 'item',
                        item: getItemById(entry.itemId)
                    });
                } else if (entry.gold) {
                    const amount = Math.floor(
                        Math.random() * (entry.gold.max - entry.gold.min + 1)
                    ) + entry.gold.min;
                    loot.push({
                        type: 'gold',
                        amount
                    });
                }
                break;
            }
        }
    }

    return loot;
}

/**
 * Obtém cor CSS para raridade
 * @param {string} rarity 
 * @returns {string}
 */
export function getRarityColor(rarity) {
    const colors = {
        common: 'var(--rarity-common)',
        uncommon: 'var(--rarity-uncommon)',
        rare: 'var(--rarity-rare)',
        epic: 'var(--rarity-epic)',
        legendary: 'var(--rarity-legendary)'
    };
    return colors[rarity] || colors.common;
}
