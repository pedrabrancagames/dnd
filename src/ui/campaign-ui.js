/**
 * Campaign UI Module
 * Gerencia a interface de campanha e aventuras
 */

import '../styles/campaign-ui.css';
import {
    getCurrentCampaign,
    getCurrentChapter,
    getChapterObjectives,
    getCampaignProgress,
    getCampaignUIData
} from '../game/campaign-manager.js';
import {
    getCurrentAdventure,
    getAdventureUIData,
    makeChoice,
    performSkillCheck,
    advanceStep,
    cancelAdventure,
    hasActiveAdventure
} from '../game/adventure-runner.js';
import { getWorldStateUIData } from '../game/world-state.js';

// Callback para navegação
let setScreenFromModule = (screen) => {
    console.warn('setScreenFromModule não configurado');
};
let goToMapCallback = null;

/**
 * Configura callbacks de navegação
 */
export function setCampaignUINavigation(setScreen, goToMap) {
    setScreenFromModule = setScreen;
    goToMapCallback = goToMap;
}

/**
 * Inicializa a UI de campanha
 */
export function initCampaignUI() {
    // Cria elementos se não existirem
    createCampaignPanel();
    createAdventurePanel();
    createCampaignFAB();

    // Listeners de eventos
    window.addEventListener('campaign:chapter-started', onChapterStarted);
    window.addEventListener('campaign:completed', onCampaignCompleted);
    window.addEventListener('adventure:step', onAdventureStep);
    window.addEventListener('adventure:completed', onAdventureCompleted);

    console.log('[CampaignUI] Inicializado');
}

/**
 * Cria o painel de campanha
 */
