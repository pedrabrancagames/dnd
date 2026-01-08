/**
 * Admin POI Manager - Gerenciador de POIs para o DM
 * Permite adicionar, editar e remover POIs no mapa
 */

import { getLastPosition } from '../lib/gps.js';
import geofenceManager from '../lib/geofence.js';
import { renderPOIs } from './map-manager.js';

const STORAGE_KEY = 'dd_campaign_pois';

let customPOIs = [];
let editingPOIId = null;

/**
 * Inicializa o módulo de admin
 */
export function initAdminPanel() {
    // Carrega POIs salvos
    loadPOIsFromStorage();

    // Setup de eventos
    setupAdminListeners();
}

/**
 * Configura todos os listeners do painel de admin
 */
function setupAdminListeners() {
    // Botão de toggle admin
    document.getElementById('admin-toggle-btn')?.addEventListener('click', () => {
        openAdminPanel();
    });

    // Botão fechar
    document.getElementById('close-admin-btn')?.addEventListener('click', () => {
        closeAdminPanel();
    });

    // Tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            switchTab(tabId);
        });
    });

    // Usar minha localização
    document.getElementById('use-my-location-btn')?.addEventListener('click', () => {
        const pos = getLastPosition();
        if (pos) {
            document.getElementById('poi-lat').value = pos.lat.toFixed(6);
            document.getElementById('poi-lng').value = pos.lng.toFixed(6);
        } else {
            alert('Localização não disponível. Certifique-se de que o GPS está ativado.');
        }
    });

    // Formulário de POI
    document.getElementById('poi-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        savePOI();
    });

    // Auto-preencher ícone baseado no tipo
    document.getElementById('poi-type')?.addEventListener('change', (e) => {
        const iconMap = {
            'npc': '🧙',
            'clue': '🔮',
            'combat': '⚔️',
            'boss': '☠️',
            'sanctuary': '🏠'
        };
        const iconInput = document.getElementById('poi-icon');
        if (!iconInput.value || iconInput.value.length <= 2) {
            iconInput.value = iconMap[e.target.value] || '📍';
        }
    });

    // Botões de exportação
    document.getElementById('copy-json-btn')?.addEventListener('click', copyJSON);
    document.getElementById('import-json-btn')?.addEventListener('click', showImportSection);
    document.getElementById('confirm-import-btn')?.addEventListener('click', importJSON);
}

/**
 * Abre o painel de admin
 */
function openAdminPanel() {
    document.getElementById('admin-screen')?.classList.add('active');
    updatePOIsList();
    updateExportJSON();
}

/**
 * Fecha o painel de admin
 */
function closeAdminPanel() {
    document.getElementById('admin-screen')?.classList.remove('active');
    clearForm();
}

/**
 * Troca entre tabs
 */
function switchTab(tabId) {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));

    document.querySelector(`.admin-tab[data-tab="${tabId}"]`)?.classList.add('active');
    document.getElementById(`tab-${tabId}`)?.classList.add('active');

    if (tabId === 'list-pois') {
        updatePOIsList();
    } else if (tabId === 'export') {
        updateExportJSON();
    }
}

/**
 * Salva um POI (novo ou editado)
 */
function savePOI() {
    const lat = parseFloat(document.getElementById('poi-lat').value);
    const lng = parseFloat(document.getElementById('poi-lng').value);
    const name = document.getElementById('poi-name').value.trim();
    const type = document.getElementById('poi-type').value;
    const icon = document.getElementById('poi-icon').value || '📍';
    const radius = parseInt(document.getElementById('poi-radius').value) || 30;
    const description = document.getElementById('poi-description').value.trim();

    if (!lat || !lng) {
        alert('Por favor, selecione uma localização usando "Usar minha localização".');
        return;
    }

    if (!name) {
        alert('Por favor, insira um nome para o local.');
        return;
    }

    const poi = {
        id: editingPOIId || `poi_${Date.now()}`,
        name,
        type,
        icon,
        lat,
        lng,
        radius,
        description,
        chapter: 1 // Pode ser expandido depois
    };

    if (editingPOIId) {
        // Editando
        const index = customPOIs.findIndex(p => p.id === editingPOIId);
        if (index >= 0) {
            customPOIs[index] = poi;
        }
        editingPOIId = null;
    } else {
        // Novo
        customPOIs.push(poi);
    }

    savePOIsToStorage();
    reloadPOIs();
    clearForm();
    alert(`POI "${name}" salvo com sucesso!`);
}

/**
 * Edita um POI existente
 */
function editPOI(poiId) {
    const poi = customPOIs.find(p => p.id === poiId);
    if (!poi) return;

    editingPOIId = poiId;

    document.getElementById('poi-lat').value = poi.lat;
    document.getElementById('poi-lng').value = poi.lng;
    document.getElementById('poi-name').value = poi.name;
    document.getElementById('poi-type').value = poi.type;
    document.getElementById('poi-icon').value = poi.icon;
    document.getElementById('poi-radius').value = poi.radius;
    document.getElementById('poi-description').value = poi.description || '';

    switchTab('add-poi');
}

