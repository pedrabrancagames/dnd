/**
 * Definições das Campanhas e Pontos de Interesse (POIs)
 * Estrutura completa para o sistema de campanhas
 */

export const CAMPAIGNS = {
    'plague_of_orcus': {
        id: 'plague_of_orcus',
        name: 'A Praga de Orcus',
        description: 'Mortos-vivos estão surgindo na região. Um culto antigo tenta invocar Orcus, o Príncipe Demoníaco dos Mortos-Vivos.',
        icon: '☠️',
        minLevel: 1,
        durationDays: 14,
        isActive: true,

        // Capítulos da campanha
        chapters: [
            {
                number: 1,
                name: 'Os Primeiros Sinais',
                description: 'Investigar os rumores sobre mortos-vivos na região.',
                objectives: [
                    {
                        id: 'kill_skeletons',
                        type: 'kill',
                        monsterType: 'undead',
                        description: 'Derrote esqueletos no bairro',
                        target: 10
                    },
                    {
                        id: 'find_cult_symbols',
                        type: 'find',
                        artifactId: 'cult_symbol',
                        description: 'Encontre símbolos do culto',
                        target: 3
                    },
                    {
                        id: 'talk_stranger',
                        type: 'npc',
                        npcId: 'mysterious_stranger',
                        description: 'Fale com o estranho misterioso',
                        target: 1
                    }
                ],
                rewards: {
                    xp: 100,
                    gold: 25,
                    buff: 'temple_blessing',
                    buffDuration: 300000
                },
                spawnModifiers: {
                    undead: 1.5
                }
            },
            {
                number: 2,
                name: 'O Covil dos Mortos',
                description: 'O culto está concentrado em um local específico. Hora de agir!',
                objectives: [
                    {
                        id: 'defeat_ghouls',
                        type: 'kill',
                        monsterId: 'ghoul',
                        description: 'Derrote os Ghouls guardiões',
                        target: 5
                    },
                    {
                        id: 'destroy_altar',
                        type: 'find',
                        artifactId: 'unholy_altar',
                        description: 'Destrua o altar profano',
                        target: 1
                    },
                    {
                        id: 'rescue_villager',
                        type: 'npc',
                        npcId: 'captured_villager',
                        description: 'Resgate o aldeão capturado',
                        target: 1
                    }
                ],
                rewards: {
                    xp: 200,
                    gold: 50
                },
                spawnModifiers: {
                    undead: 2
                }
            },
            {
                number: 3,
                name: 'O Confronto Final',
                description: 'Orcus tenta atravessar! Apenas você pode impedir a catástrofe.',
                objectives: [
                    {
                        id: 'defeat_lich',
                        type: 'boss',
                        bossId: 'lich',
                        description: 'Derrote o Lich que lidera o culto',
                        target: 1
                    }
                ],
                rewards: {
                    xp: 500,
                    gold: 200
                },
                spawnModifiers: {
                    undead: 3
                }
            }
        ],

        // Recompensas finais da campanha
        finalRewards: {
            xp: 1000,
            gold: 500,
            item: 'cloak_of_exorcist',
            bonuses: {
                undead_damage: 1.15
            }
        },

        // Título ao completar
        completionTitle: {
            id: 'orcus_destroyer',
            name: 'Destruidor de Orcus',
            description: 'Derrotou o culto de Orcus e salvou a região.'
        },

        // POIs da campanha
        pois: [
            {
                id: 'poi_start_npc',
                name: 'O Estranho Misterioso',
                type: 'npc',
                description: 'Uma figura encapuzada observa o movimento.',
                lat: -23.550520,
                lng: -46.633308,
                radius: 40,
                icon: '🧙',
                dialogueId: 'intro_cult',
                chapter: 1
            },
            {
                id: 'poi_clue_1',
                name: 'Símbolos Profanos',
                type: 'clue',
                description: 'Marcas estranhas desenhadas no chão.',
                lat: -23.551520,
                lng: -46.634308,
                radius: 30,
                icon: '🔮',
                arContent: 'glyph_model',
                chapter: 1
            },
            {
                id: 'poi_combat_zombies',
                name: 'Cova Rasa',
                type: 'combat',
                description: 'A terra aqui parece revirada recentemente...',
                lat: -23.552520,
                lng: -46.635308,
                radius: 35,
                icon: '🧟',
                monsterId: 'zombie',
                monsterCount: 3,
                chapter: 1
            },
            {
                id: 'poi_sanctuary',
                name: 'Templo Abandonado',
                type: 'sanctuary',
                description: 'Um templo antigo onde ainda resta poder divino.',
                lat: -23.549520,
                lng: -46.632308,
                radius: 45,
                icon: '🏛️',
                chapter: 1
            },
            {
                id: 'poi_boss_lich',
                name: 'Altar do Lich',
                type: 'boss',
                description: 'Uma aura de morte emana deste local.',
                lat: -23.553520,
                lng: -46.636308,
                radius: 50,
                icon: '☠️',
                monsterId: 'lich',
                isBoss: true,
                chapter: 3
            }
        ]
    },

    'blood_moon': {
        id: 'blood_moon',
        name: 'A Maldição da Lua de Sangue',
        description: 'Lobisomens estão atacando a região. A lua de sangue está transformando pessoas inocentes.',
        icon: '🐺',
        minLevel: 3,
        durationDays: 7,
        isActive: false,

        chapters: [
            {
                number: 1,
                name: 'Rastros na Floresta',
                description: 'Investigar os ataques de lobos estranhos.',
                objectives: [
                    {
                        id: 'kill_wolves',
                        type: 'kill',
                        monsterId: 'wolf',
                        description: 'Derrote os lobos selvagens',
                        target: 8
                    },
                    {
                        id: 'find_tracks',
                        type: 'find',
                        artifactId: 'werewolf_tracks',
                        description: 'Encontre rastros de lobisomem',
                        target: 2
                    }
                ],
                rewards: {
                    xp: 75,
                    gold: 20
                }
            },
            {
                number: 2,
                name: 'A Primeira Transformação',
                description: 'Confrontar os primeiros lobisomens.',
                objectives: [
                    {
                        id: 'defeat_werewolf',
                        type: 'kill',
                        monsterId: 'werewolf',
                        description: 'Derrote os lobisomens',
                        target: 3
                    },
                    {
                        id: 'save_villager',
                        type: 'npc',
                        npcId: 'infected_villager',
                        description: 'Salve o aldeão infectado',
                        target: 1
                    }
                ],
                rewards: {
                    xp: 150,
                    gold: 40,
                    item: 'silver_dagger'
                }
            },
            {
                number: 3,
                name: 'O Alfa',
                description: 'Confrontar o líder da matilha.',
                objectives: [
                    {
                        id: 'defeat_alpha',
                        type: 'boss',
                        bossId: 'alpha_werewolf',
                        description: 'Derrote o Alfa Lobisomem',
                        target: 1
                    }
                ],
                rewards: {
                    xp: 400,
                    gold: 150
                }
            }
        ],

        finalRewards: {
            xp: 800,
            gold: 400,
            item: 'cursed_silver_blade',
            bonuses: {
                night_vision: true,
                silver_damage: 1.25
            }
        },

        completionTitle: {
            id: 'moon_hunter',
            name: 'Caçador da Lua',
            description: 'Quebrou a maldição da lua de sangue.'
        },

        pois: [
            {
                id: 'poi_forest_entrance',
                name: 'Entrada da Floresta',
                type: 'npc',
                description: 'Um caçador experiente espera na entrada.',
                lat: -23.548520,
                lng: -46.631308,
                radius: 35,
                icon: '🏹',
                dialogueId: 'hunter_intro',
                chapter: 1
            },
            {
                id: 'poi_wolf_den',
                name: 'Covil dos Lobos',
                type: 'combat',
                description: 'Uivos ecoam deste local.',
                lat: -23.547520,
                lng: -46.630308,
                radius: 40,
                icon: '🐺',
                monsterId: 'wolf',
                monsterCount: 4,
                chapter: 1
            }
        ]
    },

    'dragon_awakening': {
        id: 'dragon_awakening',
        name: 'O Despertar do Dragão Vermelho',
        description: 'Um dragão antigo está despertando. Cultistas do dragão estão preparando seu despertar.',
        icon: '🐉',
        minLevel: 5,
        durationDays: 28,
        isActive: false,

        chapters: [
            {
                number: 1,
                name: 'Servos do Dragão',
                description: 'Kobolds estão se tornando mais agressivos.',
                objectives: [
                    {
                        id: 'clear_kobolds',
                        type: 'kill',
                        monsterId: 'kobold',
                        description: 'Elimine os Kobolds da região',
                        target: 15
                    }
                ],
                rewards: { xp: 100, gold: 30 }
            },
            {
                number: 2,
                name: 'Os Drakes',
                description: 'Drakes estão atacando viajantes.',
                objectives: [
                    {
                        id: 'defeat_drakes',
                        type: 'kill',
                        monsterId: 'drake',
                        description: 'Derrote os Drakes',
                        target: 5
                    }
                ],
                rewards: { xp: 200, gold: 60 }
            },
            {
                number: 3,
                name: 'O Jovem Dragão',
                description: 'Um dragão jovem guarda a entrada da caverna.',
                objectives: [
                    {
                        id: 'defeat_young_dragon',
                        type: 'boss',
                        bossId: 'young_red_dragon',
                        description: 'Derrote o Dragão Jovem',
                        target: 1
                    }
                ],
                rewards: { xp: 400, gold: 100, item: 'dragonscale_shield' }
            },
            {
                number: 4,
                name: 'O Despertar',
                description: 'O dragão antigo acordou!',
                objectives: [
                    {
                        id: 'defeat_ancient_dragon',
                        type: 'boss',
                        bossId: 'ancient_red_dragon',
                        description: 'Derrote o Dragão Vermelho Ancestral',
                        target: 1
                    }
                ],
                rewards: { xp: 1000, gold: 500 }
            }
        ],

        finalRewards: {
            xp: 2000,
            gold: 1000,
            item: 'red_dragon_scale',
            bonuses: {
                fire_resistance: 0.5,
                max_hp: 10
            }
        },

        completionTitle: {
            id: 'dragonslayer',
            name: 'Matador de Dragões',
            description: 'Derrotou o dragão ancestral e salvou o reino.'
        },

        pois: []
    }
};

