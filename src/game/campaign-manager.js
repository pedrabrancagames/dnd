/**
 * Campaign Manager
 * Gerencia o sistema de campanhas progressivas
 */

import { gameState } from './state.js';
import { CAMPAIGNS } from '../data/campaigns.js';
import { initBuffSystem, applyCampaignBuff, CAMPAIGN_BUFFS } from './buff-manager.js';

// Estado da campanha atual
const campaignState = {
    currentCampaign: null,
    chapter: 1,
    objectives: {},
    globalProgress: {
        campaignKills: 0,
        artifactsFound: 0,
        bossesDefeated: 0
    },
    playerContribution: {
        score: 0,
        personalObjectives: [],
        rewardsClaimed: []
    },
    worldFlags: {}
};

/**
 * Inicializa o sistema de campanhas
 * @param {string} campaignId - ID da campanha a iniciar
 */
export function initCampaign(campaignId = null) {
    // Se já tem uma campanha ativa, usa ela
    if (campaignState.currentCampaign) {
        console.log(`[Campaign] Campanha ativa: ${campaignState.currentCampaign.name}`);
        return campaignState.currentCampaign;
    }

    // Se não especificou, usa a primeira disponível
    const campaign = campaignId
        ? CAMPAIGNS[campaignId]
        : Object.values(CAMPAIGNS)[0];

    if (!campaign) {
        console.error('[Campaign] Nenhuma campanha encontrada');
        return null;
    }

    campaignState.currentCampaign = campaign;
    campaignState.chapter = 1;
    campaignState.objectives = initializeChapterObjectives(campaign, 1);

    console.log(`[Campaign] Iniciada: ${campaign.name}`);
    return campaign;
}

/**
 * Inicializa os objetivos de um capítulo
 */
function initializeChapterObjectives(campaign, chapterNumber) {
    const chapter = campaign.chapters?.[chapterNumber - 1];
    if (!chapter) return {};

    const objectives = {};
    chapter.objectives?.forEach(obj => {
        objectives[obj.id] = {
            ...obj,
            current: 0
        };
    });

    return objectives;
}

/**
 * Obtém a campanha atual
 */
export function getCurrentCampaign() {
    return campaignState.currentCampaign;
}

/**
 * Obtém o capítulo atual
 */
export function getCurrentChapter() {
    if (!campaignState.currentCampaign) return null;

    const chapter = campaignState.currentCampaign.chapters?.[campaignState.chapter - 1];
    return chapter ? { ...chapter, number: campaignState.chapter } : null;
}

/**
 * Obtém os objetivos do capítulo atual
 */
export function getChapterObjectives() {
    return campaignState.objectives;
}

/**
 * Atualiza progresso de um objetivo
 * @param {string} objectiveId - ID do objetivo
 * @param {number} amount - Quantidade a adicionar (default: 1)
 */
export function updateObjective(objectiveId, amount = 1) {
    const objective = campaignState.objectives[objectiveId];
    if (!objective) {
        console.warn(`[Campaign] Objetivo não encontrado: ${objectiveId}`);
        return null;
    }

    objective.current = Math.min(objective.current + amount, objective.target);

    console.log(`[Campaign] Objetivo ${objectiveId}: ${objective.current}/${objective.target}`);

    // Verifica se capítulo foi completado
    if (isChapterComplete()) {
        onChapterComplete();
    }

    // Atualiza contribuição do jogador
    campaignState.playerContribution.score += amount;

    return objective;
}

/**
 * Registra uma kill para a campanha
 * @param {Object} monster - Monstro derrotado
 */
export function registerCampaignKill(monster) {
    campaignState.globalProgress.campaignKills++;

    // Verifica se tem objetivo relacionado
    const killObjective = Object.keys(campaignState.objectives).find(key => {
        const obj = campaignState.objectives[key];
        return obj.type === 'kill' &&
            (obj.monsterType === monster.type || obj.monsterType === 'any');
    });

    if (killObjective) {
        updateObjective(killObjective);
    }

    // Checa por objetivos específicos de monstro
    const specificKill = Object.keys(campaignState.objectives).find(key => {
        const obj = campaignState.objectives[key];
        return obj.type === 'kill' && obj.monsterId === monster.templateId;
    });

    if (specificKill) {
        updateObjective(specificKill);
    }

    console.log(`[Campaign] Kill registrada: ${monster.name} (total: ${campaignState.globalProgress.campaignKills})`);
}

