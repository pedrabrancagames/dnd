/**
 * Cliente Supabase para autenticação e banco de dados
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ SUPABASE NÃO CONFIGURADO!');
    console.error('Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Vercel');
    console.error('supabaseUrl:', supabaseUrl);
    console.error('supabaseAnonKey:', supabaseAnonKey ? '[PRESENTE]' : '[AUSENTE]');
}

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Registra um novo usuário
 * @param {string} email 
 * @param {string} password 
 * @param {string} name 
 * @returns {Promise<{user: object|null, error: string|null}>}
 */
export async function signUp(email, password, name) {
    if (!supabase) {
        return { user: null, error: 'Supabase não configurado' };
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name
                }
            }
        });

        if (error) {
            return { user: null, error: error.message };
        }

        return { user: data.user, error: null };
    } catch (err) {
        return { user: null, error: err.message };
    }
}

/**
 * Faz login do usuário
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{user: object|null, error: string|null}>}
 */
export async function signIn(email, password) {
    if (!supabase) {
        return { user: null, error: 'Supabase não configurado' };
    }

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            return { user: null, error: error.message };
        }

        return { user: data.user, error: null };
    } catch (err) {
        return { user: null, error: err.message };
    }
}

/**
 * Faz logout do usuário
 * @returns {Promise<{error: string|null}>}
 */
export async function signOut() {
    if (!supabase) {
        return { error: 'Supabase não configurado' };
    }

    try {
        const { error } = await supabase.auth.signOut();
        return { error: error?.message || null };
    } catch (err) {
        return { error: err.message };
    }
}

/**
 * Obtém a sessão atual do usuário
 * @returns {Promise<{session: object|null, user: object|null}>}
 */
export async function getSession() {
    if (!supabase) {
        return { session: null, user: null };
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        return {
            session,
            user: session?.user || null
        };
    } catch (e) {
        console.error('Erro ao obter sessão:', e);
        return { session: null, user: null };
    }
}

/**
 * Observa mudanças no estado de autenticação
 * @param {function} callback 
 * @returns {function} unsubscribe
 */
export function onAuthStateChange(callback) {
    if (!supabase) {
        return () => { };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });

    return () => subscription.unsubscribe();
}

/**
 * Busca dados do jogador
 * @param {string} userId 
 * @returns {Promise<{player: object|null, error: string|null}>}
 */
export async function getPlayer(userId) {
    if (!supabase) {
        return { player: null, error: 'Supabase não configurado' };
    }

    try {
        const { data, error } = await supabase
            .from('players')
            .select('*')
            .eq('id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            return { player: null, error: error.message };
        }

        return { player: data, error: null };
    } catch (err) {
        return { player: null, error: err.message };
    }
}

/**
 * Cria um novo jogador
 * @param {object} playerData 
 * @returns {Promise<{player: object|null, error: string|null}>}
 */
export async function createPlayer(playerData) {
    if (!supabase) {
        return { player: null, error: 'Supabase não configurado' };
    }

    try {
        const { data, error } = await supabase
            .from('players')
            .insert(playerData)
            .select()
            .single();

        if (error) {
            return { player: null, error: error.message };
        }

        return { player: data, error: null };
    } catch (err) {
        return { player: null, error: err.message };
    }
}

/**
 * Atualiza dados do jogador
 * @param {string} userId 
 * @param {object} updates 
 * @returns {Promise<{error: string|null}>}
 */
export async function updatePlayer(userId, updates) {
    if (!supabase) {
        return { error: 'Supabase não configurado' };
    }

    try {
        const { error } = await supabase
            .from('players')
            .update(updates)
            .eq('id', userId);

        return { error: error?.message || null };
    } catch (err) {
        return { error: err.message };
    }
}

// ========== PERSISTÊNCIA DE INVENTÁRIO ==========

/**
 * Busca o inventário do jogador
 * @param {string} playerId 
 * @returns {Promise<{inventory: Array|null, error: string|null}>}
 */
export async function fetchInventory(playerId) {
    if (!supabase) return { inventory: [], error: 'Supabase não configurado' };

    try {
        const { data, error } = await supabase
            .from('inventory')
            .select('*')
            .eq('player_id', playerId);

        if (error) return { inventory: null, error: error.message };

        return { inventory: data, error: null };
    } catch (err) {
        return { inventory: null, error: err.message };
    }
}

/**
 * Adiciona item ao inventário no banco
 * @param {string} playerId 
 * @param {Object} itemData 
 */
export async function addToInventoryDB(playerId, itemData) {
    if (!supabase) return { error: 'Supabase não configurado' };

    try {
        const { data, error } = await supabase
            .from('inventory')
            .insert({
                player_id: playerId,
                item_id: itemData.itemId,
                quantity: itemData.quantity,
                equipped: itemData.equipped || false,
                slot: itemData.slot || null
            })
            .select()
            .single();

        return { data, error: error?.message };
    } catch (err) {
        return { error: err.message };
    }
}

/**
 * Atualiza item no inventário
 * @param {string} instanceId 
 * @param {Object} updates 
 */
export async function updateInventoryItemDB(instanceId, updates) {
    if (!supabase) return { error: 'Supabase não configurado' };

    try {
        // Se instanceId não for UUID válido (ex: gerado localmente), ignora
        if (!instanceId || instanceId.startsWith('item_')) return { error: null };

        const { error } = await supabase
            .from('inventory')
            .update(updates)
            .eq('id', instanceId);

        return { error: error?.message };
    } catch (err) {
        return { error: err.message };
    }
}

/**
 * Remove item do inventário
 * @param {string} instanceId 
 */
export async function deleteFromInventoryDB(instanceId) {
    if (!supabase) return { error: 'Supabase não configurado' };

    try {
        if (!instanceId || instanceId.startsWith('item_')) return { error: null };

        const { error } = await supabase
            .from('inventory')
            .delete()
            .eq('id', instanceId);

        return { error: error?.message };
    } catch (err) {
        return { error: err.message };
    }
}

// ========== PERSISTÊNCIA DE MONSTROS ==========

/**
 * Registra a morte de um monstro
 * @param {string} cellId 
 * @param {string} monsterId 
 * @returns {Promise<{error: string|null}>}
 */
export async function recordMonsterKill(cellId, monsterId) {
    if (!supabase) return { error: 'Supabase não configurado' };

    try {
        // Usamos active_monsters para registrar kills
        // spawned_at = agora, defeated_at = agora
        // Isso marca que ele "já foi spawnado e já morreu"
        const { error } = await supabase
            .from('active_monsters')
            .insert({
                cell_id: cellId,
                monster_id: monsterId,
                hp_current: 0,
                defeated_at: new Date().toISOString()
            });

        return { error: error?.message };
    } catch (err) {
        return { error: err.message };
    }
}

/**
 * Busca monstros derrotados recentemente em uma lista de células
 * @param {string[]} cellIds 
 * @returns {Promise<{killedMonsters: Array|null, error: string|null}>}
 */
export async function getDefeatedMonsters(cellIds) {
    if (!supabase) return { killedMonsters: [], error: 'Supabase não configurado' };

    try {
        // Busca monstros derrotados nas últimas 2 horas (exemplo de tempo de respawn)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabase
            .from('active_monsters')
            .select('cell_id, monster_id, defeated_at')
            .in('cell_id', cellIds)
            .gt('defeated_at', twoHoursAgo);

        if (error) return { killedMonsters: [], error: error.message };

        return { killedMonsters: data, error: null };
    } catch (err) {
        return { killedMonsters: [], error: err.message };
    }
}
