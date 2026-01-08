/**
 * World State
 * Sistema de estado global do mundo que afeta gameplay
 */

import { gameState } from './state.js';

// Estado do mundo
const worldState = {
    // Flags de eventos (verdadeiro/falso)
    flags: {
        cultDefeated: false,
        druidAlly: false,
        townSaved: false,
        dragonAwoken: false,
        bloodMoonActive: false
    },

    // Contadores globais
    counters: {
        totalUndeadKilled: 0,
        totalDragonsKilled: 0,
        totalBossesKilled: 0,
        artifactsFound: 0,
        questsCompleted: 0
    },

    // Eventos ativos
    activeEvents: [],

    // Modificadores de spawn baseados no estado
    spawnModifiers: {},

    // Aliados ativos
    allies: [],

    // Efeitos globais ativos
    globalEffects: []
};

/**
 * Inicializa o world state
 */
export function initWorldState() {
    loadWorldState();
    updateSpawnModifiers();
    checkActiveEvents();
    console.log('[WorldState] Inicializado');
}

/**
 * Define uma flag do mundo
 * @param {string} flag - Nome da flag
 * @param {boolean} value - Valor da flag
 */
export function setFlag(flag, value) {
    const oldValue = worldState.flags[flag];
    worldState.flags[flag] = value;

    console.log(`[WorldState] Flag ${flag}: ${oldValue} -> ${value}`);

    // Dispara evento de mudança
    window.dispatchEvent(new CustomEvent('worldstate:flag-changed', {
        detail: { flag, oldValue, newValue: value }
    }));

    // Atualiza modificadores
    updateSpawnModifiers();

    // Persiste
    saveWorldState();
}

/**
 * Obtém uma flag do mundo
 */
export function getFlag(flag) {
    return worldState.flags[flag] || false;
}

/**
 * Incrementa um contador
 * @param {string} counter - Nome do contador
 * @param {number} amount - Quantidade a adicionar
 */
export function incrementCounter(counter, amount = 1) {
    if (worldState.counters[counter] === undefined) {
        worldState.counters[counter] = 0;
    }
    worldState.counters[counter] += amount;

    console.log(`[WorldState] Counter ${counter}: ${worldState.counters[counter]}`);

    // Verifica triggers de contadores
    checkCounterTriggers(counter);

    saveWorldState();
}

/**
 * Obtém um contador
 */
export function getCounter(counter) {
    return worldState.counters[counter] || 0;
}

/**
 * Atualiza modificadores de spawn baseados no estado do mundo
 */
function updateSpawnModifiers() {
    const mods = { ...DEFAULT_SPAWN_MODIFIERS };

    // Modificadores baseados em flags
    if (worldState.flags.cultDefeated) {
        mods.undead *= 0.5; // -50% undead
    }

    if (worldState.flags.druidAlly) {
        mods.beast *= 0.7; // -30% beasts
        mods.plant *= 0.5; // -50% plant monsters
    }

    if (worldState.flags.bloodMoonActive) {
        mods.werewolf *= 3; // 3x werewolves
        mods.beast *= 1.5; // +50% beasts
    }

    if (worldState.flags.dragonAwoken) {
        mods.dragon *= 2; // 2x dragon-related
        mods.kobold *= 1.5; // +50% kobolds
    }

    // Modificadores baseados em contadores
    const undeadKilled = worldState.counters.totalUndeadKilled || 0;
    if (undeadKilled >= 100) {
        mods.undead *= 0.8; // -20% se matou muitos
    }

    worldState.spawnModifiers = mods;
    console.log('[WorldState] Spawn modifiers atualizados:', mods);
}

const DEFAULT_SPAWN_MODIFIERS = {
    undead: 1,
    beast: 1,
    humanoid: 1,
    dragon: 1,
    fiend: 1,
    aberration: 1,
    plant: 1,
    werewolf: 1,
    kobold: 1
};

/**
 * Obtém modificadores de spawn
 */
export function getSpawnModifiers() {
    return { ...worldState.spawnModifiers };
}

/**
 * Obtém modificador de spawn para um tipo específico
 * @param {string} type - Tipo de monstro
 */
export function getSpawnModifier(type) {
    return worldState.spawnModifiers[type] || 1;
}

/**
 * Verifica triggers de contadores
 */
