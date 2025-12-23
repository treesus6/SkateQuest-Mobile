// Supabase Client Configuration for SkateQuest
// Replace Firebase with Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Get your Supabase credentials from: https://supabase.com/dashboard/project/_/settings/api
const SUPABASE_URL = 'https://hreeuqdgrwvnxquxohod.supabase.co' // Your project URL
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE' // Replace with your anon/public key

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Helper functions to replace Firebase functions

// ===== AUTH =====
export async function signInAnonymously() {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    return data
}

export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(session?.user || null)
    })
}

export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

// ===== DATABASE =====

// Get a single document
export async function getDoc(table, id) {
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single()

    if (error) throw error
    return { exists: () => !!data, data: () => data }
}

// Set/Update a document
export async function setDoc(table, id, data) {
    const { error } = await supabase
        .from(table)
        .upsert({ id, ...data })

    if (error) throw error
}

// Add a new document (auto-generate ID)
export async function addDoc(table, data) {
    const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single()

    if (error) throw error
    return { id: result.id }
}

// Update a document
export async function updateDoc(table, id, updates) {
    // Check if any values are increment operations
    const hasIncrements = Object.values(updates).some(
        val => val && typeof val === 'object' && '_increment' in val
    )

    if (hasIncrements) {
        // Handle increments using RPC for atomic operations
        const regularUpdates = {}
        const incrementUpdates = {}

        for (const [key, value] of Object.entries(updates)) {
            if (value && typeof value === 'object' && '_increment' in value) {
                incrementUpdates[key] = value._increment
            } else {
                regularUpdates[key] = value
            }
        }

        // Apply increments atomically
        if (Object.keys(incrementUpdates).length > 0) {
            const { error: rpcError } = await supabase.rpc('increment_fields', {
                table_name: table,
                record_id: id,
                increments: incrementUpdates
            })
            if (rpcError) throw rpcError
        }

        // Apply regular updates if any
        if (Object.keys(regularUpdates).length > 0) {
            const { error } = await supabase
                .from(table)
                .update(regularUpdates)
                .eq('id', id)
            if (error) throw error
        }
    } else {
        // No increments, do regular update
        const { error } = await supabase
            .from(table)
            .update(updates)
            .eq('id', id)

        if (error) throw error
    }
}

// Delete a document
export async function deleteDoc(table, id) {
    const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id)

    if (error) throw error
}

// Get all documents from a collection
export async function getDocs(table, options = {}) {
    let query = supabase.from(table).select('*')

    // Apply filters
    if (options.where) {
        options.where.forEach(([field, op, value]) => {
            query = query.eq(field, value) // Simplified - extend for other operators
        })
    }

    // Apply ordering
    if (options.orderBy) {
        query = query.order(options.orderBy.field, { ascending: options.orderBy.direction === 'asc' })
    }

    // Apply limit
    if (options.limit) {
        query = query.limit(options.limit)
    }

    const { data, error } = await query
    if (error) throw error

    return data.map(doc => ({ id: doc.id, data: () => doc }))
}

// Real-time subscription (replaces onSnapshot)
export function onSnapshot(table, id, callback) {
    // Subscribe to changes
    const channel = supabase
        .channel(`${table}:${id}`)
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: table,
                filter: id ? `id=eq.${id}` : undefined
            },
            (payload) => {
                callback({
                    exists: () => !!payload.new,
                    data: () => payload.new
                })
            }
        )
        .subscribe()

    // Return unsubscribe function
    return () => supabase.removeChannel(channel)
}

// Query helpers
export function query(table) {
    return { table }
}

export function where(field, operator, value) {
    return [field, operator, value]
}

export function orderBy(field, direction = 'asc') {
    return { field, direction }
}

export function limit(count) {
    return count
}

// Increment helper (for XP, etc.)
// Returns a special object that updateDoc() will handle atomically
export function increment(value) {
    return { _increment: value }
}

// Server timestamp
export function serverTimestamp() {
    return new Date().toISOString()
}

// ===== STORAGE =====

// Upload file
export async function uploadFile(bucket, path, file) {
    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            cacheControl: '3600',
            upsert: false
        })

    if (error) throw error
    return data
}

// Get public URL for file
export function getPublicURL(bucket, path) {
    const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

    return data.publicUrl
}

// ===== SPECIAL FUNCTIONS =====

// Increment XP (using Supabase RPC)
export async function incrementXP(userId, amount) {
    const { data, error } = await supabase.rpc('increment_xp', {
        user_id: userId,
        amount: amount
    })

    if (error) throw error
    return data
}

// You'll need to create this function in Supabase:
/*
CREATE OR REPLACE FUNCTION increment_xp(user_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles
    SET xp = xp + amount
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

// Increment crew XP
export async function incrementCrewXP(crewId, amount) {
    const { data, error } = await supabase.rpc('increment_crew_xp', {
        crew_id: crewId,
        amount: amount
    })

    if (error) throw error
    return data
}

/*
CREATE OR REPLACE FUNCTION increment_crew_xp(crew_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE public.crews
    SET total_xp = total_xp + amount
    WHERE id = crew_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
*/

// Generic field increment function (used by updateDoc)
/*
IMPORTANT: You need to create this function in your Supabase database
for the increment() helper to work properly with updateDoc().

Run this in your Supabase SQL Editor:

CREATE OR REPLACE FUNCTION increment_fields(
    table_name TEXT,
    record_id UUID,
    increments JSONB
)
RETURNS void AS $$
DECLARE
    field_name TEXT;
    field_value NUMERIC;
    sql_query TEXT;
BEGIN
    -- Build and execute UPDATE statement for each field to increment
    FOR field_name, field_value IN SELECT * FROM jsonb_each_text(increments)
    LOOP
        sql_query := format(
            'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
            table_name,
            field_name,
            field_name
        );
        EXECUTE sql_query USING field_value::NUMERIC, record_id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

This function allows updateDoc() to atomically increment multiple fields at once.
Example usage:
  await updateDoc('profiles', userId, {
    xp: increment(50),
    spotsAdded: increment(1)
  })
*/

// Array operations for Supabase
export async function arrayUnion(table, id, field, value) {
    // Get current array
    const { data: current } = await supabase
        .from(table)
        .select(field)
        .eq('id', id)
        .single()

    // Add value if not exists
    const currentArray = current[field] || []
    if (!currentArray.includes(value)) {
        const { error } = await supabase
            .from(table)
            .update({ [field]: [...currentArray, value] })
            .eq('id', id)

        if (error) throw error
    }
}

export async function arrayRemove(table, id, field, value) {
    // Get current array
    const { data: current } = await supabase
        .from(table)
        .select(field)
        .eq('id', id)
        .single()

    // Remove value
    const newArray = (current[field] || []).filter(v => v !== value)
    const { error } = await supabase
        .from(table)
        .update({ [field]: newArray })
        .eq('id', id)

    if (error) throw error
}