function createCampaignPanel() {
    if (document.getElementById('campaign-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'campaign-panel';
    panel.className = 'campaign-panel';
    panel.innerHTML = `
        <div class="campaign-header">
            <button class="close-btn" id="close-campaign-btn">×</button>
            <h2>
                <span class="campaign-icon">📜</span>
                <span id="campaign-name">Carregando...</span>
            </h2>
            <p class="campaign-description" id="campaign-desc"></p>
            <div class="campaign-progress-bar">
                <div class="campaign-progress-fill" id="campaign-progress-fill" style="width: 0%"></div>
                <span class="campaign-progress-text" id="campaign-progress-text">0%</span>
            </div>
        </div>

        <div class="chapter-section">
            <div class="chapter-card">
                <h3 class="chapter-title">
                    <span class="chapter-number" id="chapter-number">1</span>
                    <span id="chapter-name">Carregando...</span>
                </h3>
                <p class="chapter-description" id="chapter-desc"></p>

                <div class="objectives-list" id="objectives-list">
                    <!-- Objetivos serão inseridos aqui -->
                </div>
            </div>
        </div>

        <div class="rewards-section">
            <h4 class="rewards-title">Recompensas do Capítulo</h4>
            <div class="rewards-grid" id="chapter-rewards">
                <!-- Recompensas serão inseridas aqui -->
            </div>
        </div>
    `;

    document.body.appendChild(panel);

    // Listener de fechar
    document.getElementById('close-campaign-btn')?.addEventListener('click', closeCampaignPanel);
}

/**
 * Cria o painel de aventura
 */
function createAdventurePanel() {
    if (document.getElementById('adventure-panel')) return;

    const panel = document.createElement('div');
    panel.id = 'adventure-panel';
    panel.className = 'adventure-panel';
    panel.innerHTML = `
        <div class="adventure-header">
            <h2 class="adventure-title">
                <span class="emoji" id="adventure-emoji">⚔️</span>
                <span id="adventure-title">Aventura</span>
            </h2>
            <div class="adventure-progress">
                <span>Passo</span>
                <span id="adventure-step-current">1</span>
                <span>de</span>
                <span id="adventure-step-total">5</span>
                <div class="adventure-step-indicator" id="step-indicator"></div>
            </div>
        </div>

        <div class="adventure-content" id="adventure-content">
            <!-- Conteúdo do passo -->
        </div>

        <div class="adventure-footer">
            <button class="cancel-btn" id="cancel-adventure-btn">Abandonar</button>
            <button class="continue-btn hidden" id="continue-adventure-btn">Continuar</button>
        </div>
    `;

    document.body.appendChild(panel);

    // Listeners
    document.getElementById('cancel-adventure-btn')?.addEventListener('click', () => {
        if (confirm('Tem certeza que deseja abandonar esta aventura?')) {
            cancelAdventure();
            closeAdventurePanel();
        }
    });

    document.getElementById('continue-adventure-btn')?.addEventListener('click', () => {
        advanceStep();
        updateAdventurePanel();
    });
}

/**
 * Cria o FAB (botão flutuante) de campanha
 */
function createCampaignFAB() {
    if (document.getElementById('campaign-fab')) return;

    const fab = document.createElement('button');
    fab.id = 'campaign-fab';
    fab.className = 'campaign-fab';
    fab.innerHTML = '📜';
    fab.title = 'Ver Campanha';

    fab.addEventListener('click', openCampaignPanel);

    document.body.appendChild(fab);
}

/**
 * Abre o painel de campanha
 */
export function openCampaignPanel() {
    const panel = document.getElementById('campaign-panel');
    if (!panel) return;

    updateCampaignPanel();
    panel.classList.add('active');
}

/**
 * Fecha o painel de campanha
 */
export function closeCampaignPanel() {
    const panel = document.getElementById('campaign-panel');
    panel?.classList.remove('active');
}

/**
 * Atualiza o painel de campanha com dados atuais
 */
export function updateCampaignPanel() {
    const data = getCampaignUIData();
    if (!data) {
        console.warn('[CampaignUI] Nenhuma campanha ativa');
        return;
    }

    // Atualiza header
    document.getElementById('campaign-name').textContent = data.campaign.name;
    document.getElementById('campaign-desc').textContent = data.campaign.description;

    // Atualiza progresso
    const progressFill = document.getElementById('campaign-progress-fill');
    const progressText = document.getElementById('campaign-progress-text');
    if (progressFill) progressFill.style.width = `${data.progress}%`;
    if (progressText) progressText.textContent = `${data.progress}%`;

    // Atualiza capítulo
    if (data.chapter) {
        document.getElementById('chapter-number').textContent = data.chapter.number;
        document.getElementById('chapter-name').textContent = data.chapter.name;
        document.getElementById('chapter-desc').textContent = data.chapter.description;
    }

    // Atualiza objetivos
    const objectivesList = document.getElementById('objectives-list');
    if (objectivesList) {
        objectivesList.innerHTML = data.objectives.map(obj => `
            <div class="objective-item ${obj.complete ? 'complete' : ''}">
                <div class="objective-checkbox"></div>
                <div class="objective-info">
                    <p class="objective-description">${obj.description}</p>
                    <span class="objective-progress">
                        <span class="current">${obj.current}</span> / ${obj.target}
                    </span>
                </div>
            </div>
        `).join('');
    }
}

/**
 * Abre o painel de aventura
 */
export function openAdventurePanel() {
    const panel = document.getElementById('adventure-panel');
    if (!panel) return;

    updateAdventurePanel();
    panel.classList.add('active');
}

/**
 * Fecha o painel de aventura
 */
export function closeAdventurePanel() {
    const panel = document.getElementById('adventure-panel');
    panel?.classList.remove('active');
}

/**
 * Atualiza o painel de aventura
 */
export function updateAdventurePanel() {
    const data = getAdventureUIData();
    if (!data) {
        closeAdventurePanel();
        return;
    }

    // Header
    document.getElementById('adventure-emoji').textContent = data.type === 'combat_chain' ? '⚔️' :
        data.type === 'investigation' ? '🔍' :
            data.type === 'puzzle' ? '🧩' :
                data.type === 'social' ? '🤝' : '📜';
    document.getElementById('adventure-title').textContent = data.title;
    document.getElementById('adventure-step-current').textContent = data.currentStepIndex + 1;
    document.getElementById('adventure-step-total').textContent = data.totalSteps;

    // Indicador de passos
    const indicator = document.getElementById('step-indicator');
    if (indicator) {
        indicator.innerHTML = Array(data.totalSteps).fill(0).map((_, i) => {
            const className = i < data.currentStepIndex ? 'complete' :
                i === data.currentStepIndex ? 'current' : '';
            return `<div class="step ${className}"></div>`;
        }).join('');
    }

    // Conteúdo do passo
    const content = document.getElementById('adventure-content');
    if (content && data.currentStep) {
        content.innerHTML = renderStepContent(data.currentStep);
        attachStepListeners(data.currentStep);
    }

    // Botão continuar
    const continueBtn = document.getElementById('continue-adventure-btn');
    if (continueBtn) {
        continueBtn.classList.toggle('hidden', data.currentStep?.type !== 'reward');
    }
}

/**
 * Renderiza o conteúdo de um passo
 */
function renderStepContent(step) {
    const icon = getStepIcon(step.type);

    switch (step.type) {
        case 'choice':
            return `
                <div class="step-icon">${icon}</div>
                <p class="step-description">${step.description}</p>
                <div class="choice-options">
                    ${step.options.map((opt, i) => `
                        <button class="choice-btn" data-choice="${i}">${opt}</button>
                    `).join('')}
                </div>
            `;

        case 'skill_check':
            return `
                <div class="step-icon">🎲</div>
                <p class="step-description">${step.description}</p>
                <div class="skill-check-display">
                    <div class="skill-name">${step.skill}</div>
                    <div class="dc-value">CD ${step.dc}</div>
                </div>
                <button class="roll-btn" id="roll-skill-btn">
                    🎲 Rolar Teste
                </button>
                <div id="skill-result-container"></div>
            `;

        case 'explore':
            return `
                <div class="step-icon">${icon}</div>
                <p class="step-description">${step.description}</p>
                ${step.hint ? `<p class="step-hint">${step.hint}</p>` : ''}
                <button class="roll-btn" id="explore-target-btn">
                    🔍 Investigar
                </button>
            `;

        case 'combat':
            return `
                <div class="step-icon">⚔️</div>
                <p class="step-description">${step.description}</p>
                <p class="step-hint">Prepare-se para o combate!</p>
                <button class="roll-btn" id="start-combat-btn">
                    ⚔️ Lutar!
                </button>
            `;

        case 'reward':
            return `
                <div class="step-icon">🎁</div>
                <p class="step-description">${step.description}</p>
                <div class="rewards-grid">
                    ${step.gold ? `<div class="reward-item"><span class="reward-icon">💰</span><span class="reward-value">+${step.gold}</span></div>` : ''}
                    ${step.xp ? `<div class="reward-item"><span class="reward-icon">⭐</span><span class="reward-value">+${step.xp} XP</span></div>` : ''}
                </div>
            `;

        default:
            return `
                <div class="step-icon">${icon}</div>
                <p class="step-description">${step.description || 'Passo desconhecido'}</p>
            `;
    }
}

/**
 * Obtém ícone para tipo de passo
 */
function getStepIcon(type) {
    const icons = {
        explore: '🔍',
        combat: '⚔️',
        skill_check: '🎲',
        choice: '❓',
        reward: '🎁',
        dialogue: '💬'
    };
    return icons[type] || '📜';
}

/**
 * Anexa listeners aos elementos do passo
 */
function attachStepListeners(step) {
    // Escolhas
    document.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const choice = parseInt(btn.dataset.choice);
            const result = makeChoice(choice);
            if (result) {
                if (!hasActiveAdventure()) {
                    closeAdventurePanel();
                } else {
                    updateAdventurePanel();
                }
            }
        });
    });

    // Skill check
    document.getElementById('roll-skill-btn')?.addEventListener('click', () => {
        const result = performSkillCheck(step.skill, step.dc);
        if (result) {
            showSkillResult(result);
        }
    });

    // Explorar
    document.getElementById('explore-target-btn')?.addEventListener('click', () => {
        // Abre modo AR de exploração
        // Por enquanto, avança direto
        advanceStep();
        updateAdventurePanel();
    });

    // Combate
    document.getElementById('start-combat-btn')?.addEventListener('click', () => {
        // Inicia combate da aventura
        closeAdventurePanel();
        // TODO: startAdventureCombat()
    });
}

