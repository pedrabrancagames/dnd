/**
 * Sistema GPS - Wrapper para Geolocation API
 */

/** @type {number|null} */
let watchId = null;

/** @type {GeolocationPosition|null} */
let lastPosition = null;

/** @type {Set<function>} */
const listeners = new Set();

/**
 * Opções para GPS de alta precisão (combate, mapa ativo)
 */
const highAccuracyOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
};

/**
 * Opções para GPS de baixa precisão (economia de bateria)
 */
const lowAccuracyOptions = {
    enableHighAccuracy: false,
    timeout: 30000,
    maximumAge: 60000
};

/**
 * Obtém a posição atual do jogador (uma vez)
 * @param {boolean} highAccuracy 
 * @returns {Promise<{lat: number, lng: number, accuracy: number}|null>}
 */
export function getCurrentPosition(highAccuracy = true) {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.error('Geolocalização não suportada');
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                lastPosition = position;
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                });
            },
            (error) => {
                console.error('Erro ao obter posição:', error.message);
                resolve(null);
            },
            highAccuracy ? highAccuracyOptions : lowAccuracyOptions
        );
    });
}

/**
 * Inicia monitoramento contínuo da posição
 * @param {boolean} highAccuracy 
 */
export function startWatching(highAccuracy = true) {
    if (watchId !== null) {
        stopWatching();
    }

    if (!navigator.geolocation) {
        console.error('Geolocalização não suportada');
        return;
    }

    watchId = navigator.geolocation.watchPosition(
        (position) => {
            lastPosition = position;
            const coords = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
                heading: position.coords.heading,
                speed: position.coords.speed
            };

            // Notifica todos os listeners
            listeners.forEach(callback => callback(coords));
        },
        (error) => {
            console.error('Erro no watch de posição:', error.message);
        },
        highAccuracy ? highAccuracyOptions : lowAccuracyOptions
    );
}

/**
 * Para o monitoramento de posição
 */
export function stopWatching() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
}

/**
 * Adiciona um listener para mudanças de posição
 * @param {function} callback 
 * @returns {function} unsubscribe
 */
export function onPositionChange(callback) {
    listeners.add(callback);

    // Se já temos uma posição, notifica imediatamente
    if (lastPosition) {
        callback({
            lat: lastPosition.coords.latitude,
            lng: lastPosition.coords.longitude,
            accuracy: lastPosition.coords.accuracy,
            heading: lastPosition.coords.heading,
            speed: lastPosition.coords.speed
        });
    }

    return () => listeners.delete(callback);
}

/**
 * Obtém a última posição conhecida
 * @returns {{lat: number, lng: number, accuracy: number}|null}
 */
export function getLastPosition() {
    if (!lastPosition) return null;

    return {
        lat: lastPosition.coords.latitude,
        lng: lastPosition.coords.longitude,
        accuracy: lastPosition.coords.accuracy
    };
}

/**
 * Calcula a distância entre dois pontos em metros (fórmula de Haversine)
 * @param {number} lat1 
 * @param {number} lng1 
 * @param {number} lat2 
 * @param {number} lng2 
 * @returns {number}
 */
export function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // Raio da Terra em metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Verifica se o jogador está se movendo muito rápido (possível GPS spoof)
 * @param {number} speedMps - Velocidade em metros por segundo
 * @returns {boolean}
 */
export function isSpeedSuspicious(speedMps) {
    // Mais de 50 km/h (~14 m/s) a pé é suspeito
    return speedMps > 14;
}

/**
 * Muda para modo de economia de bateria
 */
export function switchToLowPower() {
    if (watchId !== null) {
        stopWatching();
        startWatching(false);
    }
}

/**
 * Muda para modo de alta precisão
 */
export function switchToHighPrecision() {
    if (watchId !== null) {
        stopWatching();
        startWatching(true);
    }
}
