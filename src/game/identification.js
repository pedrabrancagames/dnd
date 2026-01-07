/**
 * Sistema de Identificação de Itens e Detecção de Perigos
 * Implementa mecânicas de D&D para identificar itens mágicos e detectar armadilhas
 */

import { gameState } from './state.js';
import { rollSkillCheck } from '../lib/dice.js';
import { getItemById } from '../data/items.js';

/**
 * DCs para identificação baseado na raridade
 */
export const IDENTIFICATION_DCS = {
    common: 8,      // Fácil, quase sempre sucesso
    uncommon: 12,   // Moderado
    rare: 15,       // Difícil
    epic: 18,       // Muito difícil
    legendary: 22   // Extremamente difícil
};

/**
 * Tipos de armadilhas em baús
 */
export const TRAP_TYPES = {
    none: {
        id: 'none',
        name: 'Sem Armadilha',
        namePt: 'Seguro',
        dc: 0,
        damage: null
    },
    poison_dart: {
        id: 'poison_dart',
        name: 'Poison Dart Trap',
        namePt: 'Armadilha de Dardo Envenenado',
        dc: 12,
        insightDC: 10,
        damage: '1d6',
        damageType: 'poison',
        effect: 'poisoned',
        effectDuration: 60000, // 1 minuto
        description: 'Um dardo voa do mecanismo e te acerta!',
        hint: 'Você nota pequenos furos na frente do baú...'
    },
    fire_trap: {
        id: 'fire_trap',
        name: 'Fire Trap',
        namePt: 'Armadilha de Fogo',
        dc: 14,
        insightDC: 12,
        damage: '2d6',
        damageType: 'fire',
        description: 'Uma explosão de chamas irrompe do baú!',
        hint: 'Você sente um leve cheiro de enxofre...'
    },
    needle_trap: {
        id: 'needle_trap',
        name: 'Needle Trap',
        namePt: 'Armadilha de Agulha',
        dc: 10,
        insightDC: 8,
        damage: '1d4',
        damageType: 'piercing',
        effect: 'poisoned',
        effectDuration: 30000,
        description: 'Uma agulha oculta perfura seu dedo!',
        hint: 'A fechadura parece estranhamente elaborada...'
    },
    curse_trap: {
        id: 'curse_trap',
        name: 'Curse Trap',
        namePt: 'Armadilha Amaldiçoada',
        dc: 16,
        insightDC: 14,
        damage: null,
        effect: 'cursed',
        goldLoss: { min: 10, max: 50 },
        description: 'Uma energia negra envolve você e some com parte do seu ouro!',
        hint: 'Runas estranhas parecem pulsar sutilmente...'
    },
    mimic: {
        id: 'mimic',
        name: 'Mimic',
        namePt: 'Mímico',
        dc: 15,
        insightDC: 13,
        damage: null,
        triggersCombat: true,
        description: 'O baú abre uma boca cheia de dentes e te ataca!',
        hint: 'O baú parece... respirar?'
    }
};

/**
 * Verifica se um item precisa ser identificado
 * @param {Object} item - Item do banco de dados
 * @returns {boolean}
 */
export function needsIdentification(item) {
    if (!item) return false;

    // Itens comuns e consumíveis não precisam identificação
    if (item.type === 'consumable' && item.rarity === 'common') return false;
    if (item.rarity === 'common') return false;

    // Itens mágicos (uncommon+) precisam identificação
    return ['uncommon', 'rare', 'epic', 'legendary'].includes(item.rarity);
}

/**
 * Gera uma descrição misteriosa para item não identificado
 * @param {Object} item - Item original
 * @returns {Object} Item com informações ocultas
 */
export function getUnidentifiedInfo(item) {
    if (!item) return null;

    const mysteryNames = {
        weapon: ['Arma Estranha', 'Lâmina Misteriosa', 'Arma Rúnica'],
        armor: ['Armadura Estranha', 'Proteção Misteriosa', 'Vestimenta Rúnica'],
        accessory: ['Anel Misterioso', 'Amuleto Estranho', 'Joia Rúnica'],
        consumable: ['Poção Turva', 'Líquido Misterioso', 'Elixir Desconhecido']
    };

    const descriptions = {
        weapon: 'Uma arma com runas que você não consegue decifrar.',
        armor: 'Uma peça de armadura com símbolos estranhos.',
        accessory: 'Um objeto mágico de propósito desconhecido.',
        consumable: 'Um líquido de cor e cheiro peculiares.'
    };

    const names = mysteryNames[item.type] || ['Item Misterioso'];
    const randomName = names[Math.floor(Math.random() * names.length)];

    return {
        ...item,
        displayName: randomName,
        displayDescription: descriptions[item.type] || 'Um item de propósito desconhecido.',
        displayEffect: '???',
        displayDamage: item.damage ? '???' : undefined,
        displayAcBonus: item.acBonus ? '???' : undefined,
        isUnidentified: true
    };
}

