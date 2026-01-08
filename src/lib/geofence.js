
import { getDistance, onPositionChange, getLastPosition } from './gps.js';

/**
 * Gerencia zonas de interesse (POIs) e detecta entrada/saída usando GPS
 */
export class GeofenceManager {
    constructor() {
        this.activePOIs = [];
        this.enteredPOIs = new Set();
        this.listeners = [];
        this.monitoring = false;
        this.unsubscribeGPS = null;
    }

    /**
     * Carrega uma lista de POIs para monitorar
     * @param {Array} pois - Lista de objetos POI
     */
    loadPOIs(pois) {
        this.activePOIs = pois;
        console.log(`[Geofence] Carregados ${pois.length} locais de interesse.`);
        // Verifica imediatamente se já temos posição
        const lastPos = getLastPosition();
        if (lastPos) {
            this.checkGeofences(lastPos);
        }
    }

    /**
     * Adiciona um único POI para monitorar
     * @param {Object} poi 
     */
    addPOI(poi) {
        this.activePOIs.push(poi);
    }

    /**
     * Remove todos os POIs
     */
    clearPOIs() {
        this.activePOIs = [];
        this.enteredPOIs.clear();
    }

    /**
     * Inicia o monitoramento contínuo
     */
    startMonitoring() {
        if (this.monitoring) return;

        console.log('[Geofence] Iniciando monitoramento de áreas...');
        this.monitoring = true;

        // Assina as atualizações do GPS
        this.unsubscribeGPS = onPositionChange((coords) => {
            this.checkGeofences(coords);
        });
    }

    /**
     * Para o monitoramento
     */
    stopMonitoring() {
        if (!this.monitoring) return;

        if (this.unsubscribeGPS) {
            this.unsubscribeGPS();
            this.unsubscribeGPS = null;
        }
        this.monitoring = false;
        console.log('[Geofence] Monitoramento pausado.');
    }

    /**
     * Verifica a posição atual contra todas as geofences
     * @param {Object} playerCoords - { lat, lng }
     */
    checkGeofences(playerCoords) {
        if (!playerCoords || !playerCoords.lat) return;

        for (const poi of this.activePOIs) {
            // Calcula distância em metros
            const distance = getDistance(
                playerCoords.lat, playerCoords.lng,
                poi.lat, poi.lng
            );

            // Raio de ativação (padrão 30m se não especificado)
            const activationRadius = poi.radius || 30;

            // Verifica se está dentro
            const isInside = distance <= activationRadius;
            const wasInside = this.enteredPOIs.has(poi.id);

            // Evento: ENTRADA
            if (isInside && !wasInside) {
                this.enteredPOIs.add(poi.id);
                this.notifyListeners('enter', poi, distance);
                console.log(`[Geofence] Entrou em: ${poi.name} (${Math.round(distance)}m)`);
            }
            // Evento: SAÍDA
            else if (!isInside && wasInside) {
                this.enteredPOIs.delete(poi.id);
                this.notifyListeners('exit', poi, distance);
                console.log(`[Geofence] Saiu de: ${poi.name}`);
            }
            // Evento: UPDATE (ainda dentro)
            else if (isInside) {
                this.notifyListeners('inside', poi, distance);
            }
        }
    }

    /**
     * Adiciona um listener para eventos de geofence
     * @param {Function} callback - (event, poi, distance) => {}
     */
    onGeofenceEvent(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Notifica todos os listeners
     */
    notifyListeners(event, poi, distance) {
        this.listeners.forEach(cb => cb(event, poi, distance));
    }

    /**
     * Retorna os POIs ativos ordenados por distância
     */
    getPOIsByDistance() {
        const lastPos = getLastPosition();
        if (!lastPos) return this.activePOIs;

        return [...this.activePOIs].map(poi => {
            const dist = getDistance(lastPos.lat, lastPos.lng, poi.lat, poi.lng);
            return { ...poi, distance: dist };
        }).sort((a, b) => a.distance - b.distance);
    }
}

// Exporta uma instância singleton por padrão
const geofenceManager = new GeofenceManager();
export default geofenceManager;