function checkCounterTriggers(counter) {
    const triggers = COUNTER_TRIGGERS[counter];
    if (!triggers) return;

    triggers.forEach(trigger => {
        if (worldState.counters[counter] >= trigger.threshold && !trigger.triggered) {
            trigger.triggered = true;
            console.log(`[WorldState] Trigger ativado: ${trigger.name}`);

            if (trigger.setFlag) {
                setFlag(trigger.setFlag, true);
            }
            if (trigger.event) {
                activateEvent(trigger.event);
            }
            if (trigger.callback) {
                trigger.callback();
            }
        }
    });
}

const COUNTER_TRIGGERS = {
    totalUndeadKilled: [
        { threshold: 50, name: 'Undead Slayer I', setFlag: 'undeadSlayer1' },
        { threshold: 100, name: 'Undead Slayer II', setFlag: 'undeadSlayer2' },
        { threshold: 250, name: 'Undead Slayer III', setFlag: 'undeadSlayer3' }
    ],
    totalBossesKilled: [
        { threshold: 5, name: 'Boss Hunter', setFlag: 'bossHunter' },
        { threshold: 10, name: 'Champion', setFlag: 'champion' }
    ]
};

/**
 * Ativa um evento global
 */
export function activateEvent(eventId) {
    const event = WORLD_EVENTS[eventId];
    if (!event) {
        console.warn('[WorldState] Evento não encontrado:', eventId);
        return;
    }

    // Verifica se já está ativo
    if (worldState.activeEvents.includes(eventId)) {
        return;
    }

    worldState.activeEvents.push(eventId);

    console.log(`[WorldState] Evento ativado: ${event.name}`);

    // Aplica efeitos do evento
    if (event.effects) {
        applyEventEffects(event.effects);
    }

    // Dispara evento
    window.dispatchEvent(new CustomEvent('worldstate:event-activated', {
        detail: { eventId, event }
    }));

    // Agenda duração se tiver
    if (event.duration) {
        setTimeout(() => {
            deactivateEvent(eventId);
        }, event.duration);
    }

    saveWorldState();
}

/**
 * Desativa um evento global
 */
export function deactivateEvent(eventId) {
    const index = worldState.activeEvents.indexOf(eventId);
    if (index === -1) return;

    worldState.activeEvents.splice(index, 1);

    const event = WORLD_EVENTS[eventId];
    console.log(`[WorldState] Evento desativado: ${event?.name || eventId}`);

    // Remove efeitos
    if (event?.effects) {
        removeEventEffects(event.effects);
    }

    window.dispatchEvent(new CustomEvent('worldstate:event-deactivated', {
        detail: { eventId, event }
    }));

    saveWorldState();
}

/**
 * Verifica se um evento está ativo
 */
export function isEventActive(eventId) {
    return worldState.activeEvents.includes(eventId);
}

/**
 * Aplica efeitos de um evento
 */
function applyEventEffects(effects) {
    if (effects.spawnModifiers) {
        Object.entries(effects.spawnModifiers).forEach(([type, mod]) => {
            worldState.spawnModifiers[type] = (worldState.spawnModifiers[type] || 1) * mod;
        });
    }

    if (effects.globalBuff) {
        worldState.globalEffects.push(effects.globalBuff);
    }

    if (effects.setFlag) {
        setFlag(effects.setFlag, true);
    }
}

/**
 * Remove efeitos de um evento
 */
function removeEventEffects(effects) {
    if (effects.spawnModifiers) {
        updateSpawnModifiers(); // Recalcula
    }

    if (effects.globalBuff) {
        const index = worldState.globalEffects.indexOf(effects.globalBuff);
        if (index !== -1) worldState.globalEffects.splice(index, 1);
    }
}