/**
 * Mostra resultado do skill check
 */
function showSkillResult(result) {
    const container = document.getElementById('skill-result-container');
    if (!container) return;

    container.innerHTML = `
        <div class="skill-result ${result.success ? 'success' : 'failure'}">
            <div class="result-icon">${result.success ? '✅' : '❌'}</div>
            <div class="roll-value">
                🎲 ${result.natural}
                ${result.modifier >= 0 ? '+' : ''}${result.modifier || 0}
                = ${result.total}
            </div>
            <p>${result.success ? 'Sucesso!' : 'Falha!'}</p>
        </div>
    `;

    // Após mostrar, aguarda e avança
    setTimeout(() => {
        if (hasActiveAdventure()) {
            updateAdventurePanel();
        } else {
            closeAdventurePanel();
        }
    }, 2000);
}

/**
 * Callbacks de eventos
 */
function onChapterStarted(e) {
    console.log('[CampaignUI] Novo capítulo:', e.detail);
    updateCampaignPanel();

    // Mostra notificação
    showCampaignNotification('Novo Capítulo!', `Capítulo ${e.detail.chapter} iniciado`);
}

function onCampaignCompleted(e) {
    console.log('[CampaignUI] Campanha completa:', e.detail);
    showCampaignNotification('🎉 Campanha Completa!', 'Você completou a campanha!');
}

function onAdventureStep(e) {
    console.log('[CampaignUI] Passo de aventura:', e.detail);
    updateAdventurePanel();
}

function onAdventureCompleted(e) {
    console.log('[CampaignUI] Aventura completa:', e.detail);
    closeAdventurePanel();

    if (e.detail.success) {
        showCampaignNotification('✅ Aventura Completa!', 'Você completou a aventura!');
    } else {
        showCampaignNotification('❌ Aventura Falhou', e.detail.reason || 'Melhor sorte na próxima!');
    }
}

/**
 * Mostra notificação de campanha
 */
function showCampaignNotification(title, message) {
    // Implementação simples - pode ser melhorada
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: message });
    }
    console.log(`[Campanha] ${title}: ${message}`);
}

/**
 * Atualiza badge do FAB
 */
export function updateCampaignFABBadge(count) {
    const fab = document.getElementById('campaign-fab');
    if (!fab) return;

    let badge = fab.querySelector('.notification-badge');

    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            fab.appendChild(badge);
        }
        badge.textContent = count;
    } else if (badge) {
        badge.remove();
    }
}
