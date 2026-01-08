/**
 * Definições de Mini-Aventuras
 * Sequências de eventos que contam pequenas histórias
 */

export const ADVENTURES = {
    // ============ AVENTURAS DE INVESTIGAÇÃO ============

    'merchant_disappearance': {
        id: 'merchant_disappearance',
        type: 'investigation',
        title: 'O Desaparecimento do Mercador',
        description: 'Um mercador local desapareceu misteriosamente. Siga as pistas para descobrir o que aconteceu!',
        emoji: '🔍',
        minLevel: 1,
        campaignId: 'plague_of_orcus', // Opcional - conecta à campanha

        steps: [
            {
                type: 'explore',
                target: 'merchant_cart',
                hint: 'Procure a carroça abandonada do mercador',
                description: 'Você encontra a carroça do mercador abandonada. Há sinais de luta.',
                arObject: 'cart_model'
            },
            {
                type: 'skill_check',
                skill: 'perception',
                dc: 12,
                description: 'Você percebe rastros de sangue levando para uma direção...'
            },
            {
                type: 'explore',
                target: 'hidden_cave',
                hint: 'Siga os rastros até a caverna',
                description: 'Os rastros levam a uma caverna escondida.',
                arObject: 'cave_entrance'
            },
            {
                type: 'combat',
                monster: 'bandit',
                count: 2,
                description: 'Bandidos! Eles capturaram o mercador!'
            },
            {
                type: 'combat',
                monster: 'bandit_leader',
                isBoss: true,
                description: 'O líder dos bandidos aparece!'
            },
            {
                type: 'reward',
                description: 'Você resgatou o mercador! Ele está muito grato.',
                gold: 30
            }
        ],

        rewards: {
            xp: 200,
            gold: 50,
            item: 'ring_of_protection'
        }
    },

    'cult_investigation': {
        id: 'cult_investigation',
        type: 'investigation',
        title: 'Investigação do Culto',
        description: 'Investigue as atividades suspeitas do culto de Orcus.',
        emoji: '🔮',
        minLevel: 2,
        campaignId: 'plague_of_orcus',

        steps: [
            {
                type: 'explore',
                target: 'cult_symbol_1',
                hint: 'Encontre símbolos do culto no bairro',
                description: 'Um símbolo profano brilha no escuro...'
            },
            {
                type: 'skill_check',
                skill: 'arcana',
                dc: 14,
                description: 'Você tenta decifrar o significado do símbolo...'
            },
            {
                type: 'choice',
                description: 'Você encontra uma trilha. O que fazer?',
                options: ['Seguir a trilha', 'Voltar para avisar a guarda', 'Armar uma emboscada'],
                outcomes: {
                    0: { next: 3 },
                    1: { skip: 2, reward: { gold: 10 } },
                    2: { advantage: true, next: 3 }
                }
            },
            {
                type: 'combat',
                monster: 'cultist',
                count: 3,
                description: 'Cultistas do mal!'
            },
            {
                type: 'explore',
                target: 'cult_altar',
                description: 'Um altar profano. Aqui deve ser onde fazem seus rituais.'
            }
        ],

        rewards: {
            xp: 250,
            gold: 40
        },

        // Atualiza objetivo de campanha ao completar
        campaignObjective: 'find_cult_symbols'
    },

    // ============ AVENTURAS DE COMBATE ============

    'goblin_lair': {
        id: 'goblin_lair',
        type: 'combat_chain',
        title: 'O Covil dos Goblins',
        description: 'Limpe o covil de goblins que ameaça a região!',
        emoji: '⚔️',
        minLevel: 1,

        steps: [
            {
                type: 'combat',
                monster: 'goblin',
                count: 2,
                description: 'Guardas goblin bloqueiam a entrada!'
            },
            {
                type: 'choice',
                description: 'Você vê dois caminhos. Qual escolher?',
                options: ['Caminho principal (mais goblins)', 'Passagem secreta (armadilha?)'],
                outcomes: {
                    0: { next: 2 },
                    1: { skillCheck: { skill: 'perception', dc: 13 } }
                }
            },
            {
                type: 'combat',
                monster: 'goblin',
                count: 3,
                description: 'Mais goblins atacam!'
            },
            {
                type: 'combat',
                monster: 'goblin_shaman',
                isBoss: true,
                description: 'O Xamã Goblin invoca seus poderes!'
            },
            {
                type: 'reward',
                chest: 'goblin_treasure',
                description: 'Você encontra o tesouro roubado pelos goblins!'
            }
        ],

        rewards: {
            xp: 150,
            loot: 'goblin_loot_table'
        }
    },

    'undead_assault': {
        id: 'undead_assault',
        type: 'combat_chain',
        title: 'Assalto dos Mortos-Vivos',
        description: 'Uma horda de mortos-vivos está atacando! Defenda-se!',
        emoji: '🧟',
        minLevel: 2,
        campaignId: 'plague_of_orcus',

        steps: [
            {
                type: 'combat',
                monster: 'skeleton',
                count: 4,
                description: 'Esqueletos surgem das sombras!'
            },
            {
                type: 'combat',
                monster: 'zombie',
                count: 3,
                description: 'Zumbis emergem do chão!'
            },
            {
                type: 'skill_check',
                skill: 'athletics',
                dc: 12,
                description: 'Você precisa escalar para um terreno mais alto!'
            },
            {
                type: 'combat',
                monster: 'ghoul',
                count: 2,
                isBoss: false,
                description: 'Ghouls famintos aparecem!'
            }
        ],

        rewards: {
            xp: 200,
            gold: 30
        },

        campaignObjective: 'kill_skeletons'
    },

    // ============ AVENTURAS DE QUEBRA-CABEÇA ============

    'mage_tomb': {
        id: 'mage_tomb',
        type: 'puzzle',
        title: 'A Tumba do Mago',
        description: 'Uma tumba antiga guarda segredos e tesouros. Resolva os enigmas!',
        emoji: '🧩',
        minLevel: 3,

        steps: [
            {
                type: 'skill_check',
                skill: 'arcana',
                dc: 12,
                description: 'Runas mágicas brilham na porta. Você tenta decifrá-las...'
            },
            {
                type: 'choice',
                description: 'A porta pergunta: "Qual elemento é associado à sabedoria?"',
                options: ['Fogo 🔥', 'Água 💧', 'Ar 💨'],
                correct: 1,
                failOnWrong: false // Apenas perde HP se errar
            },
            {
                type: 'skill_check',
                skill: 'investigation',
                dc: 15,
                description: 'Você procura por armadilhas na câmara...'
            },
            {
                type: 'choice',
                description: 'Três alavancas. Qual sequência está correta?',
                options: ['Esquerda, Direita, Centro', 'Centro, Esquerda, Direita', 'Direita, Centro, Esquerda'],
                correct: 2,
                failOnWrong: true // Armadilha mortal
            },
            {
                type: 'reward',
                chest: 'ancient_treasure',
                description: 'O sarcófago se abre, revelando tesouros mágicos!'
            }
        ],

        rewards: {
            xp: 100,
            item: 'staff_of_power'
        }
    },

    'runic_door': {
        id: 'runic_door',
        type: 'puzzle',
        title: 'A Porta Rúnica',
        description: 'Uma porta mágica bloqueia o caminho. Decifre as runas para abri-la!',
        emoji: '🚪',
        minLevel: 2,

        steps: [
            {
                type: 'skill_check',
                skill: 'arcana',
                dc: 10,
                description: 'Você examina as runas mágicas...'
            },
            {
                type: 'choice',
                description: 'As runas formam uma charada: "Nasce pela manhã, morre à noite, mas retorna sempre."',
                options: ['O sol', 'A lua', 'As estrelas', 'O fogo'],
                correct: 0
            },
            {
                type: 'skill_check',
                skill: 'perception',
                dc: 12,
                description: 'Há algo escondido na porta...'
            },
            {
                type: 'reward',
                xp: 25,
                description: 'A porta se abre com um estalo mágico!'
            }
        ],

        rewards: {
            xp: 75
        }
    },

    // ============ AVENTURAS SOCIAIS ============

    'druid_alliance': {
        id: 'druid_alliance',
        type: 'social',
        title: 'O Acordo com o Druida',
        description: 'Convença o druida da floresta a ajudar contra os mortos-vivos.',
        emoji: '🌿',
        minLevel: 2,
        campaignId: 'plague_of_orcus',

        steps: [
            {
                type: 'explore',
                target: 'druid_grove',
                description: 'Você encontra o bosque sagrado do druida.'
            },
            {
                type: 'skill_check',
                skill: 'persuasion',
                dc: 12,
                description: 'O druida está desconfiado. Você tenta convencê-lo de suas boas intenções...'
            },
            {
                type: 'choice',
                description: 'O druida pede algo em troca. O que você oferece?',
                options: ['Ouro 💰', 'Proteção para a floresta 🌲', 'Uma poção mágica 🧪'],
                outcomes: {
                    0: { bonus: -1, next: 3 }, // Druida não gosta de ouro
                    1: { bonus: +2, next: 3 }, // Druida aprova
                    2: { bonus: 0, next: 3 }
                }
            },
            {
                type: 'skill_check',
                skill: 'insight',
                dc: 10,
                description: 'Você tenta entender as verdadeiras preocupações do druida...'
            }
        ],

        rewards: {
            xp: 100
        },

        outcomes: {
            success: {
                ally: 'forest_druids',
                buff: 'nature_blessing',
                worldFlag: 'druidAlly'
            },
            failure: {
                consequence: 'druids_hostile',
                worldFlag: null
            }
        }
    },

    'tavern_rumor': {
        id: 'tavern_rumor',
        type: 'social',
        title: 'Rumores na Taverna',
        description: 'Colete informações sobre o culto nas tavernas locais.',
        emoji: '🍺',
        minLevel: 1,
        campaignId: 'plague_of_orcus',

        steps: [
            {
                type: 'skill_check',
                skill: 'persuasion',
                dc: 10,
                description: 'Você tenta extrair informações dos frequentadores...'
            },
            {
                type: 'choice',
                description: 'Um bêbado parece saber de algo. Como você aborda?',
                options: ['Comprar mais bebida', 'Ameaçar', 'Fingir ser do culto'],
                outcomes: {
                    0: { cost: { gold: 5 }, bonus: 1 },
                    1: { skillCheck: { skill: 'intimidation', dc: 14 } },
                    2: { skillCheck: { skill: 'deception', dc: 16 } }
                }
            },
            {
                type: 'skill_check',
                skill: 'insight',
                dc: 11,
                description: 'Você tenta separar verdade de exagero nas histórias...'
            }
        ],

        rewards: {
            xp: 50,
            gold: 10
        },

        campaignObjective: 'find_cult_symbols'
    }
};

/**
 * Obtém aventura por ID
 */
export function getAdventureById(id) {
    return ADVENTURES[id] || null;
}

/**
 * Lista aventuras disponíveis para o nível do jogador
 */
export function getAvailableAdventures(playerLevel = 1) {
    return Object.values(ADVENTURES).filter(a => a.minLevel <= playerLevel);
}

/**
 * Lista aventuras de uma campanha específica
 */
export function getCampaignAdventures(campaignId) {
    return Object.values(ADVENTURES).filter(a => a.campaignId === campaignId);
}

/**
 * Lista aventuras por tipo
 */
export function getAdventuresByType(type) {
    return Object.values(ADVENTURES).filter(a => a.type === type);
}

/**
 * Seleciona uma aventura aleatória disponível
 */
export function getRandomAdventure(playerLevel = 1, campaignId = null) {
    let available = getAvailableAdventures(playerLevel);

    if (campaignId) {
        // Prioriza aventuras da campanha atual
        const campaignAdventures = available.filter(a => a.campaignId === campaignId);
        if (campaignAdventures.length > 0 && Math.random() < 0.7) {
            available = campaignAdventures;
        }
    }

    if (available.length === 0) return null;

    const index = Math.floor(Math.random() * available.length);
    return available[index];
}
