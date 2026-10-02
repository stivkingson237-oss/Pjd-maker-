const CHANNEL_NAMES = ['WhatsApp', 'Facebook', 'Instagram', 'TikTok', 'SMS'];

function clean(value, max = 1800) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function normalizeChannels(channels) {
  return [...new Set((Array.isArray(channels) ? channels : []).map(clean).filter(c => CHANNEL_NAMES.includes(c)))];
}

function fallbackCampaign(product, channels) {
  const title = clean(product.title || product.name || 'Produit PJD Market', 120);
  const description = clean(product.description || 'Découvrez ce produit disponible sur PJD Market.', 360);
  const price = Number(product.price || 0);
  const promo = product.promo_price == null ? null : Number(product.promo_price);
  const shownPrice = Number.isFinite(promo) && promo > 0 && promo < price ? promo : price;
  const priceText = shownPrice > 0 ? ` Prix : ${shownPrice.toLocaleString('fr-FR')} FCFA.` : '';
  const posts = {};
  const headlines = {};
  const ctas = {};

  for (const channel of channels) {
    if (channel === 'WhatsApp') {
      headlines[channel] = `✨ ${title}`;
      posts[channel] = `Découvrez ${title}. ${description}${priceText}\n\nIntéressé(e) ? Écrivez-nous pour commander ou obtenir plus d'informations.`;
      ctas[channel] = 'Écrivez-nous pour commander';
    } else if (channel === 'Facebook') {
      headlines[channel] = `${title} — découvrez-le sur PJD Market`;
      posts[channel] = `🛍️ ${title}\n\n${description}${priceText}\n\nDécouvrez le produit sur PJD Market et contactez le vendeur pour passer commande.`;
      ctas[channel] = 'Découvrir et commander';
    } else if (channel === 'Instagram') {
      headlines[channel] = `${title} ✨`;
      posts[channel] = `✨ ${title}\n\n${description}${priceText}\n\nDisponible sur PJD Market. Contactez le vendeur pour commander.`;
      ctas[channel] = 'Découvrir le produit';
    } else if (channel === 'TikTok') {
      headlines[channel] = `Tu cherches ${title} ? 👀`;
      posts[channel] = `👀 Tu cherches ${title} ?\n\n${description}${priceText}\n\nDécouvre-le sur PJD Market et contacte le vendeur pour commander.`;
      ctas[channel] = 'Découvre-le maintenant';
    } else if (channel === 'SMS') {
      headlines[channel] = title;
      posts[channel] = `${title}.${priceText} ${description.slice(0, 150)} Commandez via PJD Market.`;
      ctas[channel] = 'Commander via PJD Market';
    }
  }

  return {
    campaign_title: `Campagne — ${title}`,
    strategy: 'Présenter clairement le produit, mettre en avant son bénéfice réel et terminer par une action simple. Ce contenu de secours peut être modifié avant publication.',
    posts,
    headlines,
    ctas,
    hashtags: ['#PJDMarket', '#Shopping', '#BoutiqueEnLigne', '#Commerce', '#Afrique']
  };
}

async function generateWithGemini(apiKey, product, channels) {
  const title = clean(product.title || product.name || 'Produit PJD Market', 180);
  const description = clean(product.description || '', 1200);
  const price = Number(product.price || 0);
  const promoPrice = product.promo_price == null ? null : Number(product.promo_price);
  const category = clean(product.category || '', 120);
  const prompt = `Tu es l’assistant marketing de PJD Market, une marketplace africaine. Crée une mini-campagne prête à être relue par le vendeur, sans publier automatiquement.

PRODUIT:
Nom: ${title}
Description: ${description}
Prix: ${Number.isFinite(price) ? price : 0} FCFA
Prix promotionnel: ${promoPrice != null && Number.isFinite(promoPrice) ? promoPrice + ' FCFA' : 'aucun'}
Catégorie: ${category}

CANAUX: ${channels.join(', ')}

Retourne UNIQUEMENT un JSON valide avec exactement ces champs:
{
  "campaign_title": "...",
  "strategy": "...",
  "posts": { "Canal": "contenu adapté au canal" },
  "headlines": { "Canal": "accroche courte" },
  "ctas": { "Canal": "appel à l’action" },
  "hashtags": ["#..."]
}
Règles: français naturel, concret, pas de fausses promesses, pas de chiffres inventés, mentionne le prix quand utile, WhatsApp/SMS courts, Instagram avec hashtags, Facebook plus détaillé, TikTok très accrocheur. N’inclus que les canaux demandés.`;

  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 1800, responseMimeType: 'application/json' }
    })
  });

  const raw = await response.text();
  let data = null;
  try { data = JSON.parse(raw); } catch {}
  if (!response.ok) {
    const error = new Error(data?.error?.message || raw || `Gemini HTTP ${response.status}`);
    error.status = response.status;
    error.code = data?.error?.status || '';
    throw error;
  }

  const text = String(data?.candidates?.[0]?.content?.parts?.map(part => part?.text || '').join('') || '').trim();
  if (!text) throw new Error('Gemini n’a retourné aucun contenu.');

  let result;
  try { result = JSON.parse(text); }
  catch { throw new Error('Réponse IA invalide.'); }

  if (!result || typeof result !== 'object' || typeof result.posts !== 'object') {
    throw new Error('Structure de campagne invalide.');
  }
  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });

  const body = req.body || {};
  const channels = normalizeChannels(body.channels);
  const product = body.product && typeof body.product === 'object' ? body.product : null;
  if (!product || !channels.length) return res.status(400).json({ error: 'Sélectionnez un produit et au moins un canal.' });

  const fallback = fallbackCampaign(product, channels);
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      result: fallback,
      source: 'fallback',
      warning: 'IA non configurée : campagne de secours générée automatiquement.'
    });
  }

  try {
    const result = await generateWithGemini(apiKey, product, channels);
    return res.status(200).json({ result, source: 'gemini' });
  } catch (error) {
    console.error('pjd-ai-marketing Gemini error:', error?.status, error?.code, error?.message || error);
    let warning = 'Gemini est temporairement indisponible. Une campagne de secours a été générée.';

    if (error?.status === 429) {
      if (['insufficient_quota', 'credit_balance_exhausted', 'organization_usage_limit_exceeded',
        'organization_spend_limit_exceeded', 'project_spend_limit_exceeded'].includes(error?.code)) {
        warning = 'La clé Gemini est bien configurée, mais le quota ou la limite de facturation Gemini bloque actuellement la requête. La campagne de secours a été générée.';
      } else {
        warning = 'Gemini limite temporairement les requêtes (429). Une campagne de secours a été générée automatiquement.';
      }
    } else if (error?.status === 401) {
      warning = 'La clé Gemini configurée n’est pas acceptée. Vérifiez-la dans les secrets Supabase/Vercel. La campagne de secours a été générée.';
    } else if (error?.status === 403) {
      warning = 'Gemini a refusé la requête (403). Vérifiez le projet, les autorisations et les limites Gemini. La campagne de secours a été générée.';
    }

    return res.status(200).json({
      result: fallback,
      source: 'fallback',
      warning,
      provider_status: error?.status || null,
      provider_code: error?.code || null
    });
  }
}
