import React, { useEffect, useMemo, useRef, useState } from 'react';
import { aiHub } from './aiHub';
import './ai-center.css';

const MODES = [
  ['general', '🤖', 'Assistant général'],
  ['product', '📦', 'IA Produit'],
  ['marketing', '📣', 'IA Marketing'],
  ['commercial', '📊', 'IA Commerciale'],
  ['seller', '🛍️', 'Assistant vendeur'],
  ['customer', '💬', 'Assistant client']
];

const STARTERS = {
  general: ['Que peux-tu faire pour moi ?', 'Aide-moi à développer ma boutique', 'Comment fonctionne PJD Market ?'],
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
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  const activeMode = useMemo(() => MODES.find(([id]) => id === task) || MODES[0], [task]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [task]);

  const switchMode = (next) => {
    setTask(next);
    setInput('');
    setError('');
    setMessages([]);
  };

  const send = async (forcedText) => {
    const text = (forcedText ?? input).trim();
    if (!text || busy) return;

    setInput('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setBusy(true);

    try {
      const result = await aiHub(task, { request: text });
      const content = typeof result === 'string'
        ? result
        : (result?.response || result?.message || JSON.stringify(result, null, 2));
      setMessages(prev => [...prev, { role: 'assistant', content }]);
    } catch (e) {
      const message = e.message || 'Impossible de contacter l’assistant IA.';
      setError(message);
      setMessages(prev => [...prev, { role: 'assistant', content: `Désolé, je n’ai pas pu répondre. ${message}` }]);
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
    <div className="pjd-ai-overlay" role="dialog" aria-modal="true" aria-label="Assistant IA PJD Market">
      <div className="pjd-ai-card pjd-ai-chat-card">
        <header className="pjd-ai-head pjd-ai-chat-head">
          <div className="pjd-ai-title-wrap">
            <span className="pjd-ai-avatar">✦</span>
            <div>
              <span className="pjd-ai-badge">PJD MAKER IA</span>
              <h2>{activeMode[1]} {activeMode[2]}</h2>
              <p>Posez votre question naturellement. L’assistant vous répond dans la même conversation.</p>
            </div>
          </div>
          <button className="pjd-ai-close" onClick={onClose} aria-label="Fermer">✕</button>
        </header>

        <div className="pjd-ai-chat-layout">
          <nav className="pjd-ai-modes" aria-label="Assistants IA">
            {MODES.map(([id, icon, label]) => (
              <button key={id} className={task === id ? 'active' : ''} onClick={() => switchMode(id)}>
                <span>{icon}</span><span>{label}</span>
              </button>
            ))}
          </nav>

          <main className="pjd-ai-chat-main">
            <div className="pjd-ai-messages" aria-live="polite">
              {messages.length === 0 && (
                <div className="pjd-ai-welcome">
                  <div className="pjd-ai-welcome-icon">✦</div>
                  <h3>Bonjour 👋</h3>
                  <p>Je suis votre {activeMode[2].toLowerCase()}. Que voulez-vous faire aujourd’hui ?</p>
                  <div className="pjd-ai-starters">
                    {(STARTERS[task] || STARTERS.general).map(text => (
                      <button key={text} onClick={() => send(text)} disabled={busy}>{text}</button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`pjd-ai-message-row ${message.role}`}>
                  {message.role === 'assistant' && <span className="pjd-ai-message-avatar">✦</span>}
                  <div className={`pjd-ai-message ${message.role}`}>
                    <div>{message.content}</div>
                  </div>
                </div>
              ))}

              {busy && (
                <div className="pjd-ai-message-row assistant">
                  <span className="pjd-ai-message-avatar">✦</span>
                  <div className="pjd-ai-message assistant pjd-ai-typing"><i></i><i></i><i></i></div>
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
                placeholder="Écrivez un message…"
                rows={1}
                aria-label="Message à envoyer"
                disabled={busy}
              />
              <button className="pjd-ai-send" onClick={() => send()} disabled={busy || !input.trim()} aria-label="Envoyer">
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