/**
 * Registra uma descoberta/artefato
 */
export function registerArtifactFound(artifactId) {
    campaignState.globalProgress.artifactsFound++;

    // Verifica objetivos
    const findObjective = Object.keys(campaignState.objectives).find(key => {
        const obj = campaignState.objectives[key];
        return obj.type === 'find' &&
            (obj.artifactId === artifactId || obj.artifactId === 'any');
    });

    if (findObjective) {
        updateObjective(findObjective);
    }

    console.log(`[Campaign] Artefato encontrado: ${artifactId}`);
}

/**
 * Registra boss derrotado
 */
export function registerBossDefeated(bossId) {
    campaignState.globalProgress.bossesDefeated++;

    const bossObjective = Object.keys(campaignState.objectives).find(key => {
        const obj = campaignState.objectives[key];
        return obj.type === 'boss' && obj.bossId === bossId;
    });

    if (bossObjective) {
        updateObjective(bossObjective);
    }

    console.log(`[Campaign] Boss derrotado: ${bossId}`);
}

/**
 * Verifica se o capítulo atual está completo
 */
export function isChapterComplete() {
    return Object.values(campaignState.objectives).every(
        obj => obj.current >= obj.target
    );
}

/**
 * Callback quando capítulo é completado
 */
function onChapterComplete() {
    const chapter = getCurrentChapter();
    console.log(`[Campaign] Capítulo ${chapter.number} completado!`);

    // Aplica recompensas do capítulo
    if (chapter.rewards) {
        applyChapterRewards(chapter.rewards);
    }

    // Avança para próximo capítulo
    const campaign = campaignState.currentCampaign;
    if (campaignState.chapter < campaign.chapters.length) {
        advanceChapter();
    } else {
        onCampaignComplete();
    }
}

/**
 * Avança para o próximo capítulo
 */
function advanceChapter() {
    campaignState.chapter++;
    campaignState.objectives = initializeChapterObjectives(
        campaignState.currentCampaign,
        campaignState.chapter
    );

    const chapter = getCurrentChapter();
    console.log(`[Campaign] Avançou para: Capítulo ${chapter.number} - ${chapter.name}`);

    // Dispara evento de novo capítulo
    window.dispatchEvent(new CustomEvent('campaign:chapter-started', {
        detail: { chapter: campaignState.chapter }
    }));
}

/**
 * Callback quando campanha é completada
 */
function onCampaignComplete() {
    const campaign = campaignState.currentCampaign;
    console.log(`[Campaign] CAMPANHA COMPLETA: ${campaign.name}!`);

    // Aplica recompensas finais
    if (campaign.finalRewards) {
        applyCampaignRewards(campaign.finalRewards);
    }

    // Aplica título
    if (campaign.completionTitle) {
        applyTitle(campaign.completionTitle);
    }

    // Dispara evento
    window.dispatchEvent(new CustomEvent('campaign:completed', {
        detail: { campaign: campaign.id }
    }));
}

/**
 * Aplica recompensas de capítulo
 */
function applyChapterRewards(rewards) {
    if (!gameState.player) return;

    if (rewards.xp) {
        gameState.player.xp += rewards.xp;
        console.log(`[Campaign] +${rewards.xp} XP`);
    }

    if (rewards.gold) {
        gameState.player.gold = (gameState.player.gold || 0) + rewards.gold;
        console.log(`[Campaign] +${rewards.gold} ouro`);
    }

    if (rewards.buff) {
        applyCampaignBuff(rewards.buff, rewards.buffDuration || 600000); // 10 min default
        console.log(`[Campaign] Buff aplicado: ${rewards.buff}`);
    }
}

/**
 * Aplica recompensas finais de campanha
 */
function applyCampaignRewards(rewards) {
    applyChapterRewards(rewards);

    if (rewards.item) {
        // TODO: Importar e usar addItemToInventory
        console.log(`[Campaign] Item recebido: ${rewards.item}`);
    }

    if (rewards.bonuses) {
        // Aplica bônus permanentes
        Object.entries(rewards.bonuses).forEach(([key, value]) => {
            if (!gameState.player.campaignBonuses) {
                gameState.player.campaignBonuses = {};
            }
            gameState.player.campaignBonuses[key] = value;
        });
        console.log('[Campaign] Bônus permanentes aplicados');
    }
}

