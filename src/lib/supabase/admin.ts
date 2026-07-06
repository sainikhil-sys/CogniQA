import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

/**
 * Service-role Supabase client. BYPASSES RLS — use only in trusted server
 * code (background indexing, platform-admin endpoints) and always scope
 * queries explicitly to the entity being operated on.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase service-role credentials are not configured (SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY).');
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