// Definição de eventos do mundo
const WORLD_EVENTS = {
    blood_moon: {
        id: 'blood_moon',
        name: 'Lua de Sangue',
        description: 'A lua de sangue está ativa! Lobisomens estão mais agressivos.',
        effects: {
            spawnModifiers: { werewolf: 3, beast: 1.5 },
            globalBuff: 'blood_moon_active'
        },
        duration: 3600000 // 1 hora
    },

    undead_invasion: {
        id: 'undead_invasion',
        name: 'Invasão de Mortos-Vivos',
        description: 'Uma horda de mortos-vivos está atacando a região!',
        effects: {
            spawnModifiers: { undead: 2 },
            setFlag: 'underAttack'
        }
    },

    dragon_awakening: {
        id: 'dragon_awakening',
        name: 'Despertar do Dragão',
        description: 'O dragão antigo está despertando!',
        effects: {
            spawnModifiers: { dragon: 2, kobold: 1.5 },
            setFlag: 'dragonAwoken'
        }
    },

    temple_blessing: {
        id: 'temple_blessing',
        name: 'Benção do Templo',
        description: 'O templo abençoou os heróis com poder divino.',
        effects: {
            globalBuff: 'temple_blessing'
        },
        duration: 1800000 // 30 min
    },

    festival_day: {
        id: 'festival_day',
        name: 'Dia de Festival',
        description: 'É dia de festival! Os monstros estão menos agressivos.',
        effects: {
            spawnModifiers: {
                undead: 0.5,
                beast: 0.5,
                humanoid: 0.5
            }
        },
        duration: 7200000 // 2 horas
    }
};

/**
 * Verifica eventos baseados em condições (hora, etc)
 */
function checkActiveEvents() {
    const now = new Date();
    const hour = now.getHours();

    // Lua de sangue à noite (21h-3h)
    if ((hour >= 21 || hour < 3) && getFlag('bloodMoonCampaign')) {
        activateEvent('blood_moon');
    }
}

/**
 * Adiciona um aliado
 * @param {Object} ally - Dados do aliado
 */
export function addAlly(ally) {
    if (worldState.allies.some(a => a.id === ally.id)) return;

    worldState.allies.push(ally);
    console.log(`[WorldState] Aliado adicionado: ${ally.name}`);

    window.dispatchEvent(new CustomEvent('worldstate:ally-added', {
        detail: { ally }
    }));

    saveWorldState();
}

/**
 * Remove um aliado
 */
export function removeAlly(allyId) {
    const index = worldState.allies.findIndex(a => a.id === allyId);
    if (index !== -1) {
        const ally = worldState.allies.splice(index, 1)[0];
        console.log(`[WorldState] Aliado removido: ${ally.name}`);
    }
    saveWorldState();
}

/**
 * Obtém todos os aliados
 */
export function getAllies() {
    return [...worldState.allies];
}

/**
 * Verifica se tem aliado específico
 */
export function hasAlly(allyId) {
    return worldState.allies.some(a => a.id === allyId);
}

/**
 * Obtém dados para UI
 */
export function getWorldStateUIData() {
    return {
        flags: { ...worldState.flags },
        counters: { ...worldState.counters },
        activeEvents: worldState.activeEvents.map(id => ({
            id,
            ...WORLD_EVENTS[id]
        })),
        allies: [...worldState.allies],
        globalEffects: [...worldState.globalEffects]
    };
}

/**
 * Salva state para persistência
 */
export function saveWorldState() {
    const data = {
        flags: worldState.flags,
        counters: worldState.counters,
        activeEvents: worldState.activeEvents,
        allies: worldState.allies
    };

    try {
        localStorage.setItem('dd_world_state', JSON.stringify(data));
    } catch (e) {
        console.error('[WorldState] Erro ao salvar:', e);
    }
}

/**
 * Carrega state persistido
 */
export function loadWorldState() {
    try {
        const saved = localStorage.getItem('dd_world_state');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(worldState.flags, data.flags || {});
            Object.assign(worldState.counters, data.counters || {});
            worldState.activeEvents = data.activeEvents || [];
            worldState.allies = data.allies || [];
            console.log('[WorldState] Carregado do localStorage');
        }
    } catch (e) {
        console.error('[WorldState] Erro ao carregar:', e);
    }
}

/**
 * Reseta o world state (para nova partida)
 */
export function resetWorldState() {
    worldState.flags = {
        cultDefeated: false,
        druidAlly: false,
        townSaved: false,
        dragonAwoken: false,
        bloodMoonActive: false
    };
    worldState.counters = {
        totalUndeadKilled: 0,
        totalDragonsKilled: 0,
        totalBossesKilled: 0,
        artifactsFound: 0,
        questsCompleted: 0
    };
    worldState.activeEvents = [];
    worldState.allies = [];
    worldState.globalEffects = [];

    updateSpawnModifiers();
    saveWorldState();
    console.log('[WorldState] Resetado');
}