/**
 * Tenta identificar um item
 * @param {string} inventoryItemId - ID do item no inventário
 * @param {string} skillUsed - 'arcana' ou 'investigation'
 * @returns {Object} Resultado da identificação
 */
export function attemptIdentification(inventoryItemId, skillUsed = 'arcana') {
    if (!gameState.player) {
        return { success: false, message: 'Jogador não encontrado' };
    }

    const inventory = gameState.player.inventory || [];
    const invItem = inventory.find(i => i.id === inventoryItemId);

    if (!invItem) {
        return { success: false, message: 'Item não encontrado no inventário' };
    }

    // Se já identificado
    if (invItem.identified) {
        return { success: true, alreadyIdentified: true, message: 'Este item já foi identificado.' };
    }

    const item = getItemById(invItem.itemId);
    if (!item) {
        return { success: false, message: 'Definição do item não encontrada' };
    }

    // Calcula DC baseado na raridade
    const dc = IDENTIFICATION_DCS[item.rarity] || IDENTIFICATION_DCS.uncommon;

    // Pega modificador da skill
    let skillMod = 0;
    if (gameState.player.skills && gameState.player.skills[skillUsed] !== undefined) {
        skillMod = gameState.player.skills[skillUsed];
    } else {
        // Fallback para modificador de atributo
        skillMod = skillUsed === 'arcana' ? gameState.player.intMod : gameState.player.intMod;
    }

    // Rola o teste
    const roll = rollSkillCheck(skillMod, dc);

    if (roll.success) {
        // Marca como identificado
        invItem.identified = true;

        return {
            success: true,
            roll: roll.total,
            natural: roll.natural,
            dc: dc,
            message: `Você identificou: ${item.namePt || item.name}!`,
            item: item,
            effect: item.effect || null
        };
    } else {
        return {
            success: false,
            roll: roll.total,
            natural: roll.natural,
            dc: dc,
            message: 'Você não consegue decifrar as propriedades mágicas.',
            canRetryLater: true
        };
    }
}

/**
 * Gera uma armadilha aleatória para um baú
 * @param {number} playerLevel - Nível do jogador (afeta dificuldade)
 * @returns {Object} Tipo de armadilha
 */
export function generateChestTrap(playerLevel = 1) {
    // 60% chance de não ter armadilha
    if (Math.random() < 0.6) {
        return TRAP_TYPES.none;
    }

    // Pesos baseados no nível do jogador
    const trapPool = [];

    // Armadilhas básicas (sempre disponíveis)
    trapPool.push({ trap: TRAP_TYPES.needle_trap, weight: 30 });
    trapPool.push({ trap: TRAP_TYPES.poison_dart, weight: 25 });

    // Armadilha de fogo (nível 3+)
    if (playerLevel >= 3) {
        trapPool.push({ trap: TRAP_TYPES.fire_trap, weight: 20 });
    }

    // Maldição (nível 5+)
    if (playerLevel >= 5) {
        trapPool.push({ trap: TRAP_TYPES.curse_trap, weight: 15 });
    }

    // Mímico (nível 4+, mais raro)
    if (playerLevel >= 4) {
        trapPool.push({ trap: TRAP_TYPES.mimic, weight: 10 });
    }

    // Seleciona aleatoriamente
    const totalWeight = trapPool.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;

    for (const entry of trapPool) {
        random -= entry.weight;
        if (random <= 0) {
            return entry.trap;
        }
    }

    return TRAP_TYPES.needle_trap; // Fallback
}

/**
 * Teste de Insight para detectar perigo
 * @param {Object} trap - Armadilha a ser detectada
 * @param {boolean} passive - Se é teste passivo (sem rolagem)
 * @returns {Object} Resultado da detecção
 */
export function detectDanger(trap, passive = true) {
    if (!gameState.player || !trap || trap.id === 'none') {
        return { detected: false, warning: false };
    }

    // Calcula Insight passivo ou ativo
    let insightScore = 0;

    if (gameState.player.skills && gameState.player.skills.insight !== undefined) {
        insightScore = 10 + gameState.player.skills.insight; // Passivo = 10 + mod
    } else {
        insightScore = 10 + (gameState.player.wisMod || 0);
    }

    if (passive) {
        // Teste passivo
        const detected = insightScore >= trap.insightDC;

        return {
            detected: detected,
            warning: detected,
            hint: detected ? trap.hint : null,
            insightUsed: insightScore,
            dc: trap.insightDC
        };
    } else {
        // Teste ativo (com rolagem)
        const skillMod = gameState.player.skills?.insight || gameState.player.wisMod || 0;
        const roll = rollSkillCheck(skillMod, trap.insightDC);

        return {
            detected: roll.success,
            warning: roll.success,
            hint: roll.success ? trap.hint : null,
            roll: roll.total,
            natural: roll.natural,
            dc: trap.insightDC
        };
    }
}

