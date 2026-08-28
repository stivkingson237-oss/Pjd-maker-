import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://lrlukgkaarzuqotefhlc.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_zkGGMilXntgSTG8ajxi1rQ_bdvm-Ogs';

// Vercel can contain an empty or malformed VITE_SUPABASE_URL. Never pass an
// invalid value to createClient because that crashes the whole React app.
function validHttpUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return (url.protocol === 'https:' || url.protocol === 'http:') ? url.toString().replace(/\/$/, '') : null;
  } catch {
    return null;
  }
}

const SUPABASE_URL = validHttpUrl(import.meta.env.VITE_SUPABASE_URL) || DEFAULT_SUPABASE_URL;
const SUPABASE_KEY = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim() || DEFAULT_SUPABASE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Product records store the Storage object path (not a browser URL) in file_url.
// Convert that path into a short-lived signed URL when the app fetches it.
if (typeof window !== 'undefined' && !window.__pjdStorageFetchPatched) {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const raw = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    const path = raw.startsWith('/') ? raw.slice(1) : raw;
    const isProductStoragePath = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/.+\.(pdf|zip|apk|mp4|mp3|png|jpg|jpeg|webp|doc|docx|xls|xlsx)$/i.test(path) && !/^https?:\/\//i.test(raw);
    if (isProductStoragePath) {
      const { data, error } = await supabase.storage.from('product-files').createSignedUrl(path, 300, { download: true });
      if (!error && data?.signedUrl) return nativeFetch(data.signedUrl, init);
    }
    return nativeFetch(input, init);
  };
  window.__pjdStorageFetchPatched = true;
}
