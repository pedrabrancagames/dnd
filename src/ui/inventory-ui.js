/**
 * Inventory UI Module
 * Gerencia a interface de inventário
 */

import { gameState } from '../game/state.js';
import {
    getInventoryWithDetails,
    getEquippedItem,
    equipItem,
    unequipItem,
    useItem,
    initInventory
} from '../game/inventory.js';
import { getRarityColor } from '../data/items.js';
import { showARMessage } from '../ar/ar-manager.js';

// Estado local do módulo
let selectedInventoryItem = null;

// Callback para navegação
let setScreenFromModule = (screen) => {
    console.warn('setScreenFromModule não configurado');
};

/**
 * Configura a função de navegação de telas
 */
export function setInventoryUINavigation(setScreen) {
    setScreenFromModule = setScreen;
}

/**
 * Abre a tela de inventário
 */
export function openInventoryScreen() {
    initInventory();
    updateInventoryScreen();
    setScreenFromModule('inventory');
}

/**
 * Atualiza a tela de inventário
 */
export function updateInventoryScreen() {
    if (!gameState.player) return;

    // Atualiza slots equipados
    const weaponSlot = document.getElementById('equipped-weapon');
    const armorSlot = document.getElementById('equipped-armor');
    const accessorySlot = document.getElementById('equipped-accessory');

    const equippedWeapon = getEquippedItem('weapon');
    const equippedArmor = getEquippedItem('armor');
    const equippedAccessory = getEquippedItem('accessory');

    if (weaponSlot) weaponSlot.textContent = equippedWeapon?.namePt || 'Vazio';
    if (armorSlot) armorSlot.textContent = equippedArmor?.namePt || 'Vazio';
    if (accessorySlot) accessorySlot.textContent = equippedAccessory?.namePt || 'Vazio';

    // Atualiza grid de itens
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;

    grid.innerHTML = '';

    const inventory = getInventoryWithDetails();

    inventory.forEach(invItem => {
        const div = document.createElement('div');
        div.className = 'inventory-item';
        div.style.borderColor = getRarityColor(invItem.item.rarity);
        div.dataset.instanceId = invItem.id;

        // Ícone baseado no tipo ou específico do item
        const icons = {
            weapon: '⚔️',
            armor: '🛡️',
            accessory: '💍',
            consumable: '🧪'
        };

        const itemIcon = invItem.item.icon || icons[invItem.item.type] || '📦';

        if (invItem.item.image) {
            div.innerHTML = `<img src="${invItem.item.image}" alt="${invItem.item.name}" class="item-icon-img" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
                             <span class="item-icon-emoji" style="display:none">${itemIcon}</span>`;
        } else {
            div.innerHTML = `<span class="item-icon-emoji">${itemIcon}</span>`;
        }


        if (invItem.quantity > 1) {
            const qty = document.createElement('span');
            qty.className = 'quantity';
            qty.textContent = invItem.quantity;
            div.appendChild(qty);
        }

        div.addEventListener('click', () => selectInventoryItem(invItem));
        grid.appendChild(div);
    });
}

/**
 * Seleciona um item no inventário
 */
export function selectInventoryItem(invItem) {
    selectedInventoryItem = invItem;

    // Destaca item selecionado
    document.querySelectorAll('.inventory-item').forEach(el => el.classList.remove('selected'));
    document.querySelector(`[data-instance-id="${invItem.id}"]`)?.classList.add('selected');

    // Mostra detalhes
    const details = document.getElementById('item-details');
    if (details) details.classList.remove('hidden');

    const itemName = document.getElementById('item-name');
    const itemDesc = document.getElementById('item-description');

    if (itemName) {
        itemName.textContent = invItem.item.namePt || invItem.item.name;
        itemName.style.color = getRarityColor(invItem.item.rarity);
    }
    if (itemDesc) {
        itemDesc.textContent = invItem.item.effect || '';
    }

    const stats = document.getElementById('item-stats');
    if (stats) {
        stats.innerHTML = '';

        if (invItem.item.damage) {
            stats.innerHTML += `<div>Dano: ${invItem.item.damage}</div>`;
        }
        if (invItem.item.acBonus) {
            stats.innerHTML += `<div>AC: +${invItem.item.acBonus}</div>`;
        }
    }

    // Mostra botões apropriados
    const equipBtn = document.getElementById('equip-item-btn');
    const useBtn = document.getElementById('use-item-btn');
    const unequipBtn = document.getElementById('unequip-item-btn');

    if (invItem.item.type === 'consumable') {
        if (equipBtn) equipBtn.style.display = 'none';
        if (unequipBtn) unequipBtn.style.display = 'none';
        if (useBtn) {
            useBtn.style.display = 'block';
            useBtn.onclick = () => {
                const result = useItem(invItem.id);
                if (result.success) {
                    showARMessage(result.message);
                    updateInventoryScreen();
                }
            };
        }
    } else {
        if (useBtn) useBtn.style.display = 'none';

        if (invItem.equipped) {
            if (equipBtn) equipBtn.style.display = 'none';
            if (unequipBtn) {
                unequipBtn.style.display = 'block';
                unequipBtn.classList.remove('hidden'); // Garante que a classe não esconda
                unequipBtn.onclick = async () => {
                    const result = await unequipItem(invItem.slot);
                    if (result.success) {
                        updateInventoryScreen();
                        // Atualiza seleção para refletir estado
                        selectInventoryItem(invItem);
                    }
                };
            }
        } else {
            if (equipBtn) {
                equipBtn.style.display = 'block';
                equipBtn.onclick = async () => {
                    const result = await equipItem(invItem.id);
                    if (result.success) {
                        updateInventoryScreen();
                        selectInventoryItem(invItem);
                    }
                };
            }
            if (unequipBtn) {
                unequipBtn.style.display = 'none';
                unequipBtn.classList.add('hidden');
            }
        }
    }
}

/**
 * Obtém o item selecionado
 */
export function getSelectedItem() {
    return selectedInventoryItem;
}
