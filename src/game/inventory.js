/**
 * Sistema de Inventário - Gerenciamento de Itens e Equipamentos
 */

import { gameState } from './state.js';
import { getItemById } from '../data/items.js';
import {
    fetchInventory,
    addToInventoryDB,
    updateInventoryItemDB,
    deleteFromInventoryDB
} from '../lib/supabase.js';

/**
 * Slots de equipamento disponíveis
 */
export const EQUIPMENT_SLOTS = {
    weapon: { id: 'weapon', name: 'Arma', namePt: 'Arma', icon: '⚔️' },
    armor: { id: 'armor', name: 'Armor', namePt: 'Armadura', icon: '🛡️' },
    accessory: { id: 'accessory', name: 'Accessory', namePt: 'Acessório', icon: '💍' }
};

/**
 * Inicializa o inventário do jogador carregando do Supabase
 */
export async function initInventory() {
    if (!gameState.player) return;

    // Inicializa estruturas locais vazias primeiro
    if (!gameState.player.inventory) {
        gameState.player.inventory = [];
    }
    if (!gameState.player.equipped) {
        gameState.player.equipped = {
            weapon: null,
            armor: null,
            accessory: null
        };
    }

    // Carrega do banco se tiver ID
    if (gameState.player.id) {
        const { inventory, error } = await fetchInventory(gameState.player.id);

        if (inventory) {
            // Mapeia para o formato local
            gameState.player.inventory = inventory.map(dbItem => ({
                id: dbItem.id,
                itemId: dbItem.item_id,
                quantity: dbItem.quantity,
                equipped: dbItem.equipped,
                slot: dbItem.slot
            }));

            // Restaura equipados
            inventory.forEach(dbItem => {
                if (dbItem.equipped && dbItem.slot) {
                    gameState.player.equipped[dbItem.slot] = dbItem.id;
                }
            });

            // Recalcula stats
            recalculateEquipmentStats();
        }
    }
}

import { getItemDisplayInfo } from './identification.js';

// ... imports anteriores mantidos ...

/**
 * Adiciona um item ao inventário
 * @param {string} itemId 
 * @param {number} quantity 
 * @param {Object} metadata - Metadados opcionais (ex: { identified: false })
 * @returns {Promise<boolean>} sucesso
 */
export async function addItemToInventory(itemId, quantity = 1, metadata = {}) {
    if (!gameState.player) return false;

    // Garante que estruturas existam
    if (!gameState.player.inventory) await initInventory();

    const item = getItemById(itemId);
    if (!item) {
        console.error('Item não encontrado:', itemId);
        return false;
    }

    // Verifica se já existe (stackable) e se os metadados são compatíveis
    if (item.stackable || item.type === 'consumable') {
        const existing = gameState.player.inventory.find(i =>
            i.itemId === itemId &&
            // Só agrupa se o estado de identificação for o mesmo
            (i.identified === metadata.identified)
        );

        if (existing) {
            existing.quantity += quantity;
            // Sync background
            if (gameState.player.id) {
                updateInventoryItemDB(existing.id, { quantity: existing.quantity });
            }
            return true;
        }
    }

    if (gameState.player.id) {
        // Tenta salvar com metadados extras se a coluna existir no DB
        // Nota: Se o DB não tiver coluna 'metadata' ou 'identified', isso pode ser ignorado pelo backend ou falhar silenciosamente
        const dbPayload = {
            itemId,
            quantity,
            equipped: false,
            // Passamos metadados se o backend suportar, senão controlamos localmente
            ...metadata
        };

        const { data, error } = await addToInventoryDB(gameState.player.id, dbPayload);

        if (data) {
            gameState.player.inventory.push({
                id: data.id,
                itemId: data.item_id,
                quantity: data.quantity,
                equipped: data.equipped,
                slot: data.slot,
                identified: metadata.identified !== undefined ? metadata.identified : true // Default true se não especificado
            });
            return true;
        } else {
            console.error("Erro ao salvar item:", error);
            // Fallback local se falhar DB (modo offline precário)
            const tempId = `temp_${Date.now()}`;
            gameState.player.inventory.push({
                id: tempId,
                itemId: itemId,
                quantity: quantity,
                equipped: false,
                identified: metadata.identified !== undefined ? metadata.identified : true
            });
            return true;
        }
    } else {
        // Sem player ID (não logado?)
        const tempId = `temp_${Date.now()}`;
        gameState.player.inventory.push({
            id: tempId,
            itemId: itemId,
            quantity: quantity,
            equipped: false,
            identified: metadata.identified !== undefined ? metadata.identified : true
        });
        return true;
    }
}

