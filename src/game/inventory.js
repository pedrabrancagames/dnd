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

/**
 * Adiciona um item ao inventário
 * @param {string} itemId 
 * @param {number} quantity 
 * @returns {Promise<boolean>} sucesso
 */
export async function addItemToInventory(itemId, quantity = 1) {
    if (!gameState.player) return false;

    // Garante que estruturas existam
    if (!gameState.player.inventory) await initInventory();

    const item = getItemById(itemId);
    if (!item) {
        console.error('Item não encontrado:', itemId);
        return false;
    }

    // Otimisticamente atualiza UI/Local State?
    // Para simplificar e garantir ID correto do banco, vamos esperar o DB
    // Mas para UX rápida, poderíamos usar ID temporário.
    // Vamos com abordagem híbrida: espera DB para não ter desync de IDs

    // Verifica se já existe (stackable)
    if (item.stackable || item.type === 'consumable') {
        const existing = gameState.player.inventory.find(i => i.itemId === itemId);
        if (existing) {
            existing.quantity += quantity;
            // Sync background
            updateInventoryItemDB(existing.id, { quantity: existing.quantity });
            return true;
        }
    }

    // Cria entry local temporária para feedback imediato?
    // Melhor não, pois precisamos do UUID do banco para equipar/remover depois.
    // Vamos fazer insert e esperar.

    if (gameState.player.id) {
        const { data, error } = await addToInventoryDB(gameState.player.id, {
            itemId,
            quantity,
            equipped: false
        });

        if (data) {
            gameState.player.inventory.push({
                id: data.id,
                itemId: data.item_id,
                quantity: data.quantity,
                equipped: data.equipped,
                slot: data.slot
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
                equipped: false
            });
            return true;
        }
    } else {
        // Sem player ID (não logado?)
        return false;
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

    // ... verificações de classe/nível (mantidas iguais) ...
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
    // ... lógica de uso é local, mas a remoção chama removeItemFromInventory que já é async e persiste ...

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
 * Aplica o efeito de um consumível (Lógica Local mantida)
 */
function applyItemEffect(item) {
    const player = gameState.player;
    // ... switch case mantido igual ...
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
 * Helpers auxiliares (mantidos)
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
    return getInventory().map(invItem => ({
        ...invItem,
        item: getItemById(invItem.itemId)
    })).filter(i => i.item !== null);
}

function generateItemInstanceId() {
    // Agora usado apenas como fallback
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Inicializa o inventário do jogador se não existir
 */
export function initInventory() {
    if (!gameState.player) return;

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
}

/**
 * Adiciona um item ao inventário
 * @param {string} itemId 
 * @param {number} quantity 
 * @returns {boolean} sucesso
 */
export function addItemToInventory(itemId, quantity = 1) {
    initInventory();
    if (!gameState.player) return false;

    const item = getItemById(itemId);
    if (!item) {
        console.error('Item não encontrado:', itemId);
        return false;
    }

    const inventory = gameState.player.inventory;

    // Verifica se já existe no inventário (para consumíveis)
    if (item.stackable || item.type === 'consumable') {
        const existing = inventory.find(i => i.itemId === itemId);
        if (existing) {
            existing.quantity += quantity;
            return true;
        }
    }

    // Adiciona novo item
    inventory.push({
        id: generateItemInstanceId(),
        itemId: itemId,
        quantity: quantity,
        equipped: false
    });

    return true;
}

/**
 * Remove um item do inventário
 * @param {string} instanceId - ID da instância do item
 * @param {number} quantity 
 * @returns {boolean} sucesso
 */
export function removeItemFromInventory(instanceId, quantity = 1) {
    if (!gameState.player?.inventory) return false;

    const inventory = gameState.player.inventory;
    const itemIndex = inventory.findIndex(i => i.id === instanceId);

    if (itemIndex === -1) return false;

    const inventoryItem = inventory[itemIndex];

    if (inventoryItem.equipped) {
        // Não pode remover item equipado
        return false;
    }

    if (inventoryItem.quantity <= quantity) {
        inventory.splice(itemIndex, 1);
    } else {
        inventoryItem.quantity -= quantity;
    }

    return true;
}

/**
 * Equipa um item
 * @param {string} instanceId - ID da instância do item
 * @returns {{success: boolean, message: string, unequipped?: Object}}
 */
export function equipItem(instanceId) {
    initInventory();
    if (!gameState.player) return { success: false, message: 'Jogador não encontrado' };

    const inventory = gameState.player.inventory;
    const inventoryItem = inventory.find(i => i.id === instanceId);

    if (!inventoryItem) {
        return { success: false, message: 'Item não encontrado no inventário' };
    }

    const item = getItemById(inventoryItem.itemId);

    if (!item) {
        return { success: false, message: 'Definição do item não encontrada' };
    }

    // Determina o slot
    const slot = getSlotForItem(item);

    if (!slot) {
        return { success: false, message: 'Este item não pode ser equipado' };
    }

    // Verifica requisitos de classe se houver
    if (item.classRestriction && !item.classRestriction.includes(gameState.player.class)) {
        return { success: false, message: 'Sua classe não pode usar este item' };
    }

    // Verifica requisitos de nível se houver
    if (item.levelRequired && gameState.player.level < item.levelRequired) {
        return { success: false, message: `Requer nível ${item.levelRequired}` };
    }

    let unequipped = null;

    // Desequipa item atual se houver
    if (gameState.player.equipped[slot]) {
        const currentEquipped = inventory.find(
            i => i.id === gameState.player.equipped[slot]
        );
        if (currentEquipped) {
            currentEquipped.equipped = false;
            unequipped = getItemById(currentEquipped.itemId);
        }
    }

    // Equipa o novo item
    inventoryItem.equipped = true;
    gameState.player.equipped[slot] = instanceId;

    // Recalcula stats
    recalculateEquipmentStats();

    return {
        success: true,
        message: `${item.namePt || item.name} equipado!`,
        unequipped
    };
}

/**
 * Desequipa um item
 * @param {string} slot - 'weapon', 'armor', 'accessory'
 * @returns {{success: boolean, message: string}}
 */
export function unequipItem(slot) {
    initInventory();
    if (!gameState.player) return { success: false, message: 'Jogador não encontrado' };

    if (!EQUIPMENT_SLOTS[slot]) {
        return { success: false, message: 'Slot inválido' };
    }

    const instanceId = gameState.player.equipped[slot];

    if (!instanceId) {
        return { success: false, message: 'Nenhum item equipado neste slot' };
    }

    const inventoryItem = gameState.player.inventory.find(i => i.id === instanceId);

    if (inventoryItem) {
        inventoryItem.equipped = false;
    }

    gameState.player.equipped[slot] = null;

    // Recalcula stats
    recalculateEquipmentStats();

    return { success: true, message: 'Item removido' };
}

/**
 * Usa um item consumível
 * @param {string} instanceId 
 * @returns {{success: boolean, message: string, effect?: Object}}
 */
export function useItem(instanceId) {
    if (!gameState.player?.inventory) return { success: false, message: 'Inventário vazio' };

    const inventory = gameState.player.inventory;
    const inventoryItem = inventory.find(i => i.id === instanceId);

    if (!inventoryItem) {
        return { success: false, message: 'Item não encontrado' };
    }

    const item = getItemById(inventoryItem.itemId);

    if (!item || item.type !== 'consumable') {
        return { success: false, message: 'Este item não pode ser usado' };
    }

    // Aplica efeito do item
    const effect = applyItemEffect(item);

    if (!effect.success) {
        return effect;
    }

    // Remove uma unidade
    removeItemFromInventory(instanceId, 1);

    return {
        success: true,
        message: effect.message,
        effect: effect.result
    };
}

/**
 * Aplica o efeito de um consumível
 * @param {Object} item 
 * @returns {Object}
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
            // Aplica buff temporário
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
 * Determina o slot de equipamento para um item
 * @param {Object} item 
 * @returns {string|null}
 */
function getSlotForItem(item) {
    if (item.type === 'weapon') return 'weapon';
    if (item.type === 'armor') return 'armor';
    if (item.type === 'accessory') return 'accessory';
    return null;
}

/**
 * Recalcula os stats do jogador baseado nos equipamentos
 */
export function recalculateEquipmentStats() {
    if (!gameState.player) return;

    const player = gameState.player;

    // Reset bônus de equipamento
    player.equipmentBonus = {
        ac: 0,
        damage: 0,
        str: 0,
        dex: 0,
        con: 0,
        int: 0,
        wis: 0,
        cha: 0
    };

    // Calcula bônus de cada item equipado
    for (const slot of Object.keys(EQUIPMENT_SLOTS)) {
        const instanceId = player.equipped[slot];
        if (!instanceId) continue;

        const inventoryItem = player.inventory.find(i => i.id === instanceId);
        if (!inventoryItem) continue;

        const item = getItemById(inventoryItem.itemId);
        if (!item) continue;

        // AC
        if (item.acBonus) {
            player.equipmentBonus.ac += item.acBonus;
        }

        // Atributos
        if (item.statBonus) {
            for (const [stat, value] of Object.entries(item.statBonus)) {
                if (player.equipmentBonus[stat] !== undefined) {
                    player.equipmentBonus[stat] += value;
                }
            }
        }
    }
}

/**
 * Retorna o item equipado em um slot
 * @param {string} slot 
 * @returns {Object|null} item definition
 */
export function getEquippedItem(slot) {
    if (!gameState.player?.equipped) return null;

    const instanceId = gameState.player.equipped[slot];
    if (!instanceId) return null;

    const inventoryItem = gameState.player.inventory?.find(i => i.id === instanceId);
    if (!inventoryItem) return null;

    return getItemById(inventoryItem.itemId);
}

/**
 * Retorna o dano da arma equipada
 * @returns {{damage: string, type: string, bonus: number}}
 */
export function getEquippedWeaponDamage() {
    const weapon = getEquippedItem('weapon');

    if (!weapon) {
        // Dano base sem arma (soco)
        return { damage: '1d4', type: 'bludgeoning', bonus: 0 };
    }

    return {
        damage: weapon.damage || '1d6',
        type: weapon.damageType || 'slashing',
        bonus: weapon.damageBonus || 0,
        bonusDamage: weapon.bonusDamage || null
    };
}

/**
 * Retorna a AC total do jogador (incluindo equipamentos)
 * @returns {number}
 */
export function getTotalAC() {
    if (!gameState.player) return 10;

    const player = gameState.player;
    const dexMod = Math.floor((player.dex - 10) / 2);
    const baseAC = 10 + dexMod;
    const equipmentAC = player.equipmentBonus?.ac || 0;

    return baseAC + equipmentAC;
}

/**
 * Retorna o inventário do jogador
 * @returns {Object[]}
 */
export function getInventory() {
    return gameState.player?.inventory || [];
}

/**
 * Retorna o inventário com itens resolvidos
 * @returns {Object[]} items com definições completas
 */
export function getInventoryWithDetails() {
    const inventory = getInventory();

    return inventory.map(invItem => {
        const itemDef = getItemById(invItem.itemId);
        return {
            ...invItem,
            item: itemDef
        };
    }).filter(i => i.item !== null);
}

/**
 * Gera ID único para instância de item
 * @returns {string}
 */
function generateItemInstanceId() {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
