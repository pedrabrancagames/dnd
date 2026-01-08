/**
 * Combat UI Module
 * Gerencia a interface de combate AR
 */

import { gameState, updateDerivedStats, startCombat, endCombat } from '../game/state.js';
import {
    playerAttack,
    castDamageSpell,
    playerDodge,
    useHealingPotion,
    attemptFlee,
    isMonsterDefeated,
    isPlayerDefeated,
    monsterAttack
} from '../game/combat.js';
import {
    startARSession,
    endARSession,
    showMonsterDamageEffect,
    showMonsterDeathEffect,
    isARSessionActive,
    showEquippedWeapon,
    animateWeaponAttack,
    showARMessage
} from '../ar/ar-manager.js';
import { getEquippedItem } from '../game/inventory.js';
import { rollD20Animation } from '../ar/dice-animation.js';
import { playAttackSound, playDodgeSound } from '../lib/audio-manager.js';

// Estado local do módulo
let isAttacking = false;

/**
 * Inicia combate em AR
 */
export async function startARCombat(onVictory, onDefeat, goToMap) {
    if (!gameState.currentMonster) return;

    // Esconde painel de monstro
    document.getElementById('monster-panel')?.classList.add('hidden');

    // Inicia o combate primeiro
    startCombat(gameState.currentMonster);
    setScreenFromModule('ar');
    updateARHUD();

    // Tenta iniciar sessão AR (opcional, o combate funciona sem ela)
    const arStarted = await startARSession({
        monsterId: gameState.currentMonster?.templateId,
        onPlaced: async () => {
            console.log('✅ Monstro posicionado em AR');

            // Carrega e exibe a arma equipada do jogador
            const equippedWeapon = getEquippedItem('weapon');
            if (equippedWeapon?.modelPath) {
                console.log('⚔️ Carregando arma equipada:', equippedWeapon.namePt);
                await showEquippedWeapon(equippedWeapon.modelPath);
            }
        },
        onEnd: () => {
            console.log('ℹ️ Sessão AR encerrada - combate continua em modo 2D');
            // Não volta ao mapa automaticamente - o combate continua
        }
    });

    if (!arStarted) {
        console.warn('⚠️ Modo AR não disponível, usando interface 2D');
    }

    // Mostra mensagem de início de combate
    showARMessage('Seu turno! Escolha uma ação.');

    // Armazena callbacks
    combatCallbacks.onVictory = onVictory;
    combatCallbacks.onDefeat = onDefeat;
    combatCallbacks.goToMap = goToMap;
}

// Callbacks de combate
const combatCallbacks = {
    onVictory: null,
    onDefeat: null,
    goToMap: null
};

// Função auxiliar para setar tela (será chamada externamente)
let setScreenFromModule = (screen) => {
    console.warn('setScreenFromModule não configurado');
};

/**
 * Configura a função de navegação de telas
 */
export function setCombatUINavigation(setScreen) {
    setScreenFromModule = setScreen;
}

/**
 * Atualiza o HUD de AR
 */
export function updateARHUD() {
    if (!gameState.player || !gameState.currentMonster) return;

    const player = gameState.player;
    const monster = gameState.currentMonster;

    // HP/Mana do jogador
    const hpPercent = (player.currentHp / player.maxHp) * 100;
    const manaPercent = (player.currentMana / player.maxMana) * 100;

    document.getElementById('ar-hp-fill').style.width = `${hpPercent}%`;
    document.getElementById('ar-hp-value').textContent = `${player.currentHp}/${player.maxHp}`;
    document.getElementById('ar-mana-fill').style.width = `${manaPercent}%`;
    document.getElementById('ar-mana-value').textContent = `${player.currentMana}/${player.maxMana}`;

    // HP do monstro
    const monsterHpPercent = (monster.currentHp / monster.maxHp) * 100;
    document.getElementById('ar-monster-name').textContent = `${monster.emoji} ${monster.name}`;
    document.getElementById('ar-monster-hp-fill').style.width = `${monsterHpPercent}%`;
}

/**
 * Mostra popup de dano
 */
export function showDamagePopup(damage, type = 'normal', isCritical = false) {
    const container = document.getElementById('damage-popups');
    if (!container) return;

    const popup = document.createElement('div');
    popup.className = `damage-popup ${type} ${isCritical ? 'critical' : ''}`;
    popup.textContent = type === 'miss' ? 'MISS' : (type === 'heal' ? `+${damage}` : `-${damage}`);

    // Posição aleatória no centro
    popup.style.left = `${40 + Math.random() * 20}%`;
    popup.style.top = `${30 + Math.random() * 20}%`;

    container.appendChild(popup);

    setTimeout(() => popup.remove(), 1000);
}

/**
 * Executa turno do monstro (após ação do jogador)
 */
