import { createClient } from '@supabase/supabase-js';

// Production-safe Supabase configuration.
// Do not allow an invalid Vercel/Vite environment variable to crash the app.
const FALLBACK_SUPABASE_URL = 'https://lrlukgkaarzuqotefhlc.supabase.co';
const FALLBACK_SUPABASE_KEY = 'sb_publishable_zkGGMilXntgSTG8ajxi1rQ_bdvm-Ogs';

const envUrl = import.meta.env?.VITE_SUPABASE_URL;
const envKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;

const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const supabaseUrl = isValidHttpUrl(envUrl) ? envUrl : FALLBACK_SUPABASE_URL;
const supabaseKey = typeof envKey === 'string' && envKey.trim() ? envKey : FALLBACK_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
