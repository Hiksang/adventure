import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '../env';
import { IS_DEV } from '../env';

export const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SERVICE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    : IS_DEV
      ? null
      : (() => { throw new Error('Supabase credentials required in PROD mode'); })();

/**
 * Create a Supabase client for server-side operations
 * Returns the admin client for server operations
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  if (!supabaseAdmin) {
    throw new Error('Supabase is not configured');
  }
  return supabaseAdmin;
}
