export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY n’est pas configurée dans Vercel.' });

  try {
    const { product, channels } = req.body || {};
    if (!product || !Array.isArray(channels) || !channels.length) {
      return res.status(400).json({ error: 'Produit et au moins un canal sont requis.' });
    }

    const title = product.title || product.name || 'Produit PJD Market';
    const description = product.description || '';
    const price = Number(product.price || 0);
    const promoPrice = product.promo_price == null ? null : Number(product.promo_price);
    const category = product.category || '';

    const prompt = `Tu es l’assistant marketing de PJD Market, une marketplace africaine. Crée une mini-campagne prête à être relue par le vendeur, sans publier automatiquement.\n\nPRODUIT:\nNom: ${title}\nDescription: ${description}\nPrix: ${price} FCFA\nPrix promotionnel: ${promoPrice != null && !Number.isNaN(promoPrice) ? promoPrice + ' FCFA' : 'aucun'}\nCatégorie: ${category}\n\nCANAUX: ${channels.join(', ')}\n\nRetourne UNIQUEMENT un JSON valide avec exactement ces champs:\n{\n  "campaign_title": "...",\n  "strategy": "...",\n  "posts": { "Canal": "contenu adapté au canal" },\n  "headlines": { "Canal": "accroche courte" },\n  "ctas": { "Canal": "appel à l’action" },\n  "hashtags": ["#..."]\n}\nRègles: français naturel, concret, pas de fausses promesses, pas de chiffres inventés, mentionne le prix quand utile, WhatsApp/SMS courts, Instagram avec hashtags, Facebook plus détaillé, TikTok très accrocheur. N’inclus que les canaux demandés dans posts/headlines/ctas.`;

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MARKETING_MODEL || 'gpt-5.6-luna',
        input: prompt,
        max_output_tokens: 2200
      })
    });

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); } catch { data = null; }
    if (!response.ok) {
      const message = data?.error?.message || data?.error || raw || 'Erreur OpenAI.';
      return res.status(response.status).json({ error: message });
    }

    const text = data?.output_text || (data?.output || [])
      .flatMap(item => item?.content || [])
      .map(part => part?.text || '')
      .join('')
      .trim();

    if (!text) return res.status(502).json({ error: 'OpenAI n’a retourné aucun contenu.' });

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return res.status(502).json({ error: 'Réponse IA invalide. Réessayez.' });
      result = JSON.parse(match[0]);
    }

    return res.status(200).json({ result });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Impossible de générer la campagne.' });
  }
}
