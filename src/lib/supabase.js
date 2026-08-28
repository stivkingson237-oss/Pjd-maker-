import { createClient } from '@supabase/supabase-js';

// Production Supabase configuration for PJD Maker.
// Keep the public publishable key in the frontend; never use a service-role key here.
const SUPABASE_URL = 'https://lrlukgkaarzuqotefhlc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zkGGMilXntgSTG8ajxi1rQ_bdvm-Ogs';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
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
      const { data, error } = await supabase.storage
        .from('product-files')
        .createSignedUrl(path, 300, { download: true });
      if (!error && data?.signedUrl) return nativeFetch(data.signedUrl, init);
    }
    return nativeFetch(input, init);
  };
  window.__pjdStorageFetchPatched = true;
}