/**
 * Aplica título de campanha
 */
function applyTitle(title) {
    if (!gameState.player.titles) {
        gameState.player.titles = [];
    }
    gameState.player.titles.push(title);
    gameState.player.activeTitle = title.id;
    console.log(`[Campaign] Título recebido: ${title.name}`);
}

/**
 * Define uma world flag
 */
export function setWorldFlag(flag, value) {
    campaignState.worldFlags[flag] = value;
    console.log(`[Campaign] World flag setada: ${flag} = ${value}`);
}

/**
 * Obtém uma world flag
 */
export function getWorldFlag(flag) {
    return campaignState.worldFlags[flag];
}

/**
 * Obtém modificadores de spawn baseados no estado do mundo
 */
export function getSpawnModifiers() {
    const mods = { ...DEFAULT_SPAWN_MODIFIERS };

    // Ajusta baseado em flags
    if (campaignState.worldFlags.cultDefeated) {
        mods.undead = (mods.undead || 1) * 0.5; // -50% undead
    }

    if (campaignState.worldFlags.druidAlly) {
        mods.beast = (mods.beast || 1) * 0.7; // -30% beasts
    }

    // Ajusta baseado no capítulo atual
    const campaign = campaignState.currentCampaign;
    if (campaign) {
        const chapterMods = campaign.chapters?.[campaignState.chapter - 1]?.spawnModifiers;
        if (chapterMods) {
            Object.assign(mods, chapterMods);
        }
    }

    return mods;
}

const DEFAULT_SPAWN_MODIFIERS = {
    undead: 1,
    beast: 1,
    humanoid: 1,
    dragon: 1,
    fiend: 1
};

/**
 * Obtém o progresso geral da campanha como porcentagem
 */
export function getCampaignProgress() {
    if (!campaignState.currentCampaign) return 0;

    const totalChapters = campaignState.currentCampaign.chapters?.length || 1;
    const completedChapters = campaignState.chapter - 1;

    // Progresso do capítulo atual
    const objectives = Object.values(campaignState.objectives);
    let chapterProgress = 0;
    if (objectives.length > 0) {
        chapterProgress = objectives.reduce((sum, obj) => {
            return sum + (obj.current / obj.target);
        }, 0) / objectives.length;
    }

    const totalProgress = (completedChapters + chapterProgress) / totalChapters;
    return Math.round(totalProgress * 100);
}

/**
 * Obtém dados para UI de campanha
 */
export function getCampaignUIData() {
    const campaign = campaignState.currentCampaign;
    if (!campaign) return null;

    const chapter = getCurrentChapter();
    const objectives = getChapterObjectives();

    return {
        campaign: {
            id: campaign.id,
            name: campaign.name,
            description: campaign.description,
            icon: campaign.icon
        },
        chapter: chapter ? {
            number: chapter.number,
            name: chapter.name,
            description: chapter.description
        } : null,
        objectives: Object.values(objectives).map(obj => ({
            id: obj.id,
            description: obj.description,
            current: obj.current,
            target: obj.target,
            complete: obj.current >= obj.target
        })),
        progress: getCampaignProgress(),
        playerContribution: campaignState.playerContribution.score
    };
}

/**
 * Salva o estado da campanha (para persistência)
 */
export function saveCampaignState() {
    return {
        campaignId: campaignState.currentCampaign?.id,
        chapter: campaignState.chapter,
        objectives: campaignState.objectives,
        globalProgress: campaignState.globalProgress,
        playerContribution: campaignState.playerContribution,
        worldFlags: campaignState.worldFlags
    };
}

/**
 * Carrega o estado da campanha
 */
export function loadCampaignState(savedState) {
    if (!savedState) return;

    if (savedState.campaignId) {
        campaignState.currentCampaign = CAMPAIGNS[savedState.campaignId];
    }
    campaignState.chapter = savedState.chapter || 1;
    campaignState.objectives = savedState.objectives || {};
    campaignState.globalProgress = savedState.globalProgress || campaignState.globalProgress;
    campaignState.playerContribution = savedState.playerContribution || campaignState.playerContribution;
    campaignState.worldFlags = savedState.worldFlags || {};

    console.log('[Campaign] Estado carregado');
}
