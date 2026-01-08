/**
 * Exploration UI Module
 * Gerencia a interface de exploração e eventos
 */

import { gameState } from '../game/state.js';
import { generateExplorationEvent, resolveEvent } from '../game/exploration.js';
import {
    startExplorationAR,
    endExplorationAR,
    isExplorationARSupported,
    showSuccessEffect,
    showFailureEffect
} from '../ar/ar-exploration.js';
import { rollD20Animation } from '../ar/dice-animation.js';

// Estado local do módulo
let currentEvent = null;
let explorationStartTime = null;

// Callback para navegação
let setScreenFromModule = (screen) => {
    console.warn('setScreenFromModule não configurado');
};
let goToMapCallback = null;

/**
 * Configura a função de navegação de telas
 */
export function setExplorationUINavigation(setScreen, goToMap) {
    setScreenFromModule = setScreen;
    goToMapCallback = goToMap;
}

/**
 * Handler de exploração principal
 */
export async function handleExplore() {
    if (!gameState.currentCell) {
        alert("Você precisa estar localizável para explorar!");
        return;
    }

    // Gera o evento primeiro para saber o que procurar
    const event = generateExplorationEvent(gameState.currentCell);

    if (!event) {
        alert("Você procura por toda parte, mas não encontra nada.");
        return;
    }

    currentEvent = event;

    // Verifica se AR está disponível
    const arSupported = await isExplorationARSupported();

    if (arSupported) {
        // Inicia exploração em AR
        startExplorationARMode(event);
    } else {
        // Fallback: modo 2D tradicional
        showEventModal(event);
    }
}

/**
 * Inicia o modo de exploração AR
 */
async function startExplorationARMode(event) {
    // Mostra tela de exploração AR
    setScreenFromModule('exploration-ar');

    // Atualiza instruções com base no evento
    const instructionText = document.getElementById('exploration-instruction-text');
    const instructionIcon = document.getElementById('exploration-icon');

    if (instructionText) {
        instructionText.textContent = getExplorationInstruction(event);
    }
    if (instructionIcon) {
        instructionIcon.textContent = event.emoji || '🔍';
    }

    // Esconde info do objeto inicialmente
    document.getElementById('exploration-object-info')?.classList.add('hidden');

    explorationStartTime = Date.now();

    // Inicia sessão AR de exploração
    const arStarted = await startExplorationAR({
        event: event,
        onFound: (object) => {
            onExplorationObjectFound(event, object);
        },
        onClick: (eventData) => {
            onExplorationObjectClicked(eventData);
        },
        onEnd: () => {
            console.log('ℹ️ Sessão AR de exploração encerrada');
        }
    });

    if (!arStarted) {
        console.warn('⚠️ Modo AR não disponível, usando interface 2D');
        showEventModal(event);
    }
}

/**
 * Retorna instrução personalizada para cada tipo de evento
 */
function getExplorationInstruction(event) {
    const instructions = {
        'ancient_chest': 'Procure um baú antigo ao seu redor...',
        'magic_glyph': 'Procure um símbolo mágico brilhante...',
        'monster_tracks': 'Procure rastros no chão...',
        'abandoned_shrine': 'Procure um santuário abandonado...'
    };
    return instructions[event.id] || 'Procure algo interessante...';
}

/**
 * Callback quando o objeto de exploração é encontrado em AR
 */
function onExplorationObjectFound(event, object) {
    console.log('✅ Objeto de exploração encontrado:', event.title);

    // Atualiza instruções
    const instructionText = document.getElementById('exploration-instruction-text');
    if (instructionText) {
        instructionText.textContent = 'Objeto encontrado! Toque para interagir.';
    }

    // Mostra info do objeto
    const objectInfo = document.getElementById('exploration-object-info');
    const objectIcon = document.getElementById('found-object-icon');
    const objectTitle = document.getElementById('found-object-title');
    const objectDesc = document.getElementById('found-object-desc');

    if (objectInfo) {
        objectInfo.classList.remove('hidden');
    }
    if (objectIcon) {
        objectIcon.textContent = event.emoji || '📦';
    }
    if (objectTitle) {
        objectTitle.textContent = event.title;
    }
    if (objectDesc) {
        objectDesc.textContent = 'Toque no objeto para escolher uma ação';
    }
}

/**
 * Callback quando o objeto de exploração é clicado em AR
 */
