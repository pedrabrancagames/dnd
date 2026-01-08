
/**
 * Definições das Campanhas e Pontos de Interesse (POIs)
 */

export const CAMPAIGNS = {
    'plague_of_orcus': {
        id: 'plague_of_orcus',
        name: 'A Praga de Orcus',
        description: 'Mortos-vivos estão surgindo na região. Um culto antigo tenta invocar Orcus.',
        minLevel: 1,
        pois: [
            {
                id: 'poi_start_npc',
                name: 'O Estranho Misterioso',
                type: 'npc',
                description: 'Uma figura encapuzada observa o movimento.',
                // Exemplo: Substituir por coordenadas reais do seu bairro
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
                chapter: 2
            }
        ]
    }
};

/**
 * Carrega a campanha ativa (simulação)
 */
export function getActiveCampaign() {
    // Por enquanto retorna a primeira hardcoded
    return CAMPAIGNS['plague_of_orcus'];
}

/**
 * Atualiza as coordenadas dos POIs baseadas na posição atual do jogador
 * ÚTIL PARA TESTES: Cria POIs ao redor do jogador para testar sem andar km
 */
export function generateTestPOIs(playerLat, playerLng) {
    const campanha = CAMPAIGNS['plague_of_orcus'];

    // Gera POIs a 50m, 100m, 150m de distância
    const offsets = [
        { lat: 0.00045, lng: 0 },      // ~50m Norte
        { lat: 0, lng: 0.00090 },      // ~100m Leste
        { lat: -0.00045, lng: -0.00045 } // ~70m Sudoeste
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
