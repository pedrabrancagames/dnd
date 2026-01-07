/**
 * Definições de Monstros
 * Baseado no Monster Manual (PRD linhas 136-183)
 */

/**
 * @typedef {Object} Monster
 * @property {string} id - ID único
 * @property {string} name - Nome do monstro
 * @property {string} namePt - Nome em português
 * @property {number} cr - Challenge Rating
 * @property {number} hp - Hit Points
 * @property {number} ac - Armor Class
 * @property {string} damage - Dados de dano (notação D&D)
 * @property {number} xp - XP de recompensa
 * @property {string} type - Tipo de criatura
 * @property {string[]} biomes - Ambientes onde aparece
 * @property {string} emoji - Emoji representativo
 * @property {string[]} vulnerabilities - Vulnerabilidades
 * @property {string[]} resistances - Resistências
 * @property {string[]} immunities - Imunidades
 * @property {number} spawnWeight - Peso para spawn (maior = mais comum)
 */

/** @type {Monster[]} */
export const monsters = [
    // CR 0-1 (Níveis 1-3 dos jogadores)
    {
        id: 'goblin',
        name: 'Goblin',
        namePt: 'Goblin',
        cr: 0.25,
        hp: 7,
        ac: 15,
        damage: '1d6+2',
        xp: 25,
        type: 'Humanoide',
        biomes: ['urban', 'forest'],
        emoji: '👺',
        vulnerabilities: [],
        resistances: [],
        immunities: [],
        spawnWeight: 10
    },
    {
        id: 'kobold',
        name: 'Kobold',
        namePt: 'Kobold',
        cr: 0.125,
        hp: 5,
        ac: 12,
        damage: '1d4+2',
        xp: 15,
        type: 'Humanoide',
        biomes: ['ruins', 'mountain'],
        emoji: '🦎',
        vulnerabilities: [],
        resistances: [],
        immunities: [],
        spawnWeight: 12
    },
    {
        id: 'skeleton',
        name: 'Skeleton',
        namePt: 'Esqueleto',
        cr: 0.25,
        hp: 13,
        ac: 13,
        damage: '1d6+2',
        xp: 25,
        type: 'Morto-vivo',
        biomes: ['ruins'],
        emoji: '💀',
        vulnerabilities: ['bludgeoning'],
        resistances: [],
        immunities: ['poison'],
        spawnWeight: 8
    },
    {
        id: 'zombie',
        name: 'Zombie',
        namePt: 'Zumbi',
        cr: 0.25,
        hp: 22,
        ac: 8,
        damage: '1d6+1',
        xp: 25,
        type: 'Morto-vivo',
        biomes: ['ruins'],
        emoji: '🧟',
        vulnerabilities: [],
        resistances: [],
        immunities: ['poison'],
        spawnWeight: 8
    },
    {
        id: 'giant_rat',
        name: 'Giant Rat',
        namePt: 'Rato Gigante',
        cr: 0.125,
        hp: 7,
        ac: 12,
        damage: '1d4+2',
        xp: 15,
        type: 'Besta',
        biomes: ['urban'],
        emoji: '🐀',
        vulnerabilities: [],
        resistances: [],
        immunities: [],
        spawnWeight: 15
    },
    {
        id: 'wolf',
        name: 'Wolf',
        namePt: 'Lobo',
        cr: 0.25,
        hp: 11,
        ac: 13,
        damage: '2d4+2',
        xp: 25,
        type: 'Besta',
        biomes: ['forest'],
        emoji: '🐺',
        vulnerabilities: [],
        resistances: [],
        immunities: [],
        spawnWeight: 10
    },

    // CR 2-4 (Níveis 4-7 dos jogadores)
    {
        id: 'orc',
        name: 'Orc',
        namePt: 'Orc',
        cr: 0.5,
        hp: 15,
        ac: 13,
        damage: '1d12+3',
        xp: 50,
        type: 'Humanoide',
        biomes: ['mountain', 'forest'],
        emoji: '👹',
        vulnerabilities: [],
        resistances: [],
        immunities: [],
        spawnWeight: 6
    },
    {
        id: 'ogre',
        name: 'Ogre',
        namePt: 'Ogro',
        cr: 2,
        hp: 59,
        ac: 11,
        damage: '2d8+4',
        xp: 200,
        type: 'Gigante',
        biomes: ['mountain'],
        emoji: '🧌',
        vulnerabilities: [],
        resistances: [],
        immunities: [],
        spawnWeight: 3
    },
    {
        id: 'ghoul',
        name: 'Ghoul',
        namePt: 'Carniçal',
        cr: 1,
        hp: 22,
        ac: 12,
        damage: '2d6+2',
        xp: 100,
        type: 'Morto-vivo',
        biomes: ['ruins'],
        emoji: '👻',
        vulnerabilities: ['radiant'],
        resistances: [],
        immunities: ['poison'],
        spawnWeight: 5
    },
    {
        id: 'werewolf',
        name: 'Werewolf',
        namePt: 'Lobisomem',
        cr: 3,
        hp: 58,
        ac: 12,
        damage: '2d4+3',
        xp: 350,
        type: 'Metamorfo',
        biomes: ['forest'],
        emoji: '🐺',
        vulnerabilities: ['silver'],
        resistances: ['physical'],
        immunities: [],
        spawnWeight: 2
    },
    {
        id: 'owlbear',
        name: 'Owlbear',
        namePt: 'Corujurso',
        cr: 3,
        hp: 59,
        ac: 13,
        damage: '2d8+4',
        xp: 350,
        type: 'Monstruosidade',
        biomes: ['forest'],
        emoji: '🦉',
        vulnerabilities: [],
        resistances: [],
        immunities: [],
        spawnWeight: 2
    },

    // CR 5-8 (Níveis 8-12 dos jogadores) - Bosses menores
    {
        id: 'troll',
        name: 'Troll',
        namePt: 'Troll',
        cr: 5,
        hp: 84,
        ac: 15,
        damage: '2d6+4',
        xp: 900,
        type: 'Gigante',
        biomes: ['water', 'mountain'],
        emoji: '🧟‍♂️',
        vulnerabilities: ['fire', 'acid'],
        resistances: [],
        immunities: [],
        spawnWeight: 1
    },
    {
        id: 'vampire_spawn',
        name: 'Vampire Spawn',
        namePt: 'Cria Vampírica',
        cr: 5,
        hp: 82,
        ac: 15,
        damage: '2d6+3',
        xp: 900,
        type: 'Morto-vivo',
        biomes: ['ruins'],
        emoji: '🧛',
        vulnerabilities: ['radiant', 'sunlight'],
        resistances: [],
        immunities: [],
        spawnWeight: 1
    },

    // CR 9-12 (Níveis 13-16 dos jogadores) - Bosses
    {
        id: 'young_red_dragon',
        name: 'Young Red Dragon',
        namePt: 'Dragão Vermelho Jovem',
        cr: 10,
        hp: 178,
        ac: 18,
        damage: '4d10+6',
        xp: 5900,
        type: 'Dragão',
        biomes: ['mountain'],
        emoji: '🐉',
        vulnerabilities: [],
        resistances: [],
        immunities: ['fire'],
        spawnWeight: 0.1,
        isBoss: true
    },
    {
        id: 'beholder',
        name: 'Beholder',
        namePt: 'Observador',
        cr: 13,
        hp: 180,
        ac: 18,
        damage: '4d10',
        xp: 10000,
        type: 'Aberração',
        biomes: ['ruins'],
        emoji: '👁️',
        vulnerabilities: [],
        resistances: [],
        immunities: [],
        spawnWeight: 0.05,
        isBoss: true
    },

    // Mímico - Monstro especial que se disfarça de baú
    {
        id: 'mimic',
        name: 'Mimic',
        namePt: 'Mímico',
        cr: 2,
        hp: 58,
        ac: 12,
        damage: '2d8+3',
        xp: 450,
        type: 'Monstruosidade',
        biomes: ['ruins', 'urban'],
        emoji: '📦',
        vulnerabilities: [],
        resistances: [],
        immunities: ['acid'],
        spawnWeight: 0, // Não spawna naturalmente, só via armadilhas
        isSpecial: true,
        specialAbility: {
            name: 'Adhesive',
            namePt: 'Adesivo',
            description: 'Alvo grudado não pode fugir facilmente',
            effect: 'difficult_escape' // DC 13 para escapar
        },
        description: 'Uma criatura capaz de assumir a forma de objetos inanimados. Parecia um baú comum... até abrir a boca cheia de dentes.'
    }
];