/**
 * Remove um item do inventário
 * @param {string} instanceId 
 * @param {number} quantity 
 * @returns {Promise<boolean>} sucesso
 */
export async function removeItemFromInventory(instanceId, quantity = 1) {
    if (!gameState.player?.inventory) return false;

    const inventory = gameState.player.inventory;
    const itemIndex = inventory.findIndex(i => i.id === instanceId);

    if (itemIndex === -1) return false;

    const inventoryItem = inventory[itemIndex];

    if (inventoryItem.equipped) {
        return false;
    }

    if (inventoryItem.quantity <= quantity) {
        // Remove totalmente
        inventory.splice(itemIndex, 1);
        await deleteFromInventoryDB(instanceId);
    } else {
        // Reduz quantidade
        inventoryItem.quantity -= quantity;
        await updateInventoryItemDB(instanceId, { quantity: inventoryItem.quantity });
    }

    return true;
}

/**
 * Equipa um item
 * @param {string} instanceId 
 * @returns {Promise<{success: boolean, message: string, unequipped?: Object}>}
 */
export async function equipItem(instanceId) {
    // initInventory já deve ter rodado
    if (!gameState.player) return { success: false, message: 'Jogador não encontrado' };

    const inventory = gameState.player.inventory;
    const inventoryItem = inventory.find(i => i.id === instanceId);

    if (!inventoryItem) {
        return { success: false, message: 'Item não encontrado' };
    }

    const item = getItemById(inventoryItem.itemId);
    if (!item) return { success: false, message: 'Definição inválida' };

    const slot = getSlotForItem(item);
    if (!slot) return { success: false, message: 'Não equipável' };

    if (item.classRestriction && !item.classRestriction.includes(gameState.player.class)) {
        return { success: false, message: 'Restrito para sua classe' };
    }
    if (item.levelRequired && gameState.player.level < item.levelRequired) {
        return { success: false, message: `Requer nível ${item.levelRequired}` };
    }

    let unequipped = null;

    // Desequipa atual
    if (gameState.player.equipped[slot]) {
        const currentEquippedId = gameState.player.equipped[slot];
        const currentEquipped = inventory.find(i => i.id === currentEquippedId);

        if (currentEquipped) {
            currentEquipped.equipped = false;
            currentEquipped.slot = null;
            unequipped = getItemById(currentEquipped.itemId);

            // Sync DB
            await updateInventoryItemDB(currentEquipped.id, { equipped: false, slot: null });
        }
    }

    // Equipa novo
    inventoryItem.equipped = true;
    inventoryItem.slot = slot;
    gameState.player.equipped[slot] = instanceId;

    // Sync DB
    await updateInventoryItemDB(instanceId, { equipped: true, slot: slot });

    recalculateEquipmentStats();

    return {
        success: true,
        message: `${item.namePt || item.name} equipado!`,
        unequipped
    };
}

/**
 * Desequipa um item
 * @param {string} slot 
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function unequipItem(slot) {
    if (!gameState.player) return { success: false, message: 'Jogador não encontrado' };

    if (!EQUIPMENT_SLOTS[slot]) return { success: false, message: 'Slot inválido' };

    const instanceId = gameState.player.equipped[slot];
    if (!instanceId) return { success: false, message: 'Nada equipado' };

    const inventoryItem = gameState.player.inventory.find(i => i.id === instanceId);

    if (inventoryItem) {
        inventoryItem.equipped = false;
        inventoryItem.slot = null;

        // Sync DB
        await updateInventoryItemDB(instanceId, { equipped: false, slot: null });
    }

    gameState.player.equipped[slot] = null;
    recalculateEquipmentStats();

    return { success: true, message: 'Item removido' };
}

/**
 * Usa um item consumível
 * @param {string} instanceId 
 * @returns {Promise<{success: boolean, message: string, effect?: Object}>}
 */
