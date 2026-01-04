/**
 * Cliente Supabase para autenticação e banco de dados
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase não configurado. Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
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
    } catch {
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
