/**
 * Definição de Eventos de Exploração
 * Inclui sistema de armadilhas, detecção de perigo e mímicos
 */

/**
 * Tipos de armadilhas que podem aparecer em baús
 */
export const TRAP_CONFIG = {
    none: { weight: 60, minLevel: 1 },
    needle_trap: { weight: 15, minLevel: 1 },
    poison_dart: { weight: 12, minLevel: 2 },
    fire_trap: { weight: 8, minLevel: 3 },
    curse_trap: { weight: 5, minLevel: 5 },
    mimic: { weight: 5, minLevel: 4 }
};

export const EXPLORATION_EVENTS = [
    // ========== BAÚS COM SISTEMA DE ARMADILHAS ==========
    {
        id: 'ancient_chest',
        title: 'Baú Antigo',
        description: 'Você encontra um baú de madeira podre sob pedras.',
        emoji: '📦',
        image: '/icons/items/event_chest.png',
        category: 'chest',
        canBeTrapped: true,
        trapChance: 0.4, // 40% chance de armadilha
        model3d: 'chest',
        options: [
            {
                skill: 'athletics',
                label: 'Arrombar (Força)',
                dc: 13,
                successMsg: 'Você quebra a tranca com um golpe!',
                failMsg: 'O baú é resistente demais e você machuca a mão.',
                triggersTrap: true // Arrombando ativa armadilha se houver
            },
            {
                skill: 'investigation',
                label: 'Procurar mecanismo (Int)',
                dc: 10,
                successMsg: 'Você encontra um botão oculto que abre o baú.',
                failMsg: 'Você não consegue entender o mecanismo.',
                triggersTrap: false // Cuidadoso, não ativa
            },
            {
                skill: 'insight',
                label: '👁️ Examinar (Sab)',
                dc: 0, // DC varia com a armadilha
                isDetection: true, // Opção especial de detecção
                successMsg: 'Você detecta algo suspeito!',
                failMsg: 'Parece seguro...'
            }
        ],
        success: { type: 'loot', items: ['potion_healing'], xp: 20 },
        failure: { type: 'damage', value: '1d4' }
    },
    {
        id: 'ornate_chest',
        title: 'Baú Ornamentado',
        description: 'Um baú decorado com joias e símbolos arcanos. Parece valioso.',
        emoji: '💎',
        image: '/icons/items/event_chest_ornate.png',
        category: 'chest',
        canBeTrapped: true,
        trapChance: 0.6, // Maior chance por ser mais valioso
        model3d: 'chest_ornate',
        options: [
            {
                skill: 'athletics',
                label: 'Forçar (Força)',
                dc: 15,
                successMsg: 'Você consegue abrir com força bruta!',
                failMsg: 'O baú é muito resistente.',
                triggersTrap: true
            },
            {
                skill: 'investigation',
                label: 'Desarmar tranca (Int)',
                dc: 12,
                successMsg: 'Você destrava o mecanismo com habilidade.',
                failMsg: 'O mecanismo é muito complexo.',
                triggersTrap: false,
                canDisarmTrap: true // Pode desarmar armadilha no processo
            },
            {
                skill: 'insight',
                label: '👁️ Examinar (Sab)',
                dc: 0,
                isDetection: true,
                successMsg: 'Seus instintos alertam para algo errado!',
                failMsg: 'Você não nota nada de anormal.'
            }
        ],
        success: { type: 'loot', items: ['potion_healing_greater'], gold: { min: 20, max: 50 }, xp: 40 },
        failure: { type: 'damage', value: '1d6' }
    },
    {
        id: 'suspicious_chest',
        title: 'Baú Suspeito',
        description: 'Um baú isolado em um canto escuro. Algo parece errado...',
        emoji: '⚠️',
        image: '/icons/items/event_chest_suspicious.png',
        category: 'chest',
        canBeTrapped: true,
        trapChance: 0.8, // Alta chance de armadilha
        mimicChance: 0.3, // 30% chance de ser mímico se tiver armadilha
        model3d: 'chest_suspicious',
        options: [
            {
                skill: 'athletics',
                label: 'Abrir rapidamente (Força)',
                dc: 12,
                successMsg: 'Você abre antes que algo aconteça!',
                failMsg: 'Você hesita e algo dispara!',
                triggersTrap: true
            },
            {
                skill: 'perception',
                label: 'Observar de longe (Sab)',
                dc: 14,
                successMsg: 'Você nota um fio quase invisível...',
                failMsg: 'Parece um baú normal.',
                canRevealTrap: true
            },
            {
                skill: 'insight',
                label: '👁️ Sentir perigo (Sab)',
                dc: 0,
                isDetection: true,
                successMsg: 'Seu sexto sentido grita: PERIGO!',
                failMsg: 'Seus instintos não detectam nada.'
            }
        ],
        success: { type: 'loot', items: ['longsword_plus1'], gold: { min: 50, max: 100 }, xp: 60 },
        failure: { type: 'damage', value: '2d6' }
    },

    // ========== EVENTOS NORMAIS ==========
    {
        id: 'magic_glyph',
        title: 'Glifo Mágico',
        description: 'Um símbolo brilhante está gravado no chão.',
        emoji: '✨',
        image: '/icons/items/event_glyph.png',
        category: 'magic',
        model3d: 'glyph',
        options: [
            {
                skill: 'arcana',
                label: 'Absorver Energia (Int)',
                dc: 12,
                successMsg: 'Você canaliza a energia do glifo para recuperar poder.',
                failMsg: 'A energia é instável e explode em seu rosto!'
            },
            {
                skill: 'perception',
                label: 'Observar (Sab)',
                dc: 10,
                successMsg: 'Você percebe que é seguro apenas passar por perto.',
                failMsg: 'Você toca sem querer e ativa uma armadilha.'
            }
        ],
        success: { type: 'mana', value: 20, xp: 25 },
        failure: { type: 'damage', value: '1d6', damageType: 'force' }
    },
    {
        id: 'monster_tracks',
        title: 'Rastros Recentes',
        description: 'Pegadas frescas indicam que algo passou por aqui.',
        emoji: '🐾',
        image: '/icons/items/event_tracks.png',
        category: 'exploration',
        model3d: 'tracks',
        options: [
            {
                skill: 'survival',
                label: 'Rastrear (Sab)',
                dc: 11,
                successMsg: 'Você identifica o padrão de movimento da presa.',
                failMsg: 'Os rastros se confundem e você perde o rastro.'
            },
            {
                skill: 'investigation',
                label: 'Analisar (Int)',
                dc: 13,
                successMsg: 'Pelo peso e profundidade, você sabe onde atacar.',
                failMsg: 'Você não tira nenhuma conclusão útil.'
            }
        ],
        success: { type: 'buff', buff: { name: 'Caçador', effect: 'attack_bonus', value: 2, duration: 300000 }, xp: 15 },
        failure: { type: 'nothing' }
    },
    {
        id: 'abandoned_shrine',
        title: 'Santuário Abandonado',
        description: 'Uma pequena estátua coberta de musgo.',
        emoji: '⛩️',
        image: '/icons/items/event_shrine.png',
        category: 'sacred',
        model3d: 'shrine',
        options: [
            {
                skill: 'religion',
                label: 'Rezar (Int)',
                dc: 12,
                altSkill: 'arcana',
                successMsg: 'Uma luz calorosa envolve você.',
                failMsg: 'Nada acontece.'
            },
            {
                skill: 'insight',
                label: 'Meditar (Sab)',
                dc: 10,
                successMsg: 'Você sente sua mente clarear.',
                failMsg: 'Você não consegue se concentrar.'
            }
        ],
        success: { type: 'heal_all', xp: 50 },
        failure: { type: 'nothing' }
    },

    // ========== NOVOS EVENTOS ==========
    {
        id: 'mysterious_potion',
        title: 'Poção Misteriosa',
        description: 'Um frasco com líquido brilhante foi deixado aqui. Quem o perdeu?',
        emoji: '🧪',
        image: '/icons/items/event_potion.png',
        category: 'item',
        model3d: 'potion',
        requiresIdentification: true, // Item precisa ser identificado
        options: [
            {
                skill: 'arcana',
                label: 'Identificar (Int)',
                dc: 12,
                successMsg: 'Você identifica a poção!',
                failMsg: 'O líquido é muito estranho para você decifrar.'
            },
            {
                skill: 'perception',
                label: 'Cheirar (Sab)',
                dc: 14,
                successMsg: 'Pelo cheiro, você deduz os ingredientes.',
                failMsg: 'O cheiro não te diz nada.'
            },
            {
                skill: 'none',
                label: '🎲 Beber sem identificar',
                dc: 0,
                isRisky: true,
                successMsg: 'Você bebe... e algo acontece!',
                failMsg: 'Você bebe... e algo acontece!'
            }
        ],
        success: { type: 'loot', items: ['potion_healing_greater'], xp: 30 },
        failure: { type: 'random_potion_effect' }, // Efeito aleatório
        riskyOutcomes: [
            { type: 'heal', value: 20, weight: 30, message: 'A poção te cura!' },
            { type: 'damage', value: '2d6', damageType: 'poison', weight: 25, message: 'É veneno!' },
            { type: 'buff', buff: { name: 'Força', effect: 'str_bonus', value: 2 }, duration: 120000, weight: 20, message: 'Você se sente mais forte!' },
            { type: 'mana', value: 30, weight: 15, message: 'Energia mágica flui por você!' },
            { type: 'hallucination', weight: 10, message: 'Cores estranhas... tudo gira...' }
        ]
    },
    {
        id: 'fallen_adventurer',
        title: 'Aventureiro Caído',
        description: 'O corpo de um aventureiro menos sortudo. Seus pertences ainda estão aqui.',
        emoji: '💀',
        image: '/icons/items/event_corpse.png',
        category: 'exploration',
        canBeTrapped: true,
        trapChance: 0.2, // Pode ter armadilha no corpo
        model3d: 'corpse',
        options: [
            {
                skill: 'investigation',
                label: 'Revistar (Int)',
                dc: 10,
                successMsg: 'Você encontra itens úteis!',
                failMsg: 'Não há nada de valor.',
                triggersTrap: false
            },
            {
                skill: 'medicine',
                label: 'Examinar causa (Sab)',
                dc: 12,
                altSkill: 'insight',
                successMsg: 'Você entende o que o matou e aprende com isso.',
                failMsg: 'A causa da morte não é clara.'
            },
            {
                skill: 'insight',
                label: '👁️ Sentir presença (Sab)',
                dc: 0,
                isDetection: true,
                successMsg: 'Você sente que não está sozinho...',
                failMsg: 'Parece seguro.'
            }
        ],
        success: {
            type: 'loot',
            items: ['potion_healing'],
            gold: { min: 10, max: 30 },
            randomItem: true, // Pode dropar item aleatório
            xp: 25
        },
        failure: { type: 'nothing' }
    }
];

/**
 * Obtém um evento aleatório
 * @param {string} category - Categoria opcional para filtrar
 * @returns {Object} Evento selecionado
 */
export function getRandomEvent(category = null) {
    let pool = EXPLORATION_EVENTS;

    if (category) {
        pool = pool.filter(e => e.category === category);
    }

    if (pool.length === 0) pool = EXPLORATION_EVENTS;

    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Obtém evento por ID
 * @param {string} id 
 * @returns {Object|undefined}
 */
export function getEventById(id) {
    return EXPLORATION_EVENTS.find(e => e.id === id);
}
