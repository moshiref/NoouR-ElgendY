import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The ONE Supabase client for the whole app — public pages and the Admin
 * Dashboard share this singleton. Never create another client.
 *
 * Config comes from VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY (see
 * .env; VITE_SUPABASE_ANON_KEY is still honoured as a legacy fallback).
 * The publishable key is safe in browser code; RLS policies
 * (supabase/work_admin.sql) are what protect writes — a service_role or
 * secret key must NEVER appear here.
 *
 * When the env vars are absent (e.g. local dev before setup), the public
 * site transparently falls back to the bundled seed repository and the
 * Admin Dashboard shows a configuration notice instead of crashing.
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined);

/** True once both env vars are present. */
export const SUPABASE_CONFIGURED = Boolean(url && publishableKey);

let client: SupabaseClient | null = null;

/** Returns the shared client. Throws when Supabase is not configured. */
export function getSupabase(): SupabaseClient {
  if (!url || !publishableKey) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (see .env.example).',
    );
  }
  if (!client) client = createClient(url, publishableKey);
  return client;
}
