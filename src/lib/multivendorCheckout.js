import { supabase } from './supabase';

export async function validatePromoCode({ code, userId, subtotal }) {
  if (!userId) throw new Error('Connexion requise pour utiliser un code promo.');
  const { data, error } = await supabase.rpc('validate_promo_code', {
    p_code: String(code || '').trim().toUpperCase(),
    p_user_id: userId,
    p_subtotal: Number(subtotal || 0),
  });
  if (error) throw error;
  if (!data?.valid) throw new Error(data?.message || 'Code promo invalide.');
  return data;
}

export async function createMultivendorOrder({ userId, items, paymentMethod = 'pending', promoCode = null }) {
  if (!userId) throw new Error('Connexion requise pour commander.');
  const cleanItems = (items || []).map((item) => ({
    product_id: item.product_id,
    quantity: Math.max(1, Number(item.quantity || 1)),
  })).filter((item) => item.product_id);
  if (!cleanItems.length) throw new Error('Votre panier est vide.');

  const { data, error } = await supabase.rpc('create_multivendor_order', {
    p_user_id: userId,
    p_items: cleanItems,
    p_payment_method: paymentMethod,
    p_promo_code: promoCode || null,
  });
  if (error) throw error;

  const urlRef = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ref') : null;
  const affiliateCode = (localStorage.getItem('pjd-affiliate-ref') || urlRef || '').trim().toUpperCase();
  if (affiliateCode) localStorage.setItem('pjd-affiliate-ref', affiliateCode);
  const clickId = localStorage.getItem('pjd-affiliate-click');
  if (affiliateCode) {
    await supabase.rpc('record_affiliate_conversion', {
      p_order_id: data,
      p_affiliate_code: affiliateCode,
      p_click_id: clickId || null,
    });
  }
  return data;
}

export function groupOrderItemsByShop(items = []) {
  return items.reduce((groups, item) => {
    const key = item.shop_id || 'unknown';
    (groups[key] ||= []).push(item);
    return groups;
  }, {});
}
