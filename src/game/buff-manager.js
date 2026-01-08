/**
 * Sistema de Gerenciamento de Buffs e Debuffs
 * Centraliza a lógica de buffs temporários do jogador
 */

import { gameState, updateDerivedStats } from './state.js';

/**
 * @typedef {Object} Buff
 * @property {string} id - Identificador único do buff
 * @property {string} name - Nome do buff
 * @property {string} namePt - Nome em português
 * @property {string} type - Tipo: 'buff' ou 'debuff'
 * @property {number} expires - Timestamp de expiração
 * @property {Object} effects - Efeitos do buff
 */

/**
 * Inicializa o sistema de buffs
 */
export function initBuffSystem() {
    if (!gameState.playerBuffs) {
        gameState.playerBuffs = [];
    }
}

/**
 * Adiciona um buff ao jogador
 * @param {Object} buffData - Dados do buff
 * @param {number} durationMs - Duração em milissegundos
 * @returns {boolean} Sucesso
 */
export function addBuff(buffData, durationMs = 60000) {
    initBuffSystem();

    // Verifica se buff já existe (stackável ou não)
    const existingIndex = gameState.playerBuffs.findIndex(b => b.id === buffData.id);

    if (existingIndex !== -1) {
        if (buffData.stackable) {
            // Aumenta stacks
            gameState.playerBuffs[existingIndex].stacks =
                (gameState.playerBuffs[existingIndex].stacks || 1) + 1;
            // Renova duração
            gameState.playerBuffs[existingIndex].expires = Date.now() + durationMs;
        } else {
            // Apenas renova duração
            gameState.playerBuffs[existingIndex].expires = Date.now() + durationMs;
        }
    } else {
        // Adiciona novo buff
        gameState.playerBuffs.push({
            ...buffData,
            expires: Date.now() + durationMs,
            stacks: 1
        });
    }

    // Recalcula stats se necessário
    if (buffData.effects?.statBonus) {
        updateDerivedStats();
    }

    console.log(`[Buff] Aplicado: ${buffData.namePt || buffData.name}`);
    return true;
}

/**
 * Remove um buff específico
 * @param {string} buffId 
 */
export function removeBuff(buffId) {
    if (!gameState.playerBuffs) return;

    const idx = gameState.playerBuffs.findIndex(b => b.id === buffId);
    if (idx !== -1) {
        const buff = gameState.playerBuffs[idx];
        gameState.playerBuffs.splice(idx, 1);

        // Recalcula stats se necessário
        if (buff.effects?.statBonus) {
            updateDerivedStats();
        }

        console.log(`[Buff] Removido: ${buff.namePt || buff.name}`);
    }
}

/**
 * Limpa buffs expirados
 * @returns {string[]} IDs dos buffs removidos
 */
export function cleanExpiredBuffs() {
    if (!gameState.playerBuffs) return [];

    const now = Date.now();
    const expired = gameState.playerBuffs.filter(b => b.expires <= now);

    if (expired.length > 0) {
        gameState.playerBuffs = gameState.playerBuffs.filter(b => b.expires > now);

        // Notifica buffs expirados
        expired.forEach(buff => {
            console.log(`[Buff] Expirado: ${buff.namePt || buff.name}`);
        });

        // Recalcula stats se algum buff tinha modificador de stat
        if (expired.some(b => b.effects?.statBonus)) {
            updateDerivedStats();
        }
    }

    return expired.map(b => b.id);
}

/**
 * Verifica se o jogador tem um buff ativo
 * @param {string} buffId 
 * @returns {boolean}
 */
export function hasBuff(buffId) {
    if (!gameState.playerBuffs) return false;
    return gameState.playerBuffs.some(b => b.id === buffId && b.expires > Date.now());
}

/**
 * Obtém um buff ativo
 * @param {string} buffId 
 * @returns {Buff|null}
 */
export function getBuff(buffId) {
    if (!gameState.playerBuffs) return null;
    return gameState.playerBuffs.find(b => b.id === buffId && b.expires > Date.now()) || null;
}

/**
 * Obtém todos os buffs ativos
 * @returns {Buff[]}
 */
export function getActiveBuffs() {
    if (!gameState.playerBuffs) return [];
    cleanExpiredBuffs();
    return [...gameState.playerBuffs];
}

