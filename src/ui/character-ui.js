/**
 * Character UI Module
 * Gerencia a interface de personagem/ficha
 */

import { gameState, getClassIcon } from '../game/state.js';
import { getClassDefinition } from '../game/classes.js';
import { getXPProgress, getXPForLevel, getTotalXPForLevel } from '../game/progression.js';

// Callback para navegação
let setScreenFromModule = (screen) => {
    console.warn('setScreenFromModule não configurado');
};

/**
 * Configura a função de navegação de telas
 */
export function setCharacterUINavigation(setScreen) {
    setScreenFromModule = setScreen;
}

/**
 * Abre a tela de personagem
 */
export function openCharacterScreen() {
    updateCharacterScreen();
    setScreenFromModule('character-panel');
}

/**
 * Atualiza a tela de personagem
 */
export function updateCharacterScreen() {
    if (!gameState.player) return;

    const player = gameState.player;
    const classDef = getClassDefinition(player.class);

    // Info básica
    const classIconElem = document.getElementById('char-class-icon');
    if (classIconElem) {
        classIconElem.innerHTML = `<img src="${getClassIcon(player.class)}" alt="Classe" class="char-class-icon-img">`;
    }

    const charName = document.getElementById('char-name');
    const charClass = document.getElementById('char-class');
    const charLevel = document.getElementById('char-level');

    if (charName) charName.textContent = player.name;
    if (charClass) charClass.textContent = classDef?.namePt || player.class;
    if (charLevel) charLevel.textContent = `Nível ${player.level} `;

    // Barra de XP
    const xpProgress = getXPProgress(player.xp, player.level);
    const xpNeeded = getXPForLevel(player.level + 1);
    const xpCurrent = player.xp - getTotalXPForLevel(player.level);

    // Atualiza ouro
    const goldElem = document.getElementById('char-gold');
    if (goldElem) {
        goldElem.textContent = player.gold || 0;
    }

    const xpFill = document.getElementById('xp-fill');
    const xpText = document.getElementById('xp-text');

    if (xpFill) xpFill.style.width = `${xpProgress}% `;
    if (xpText) xpText.textContent = `${xpCurrent} / ${xpNeeded} XP`;

    // Atributos
    const attrs = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    attrs.forEach(attr => {
        const elem = document.getElementById(`attr-${attr}`);
        if (elem) elem.textContent = player[attr];
    });

    // Pontos de atributo
    const points = player.attributePoints || 0;
    const attrPoints = document.getElementById('attribute-points');
    if (attrPoints) {
        attrPoints.textContent = points > 0 ? `(${points} pontos)` : '';
    }

    // Mostra/esconde botões de +
    document.querySelectorAll('.attr-up-btn').forEach(btn => {
        btn.classList.toggle('visible', points > 0);
    });

    // Stats derivados
    const charHp = document.getElementById('char-hp');
    const charMana = document.getElementById('char-mana');
    const charAc = document.getElementById('char-ac');
    const charAttack = document.getElementById('char-attack');

    if (charHp) charHp.textContent = `${player.currentHp}/${player.maxHp}`;
    if (charMana) charMana.textContent = `${player.currentMana}/${player.maxMana}`;
    if (charAc) charAc.textContent = player.ac;
    if (charAttack) charAttack.textContent = `+${player.attackMod}`;

    // Habilidade de classe
    if (classDef) {
        const abilityName = document.querySelector('#class-ability .ability-name');
        const abilityDesc = document.querySelector('#class-ability .ability-desc');

        if (abilityName) abilityName.textContent = classDef.ability.namePt;
        if (abilityDesc) abilityDesc.textContent = classDef.ability.description;
    }
}
