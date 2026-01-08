/**
 * Sistema de Progresso de Campanha
 * Rastreia POIs completados e progresso geral
 */

const STORAGE_KEY = 'dd_campaign_progress';

let campaignProgress = {
    completedPOIs: [],
    startedAt: null,
    lastPlayedAt: null,
    stats: {
        combatsWon: 0,
        npcsInteracted: 0,
        cluesFound: 0,
        totalDistance: 0
    }
};

/**
 * Inicializa o sistema de progresso
 */
export function initProgress() {
    loadProgress();
    console.log('[Progress] Sistema iniciado. POIs completos:', campaignProgress.completedPOIs.length);
}

/**
 * Marca um POI como completo
 * @param {string} poiId - ID do POI
 * @param {string} type - Tipo do POI (combat, npc, clue, etc)
 */
export function completePOI(poiId, type) {
    if (isPOICompleted(poiId)) {
        console.log('[Progress] POI já está completo:', poiId);
        return false;
    }

    campaignProgress.completedPOIs.push({
        id: poiId,
        type,
        completedAt: Date.now()
    });

    // Atualiza estatísticas
    switch (type) {
        case 'combat':
        case 'boss':
            campaignProgress.stats.combatsWon++;
            break;
        case 'npc':
            campaignProgress.stats.npcsInteracted++;
            break;
        case 'clue':
            campaignProgress.stats.cluesFound++;
            break;
    }

    campaignProgress.lastPlayedAt = Date.now();

    saveProgress();
    updateProgressUI();

    console.log('[Progress] POI marcado como completo:', poiId);
    return true;
}

/**
 * Verifica se um POI foi completado
 * @param {string} poiId 
 */
export function isPOICompleted(poiId) {
    return campaignProgress.completedPOIs.some(p => p.id === poiId);
}

/**
 * Retorna lista de IDs de POIs completados
 */
export function getCompletedPOIIds() {
    return campaignProgress.completedPOIs.map(p => p.id);
}

/**
 * Calcula progresso da campanha
 * @param {number} totalPOIs - Total de POIs na campanha
 */
export function getProgressPercentage(totalPOIs) {
    if (totalPOIs === 0) return 0;
    return Math.round((campaignProgress.completedPOIs.length / totalPOIs) * 100);
}

/**
 * Retorna estatísticas de progresso
 */
export function getProgressStats() {
    return {
        completed: campaignProgress.completedPOIs.length,
        stats: campaignProgress.stats,
        startedAt: campaignProgress.startedAt,
        lastPlayedAt: campaignProgress.lastPlayedAt
    };
}

/**
 * Salva progresso no localStorage
 */
function saveProgress() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(campaignProgress));
    } catch (e) {
        console.error('[Progress] Erro ao salvar:', e);
    }
}

/**
 * Carrega progresso do localStorage
 */
function loadProgress() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            campaignProgress = JSON.parse(saved);
        } else {
            // Primeira vez jogando
            campaignProgress.startedAt = Date.now();
            saveProgress();
        }
    } catch (e) {
        console.error('[Progress] Erro ao carregar:', e);
    }
}

/**
 * Reseta todo o progresso
 */
export function resetProgress() {
    if (confirm('⚠️ Tem certeza que deseja resetar TODO o progresso da campanha?')) {
        campaignProgress = {
            completedPOIs: [],
            startedAt: Date.now(),
            lastPlayedAt: null,
            stats: {
                combatsWon: 0,
                npcsInteracted: 0,
                cluesFound: 0,
                totalDistance: 0
            }
        };
        saveProgress();
        updateProgressUI();
        console.log('[Progress] Progresso resetado!');
        return true;
    }
    return false;
}

/**
 * Atualiza a UI de progresso
 */
export function updateProgressUI() {
    const progressBar = document.getElementById('campaign-progress-bar');
    const progressText = document.getElementById('campaign-progress-text');
    const statsEl = document.getElementById('campaign-stats');

    // Conta total de POIs (precisa importar do geofenceManager)
    const totalPOIs = window.getTotalPOIs ? window.getTotalPOIs() : 0;
    const completed = campaignProgress.completedPOIs.length;
    const percentage = totalPOIs > 0 ? Math.round((completed / totalPOIs) * 100) : 0;

    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
        progressBar.setAttribute('aria-valuenow', percentage);
    }

    if (progressText) {
        progressText.textContent = `${completed}/${totalPOIs} POIs (${percentage}%)`;
    }

    if (statsEl) {
        statsEl.innerHTML = `
            <span>⚔️ ${campaignProgress.stats.combatsWon}</span>
            <span>🗣️ ${campaignProgress.stats.npcsInteracted}</span>
            <span>🔮 ${campaignProgress.stats.cluesFound}</span>
        `;
    }
}

/**
 * Função auxiliar para obter total de POIs (exposta globalmente)
 */
export function setTotalPOIsGetter(fn) {
    window.getTotalPOIs = fn;
}
