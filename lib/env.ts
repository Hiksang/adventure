export const IS_DEV = process.env.NEXT_PUBLIC_APP_ENV === 'DEV';
export const IS_PROD = process.env.NEXT_PUBLIC_APP_ENV === 'PROD';
export const APP_ID = process.env.NEXT_PUBLIC_WLD_APP_ID || 'app_staging_dev';
export const WLD_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_WLD_TOKEN_ADDRESS || '0x2cFc85d8E48F8EAB294be644d9E25C3030863003';
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
