/**
 * Definição de Eventos de Exploração
 */

export const EXPLORATION_EVENTS = [
    {
        id: 'ancient_chest',
        title: 'Baú Antigo',
        description: 'Você encontra um baú de madeira podre sob pedras.',
        emoji: '📦',
        image: '/icons/items/event_chest.png',
        options: [
            {
                skill: 'athletics',
                label: 'Arrombar (Força)',
                dc: 13,
                successMsg: 'Você quebra a tranca com um golpe!',
                failMsg: 'O baú é resistente demais e você machuca a mão.'
            },
            {
                skill: 'investigation',
                label: 'Procurar mecanismo (Int)',
                dc: 10,
                successMsg: 'Você encontra um botão oculto que abre o baú.',
                failMsg: 'Você não consegue entender o mecanismo.'
            }
        ],
        success: { type: 'loot', items: ['potion_health'], xp: 20 },
        failure: { type: 'damage', value: '1d4' }
    },
    {
        id: 'magic_glyph',
        title: 'Glifo Mágico',
        description: 'Um símbolo brilhante está gravado no chão.',
        emoji: '✨',
        image: '/icons/items/event_glyph.png',
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
        success: { type: 'buff', buff: { name: 'Caçador', effect: 'attack_bonus', value: 2, duration: 300000 }, xp: 15 }, // 5 min
        failure: { type: 'nothing' }
    },
    {
        id: 'abandoned_shrine',
        title: 'Santuário Abandonado',
        description: 'Uma pequena estátua coberta de musgo.',
        emoji: '⛩️',
        image: '/icons/items/event_shrine.png',
        options: [
            {
                skill: 'religion',
                label: 'Rezar (Int)',
                dc: 12, // Usa Arcana/Int por enquanto se não tiver Religion
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
    }
];
