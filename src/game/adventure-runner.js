/**
 * Adventure Runner
 * Executor de mini-aventuras - gerencia o fluxo de passos de cada aventura
 */

import { gameState } from './state.js';
import { rollSkillCheck } from '../lib/dice.js';
import { registerCampaignKill, registerArtifactFound, updateObjective } from './campaign-manager.js';
import { addItemToInventory } from './inventory.js';

// Estado da aventura atual
let currentAdventure = null;
let currentStep = 0;
let adventureState = {};
let adventureCallbacks = {
    onStepChange: null,
    onComplete: null,
    onFail: null
};

/**
 * Inicia uma mini-aventura
 * @param {Object} adventure - Definição da aventura
 * @param {Object} callbacks - Callbacks de eventos
 */
export function startAdventure(adventure, callbacks = {}) {
    if (currentAdventure) {
        console.warn('[Adventure] Já existe uma aventura ativa');
        return false;
    }

    currentAdventure = adventure;
    currentStep = 0;
    adventureState = {
        startedAt: Date.now(),
        choices: [],
        results: [],
        combatsWon: 0,
        skillChecks: { passed: 0, failed: 0 }
    };
    adventureCallbacks = callbacks;

    console.log(`[Adventure] Iniciada: ${adventure.title}`);

    // Dispara evento
    window.dispatchEvent(new CustomEvent('adventure:started', {
        detail: { adventure }
    }));

    // Executa o primeiro passo
    executeCurrentStep();

    return true;
}

/**
 * Obtém a aventura atual
 */
export function getCurrentAdventure() {
    return currentAdventure;
}

/**
 * Obtém o passo atual
 */
export function getCurrentStep() {
    if (!currentAdventure) return null;

    const step = currentAdventure.steps[currentStep];
    return step ? { ...step, index: currentStep } : null;
}

/**
 * Obtém dados para UI
 */
export function getAdventureUIData() {
    if (!currentAdventure) return null;

    const step = getCurrentStep();
    return {
        title: currentAdventure.title,
        description: currentAdventure.description,
        type: currentAdventure.type,
        totalSteps: currentAdventure.steps.length,
        currentStepIndex: currentStep,
        currentStep: step,
        state: adventureState,
        progress: Math.round((currentStep / currentAdventure.steps.length) * 100)
    };
}

/**
 * Executa o passo atual
 */
function executeCurrentStep() {
    const step = currentAdventure.steps[currentStep];
    if (!step) {
        console.error('[Adventure] Passo não encontrado');
        return;
    }

    console.log(`[Adventure] Executando passo ${currentStep + 1}/${currentAdventure.steps.length}:`, step.type);

    // Notifica UI
    if (adventureCallbacks.onStepChange) {
        adventureCallbacks.onStepChange(step, currentStep);
    }

    // Dispara evento
    window.dispatchEvent(new CustomEvent('adventure:step', {
        detail: { step, index: currentStep }
    }));
}

/**
 * Avança para o próximo passo
 */
export function advanceStep() {
    currentStep++;

    if (currentStep >= currentAdventure.steps.length) {
        // Aventura completa!
        completeAdventure(true);
    } else {
        executeCurrentStep();
    }
}

/**
 * Processa uma escolha do jogador
 * @param {number} choiceIndex - Índice da opção escolhida
 */
export function makeChoice(choiceIndex) {
    const step = getCurrentStep();
    if (!step || step.type !== 'choice') {
        console.warn('[Adventure] Passo atual não é uma escolha');
        return null;
    }

    const choice = step.options?.[choiceIndex];
    if (!choice) {
        console.warn('[Adventure] Opção inválida:', choiceIndex);
        return null;
    }

    // Registra a escolha
    adventureState.choices.push({
        step: currentStep,
        choice: choiceIndex,
        label: choice
    });

    console.log(`[Adventure] Escolha feita: ${choice}`);

    // Verifica se é a escolha correta (para puzzles)
    if (step.correct !== undefined) {
        const isCorrect = step.correct === choiceIndex;
        adventureState.results.push({ step: currentStep, success: isCorrect });

        if (!isCorrect && step.failOnWrong) {
            // Falha crítica
            completeAdventure(false, 'Resposta incorreta!');
            return { success: false, message: 'Resposta incorreta!' };
        }

        return { success: isCorrect };
    }

    // Avança normalmente
    advanceStep();
    return { success: true };
}