/**
 * Calcula bônus de stat de todos os buffs ativos
 * @param {string} stat - Nome do stat (str, dex, etc)
 * @returns {number} Bônus total
 */
export function getBuffStatBonus(stat) {
    const activeBuffs = getActiveBuffs();
    let total = 0;

    for (const buff of activeBuffs) {
        if (buff.effects?.statBonus?.[stat]) {
            total += buff.effects.statBonus[stat] * (buff.stacks || 1);
        }
    }

    return total;
}

/**
 * Calcula modificador de dano de buffs
 * @param {string} damageType - Tipo de dano (opcional, para bônus específicos)
 * @returns {number} Multiplicador (ex: 1.15 para +15%)
 */
export function getBuffDamageModifier(damageType = null) {
    const activeBuffs = getActiveBuffs();
    let modifier = 1;

    for (const buff of activeBuffs) {
        if (buff.effects?.damageBonus) {
            // Bônus geral
            if (typeof buff.effects.damageBonus === 'number') {
                modifier *= buff.effects.damageBonus;
            }
            // Bônus específico por tipo
            else if (damageType && buff.effects.damageBonus[damageType]) {
                modifier *= buff.effects.damageBonus[damageType];
            }
        }
    }

    return modifier;
}

/**
 * Calcula bônus de AC de buffs
 * @returns {number}
 */
export function getBuffACBonus() {
    const activeBuffs = getActiveBuffs();
    let total = 0;

    for (const buff of activeBuffs) {
        if (buff.effects?.acBonus) {
            total += buff.effects.acBonus;
        }
    }

    return total;
}

// ========== BUFFS PRÉ-DEFINIDOS (para uso em campanhas) ==========

export const CAMPAIGN_BUFFS = {
    // Benção do Templo (mencionado no plano)
    temple_blessing: {
        id: 'temple_blessing',
        name: 'Temple Blessing',
        namePt: 'Benção do Templo',
        type: 'buff',
        icon: '🙏',
        effects: {
            healingBonus: 1.2, // +20% healing
            acBonus: 1
        }
    },

    // Bônus vs Undead (recompensa de campanha)
    undead_slayer: {
        id: 'undead_slayer',
        name: 'Undead Slayer',
        namePt: 'Destruidor de Mortos-Vivos',
        type: 'buff',
        icon: '☠️',
        effects: {
            damageBonus: { undead: 1.15 } // +15% vs undead
        }
    },

    // Visão Noturna (recompensa werewolf campaign)
    night_vision: {
        id: 'night_vision',
        name: 'Night Vision',
        namePt: 'Visão Noturna',
        type: 'buff',
        icon: '🌙',
        effects: {
            perceptionBonus: 5
        }
    },

    // Resistência a Fogo (recompensa dragon campaign)
    fire_resistance: {
        id: 'fire_resistance',
        name: 'Fire Resistance',
        namePt: 'Resistência a Fogo',
        type: 'buff',
        icon: '🔥',
        effects: {
            damageResistance: { fire: 0.5 } // 50% menos dano de fogo
        }
    },

    // Poção de Heroísmo
    heroism: {
        id: 'heroism',
        name: 'Heroism',
        namePt: 'Heroísmo',
        type: 'buff',
        icon: '⚔️',
        effects: {
            tempHp: 10,
            savingThrowBonus: 2
        }
    },

    // Dodge (do combat.js)
    dodging: {
        id: 'dodging',
        name: 'Dodging',
        namePt: 'Esquivando',
        type: 'buff',
        icon: '💨',
        effects: {
            attackDisadvantage: true // inimigos atacam com desvantagem
        }
    }
};

/**
 * Aplica um buff pré-definido de campanha
 * @param {string} buffId - ID do buff em CAMPAIGN_BUFFS
 * @param {number} durationMs - Duração (padrão 5 minutos)
 */
export function applyCampaignBuff(buffId, durationMs = 300000) {
    const buffTemplate = CAMPAIGN_BUFFS[buffId];
    if (!buffTemplate) {
        console.error(`[Buff] Buff de campanha não encontrado: ${buffId}`);
        return false;
    }

    return addBuff(buffTemplate, durationMs);
}