/**
 * Busca monstro por ID
 * @param {string} id 
 * @returns {Monster|undefined}
 */
export function getMonsterById(id) {
    return monsters.find(m => m.id === id);
}

/**
 * Filtra monstros por bioma
 * @param {string} biome 
 * @returns {Monster[]}
 */
export function getMonstersByBiome(biome) {
    return monsters.filter(m => m.biomes.includes(biome));
}

/**
 * Filtra monstros por CR máximo
 * @param {number} maxCR 
 * @returns {Monster[]}
 */
export function getMonstersByCR(maxCR) {
    return monsters.filter(m => m.cr <= maxCR);
}

/**
 * Seleciona um monstro aleatório baseado em peso de spawn
 * @param {Monster[]} pool 
 * @returns {Monster}
 */
export function selectRandomMonster(pool) {
    const totalWeight = pool.reduce((sum, m) => sum + m.spawnWeight, 0);
    let random = Math.random() * totalWeight;

    for (const monster of pool) {
        random -= monster.spawnWeight;
        if (random <= 0) {
            return monster;
        }
    }

    return pool[0]; // Fallback
}

/**
 * Cria uma instância de monstro para combate
 * @param {Monster} template 
 * @param {string} cellId 
 * @returns {Object}
 */
export function createMonsterInstance(template, cellId) {
    return {
        id: `${template.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        templateId: template.id,
        name: template.namePt,
        emoji: template.emoji,
        maxHp: template.hp,
        currentHp: template.hp,
        ac: template.ac,
        damage: template.damage,
        xp: template.xp,
        type: template.type,
        cellId,
        spawnedAt: Date.now(),
        isBoss: template.isBoss || false
    };
}