/**
 * Processa um skill check
 * @param {string} skill - Skill a ser testada
 * @param {number} dc - Dificuldade
 */
export function performSkillCheck(skill, dc) {
    if (!gameState.player) return null;

    const step = getCurrentStep();
    if (!step || step.type !== 'skill_check') {
        console.warn('[Adventure] Passo atual não é um skill check');
        return null;
    }

    // Obtém modificador da skill
    const skillMod = gameState.player.skills?.[skill] || 0;

    // Rola o teste
    const result = rollSkillCheck(skillMod, dc);

    // Registra resultado
    adventureState.results.push({
        step: currentStep,
        skill,
        dc,
        roll: result.total,
        natural: result.natural,
        success: result.success
    });

    if (result.success) {
        adventureState.skillChecks.passed++;
    } else {
        adventureState.skillChecks.failed++;
    }

    console.log(`[Adventure] Skill check ${skill}: ${result.total} vs DC ${dc} - ${result.success ? 'SUCESSO' : 'FALHA'}`);

    // Verifica consequências
    if (!result.success && step.failEndsAdventure) {
        completeAdventure(false, `Falha no teste de ${skill}!`);
        return result;
    }

    // Avança normalmente
    advanceStep();
    return result;
}

/**
 * Inicia um combate da aventura
 */
export function startAdventureCombat() {
    const step = getCurrentStep();
    if (!step || step.type !== 'combat') {
        console.warn('[Adventure] Passo atual não é um combate');
        return null;
    }

    // Retorna os dados do combate para serem processados externamente
    return {
        monsterId: step.monster,
        monsterCount: step.count || 1,
        isBoss: step.isBoss || false,
        onVictory: () => onCombatVictory(),
        onDefeat: () => onCombatDefeat()
    };
}

/**
 * Callback de vitória em combate
 */
function onCombatVictory() {
    adventureState.combatsWon++;
    adventureState.results.push({
        step: currentStep,
        type: 'combat',
        success: true
    });

    console.log('[Adventure] Combate vencido!');
    advanceStep();
}

/**
 * Callback de derrota em combate
 */
function onCombatDefeat() {
    const step = getCurrentStep();

    adventureState.results.push({
        step: currentStep,
        type: 'combat',
        success: false
    });

    if (step.defeatEndsAdventure !== false) {
        completeAdventure(false, 'Derrotado em combate!');
    } else {
        // Permite continuar mesmo após derrota
        advanceStep();
    }
}

/**
 * Processa um passo de exploração
 */
export function exploreTarget(targetId) {
    const step = getCurrentStep();
    if (!step || step.type !== 'explore') {
        console.warn('[Adventure] Passo atual não é exploração');
        return null;
    }

    // Registra descoberta
    registerArtifactFound(targetId);

    adventureState.results.push({
        step: currentStep,
        type: 'explore',
        target: targetId,
        success: true
    });

    console.log(`[Adventure] Alvo explorado: ${targetId}`);
    advanceStep();

    return { success: true };
}

/**
 * Processa um passo de recompensa
 */
export function claimReward() {
    const step = getCurrentStep();
    if (!step || step.type !== 'reward') {
        console.warn('[Adventure] Passo atual não é recompensa');
        return null;
    }

    const rewards = [];

    if (step.chest) {
        // Abre baú com loot
        rewards.push({ type: 'chest', id: step.chest });
    }

    if (step.item) {
        addItemToInventory(step.item, 1);
        rewards.push({ type: 'item', id: step.item });
    }

    if (step.gold) {
        gameState.player.gold = (gameState.player.gold || 0) + step.gold;
        rewards.push({ type: 'gold', amount: step.gold });
    }

    if (step.xp) {
        gameState.player.xp += step.xp;
        rewards.push({ type: 'xp', amount: step.xp });
    }

    console.log('[Adventure] Recompensa reivindicada:', rewards);
    advanceStep();

    return { success: true, rewards };
}

