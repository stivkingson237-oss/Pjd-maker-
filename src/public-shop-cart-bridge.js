import { supabase } from './lib/supabase';

let busy = false;

async function findProduct(title, shopName) {
  if (!title) return null;

  const shopResult = shopName
    ? await supabase.from('shops').select('id').eq('shop_name', shopName).maybeSingle()
    : { data: null };
  const shopId = shopResult.data?.id || null;

  const [digitalResult, physicalResult] = await Promise.all([
    supabase.from('digital_products').select('id,seller_id,shop_id,title,description,category,price,promo_price,cover_image,image_url,file_url,is_free,stock,status,created_at,source_type,product_type').eq('title', title).in('status', ['active', 'approved', 'actif', 'approuvé']).maybeSingle(),
    supabase.from('marketplace_products').select('id,seller_id,shop_id,title,description,category,price,stock,images,status,created_at,updated_at').eq('title', title).in('status', ['active', 'approved', 'actif', 'approuvé']).maybeSingle()
  ]);

  const candidates = [
    digitalResult.data ? { ...digitalResult.data, product_type: digitalResult.data.product_type || 'digital' } : null,
    physicalResult.data ? { ...physicalResult.data, product_type: 'physical', cover_image: physicalResult.data.images?.[0] || null } : null,
  ].filter(Boolean);

  return candidates.find((product) => !shopId || String(product.shop_id) === String(shopId)) || candidates[0] || null;
}

async function addPublicShopProduct(event) {
  const target = event.target?.closest?.('.public-shop-page .product-card');
  if (!target || event.target?.closest?.('button, a, input, textarea, select, form')) return;

  event.preventDefault();
  event.stopPropagation();
  if (event.stopImmediatePropagation) event.stopImmediatePropagation();
  if (busy) return;
  busy = true;

  try {
    const title = target.querySelector('h3')?.textContent?.trim();
    const shopName = document.querySelector('.public-shop-info h1')?.textContent?.trim();
    const product = await findProduct(title, shopName);

    if (!product) {
      console.warn('PJD Market: produit introuvable pour le panier', title);
      return;
    }

    const free = Number(product.price || 0) === 0 || product.is_free === true;
    if (free && product.product_type === 'digital') {
      window.dispatchEvent(new CustomEvent('pjd-product-free-clicked', { detail: product }));
      return;
    }

    window.dispatchEvent(new CustomEvent('pjd-add-to-cart', { detail: product }));
  } finally {
    busy = false;
  }
}

document.addEventListener('click', addPublicShopProduct, true);