async function onExplorationObjectClicked(event) {
    console.log('🖱️ Objeto clicado:', event.title);

    // NÃO encerra a sessão AR aqui. 
    // Mantemos o AR rodando no fundo e mostramos o modal por cima.

    // Mostra modal de opções (agora como overlay)
    showEventModal(event);
}

/**
 * Cancela a exploração AR e volta ao mapa
 */
export async function cancelExplorationAR() {
    await endExplorationAR();
    currentEvent = null;
    if (goToMapCallback) goToMapCallback();
}

/**
 * Mostra o modal de evento
 */
export function showEventModal(event) {
    currentEvent = event;
    const modal = document.getElementById('event-screen');
    const title = document.getElementById('event-title');
    const desc = document.getElementById('event-description');
    const icon = document.getElementById('event-icon');
    const optionsDiv = document.getElementById('event-options');
    const closeBtn = document.getElementById('close-event-btn');

    if (!modal || !title || !desc || !optionsDiv) return;

    title.textContent = event.title;
    desc.textContent = event.description;

    // Usa imagem se disponível, senão emoji
    if (icon) {
        if (event.image && event.image.trim() !== '') {
            // Cria a imagem com fallback para evitar ícone quebrado
            icon.innerHTML = `<img src="${event.image}" alt="${event.title}" class="event-icon-img" onerror="this.style.display='none';this.parentElement.textContent='${event.emoji || '📦'}'">`;
        } else {
            icon.textContent = event.emoji || '📦';
        }
    }

    if (closeBtn) {
        closeBtn.style.display = 'none';
        closeBtn.classList.add('hidden');
    }
    optionsDiv.innerHTML = '';

    event.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'event-option-btn';
        btn.innerHTML = `
            <span class="option-label">${opt.label}</span>
            <span class="option-dc">CD ${opt.dc}</span>
        `;
        btn.onclick = () => handleEventOption(index);
        optionsDiv.appendChild(btn);
    });

    modal.classList.add('active');
}

/**
 * Handler de opção de evento
 */
async function handleEventOption(index) {
    if (!currentEvent) return;

    const option = currentEvent.options[index];
    const optionsDiv = document.getElementById('event-options');
    const closeBtn = document.getElementById('close-event-btn');

    if (!optionsDiv) return;

    // Esconde opções e mostra animação de dado
    optionsDiv.innerHTML = `
        <div class="dice-rolling-container" style="text-align: center; padding: 2rem;">
            <div style="font-size: 3rem; animation: dice-spin 0.5s linear infinite;">🎲</div>
            <p style="margin-top: 1rem; color: var(--color-text-secondary);">Rolando ${option.skill}...</p>
        </div>
    `;

    // Aguarda um momento para mostrar animação do dado
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Resolve o evento
    const result = await resolveEvent(currentEvent, index);

    // Mostra a animação do dado com o resultado
    try {
        await new Promise((resolve) => {
            rollD20Animation(result.natural, resolve);
        });
    } catch (e) {
        console.error('Erro na animação do dado:', e);
    }

    // Aguarda um momento antes de mostrar resultado
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mostra resultado com estilo melhorado
    optionsDiv.innerHTML = `
        <div class="event-result ${result.success ? 'success' : 'failure'}" style="padding: 1.5rem; text-align: center;">
            <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">${result.success ? '✅' : '❌'}</div>
            <h3 style="color: ${result.success ? '#4ade80' : '#f87171'}; font-size: 1.5rem; margin-bottom: 0.5rem;">
                ${result.success ? 'Sucesso!' : 'Falha!'}
            </h3>
            <div style="background: rgba(255,255,255,0.1); border-radius: 8px; padding: 0.75rem; margin: 1rem 0;">
                <p style="font-size: 1.2rem; color: var(--color-accent-gold); margin: 0;">🎲 ${result.natural}</p>
                <p style="font-size: 0.85rem; opacity: 0.7; margin: 0.25rem 0 0 0;">Total: ${result.roll} vs CD ${option.dc}</p>
            </div>
            <p style="margin: 1rem 0; line-height: 1.5;">${result.message}</p>
        </div>
    `;

    if (closeBtn) {
        closeBtn.style.display = 'block';
        closeBtn.classList.remove('hidden');
    }
}

/**
 * Obtém o evento atual
 */
export function getCurrentEvent() {
    return currentEvent;
}

/**
 * Limpa o evento atual
 */
export function clearCurrentEvent() {
    currentEvent = null;
}