/**
 * Completa a aventura
 * @param {boolean} success - Se foi bem-sucedida
 * @param {string} reason - Motivo da conclusão
 */
function completeAdventure(success, reason = null) {
    if (!currentAdventure) return;

    const adventure = currentAdventure;
    const finalState = { ...adventureState };

    console.log(`[Adventure] ${success ? 'COMPLETADA' : 'FALHOU'}: ${adventure.title}`);
    if (reason) console.log(`[Adventure] Motivo: ${reason}`);

    // Aplica recompensas se sucesso
    if (success && adventure.rewards) {
        applyAdventureRewards(adventure.rewards);
    }

    // Aplica consequências de falha
    if (!success && adventure.failureConsequences) {
        applyFailureConsequences(adventure.failureConsequences);
    }

    // Callback
    if (success && adventureCallbacks.onComplete) {
        adventureCallbacks.onComplete(adventure, finalState);
    } else if (!success && adventureCallbacks.onFail) {
        adventureCallbacks.onFail(adventure, finalState, reason);
    }

    // Dispara evento
    window.dispatchEvent(new CustomEvent('adventure:completed', {
        detail: { adventure, success, state: finalState, reason }
    }));

    // Limpa estado
    currentAdventure = null;
    currentStep = 0;
    adventureState = {};
}

/**
 * Aplica recompensas da aventura
 */
function applyAdventureRewards(rewards) {
    if (!gameState.player) return;

    if (rewards.xp) {
        gameState.player.xp += rewards.xp;
        console.log(`[Adventure] +${rewards.xp} XP`);
    }

    if (rewards.gold) {
        gameState.player.gold = (gameState.player.gold || 0) + rewards.gold;
        console.log(`[Adventure] +${rewards.gold} ouro`);
    }

    if (rewards.item) {
        addItemToInventory(rewards.item, 1);
        console.log(`[Adventure] Item recebido: ${rewards.item}`);
    }

    if (rewards.loot) {
        // Gerar loot da tabela especificada
        console.log(`[Adventure] Loot da tabela: ${rewards.loot}`);
    }
}

/**
 * Aplica consequências de falha
 */
function applyFailureConsequences(consequences) {
    if (consequences.xpPenalty) {
        gameState.player.xp = Math.max(0, gameState.player.xp - consequences.xpPenalty);
        console.log(`[Adventure] -${consequences.xpPenalty} XP (penalidade)`);
    }

    if (consequences.debuff) {
        // TODO: Aplicar debuff
        console.log(`[Adventure] Debuff aplicado: ${consequences.debuff}`);
    }
}

/**
 * Cancela a aventura atual
 */
export function cancelAdventure() {
    if (!currentAdventure) return;

    console.log(`[Adventure] Cancelada: ${currentAdventure.title}`);

    window.dispatchEvent(new CustomEvent('adventure:cancelled', {
        detail: { adventure: currentAdventure }
    }));

    currentAdventure = null;
    currentStep = 0;
    adventureState = {};
}

/**
 * Verifica se há uma aventura ativa
 */
export function hasActiveAdventure() {
    return currentAdventure !== null;
}

/**
 * Salva estado da aventura para persistência
 */
export function saveAdventureState() {
    if (!currentAdventure) return null;

    return {
        adventureId: currentAdventure.id,
        currentStep,
        state: adventureState
    };
}

/**
 * Carrega estado da aventura
 */
export function loadAdventureState(savedState, adventuresData) {
    if (!savedState || !savedState.adventureId) return;

    const adventure = adventuresData[savedState.adventureId];
    if (!adventure) {
        console.warn('[Adventure] Aventura salva não encontrada:', savedState.adventureId);
        return;
    }

    currentAdventure = adventure;
    currentStep = savedState.currentStep || 0;
    adventureState = savedState.state || {};

    console.log('[Adventure] Estado carregado');
}