/**
 * Carrega a campanha ativa
 */
export function getActiveCampaign() {
    return Object.values(CAMPAIGNS).find(c => c.isActive) || null;
}

/**
 * Lista campanhas disponíveis para o nível do jogador
 */
export function getAvailableCampaigns(playerLevel = 1) {
    return Object.values(CAMPAIGNS).filter(c => c.minLevel <= playerLevel);
}

/**
 * Obtém uma campanha por ID
 */
export function getCampaignById(id) {
    return CAMPAIGNS[id] || null;
}

/**
 * Atualiza as coordenadas dos POIs baseadas na posição atual do jogador
 * ÚTIL PARA TESTES: Cria POIs ao redor do jogador para testar sem andar km
 */
export function generateTestPOIs(playerLat, playerLng) {
    const campanha = getActiveCampaign();
    if (!campanha) return [];

    // Gera POIs em diferentes direções
    const offsets = [
        { lat: 0.00045, lng: 0 },        // ~50m Norte
        { lat: 0, lng: 0.00090 },        // ~100m Leste
        { lat: -0.00045, lng: -0.00045 },// ~70m Sudoeste
        { lat: 0.00060, lng: 0.00060 },  // ~90m Nordeste
        { lat: -0.00080, lng: 0 }        // ~90m Sul
    ];

    return campanha.pois.map((poi, index) => {
        const offset = offsets[index % offsets.length];
        return {
            ...poi,
            lat: playerLat + offset.lat,
            lng: playerLng + offset.lng
        };
    });
}

/**
 * Filtra POIs por capítulo
 */
export function getPOIsByChapter(campaignId, chapterNumber) {
    const campaign = CAMPAIGNS[campaignId];
    if (!campaign) return [];

    return campaign.pois.filter(poi =>
        !poi.chapter || poi.chapter <= chapterNumber
    );
}
