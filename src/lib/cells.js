/**
 * Sistema de Células GPS
 * Conforme PRD: células de ~50m x 50m
 */

// Tamanho da célula em graus (aproximadamente 50m no equador)
// 1 grau de latitude ≈ 111km, então 50m ≈ 0.00045 graus
const CELL_SIZE_LAT = 0.00045;
// Para longitude, depende da latitude, mas usamos um valor similar
const CELL_SIZE_LNG = 0.00055;

/**
 * Gera ID único de célula baseado em coordenadas
 * @param {number} lat 
 * @param {number} lng 
 * @returns {string}
 */
export function getCellId(lat, lng) {
    const cellX = Math.floor(lng / CELL_SIZE_LNG);
    const cellY = Math.floor(lat / CELL_SIZE_LAT);
    return `${cellX}_${cellY}`;
}

/**
 * Obtém o centro de uma célula
 * @param {string} cellId 
 * @returns {{lat: number, lng: number}}
 */
export function getCellCenter(cellId) {
    const [cellX, cellY] = cellId.split('_').map(Number);
    return {
        lat: (cellY + 0.5) * CELL_SIZE_LAT,
        lng: (cellX + 0.5) * CELL_SIZE_LNG
    };
}

/**
 * Obtém os limites de uma célula
 * @param {string} cellId 
 * @returns {{north: number, south: number, east: number, west: number}}
 */
export function getCellBounds(cellId) {
    const [cellX, cellY] = cellId.split('_').map(Number);
    return {
        south: cellY * CELL_SIZE_LAT,
        north: (cellY + 1) * CELL_SIZE_LAT,
        west: cellX * CELL_SIZE_LNG,
        east: (cellX + 1) * CELL_SIZE_LNG
    };
}

/**
 * Obtém células vizinhas (incluindo a célula atual)
 * @param {string} cellId 
 * @param {number} radius - Número de células ao redor (1 = 3x3, 2 = 5x5, etc)
 * @returns {string[]}
 */
export function getNearbyCells(cellId, radius = 1) {
    const [cellX, cellY] = cellId.split('_').map(Number);
    const cells = [];

    for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
            cells.push(`${cellX + dx}_${cellY + dy}`);
        }
    }

    return cells;
}

/**
 * Determina o bioma de uma célula baseado em heurísticas simples
 * Em um jogo real, isso usaria dados de mapa ou API de POIs
 * @param {string} cellId 
 * @param {number} lat 
 * @param {number} lng 
 * @returns {string}
 */
export function getCellBiome(cellId, lat, lng) {
    // Por enquanto, usa um hash simples para variar biomas
    // Em produção, usaria OSM tags ou similar
    const hash = hashCode(cellId);
    const biomes = ['urban', 'forest', 'park', 'water', 'mountain', 'ruins'];
    return biomes[Math.abs(hash) % biomes.length];
}

/**
 * Calcula nível de perigo de uma célula (1-5)
 * @param {string} cellId 
 * @param {number} playerLevel 
 * @returns {number}
 */
export function getCellDangerLevel(cellId, playerLevel) {
    const hash = hashCode(cellId);
    // Base entre 1-3, ajustado pelo nível do jogador
    const base = (Math.abs(hash) % 3) + 1;
    // Células mais distantes do spawn tendem a ser mais perigosas
    return Math.min(5, base + Math.floor(playerLevel / 5));
}

/**
 * Verifica se jogador está dentro da célula (com tolerância)
 * @param {number} playerLat 
 * @param {number} playerLng 
 * @param {string} cellId 
 * @param {number} toleranceMeters 
 * @returns {boolean}
 */
export function isPlayerInCell(playerLat, playerLng, cellId, toleranceMeters = 10) {
    const bounds = getCellBounds(cellId);

    // Converte tolerância para graus (aproximado)
    const tolLat = toleranceMeters / 111000;
    const tolLng = toleranceMeters / (111000 * Math.cos(playerLat * Math.PI / 180));

    return (
        playerLat >= bounds.south - tolLat &&
        playerLat <= bounds.north + tolLat &&
        playerLng >= bounds.west - tolLng &&
        playerLng <= bounds.east + tolLng
    );
}

/**
 * Hash simples de string para número
 * @param {string} str 
 * @returns {number}
 */
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash;
}

/**
 * Gera uma posição aleatória dentro de uma célula
 * @param {string} cellId 
 * @returns {{lat: number, lng: number}}
 */
export function getRandomPositionInCell(cellId) {
    const bounds = getCellBounds(cellId);
    return {
        lat: bounds.south + Math.random() * (bounds.north - bounds.south),
        lng: bounds.west + Math.random() * (bounds.east - bounds.west)
    };
}
