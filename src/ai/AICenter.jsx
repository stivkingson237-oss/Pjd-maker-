import React, { useEffect, useMemo, useRef, useState } from 'react';
import { aiHub } from './aiHub';
import { supabase } from '../lib/supabase';
import './ai-center.css';

const MODES = [
  ['general', '🤖', 'Assistant général'], ['product', '📦', 'IA Produit'],
  ['marketing', '📣', 'IA Marketing'], ['commercial', '📊', 'IA Commerciale'],
  ['seller', '🛍️', 'Assistant vendeur'], ['customer', '💬', 'Assistant client']
];
const STARTERS = {
  general: ['Que peux-tu faire pour moi ?', 'Comment fonctionne PJD Market ?', 'Comment vendre sur PJD Market ?'],
  product: ['Comment améliorer ma fiche produit ?', 'Aide-moi à trouver un bon titre', 'Rédige une description convaincante'],
  marketing: ['Crée une campagne pour mon produit', 'Donne-moi une idée de promotion', 'Prépare un message WhatsApp'],
  commercial: ['Analyse ma stratégie commerciale', 'Comment augmenter mes ventes ?', 'Comment fixer mes prix ?'],
  seller: ['Analyser mon catalogue', 'Calculer un prix de vente', 'Créer une offre promotionnelle'],
  customer: ['Je cherche un produit', 'Aide-moi à choisir un produit', 'Comment acheter sur PJD Market ?']
};

export default function AICenter({ onClose }) {
  const [task, setTask] = useState('general');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [context, setContext] = useState({});
  const endRef = useRef(null), inputRef = useRef(null);
  const activeMode = useMemo(() => MODES.find(([id]) => id === task) || MODES[0], [task]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);
  useEffect(() => { inputRef.current?.focus(); }, [task]);

  useEffect(() => {
    let cancelled = false;
    const loadContext = async () => {
      setLoadingContext(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) return;
        const base = { user_id: userId };
        if (['seller', 'marketing', 'commercial'].includes(task)) {
          const { data: user } = await supabase.from('users').select('id,name,prenom,email,role,shop_id').eq('id', userId).maybeSingle();
          const shopId = user?.shop_id;
          if (shopId) {
            const [{ data: shop }, { data: physical }, { data: digital }, { data: orders }] = await Promise.all([
              supabase.from('shops').select('id,shop_name,description,category,status,city,country,rating,followers_count,plan_code,commission_rate').eq('id', shopId).maybeSingle(),
              supabase.from('marketplace_products').select('id,title,description,category,price,promo_price,stock,status,sku,delivery_available,delivery_fee,delivery_estimate_days,variants,updated_at').eq('shop_id', shopId).limit(300),
              supabase.from('digital_products').select('id,title,description,category,price,sale_price,promo_price,stock,status,sales,downloads,is_free,file_type,updated_at').eq('shop_id', shopId).limit(300),
              supabase.from('order_items').select('order_id,name,price,quantity,shop_id,commission,seller_net,product_type,status').eq('shop_id', shopId).limit(500)
            ]);
            if (!cancelled) setContext({ ...base, shop, physical_products: physical || [], digital_products: digital || [], shop_order_items: orders || [] });
          } else if (!cancelled) setContext({ ...base, shop: null, physical_products: [], digital_products: [], shop_order_items: [] });
        } else if (!cancelled) setContext(base);
      } catch (e) { if (!cancelled) setError(`Contexte IA : ${e.message || 'chargement impossible'}`); }
      finally { if (!cancelled) setLoadingContext(false); }
    };
    loadContext();
    return () => { cancelled = true; };
  }, [task]);

  const switchMode = (next) => { setTask(next); setInput(''); setError(''); setMessages([]); };

  const send = async (forcedText) => {
    const text = (forcedText ?? input).trim();
    if (!text || busy) return;
    setInput(''); setError('');
    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages); setBusy(true);
    try {
      const result = await aiHub(task, { request: text, conversation: nextMessages.slice(-12), context });
      const content = typeof result === 'string' ? result : (result?.response || result?.message || JSON.stringify(result, null, 2));
      setMessages(prev => [...prev, { role: 'assistant', content }]);
    } catch (e) {
      const message = e.message || 'Impossible de contacter l’assistant IA.';
      setError(message); setMessages(prev => [...prev, { role: 'assistant', content: `Désolé, je n’ai pas pu répondre. ${message}` }]);
    } finally { setBusy(false); setTimeout(() => inputRef.current?.focus(), 0); }
  };
  const onKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div className="pjd-ai-overlay" role="dialog" aria-modal="true" aria-label="Assistant IA PJD Market">
      <div className="pjd-ai-card pjd-ai-chat-card">
        <header className="pjd-ai-head pjd-ai-chat-head">
          <div className="pjd-ai-title-wrap"><span className="pjd-ai-avatar">✦</span><div>
            <span className="pjd-ai-badge">PJD MAKER IA</span><h2>{activeMode[1]} {activeMode[2]}</h2>
            <p>{task === 'seller' ? 'Assistant spécialisé dans votre boutique et son catalogue.' : 'Posez votre question naturellement. L’assistant vous répond dans la même conversation.'}</p>
          </div></div>
          <button className="pjd-ai-close" onClick={onClose} aria-label="Fermer">✕</button>
        </header>
        <div className="pjd-ai-chat-layout">
          <nav className="pjd-ai-modes" aria-label="Assistants IA">{MODES.map(([id, icon, label]) => (
            <button key={id} className={task === id ? 'active' : ''} onClick={() => switchMode(id)}><span>{icon}</span><span>{label}</span></button>
          ))}</nav>
          <main className="pjd-ai-chat-main">
            <div className="pjd-ai-messages" aria-live="polite">
              {messages.length === 0 && <div className="pjd-ai-welcome"><div className="pjd-ai-welcome-icon">✦</div><h3>Bonjour 👋</h3>
                <p>Je suis votre {activeMode[2].toLowerCase()}. {task === 'seller' ? (loadingContext ? 'Je prépare les données de votre boutique…' : 'Je connais le catalogue chargé de votre boutique.') : 'Que voulez-vous faire aujourd’hui ?'}</p>
                <div className="pjd-ai-starters">{(STARTERS[task] || STARTERS.general).map(text => <button key={text} onClick={() => send(text)} disabled={busy || loadingContext}>{text}</button>)}</div>
              </div>}
              {messages.map((message, index) => <div key={`${message.role}-${index}`} className={`pjd-ai-message-row ${message.role}`}>
                {message.role === 'assistant' && <span className="pjd-ai-message-avatar">✦</span>}<div className={`pjd-ai-message ${message.role}`}><div>{message.content}</div></div>
              </div>)}
              {busy && <div className="pjd-ai-message-row assistant"><span className="pjd-ai-message-avatar">✦</span><div className="pjd-ai-message assistant pjd-ai-typing"><i></i><i></i><i></i></div></div>}
              <div ref={endRef} />
            </div>
            {error && <div className="pjd-ai-error">{error}</div>}
            <div className="pjd-ai-composer"><textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder={loadingContext && task === 'seller' ? 'Chargement de votre boutique…' : 'Écrivez un message…'} rows={1} aria-label="Message à envoyer" disabled={busy || (loadingContext && task === 'seller')} />
              <button className="pjd-ai-send" onClick={() => send()} disabled={busy || !input.trim() || (loadingContext && task === 'seller')} aria-label="Envoyer">{busy ? '…' : '➤'}</button></div>
            <small className="pjd-ai-note">Entrée pour envoyer · Maj + Entrée pour aller à la ligne</small>
          </main>
        </div>
      </div>
    </div>
  );
}