/**
 * Tenta desarmar uma armadilha
 * @param {Object} trap - Armadilha a ser desarmada
 * @returns {Object} Resultado
 */
export function attemptDisarm(trap) {
    if (!gameState.player || !trap || trap.id === 'none') {
        return { success: true, message: 'Nenhuma armadilha para desarmar.' };
    }

    // Mímico não pode ser desarmado, só combatido
    if (trap.id === 'mimic') {
        return {
            success: false,
            message: 'Isto não é uma armadilha comum!',
            triggersCombat: true,
            monsterId: 'mimic'
        };
    }

    // Usa Investigation ou Sleight of Hand (usamos Investigation por simplicidade)
    let skillMod = 0;
    if (gameState.player.skills && gameState.player.skills.investigation !== undefined) {
        skillMod = gameState.player.skills.investigation;
    } else {
        skillMod = gameState.player.intMod || 0;
    }

    const roll = rollSkillCheck(skillMod, trap.dc);

    if (roll.success) {
        return {
            success: true,
            roll: roll.total,
            natural: roll.natural,
            dc: trap.dc,
            message: `Você desarmou a ${trap.namePt}!`,
            xpReward: Math.floor(trap.dc * 5) // XP pela façanha
        };
    } else {
        // Falha ao desarmar ativa a armadilha
        return {
            success: false,
            roll: roll.total,
            natural: roll.natural,
            dc: trap.dc,
            message: `Você falhou e ativou a armadilha!`,
            triggeredTrap: true
        };
    }
}

/**
 * Aplica os efeitos de uma armadilha ativada
 * @param {Object} trap - Armadilha ativada
 * @returns {Object} Dano e efeitos aplicados
 */
export function applyTrapEffects(trap) {
    if (!gameState.player || !trap) {
        return { damage: 0, effects: [] };
    }

    const results = {
        damage: 0,
        damageType: trap.damageType || 'piercing',
        effects: [],
        goldLost: 0,
        message: trap.description
    };

    // Calcula dano se houver
    if (trap.damage) {
        const parts = trap.damage.match(/(\d+)d(\d+)/);
        if (parts) {
            const numDice = parseInt(parts[1]);
            const dieSize = parseInt(parts[2]);
            for (let i = 0; i < numDice; i++) {
                results.damage += Math.floor(Math.random() * dieSize) + 1;
            }
        }

        gameState.player.currentHp = Math.max(0, gameState.player.currentHp - results.damage);
    }

    // Aplica efeitos de status
    if (trap.effect) {
        results.effects.push({
            type: trap.effect,
            duration: trap.effectDuration || 30000,
            appliedAt: Date.now()
        });

        // Adiciona ao estado do jogador
        if (!gameState.playerDebuffs) gameState.playerDebuffs = [];
        gameState.playerDebuffs.push({
            type: trap.effect,
            expires: Date.now() + (trap.effectDuration || 30000)
        });
    }

    // Perda de ouro (maldição)
    if (trap.goldLoss) {
        const goldLost = Math.floor(
            Math.random() * (trap.goldLoss.max - trap.goldLoss.min + 1)
        ) + trap.goldLoss.min;

        gameState.player.gold = Math.max(0, (gameState.player.gold || 0) - goldLost);
        results.goldLost = goldLost;
    }

    return results;
}

/**
 * Obtém informações de exibição de um item (considerando identificação)
 * @param {Object} invItem - Item do inventário
 * @returns {Object} Informações de exibição
 */
export function getItemDisplayInfo(invItem) {
    if (!invItem) return null;

    const item = getItemById(invItem.itemId);
    if (!item) return null;

    // Se não precisa identificação ou já foi identificado
    if (!needsIdentification(item) || invItem.identified) {
        return {
            ...item,
            identified: true,
            displayName: item.namePt || item.name,
            displayEffect: item.effect,
            displayDamage: item.damage,
            displayAcBonus: item.acBonus
        };
    }

    // Retorna versão não identificada
    return getUnidentifiedInfo(item);
}

export default {
    IDENTIFICATION_DCS,
    TRAP_TYPES,
    needsIdentification,
    getUnidentifiedInfo,
    attemptIdentification,
    generateChestTrap,
    detectDanger,
    attemptDisarm,
    applyTrapEffects,
    getItemDisplayInfo
};
