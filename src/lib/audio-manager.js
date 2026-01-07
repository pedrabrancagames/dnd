/**
 * Audio Manager - Gerenciamento de Sons do Jogo
 */

// Cache de áudios carregados
const audioCache = new Map();

// Volume global (0.0 a 1.0)
let masterVolume = 0.7;
let sfxVolume = 1.0;

// Mapeamento de sons
const SOUNDS = {
    // Combate
    swordImpact: '/sounds/sfx_sword_impact.mp3',
    arrowShot: '/sounds/sfx_arrow_shot.mp3',
    spellFire: '/sounds/sfx_spell_fire.mp3',
    spellHoly: '/sounds/sfx_spell_holy.mp3',
    monsterGrowl: '/sounds/sfx_monster_growl.mp3',
    dodgeWhoosh: '/sounds/sfx_dodge_whoosh.mp3',

    // Eventos
    successChime: '/sounds/sfx_success_chime.mp3',
    failThud: '/sounds/sfx_fail_thud.mp3',
    chestOpen: '/sounds/sfx_chest_open.mp3',

    // UI
    click: '/sounds/sfx_click.mp3',
    footsteps: '/sounds/sfx_footsteps_gravel.mp3'
};

/**
 * Pré-carrega os sons mais usados
 */
export function preloadSounds() {
    const prioritySounds = ['swordImpact', 'arrowShot', 'spellFire', 'monsterGrowl', 'click'];
    prioritySounds.forEach(key => {
        if (SOUNDS[key]) {
            const audio = new Audio(SOUNDS[key]);
            audio.preload = 'auto';
            audioCache.set(key, audio);
        }
    });
    console.log('🔊 Sons pré-carregados');
}

/**
 * Toca um som
 * @param {string} soundKey - Chave do som (ex: 'swordImpact')
 * @param {number} [volume=1.0] - Volume relativo (0.0 a 1.0)
 */
export function playSound(soundKey, volume = 1.0) {
    const soundPath = SOUNDS[soundKey];
    if (!soundPath) {
        console.warn('Som não encontrado:', soundKey);
        return;
    }

    try {
        // Cria nova instância para permitir sons simultâneos
        const audio = new Audio(soundPath);
        audio.volume = Math.min(1.0, masterVolume * sfxVolume * volume);
        audio.play().catch(e => {
            // Ignora erros de autoplay (requer interação do usuário)
            console.debug('Não foi possível tocar som:', e.message);
        });
    } catch (error) {
        console.error('Erro ao tocar som:', error);
    }
}

/**
 * Sons específicos para combate
 */
export function playSwordSound() {
    playSound('swordImpact');
}

export function playArrowSound() {
    playSound('arrowShot');
}

export function playFireSpellSound() {
    playSound('spellFire');
}

export function playHolySpellSound() {
    playSound('spellHoly');
}

export function playMonsterGrowl() {
    playSound('monsterGrowl', 0.8);
}

export function playDodgeSound() {
    playSound('dodgeWhoosh');
}

/**
 * Sons de eventos
 */
export function playSuccessSound() {
    playSound('successChime');
}

export function playFailSound() {
    playSound('failThud');
}

export function playChestOpenSound() {
    playSound('chestOpen');
}

export function playLevelUpSound() {
    playSound('successChime', 1.2); // Um pouco mais alto
}

/**
 * Sons de UI
 */
export function playClickSound() {
    playSound('click', 0.5);
}

export function playFootstepsSound() {
    playSound('footsteps', 0.4);
}

/**
 * Toca som de ataque baseado no tipo de arma
 * @param {string} weaponType - Tipo da arma (slashing, piercing, bludgeoning, fire, radiant, etc)
 */
export function playAttackSound(weaponType) {
    switch (weaponType) {
        case 'piercing':
            playArrowSound();
            break;
        case 'fire':
            playFireSpellSound();
            break;
        case 'radiant':
        case 'holy':
            playHolySpellSound();
            break;
        case 'slashing':
        case 'bludgeoning':
        default:
            playSwordSound();
            break;
    }
}

/**
 * Configurações de volume
 */
export function setMasterVolume(volume) {
    masterVolume = Math.max(0, Math.min(1, volume));
}

export function setSFXVolume(volume) {
    sfxVolume = Math.max(0, Math.min(1, volume));
}

export function getMasterVolume() {
    return masterVolume;
}

export function getSFXVolume() {
    return sfxVolume;
}