export async function useItem(instanceId) {
    if (!gameState.player?.inventory) return { success: false, message: 'Inventário vazio' };

    const inventory = gameState.player.inventory;
    const inventoryItem = inventory.find(i => i.id === instanceId);

    if (!inventoryItem) return { success: false, message: 'Item não encontrado' };

    const item = getItemById(inventoryItem.itemId);
    if (!item || item.type !== 'consumable') return { success: false, message: 'Não usável' };

    const effect = applyItemEffect(item);

    if (!effect.success) return effect;

    // Consome 1 unidade (persiste no DB)
    await removeItemFromInventory(instanceId, 1);

    return {
        success: true,
        message: effect.message,
        effect: effect.result
    };
}

/**
 * Aplica o efeito de um consumível
 */
function applyItemEffect(item) {
    const player = gameState.player;
    switch (item.effect) {
        case 'heal':
            const healAmount = item.healAmount || 10;
            const oldHp = player.currentHp;
            player.currentHp = Math.min(player.maxHp, player.currentHp + healAmount);
            const actualHeal = player.currentHp - oldHp;
            return {
                success: true,
                message: `Curou ${actualHeal} HP!`,
                result: { type: 'heal', amount: actualHeal }
            };

        case 'mana':
            const manaAmount = item.manaAmount || 10;
            const oldMana = player.currentMana;
            player.currentMana = Math.min(player.maxMana, player.currentMana + manaAmount);
            const actualMana = player.currentMana - oldMana;
            return {
                success: true,
                message: `Restaurou ${actualMana} Mana!`,
                result: { type: 'mana', amount: actualMana }
            };

        case 'buff':
            if (!gameState.playerBuffs) gameState.playerBuffs = [];
            gameState.playerBuffs.push({
                ...item.buff,
                expires: Date.now() + (item.duration || 30000)
            });
            return {
                success: true,
                message: `${item.buffName || 'Buff'} ativado!`,
                result: { type: 'buff', buff: item.buff }
            };

        default:
            return { success: false, message: 'Efeito desconhecido' };
    }
}

/**
 * Helpers auxiliares
 */
function getSlotForItem(item) {
    if (item.type === 'weapon') return 'weapon';
    if (item.type === 'armor') return 'armor';
    if (item.type === 'accessory') return 'accessory';
    return null;
}

export function recalculateEquipmentStats() {
    if (!gameState.player) return;
    const player = gameState.player;
    player.equipmentBonus = { ac: 0, damage: 0, str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };

    for (const slot of Object.keys(EQUIPMENT_SLOTS)) {
        const instanceId = player.equipped[slot];
        if (!instanceId) continue;
        const inventoryItem = player.inventory.find(i => i.id === instanceId);
        if (!inventoryItem) continue;
        const item = getItemById(inventoryItem.itemId);
        if (!item) continue;

        if (item.acBonus) player.equipmentBonus.ac += item.acBonus;
        if (item.statBonus) {
            for (const [stat, value] of Object.entries(item.statBonus)) {
                if (player.equipmentBonus[stat] !== undefined) player.equipmentBonus[stat] += value;
            }
        }
    }
}

export function getEquippedItem(slot) {
    if (!gameState.player?.equipped) return null;
    const instanceId = gameState.player.equipped[slot];
    if (!instanceId) return null;
    const inventoryItem = gameState.player.inventory?.find(i => i.id === instanceId);
    if (!inventoryItem) return null;
    return getItemById(inventoryItem.itemId);
}

export function getEquippedWeaponDamage() {
    const weapon = getEquippedItem('weapon');
    if (!weapon) return { damage: '1d4', type: 'bludgeoning', bonus: 0 };
    return {
        damage: weapon.damage || '1d6',
        type: weapon.damageType || 'slashing',
        bonus: weapon.damageBonus || 0,
        bonusDamage: weapon.bonusDamage || null
    };
}

export function getTotalAC() {
    if (!gameState.player) return 10;
    const player = gameState.player;
    const dexMod = Math.floor((player.dex - 10) / 2);
    return 10 + dexMod + (player.equipmentBonus?.ac || 0);
}

export function getInventory() {
    return gameState.player?.inventory || [];
}

export function getInventoryWithDetails() {
    return getInventory().map(invItem => {
        // Usa a nova função para obter info do item (considera identificação)
        const displayInfo = getItemDisplayInfo(invItem);

        return {
            ...invItem,
            item: displayInfo || getItemById(invItem.itemId) // Fallback seguro
        };
    }).filter(i => i.item !== null);
}

function generateItemInstanceId() {
    // Agora usado apenas como fallback
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
