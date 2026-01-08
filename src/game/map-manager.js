
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import geofenceManager from '../lib/geofence.js';
import { getLastPosition, onPositionChange, getDistance } from '../lib/gps.js';

let map = null;
let playerMarker = null;
let poiMarkers = {};
let navigationTarget = null;
let navigationLine = null;

/**
 * Inicializa o mapa com Leaflet
 */
export function initMap() {
    const container = document.getElementById('map-container');
    if (!container) return;

    // Pega posição inicial
    const startPos = getLastPosition() || { lat: -23.5505, lng: -46.6333 }; // Default SP

    // Inicializa Leaflet
    if (!map) {
        // @ts-ignore
        map = L.map('map-container', {
            zoomControl: false,
            attributionControl: false
        }).setView([startPos.lat, startPos.lng], 18);

        // Tiles Dark Mode (CartoDB Dark Matter)
        // @ts-ignore
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 20
        }).addTo(map);

        // Marcador do Jogador
        const playerIcon = createCustomIcon('🧙‍♂️', '#4a90e2');
        // @ts-ignore
        playerMarker = L.marker([startPos.lat, startPos.lng], { icon: playerIcon }).addTo(map);

        // Círculo de alcance
        // @ts-ignore
        L.circle([startPos.lat, startPos.lng], {
            color: '#4a90e2',
            fillColor: '#4a90e2',
            fillOpacity: 0.1,
            radius: 40 // Alcance de interação
        }).addTo(map);

        // Segue o jogador
        onPositionChange(updatePlayerPosition);
    }

    // Renderiza POIs
    renderPOIs();

    // Re-renderiza quando entra/sai de geofences
    geofenceManager.onGeofenceEvent((event, poi) => {
        updatePOIMarker(poi, event === 'enter');
    });
}

/**
 * Cria ícone HTML customizado para o Leaflet
 */
function createCustomIcon(emoji, color) {
    // @ts-ignore
    return L.divIcon({
        html: `<div style="
            background-color: ${color};
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: 0 0 10px ${color};
            border: 2px solid white;
        ">${emoji}</div>`,
        className: 'custom-map-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });
}

/**
 * Atualiza posição do jogador no mapa
 */
function updatePlayerPosition(coords) {
    if (!map || !playerMarker) return;

    const newLatLng = [coords.lat, coords.lng];
    playerMarker.setLatLng(newLatLng);

    // Centraliza suavemente se estiver seguindo
    map.panTo(newLatLng, { animate: true, duration: 1 });

    // Atualiza linha de navegação se houver alvo
    if (navigationTarget) {
        updateNavigationLine(newLatLng);
    }
}

/**
 * Limpa todos os marcadores de POI do mapa
 */
export function clearPOIMarkers() {
    if (!map) return;

    // Remove marcadores
    Object.values(poiMarkers).forEach(marker => {
        map.removeLayer(marker);
    });
    poiMarkers = {};

    // Remove círculos (precisamos rastrear eles também)
    // Por simplicidade, vamos limpar todas as camadas de círculo
    map.eachLayer(layer => {
        if (layer instanceof L.Circle && layer.options.dashArray) {
            map.removeLayer(layer);
        }
    });

    console.log('[Map] Marcadores de POI limpos');
}

/**
 * Renderiza os POIs no mapa
 */
export function renderPOIs() {
    if (!map) return;

    const pois = geofenceManager.activePOIs;

    // Se não há POIs, apenas retorna
    if (pois.length === 0) {
        console.log('[Map] Nenhum POI para renderizar');
        return;
    }

    pois.forEach(poi => {
        if (poiMarkers[poi.id]) {
            return; // Já existe
        }

        const color = getPOIColor(poi.type);
        const icon = createCustomIcon(poi.icon, color);

        const marker = L.marker([poi.lat, poi.lng], { icon: icon })
            .addTo(map)
            .bindPopup(`
                <div class="poi-popup">
                    <h3>${poi.icon} ${poi.name}</h3>
                    <p>${poi.description}</p>
                    <button onclick="window.startNavigation('${poi.id}')" class="btn-nav">
                        🧭 Navegar
                    </button>
                </div>
            `);

        // Adiciona círculo da geofence
        L.circle([poi.lat, poi.lng], {
            color: color,
            fillColor: color,
            fillOpacity: 0.05,
            radius: poi.radius || 30,
            dashArray: '5, 10'
        }).addTo(map);

        poiMarkers[poi.id] = marker;
    });

    console.log(`[Map] Renderizados ${pois.length} POIs`);
}

/**
 * Define cor baseada no tipo de POI
 */
function getPOIColor(type) {
    switch (type) {
        case 'boss': return '#ff4444'; // Vermelho
        case 'combat': return '#ff8800'; // Laranja
        case 'npc': return '#00ccff'; // Azul
        case 'clue': return '#aa00ff'; // Roxo
        case 'sanctuary': return '#00ff88'; // Verde
        default: return '#ffffff';
    }
}

/**
 * Atualiza visual do marcador (ex: quando entra na área)
 */
function updatePOIMarker(poi, isInside) {
    const marker = poiMarkers[poi.id];
    if (marker) {
        if (isInside) {
            // Efeito visual de "ativo"
            marker.openPopup();
        } else {
            marker.closePopup();
        }
    }
}

/**
 * Inicia navegação para um POI
 */
window.startNavigation = (poiId) => {
    const poi = geofenceManager.activePOIs.find(p => p.id === poiId);
    if (!poi) return;

    navigationTarget = poi;
    const playerPos = getLastPosition();

    // Desenha linha
    if (playerPos) {
        updateNavigationLine([playerPos.lat, playerPos.lng]);
    }

    // Fecha popup
    map.closePopup();

    // Atualiza HUD (feedback visual)
    showNavigationHUD(poi);
};

function updateNavigationLine(playerLatLng) {
    if (!navigationTarget || !map) return;

    const targetLatLng = [navigationTarget.lat, navigationTarget.lng];

    if (navigationLine) {
        navigationLine.setLatLngs([playerLatLng, targetLatLng]);
    } else {
        // @ts-ignore
        navigationLine = L.polyline([playerLatLng, targetLatLng], {
            color: '#ffd700',
            weight: 4,
            opacity: 0.7,
            dashArray: '10, 10'
        }).addTo(map);
    }

    // Se chegou perto, remove navegação
    const dist = getDistance(playerLatLng[0], playerLatLng[1], targetLatLng[0], targetLatLng[1]);
    if (dist < (navigationTarget.radius || 30)) {
        stopNavigation();
    }
}

function stopNavigation() {
    if (navigationLine) {
        map.removeLayer(navigationLine);
        navigationLine = null;
    }
    navigationTarget = null;
    hideNavigationHUD();
}

// Helpers de HUD (deveriam estar em outro arquivo UI, mas ok por agora)
function showNavigationHUD(poi) {
    const compass = document.getElementById('compass');
    if (compass) {
        const label = compass.querySelector('.compass-label');
        if (label) label.textContent = `Indo para: ${poi.name}`;
        compass.classList.add('navigating');
    }
}

function hideNavigationHUD() {
    const compass = document.getElementById('compass');
    if (compass) {
        const label = compass.querySelector('.compass-label');
        if (label) label.textContent = 'N';
        compass.classList.remove('navigating');
    }
}