export function executeMonsterTurn() {
    if (!gameState.inCombat || !gameState.currentMonster) return;
    if (isMonsterDefeated()) return;

    // Delay maior para o player ver o resultado do seu próprio ataque antes
    setTimeout(() => {
        if (!gameState.inCombat || !gameState.currentMonster) return;
        if (isMonsterDefeated()) return;

        // 1. Avisa ataque
        showARMessage(`${gameState.currentMonster.emoji} ${gameState.currentMonster.name} vai atacar!`);

        // 2. Calcula resultado (rolagem "server-side")
        const result = monsterAttack();

        if (result) {
            // 3. Pequeno delay e rola o dado
            setTimeout(() => {
                showARMessage(`🎲 d20: ${result.natural}`);

                try {
                    rollD20Animation(result.natural, () => {
                        // 4. Callback pós-animação: Aplica efeitos visuais
                        if (result.hit) {
                            showDamagePopup(result.damage, result.isCritical ? 'critical' : 'normal', result.isCritical);

                            if (result.isCritical) {
                                showARMessage(`CRÍTICO! Sofreu ${result.damage} dano!`);
                            } else {
                                showARMessage(`Acertado! Sofreu ${result.damage} dano`);
                            }
                        } else {
                            showDamagePopup(0, 'miss');
                            showARMessage('Esquivou!');
                        }

                        updateARHUD();

                        // 5. Verifica derrota ou passa a vez
                        if (isPlayerDefeated()) {
                            if (combatCallbacks.onDefeat) combatCallbacks.onDefeat();
                        } else {
                            setTimeout(() => {
                                showARMessage("Sua vez!");
                            }, 1000);
                        }
                    });
                } catch (e) {
                    // Fallback
                    console.error("Erro animação monstro", e);
                    if (result.hit) showDamagePopup(result.damage, 'normal');
                    updateARHUD();
                }
            }, 1000);
        }
    }, 1500);
}

/**
 * Handler de ataque do jogador
 */
export function handleAttack() {
    console.log('🗡️ handleAttack chamado');

    if (isAttacking) {
        console.log('🗡️ Já está atacando, ignorando');
        return;
    }

    const result = playerAttack();
    console.log('🗡️ Resultado do ataque:', result);

    if (!result) {
        console.log('🗡️ Ataque retornou null - sem combate ativo?');
        showARMessage('Nenhum combate ativo!');
        return;
    }

    isAttacking = true;

    // Mostra o resultado do dado primeiro
    showARMessage(`🎲 d20: ${result.natural}`);

    // Tenta animação do dado, com fallback
    try {
        rollD20Animation(result.natural, () => {
            processAttackResult(result);
        });
    } catch (e) {
        console.error('🎲 Erro na animação do dado:', e);
        // Fallback: processa resultado sem animação
        setTimeout(() => processAttackResult(result), 500);
    }
}

/**
 * Processa o resultado do ataque após animação
 */
function processAttackResult(result) {
    isAttacking = false;

    if (result.hit) {
        showDamagePopup(result.damage, result.isCritical ? 'critical' : 'fire', result.isCritical);
        showMonsterDamageEffect(result.damage, result.isCritical);
        animateWeaponAttack(); // Anima a arma 3D
        playAttackSound(result.damageType || 'slashing'); // Som de ataque
        if (result.isCritical) {
            showARMessage('CRÍTICO! Dano dobrado!');
        } else {
            showARMessage(`Acertou! ${result.damage} de dano`);
        }
    } else {
        showDamagePopup(0, 'miss');
        if (result.isFumble) {
            showARMessage('Falha Crítica!');
        } else {
            showARMessage('Errou!');
        }
    }

    updateARHUD();

    if (isMonsterDefeated()) {
        showMonsterDeathEffect();
        setTimeout(() => {
            if (combatCallbacks.onVictory) combatCallbacks.onVictory();
        }, 1200);
    } else {
        executeMonsterTurn();
    }
}

/**
 * Handler de magia
 */
export function handleSpell() {
    if (!gameState.player) return;

    // Seleciona cantrip baseado na classe
    let spellId = 'fireBolt'; // Default (Mage)
    if (gameState.player.class === 'cleric') spellId = 'sacredFlame';

    const result = castDamageSpell(spellId);
    if (!result) return;

    if (!result.success) {
        showARMessage(result.message || 'Falha ao lançar');
        return;
    }

    showARMessage(result.message);

    // Verifica vitória ou passa turno
    if (isMonsterDefeated()) {
        showMonsterDeathEffect();
        setTimeout(() => {
            if (combatCallbacks.onVictory) combatCallbacks.onVictory();
        }, 1200);
    } else {
        executeMonsterTurn();
    }
}

/**
 * Handler de Dodge
 */
export function handleDodge() {
    console.log('🛡️ handleDodge chamado');
    if (isAttacking) return;

    const result = playerDodge();
    if (!result.success) {
        showARMessage(result.message);
        return;
    }

    playDodgeSound(); // Som de esquiva
    showARMessage(result.message);
    executeMonsterTurn();
}

/**
 * Handler de item
 */
export function handleItem() {
    const result = useHealingPotion();
    if (!result.success) {
        showARMessage(result.message);
        return;
    }

    showDamagePopup(result.healAmount, 'heal');
    showARMessage(`Curou ${result.healAmount} HP!`);
    updateARHUD();

    // Usar item gasta um turno
    executeMonsterTurn();
}

/**
 * Handler de fuga
 */
export async function handleFlee() {
    const result = attemptFlee();

    showARMessage(result.message);

    if (result.success) {
        // Tenta encerrar sessão AR com segurança
        try {
            if (isARSessionActive()) {
                await endARSession();
            }
        } catch (e) {
            console.error("Erro ao encerrar AR na fuga:", e);
        }

        endCombat();

        // Volta para o mapa
        setTimeout(() => {
            if (combatCallbacks.goToMap) combatCallbacks.goToMap();
        }, 1000);
    } else {
        updateARHUD();

        if (isPlayerDefeated()) {
            if (combatCallbacks.onDefeat) combatCallbacks.onDefeat();
        }
    }
}

/**
 * Configura listeners de combate
 */
export function setupCombatListeners() {
    document.getElementById('attack-btn')?.addEventListener('click', handleAttack);
    document.getElementById('spell-btn')?.addEventListener('click', handleSpell);
    document.getElementById('item-btn')?.addEventListener('click', handleItem);
    document.getElementById('flee-btn')?.addEventListener('click', handleFlee);
    document.getElementById('dodge-btn')?.addEventListener('click', handleDodge);
}