/**
 * Remove um POI
 */
function deletePOI(poiId) {
    const poi = customPOIs.find(p => p.id === poiId);
    if (!poi) return;

    if (!confirm(`Tem certeza que deseja remover "${poi.name}"?`)) {
        return;
    }

    customPOIs = customPOIs.filter(p => p.id !== poiId);
    savePOIsToStorage();
    reloadPOIs();
    updatePOIsList();
}

/**
 * Limpa o formulário
 */
function clearForm() {
    document.getElementById('poi-lat').value = '';
    document.getElementById('poi-lng').value = '';
    document.getElementById('poi-name').value = '';
    document.getElementById('poi-type').value = 'npc';
    document.getElementById('poi-icon').value = '🧙';
    document.getElementById('poi-radius').value = '30';
    document.getElementById('poi-description').value = '';
    editingPOIId = null;
}

/**
 * Atualiza a lista de POIs
 */
function updatePOIsList() {
    const container = document.getElementById('pois-list');
    if (!container) return;

    if (customPOIs.length === 0) {
        container.innerHTML = '<p class="empty-list">Nenhum POI cadastrado ainda.</p>';
        return;
    }

    container.innerHTML = customPOIs.map(poi => `
        <div class="poi-item" data-id="${poi.id}">
            <div class="poi-item-icon">${poi.icon}</div>
            <div class="poi-item-info">
                <div class="poi-item-name">${poi.name}</div>
                <div class="poi-item-type">${getTypeName(poi.type)} · ${poi.radius}m</div>
            </div>
            <div class="poi-item-actions">
                <button class="btn-edit" onclick="window.adminEditPOI('${poi.id}')">✏️</button>
                <button class="btn-delete" onclick="window.adminDeletePOI('${poi.id}')">🗑️</button>
            </div>
        </div>
    `).join('');
}

/**
 * Retorna nome legível do tipo
 */
function getTypeName(type) {
    const names = {
        'npc': 'NPC',
        'clue': 'Pista',
        'combat': 'Combate',
        'boss': 'Boss',
        'sanctuary': 'Santuário'
    };
    return names[type] || type;
}

/**
 * Atualiza o JSON de exportação
 */
function updateExportJSON() {
    const textarea = document.getElementById('export-json');
    if (textarea) {
        textarea.value = JSON.stringify(customPOIs, null, 2);
    }
}

/**
 * Copia JSON para clipboard
 */
function copyJSON() {
    const json = JSON.stringify(customPOIs, null, 2);
    navigator.clipboard.writeText(json).then(() => {
        alert('JSON copiado para a área de transferência!');
    }).catch(() => {
        alert('Erro ao copiar. Selecione o texto manualmente.');
    });
}

/**
 * Mostra seção de importação
 */
function showImportSection() {
    const section = document.getElementById('import-section');
    if (section) {
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
    }
}

/**
 * Importa POIs de JSON
 */
function importJSON() {
    const textarea = document.getElementById('import-json');
    if (!textarea) return;

    try {
        const imported = JSON.parse(textarea.value);
        if (!Array.isArray(imported)) {
            throw new Error('JSON deve ser um array de POIs');
        }

        // Valida estrutura básica
        for (const poi of imported) {
            if (!poi.id || !poi.name || !poi.lat || !poi.lng) {
                throw new Error('POI inválido: faltando id, name, lat ou lng');
            }
        }

        if (confirm(`Importar ${imported.length} POIs? Isso irá substituir os POIs atuais.`)) {
            customPOIs = imported;
            savePOIsToStorage();
            reloadPOIs();
            updatePOIsList();
            updateExportJSON();
            textarea.value = '';
            document.getElementById('import-section').style.display = 'none';
            alert('POIs importados com sucesso!');
        }
    } catch (e) {
        alert('Erro ao importar: ' + e.message);
    }
}

/**
 * Salva POIs no localStorage
 */
function savePOIsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customPOIs));
}

/**
 * Carrega POIs do localStorage
 */
function loadPOIsFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            customPOIs = JSON.parse(saved);
            console.log(`[Admin] Carregados ${customPOIs.length} POIs do localStorage`);
        }
    } catch (e) {
        console.error('[Admin] Erro ao carregar POIs:', e);
        customPOIs = [];
    }
}

/**
 * Recarrega os POIs no mapa
 */
function reloadPOIs() {
    geofenceManager.clearPOIs();
    geofenceManager.loadPOIs(customPOIs);
    // Nota: renderPOIs() precisa ser chamado após o mapa ser reinicializado
    // Por enquanto, os markers antigos permanecem, mas os novos serão adicionados
}

/**
 * Retorna os POIs customizados
 */
export function getCustomPOIs() {
    return customPOIs;
}

/**
 * Verifica se há POIs customizados salvos
 */
export function hasCustomPOIs() {
    return customPOIs.length > 0;
}

// Expõe funções para os botões inline
window.adminEditPOI = editPOI;
window.adminDeletePOI = deletePOI;
