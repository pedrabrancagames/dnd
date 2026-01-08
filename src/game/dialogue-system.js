/**
 * Sistema de Diálogos para NPCs
 * Gerencia árvores de diálogo e exibição na UI
 */

// Diálogos de exemplo (podem ser personalizados via Admin)
export const SAMPLE_DIALOGUES = {
    'quest_giver': {
        id: 'quest_giver',
        npcName: 'Ancião Misterioso',
        npcIcon: '🧙',
        nodes: {
            'start': {
                text: 'Ah, um aventureiro! Finalmente alguém corajoso aparece nestes tempos sombrios...',
                options: [
                    { text: 'O que está acontecendo?', next: 'explain' },
                    { text: 'Tenho pressa. O que você precisa?', next: 'quest' },
                    { text: 'Tchau.', next: 'end' }
                ]
            },
            'explain': {
                text: 'Uma praga de mortos-vivos assola nossa vila. Orcus, o senhor dos mortos, está enviando seus servos. Precisamos de heróis!',
                options: [
                    { text: 'Como posso ajudar?', next: 'quest' },
                    { text: 'Parece perigoso demais...', next: 'coward' }
                ]
            },
            'quest': {
                text: 'Preciso que você investigue o cemitério abandonado ao norte. Dizem que há uma fonte de energia maligna lá. Você aceita?',
                options: [
                    { text: 'Aceito a missão!', next: 'accept', action: 'accept_quest' },
                    { text: 'Preciso me preparar primeiro.', next: 'prepare' }
                ]
            },
            'accept': {
                text: 'Excelente! Que os deuses protejam você, aventureiro. Volte quando tiver descoberto algo. Tome esta poção, vai precisar.',
                reward: { type: 'item', itemId: 'health_potion', quantity: 1 },
                options: [
                    { text: 'Obrigado! Partirei imediatamente.', next: 'end' }
                ]
            },
            'prepare': {
                text: 'Sábio. Volte quando estiver pronto. O perigo não vai a lugar nenhum, infelizmente...',
                options: [
                    { text: 'Até breve.', next: 'end' }
                ]
            },
            'coward': {
                text: '*suspiro* Entendo. Nem todos têm coragem para enfrentar a escuridão. Vá em paz.',
                options: [
                    { text: 'Talvez eu volte depois...', next: 'end' }
                ]
            },
            'end': {
                text: '',
                isEnd: true
            }
        }
    },
    'merchant': {
        id: 'merchant',
        npcName: 'Mercador Viajante',
        npcIcon: '🧔',
        nodes: {
            'start': {
                text: 'Olá, viajante! Tenho itens raros de terras distantes. Quer dar uma olhada?',
                options: [
                    { text: 'O que você tem para vender?', next: 'shop', action: 'open_shop' },
                    { text: 'Notícias da estrada?', next: 'rumors' },
                    { text: 'Não, obrigado.', next: 'end' }
                ]
            },
            'shop': {
                text: 'Excelente! Aqui está meu estoque...',
                isEnd: true,
                action: 'open_shop'
            },
            'rumors': {
                text: 'Ouvi dizer que há criaturas estranhas aparecendo nas ruínas ao leste. Cuidado se for por lá!',
                options: [
                    { text: 'Obrigado pela informação!', next: 'end' },
                    { text: 'Vou verificar isso.', next: 'end' }
                ]
            },
            'end': {
                text: '',
                isEnd: true
            }
        }
    },
    'simple_greeting': {
        id: 'simple_greeting',
        npcName: 'Aldeão',
        npcIcon: '👤',
        nodes: {
            'start': {
                text: 'Bom dia, aventureiro! É sempre bom ver faces novas por aqui.',
                options: [
                    { text: 'Bom dia!', next: 'end' },
                    { text: 'Sabe de algo interessante por aqui?', next: 'hint' }
                ]
            },
            'hint': {
                text: 'Hmm, ouvi falar que há um baú escondido perto da fonte da praça. Mas não conte a ninguém que eu disse!',
                options: [
                    { text: 'Obrigado pela dica!', next: 'end' }
                ]
            },
            'end': {
                text: '',
                isEnd: true
            }
        }
    }
};

let currentDialogue = null;
let currentNode = null;
let dialogueCallback = null;

/**
 * Inicia um diálogo
 * @param {Object} dialogue - Objeto de diálogo ou ID de diálogo de exemplo
 * @param {Function} onComplete - Callback quando diálogo terminar
 */
