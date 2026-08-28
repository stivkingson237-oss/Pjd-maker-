const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const DEFAULT_PUBLIC_BUCKET = 'public-assets';

function normalizeSupabaseImageUrl(value) {
  if (!value || typeof value !== 'string') return null;
  const s = value.trim();
  if (!s) return null;
  if (/^(https?:|data:|blob:)/i.test(s)) return s;
  if (!SUPABASE_URL) return s;
  const clean = s.replace(/^\/+/, '');
  if (clean.startsWith('storage/v1/')) return `${SUPABASE_URL}/${clean}`;
  return `${SUPABASE_URL}/storage/v1/object/public/${DEFAULT_PUBLIC_BUCKET}/${clean}`;
}

function addValue(out, value) {
  if (!value) return;
  if (Array.isArray(value)) { value.forEach(v => addValue(out, v)); return; }
  if (typeof value === 'object') {
    addValue(out, value.url || value.publicUrl || value.public_url || value.src || value.path || value.image_url || value.cover_image || value.image);
    return;
  }
  const url = normalizeSupabaseImageUrl(String(value));
  if (url && !out.includes(url)) out.push(url);
}

export function productImageUrl(value) {
  const out = [];
  addValue(out, value);
  return out[0] || null;
}

export function getProductImageCandidates(product) {
  if (!product) return [];
  const out = [];
  // Support every image shape currently used by physical and digital products.
  [product.images, product.image_url, product.image, product.cover_image, product.thumbnail, product.cover, product.photo, product.photos].forEach(v => addValue(out, v));
  return out;
}

export function getProductImage(product) {
  return getProductImageCandidates(product)[0] || null;
}

// Images are no longer forced to 1536x1024. Keep the seller's original aspect ratio.
export async function normalizeProductImage(file) {
  if (!file || !file.type?.startsWith('image/')) throw new Error('Sélectionnez une image valide.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Image trop volumineuse. Maximum 12 Mo.');
  return file;
}
