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

// Storage uploads on mobile networks can fail with the browser's generic
// "Failed to fetch" even when Supabase is healthy. Retry transient network
// failures before returning the error to the uploader.
if (typeof window !== 'undefined' && !window.__pjdStorageFetchPatched) {
  const nativeFetch = window.fetch.bind(window);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  window.fetch = async (input, init) => {
    const raw = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    const path = raw.startsWith('/') ? raw.slice(1) : raw;
    const isStorageRequest = /\.storage\.supabase\.co\/storage\/v1\//i.test(raw) ||
      /\.supabase\.co\/storage\/v1\//i.test(raw);
    const isProductStoragePath = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/.+\.(pdf|zip|apk|mp4|mp3|png|jpg|jpeg|webp|doc|docx|xls|xlsx)$/i.test(path) && !/^https?:\/\//i.test(raw);

    if (isProductStoragePath) {
      const { data, error } = await supabase.storage
        .from('product-files')
        .createSignedUrl(path, 300, { download: true });
      if (!error && data?.signedUrl) return nativeFetch(data.signedUrl, init);
    }

    // Retry only network-level failures for Storage. HTTP errors (401/403/409/etc.)
    // must pass through unchanged so the application can show the real cause.
    if (isStorageRequest) {
      let lastError;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          return await nativeFetch(input, init);
        } catch (error) {
          lastError = error;
          if (attempt < 2) await sleep(1200 * (attempt + 1));
        }
      }
      throw lastError;
    }

    return nativeFetch(input, init);
  };
  window.__pjdStorageFetchPatched = true;
}

// Product upload helper: the standard Supabase SDK upload is used for small
// files, but on mobile we retry transient network failures without changing
// authentication or RLS behaviour.
if (!supabase.__pjdStorageUploadPatched) {
  const originalFrom = supabase.storage.from.bind(supabase.storage);
  supabase.storage.from = (bucket) => {
    const api = originalFrom(bucket);
    if (bucket !== 'product-files' || api.__pjdUploadPatched) return api;

    const originalUpload = api.upload.bind(api);
    api.upload = async (path, file, options) => {
      let last = null;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const result = await originalUpload(path, file, options);
        if (!result.error) return result;
        last = result;
        const message = String(result.error?.message || '').toLowerCase();
        const transient = message.includes('failed to fetch') ||
          message.includes('network') ||
          message.includes('timeout') ||
          message.includes('connection');
        if (!transient || attempt === 2) break;
        await sleep(1200 * (attempt + 1));
      }
      return last;
    };
    api.__pjdUploadPatched = true;
    return api;
  };
  supabase.__pjdStorageUploadPatched = true;
}

// Product records store the Storage object path (not a browser URL) in file_url.
// Convert that path into a short-lived signed URL when the app fetches it.

// Boutique catalogue: clicking a product opens the same dedicated product page
// used by the marketplace, instead of silently adding the item to the cart.
// Review/action buttons keep their existing behaviour.
if (typeof document !== 'undefined' && !window.__pjdBoutiqueProductNavigation) {
  const openBoutiqueProduct = async (event) => {
    const card = event.target?.closest?.('.public-shop-products .product-card');
    if (!card) return;

    const action = event.target?.closest?.('button, a, textarea, input, select');
    if (action) return;

    const title = card.querySelector('h3')?.textContent?.trim();
    if (!title) return;

    event.preventDefault();
    event.stopPropagation();

    try {
      const [digitalResult, physicalResult] = await Promise.all([
        supabase.from('digital_products').select('*').eq('title', title).maybeSingle(),
        supabase.from('marketplace_products').select('*').eq('title', title).maybeSingle(),
      ]);

      const product = digitalResult.data
        ? { ...digitalResult.data, product_type: digitalResult.data.product_type || 'digital' }
        : physicalResult.data
          ? {
              ...physicalResult.data,
              product_type: 'physical',
              cover_image: physicalResult.data.images?.[0] || null,
            }
          : null;

      if (!product) return;

      window.history.pushState({ productId: product.id }, '', `/produit/${encodeURIComponent(product.id)}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch (error) {
      console.error('PJD boutique product navigation error', error);
    }
  };

  document.addEventListener('click', openBoutiqueProduct, true);
  window.__pjdBoutiqueProductNavigation = true;
}