export function startDialogue(dialogue, onComplete = null) {
    // Se for string, busca nos diálogos de exemplo
    if (typeof dialogue === 'string') {
        dialogue = SAMPLE_DIALOGUES[dialogue];
    }

    if (!dialogue || !dialogue.nodes) {
        console.error('[Dialogue] Diálogo inválido:', dialogue);
        return;
    }

    currentDialogue = dialogue;
    dialogueCallback = onComplete;

    showDialogueUI();
    goToNode('start');
}

/**
 * Navega para um nó do diálogo
 */
function goToNode(nodeId) {
    const node = currentDialogue.nodes[nodeId];

    if (!node) {
        console.error('[Dialogue] Nó não encontrado:', nodeId);
        endDialogue();
        return;
    }

    currentNode = node;

    // Se é nó final, encerra
    if (node.isEnd) {
        endDialogue();
        return;
    }

    // Atualiza UI
    updateDialogueUI(node);

    // Processa recompensas se houver
    if (node.reward) {
        processReward(node.reward);
    }
}

/**
 * Seleciona uma opção de resposta
 */
export function selectOption(optionIndex) {
    if (!currentNode || !currentNode.options) return;

    const option = currentNode.options[optionIndex];
    if (!option) return;

    // Executa ação se houver
    if (option.action) {
        executeAction(option.action);
    }

    // Navega para próximo nó
    if (option.next) {
        goToNode(option.next);
    } else {
        endDialogue();
    }
}

/**
 * Encerra o diálogo
 */
function endDialogue() {
    hideDialogueUI();

    if (dialogueCallback) {
        dialogueCallback(currentDialogue);
    }

    currentDialogue = null;
    currentNode = null;
    dialogueCallback = null;
}

/**
 * Processa recompensa do nó
 */
function processReward(reward) {
    console.log('[Dialogue] Recompensa:', reward);
    // TODO: Integrar com sistema de inventário
    // addItemToInventory(reward.itemId, reward.quantity);
}

/**
 * Executa ação especial
 */
function executeAction(action) {
    console.log('[Dialogue] Ação:', action);
    switch (action) {
        case 'accept_quest':
            // TODO: Marcar quest como aceita
            break;
        case 'open_shop':
            // TODO: Abrir loja
            break;
    }
}

/**
 * Mostra a UI de diálogo
 */
function showDialogueUI() {
    const modal = document.getElementById('dialogue-modal');
    if (modal) {
        modal.classList.add('active');

        // Atualiza nome e ícone do NPC
        const npcIcon = document.getElementById('dialogue-npc-icon');
        const npcName = document.getElementById('dialogue-npc-name');

        if (npcIcon) npcIcon.textContent = currentDialogue.npcIcon || '👤';
        if (npcName) npcName.textContent = currentDialogue.npcName || 'NPC';
    }
}

/**
 * Esconde a UI de diálogo
 */
function hideDialogueUI() {
    const modal = document.getElementById('dialogue-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/**
 * Atualiza a UI com o conteúdo do nó atual
 */
function updateDialogueUI(node) {
    const textEl = document.getElementById('dialogue-text');
    const optionsEl = document.getElementById('dialogue-options');

    // Efeito de digitação
    if (textEl) {
        typewriterEffect(textEl, node.text);
    }

    // Opções de resposta
    if (optionsEl && node.options) {
        // Delay para mostrar opções após o texto
        setTimeout(() => {
            optionsEl.innerHTML = node.options.map((opt, i) => `
                <button class="dialogue-option" onclick="window.selectDialogueOption(${i})">
                    ${opt.text}
                </button>
            `).join('');
            optionsEl.classList.add('visible');
        }, Math.min(node.text.length * 30, 1500)); // Max 1.5s delay
    }
}

/**
 * Efeito de digitação
 */
function typewriterEffect(element, text) {
    element.textContent = '';
    document.getElementById('dialogue-options')?.classList.remove('visible');

    let i = 0;
    const speed = 30; // ms por caractere

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }

    type();
}

/**
 * Cria diálogo simples a partir de texto
 */
export function createSimpleDialogue(npcName, npcIcon, text) {
    return {
        id: 'simple_' + Date.now(),
        npcName,
        npcIcon,
        nodes: {
            'start': {
                text,
                options: [
                    { text: 'Entendi.', next: 'end' }
                ]
            },
            'end': {
                isEnd: true
            }
        }
    };
}

// Expõe função para os botões
window.selectDialogueOption = selectOption;
