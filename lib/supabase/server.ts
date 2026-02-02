import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '../env';

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
