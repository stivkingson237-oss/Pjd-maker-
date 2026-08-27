export const PRODUCT_IMAGE_WIDTH = 1536;
export const PRODUCT_IMAGE_HEIGHT = 1024;
export const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export function productImageUrl(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const s = value.trim();
    return s || null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = productImageUrl(item);
      if (url) return url;
    }
    return null;
  }
  if (typeof value === 'object') {
    return productImageUrl(value.url || value.publicUrl || value.public_url || value.src || value.path || value.image_url || value.cover_image);
  }
  return null;
}

export function getProductImageCandidates(product) {
  if (!product) return [];
  const values = [product.cover_image, product.image_url, product.image, product.images, product.thumbnail, product.cover];
  const out = [];
  const add = value => {
    if (Array.isArray(value)) return value.forEach(add);
    const url = productImageUrl(value);
    if (url && !out.includes(url)) out.push(url);
  };
  values.forEach(add);
  return out;
}

export function getProductImage(product) {
  return getProductImageCandidates(product)[0] || null;
}

export async function normalizeProductImage(file) {
  if (!file || !file.type?.startsWith('image/')) throw new Error('Sélectionnez une image valide.');
  if (file.size > 12 * 1024 * 1024) throw new Error('Image trop volumineuse. Maximum 12 Mo avant traitement.');
  const bitmap = await createImageBitmap(file);
  const target = PRODUCT_IMAGE_WIDTH / PRODUCT_IMAGE_HEIGHT;
  const source = bitmap.width / bitmap.height;
  let sx = 0, sy = 0, sw = bitmap.width, sh = bitmap.height;
  if (source > target) { sw = Math.round(bitmap.height * target); sx = Math.round((bitmap.width - sw) / 2); }
  else if (source < target) { sh = Math.round(bitmap.width / target); sy = Math.round((bitmap.height - sh) / 2); }
  const canvas = document.createElement('canvas');
  canvas.width = PRODUCT_IMAGE_WIDTH;
  canvas.height = PRODUCT_IMAGE_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) { bitmap.close?.(); throw new Error('Impossible de préparer l’image.'); }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, PRODUCT_IMAGE_WIDTH, PRODUCT_IMAGE_HEIGHT);
  bitmap.close?.();
  let blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.88));
  if (!blob) throw new Error('Impossible de compresser l’image.');
  if (blob.size > PRODUCT_IMAGE_MAX_BYTES) blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.78));
  if (!blob || blob.size > PRODUCT_IMAGE_MAX_BYTES) throw new Error('La photo reste trop volumineuse après compression.');
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'produit'}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}
