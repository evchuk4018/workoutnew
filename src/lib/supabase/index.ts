/**
 * Supabase client module
 * Re-exports all Supabase utilities and types
 */

export { createClient as createBrowserClient, type SupabaseClient } from './client';
export { createClient as createServerClient, type SupabaseServerClient } from './server';
export * from './database.types';
