import React, { useEffect, useRef, useState } from 'react';
import { aiHub } from './aiHub';
import { supabase } from '../lib/supabase';
import './ai-center.css';

const STARTERS = [
  'Que peux-tu faire pour moi sur PJD Market ?',
  'Analyse ma boutique et propose des actions pour augmenter mes ventes.',
  'Aide-moi à améliorer la fiche de mon produit.',
  'Crée une campagne marketing pour mon produit.',
  'Propose une promotion adaptée à mon catalogue.',
  'Aide-moi à gérer mes commandes et mes livraisons.',
  'Comment acheter, payer ou télécharger un produit numérique ?',
  'Prépare un message WhatsApp pour mes clients.'
];

export default function AICenter({ onClose }) {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [context, setContext] = useState({});
  const endRef = useRef(null), inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadContext = async () => {
      setLoadingContext(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        const userId = session?.user?.id;

        if (!userId) {
          if (!cancelled) setContext({});
          return;
        }

        const base = { user_id: userId };

        const { data: user } = await supabase
          .from('users')
          .select('id,name,prenom,email,role,shop_id')
          .eq('id', userId)
          .maybeSingle();

        const shopId = user?.shop_id;

        const requests = [
          supabase
            .from('order_items')
            .select('order_id,name,price,quantity,shop_id,commission,seller_net,product_type,status')
            .limit(500)
        ];

        if (shopId) {
          requests.push(
            supabase
              .from('shops')
              .select('id,shop_name,description,category,status,city,country,rating,followers_count,plan_code,commission_rate')
              .eq('id', shopId)
              .maybeSingle()
          );
          requests.push(
            supabase
              .from('marketplace_products')
              .select('id,title,description,category,price,promo_price,stock,status,sku,delivery_available,delivery_fee,delivery_estimate_days,variants,updated_at')
              .eq('shop_id', shopId)
              .limit(300)
          );
          requests.push(
            supabase
              .from('digital_products')
              .select('id,title,description,category,price,sale_price,promo_price,stock,status,sales,downloads,is_free,file_type,updated_at')
              .eq('shop_id', shopId)
              .limit(300)
          );
        }

        const results = await Promise.all(requests);
        const orderResult = results[0];
        const shopResult = shopId ? results[1] : null;
        const physicalResult = shopId ? results[2] : null;
        const digitalResult = shopId ? results[3] : null;

        if (!cancelled) {
          setContext({
            ...base,
            user: user || null,
            shop: shopResult?.data || null,
            physical_products: physicalResult?.data || [],
            digital_products: digitalResult?.data || [],
            shop_order_items: orderResult?.data || []
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(`Contexte IA : ${e.message || 'chargement impossible'}`);
        }
      } finally {
        if (!cancelled) setLoadingContext(false);
      }
    };

    loadContext();
    return () => { cancelled = true; };
  }, []);

  const send = async (forcedText) => {
    const text = (forcedText ?? input).trim();
    if (!text || busy) return;

    setInput('');
    setError('');

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setBusy(true);

    try {
      const result = await aiHub('general', {
        request: text,
        conversation: nextMessages.slice(-12),
        context
      });

      const content = typeof result === 'string'
        ? result
        : (result?.response || result?.message || JSON.stringify(result, null, 2));

      setMessages(prev => [...prev, { role: 'assistant', content }]);
    } catch (e) {
      const message = e.message || 'Impossible de contacter l’assistant IA.';
      setError(message);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Désolé, je n’ai pas pu répondre. ${message}` }
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="pjd-ai-overlay" role="dialog" aria-modal="true" aria-label="Assistant général PJD Market">
      <div className="pjd-ai-card pjd-ai-chat-card">
        <header className="pjd-ai-head pjd-ai-chat-head">
          <div className="pjd-ai-title-wrap">
            <span className="pjd-ai-avatar">✦</span>
            <div>
              <span className="pjd-ai-badge">PJD MAKER IA</span>
              <h2>🤖 Assistant général</h2>
              <p>Un seul assistant pour toutes les fonctionnalités PJD Market.</p>
            </div>
          </div>
          <button className="pjd-ai-close" onClick={onClose} aria-label="Fermer">✕</button>
        </header>

        <div className="pjd-ai-chat-layout">
          <main className="pjd-ai-chat-main">
            <div className="pjd-ai-messages" aria-live="polite">
              {messages.length === 0 && (
                <div className="pjd-ai-welcome">
                  <div className="pjd-ai-welcome-icon">✦</div>
                  <h3>Bonjour 👋</h3>
                  <p>
                    Je suis votre Assistant général PJD Market.
                    {loadingContext
                      ? ' Je prépare les données disponibles de votre compte…'
                      : ' Je peux vous aider avec les produits, le marketing, les ventes, votre boutique, les commandes, les livraisons et le parcours client, dans la même conversation.'}
                  </p>
                  <div className="pjd-ai-starters">
                    {STARTERS.map(text => (
                      <button
                        key={text}
                        onClick={() => send(text)}
                        disabled={busy || loadingContext}
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`pjd-ai-message-row ${message.role}`}
                >
                  {message.role === 'assistant' && <span className="pjd-ai-message-avatar">✦</span>}
                  <div className={`pjd-ai-message ${message.role}`}>
                    <div>{message.content}</div>
                  </div>
                </div>
              ))}

              {busy && (
                <div className="pjd-ai-message-row assistant">
                  <span className="pjd-ai-message-avatar">✦</span>
                  <div className="pjd-ai-message assistant pjd-ai-typing">
                    <i></i><i></i><i></i>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>

            {error && <div className="pjd-ai-error">{error}</div>}

            <div className="pjd-ai-composer">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={loadingContext ? 'Préparation de l’assistant…' : 'Écrivez un message…'}
                rows={1}
                aria-label="Message à envoyer"
                disabled={busy}
              />
              <button
                className="pjd-ai-send"
                onClick={() => send()}
                disabled={busy || !input.trim()}
                aria-label="Envoyer"
              >
                {busy ? '…' : '➤'}
              </button>
            </div>
            <small className="pjd-ai-note">Entrée pour envoyer · Maj + Entrée pour aller à la ligne</small>
          </main>
        </div>
      </div>
    </div>
  );
}
