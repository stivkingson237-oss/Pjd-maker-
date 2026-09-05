import React, { useState } from 'react';
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

export default function AICenter({ onClose }) {
  const [task, setTask] = useState('general');
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async () => {
    if (!input.trim() || busy) return;
    setBusy(true); setError(''); setResult('');
    try {
      const r = await aiHub(task, { request: input.trim() });
      setResult(typeof r === 'string' ? r : JSON.stringify(r, null, 2));
    } catch (e) {
      setError(e.message || 'Impossible de contacter le Centre IA.');
    } finally { setBusy(false); }
  };

  return (
    <div className="pjd-ai-overlay" role="dialog" aria-modal="true" aria-label="Centre IA PJD Maker">
      <div className="pjd-ai-card">
        <div className="pjd-ai-head">
          <div>
            <span className="pjd-ai-badge">CENTRE IA PJD MAKER</span>
            <h2>Toutes vos IA au même endroit</h2>
            <p>Produit, marketing, commercial, vendeur et client — sans connexion aux réseaux sociaux.</p>
          </div>
          <button className="pjd-ai-close" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="pjd-ai-grid">
          <nav className="pjd-ai-modes" aria-label="Modes IA">
            {MODES.map(([id, icon, label]) => (
              <button key={id} className={task === id ? 'active' : ''} onClick={() => { setTask(id); setResult(''); setError(''); }}>
                <span>{icon}</span><span>{label}</span>
              </button>
            ))}
          </nav>

          <main className="pjd-ai-main">
            <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Décris ce que tu veux que l’IA fasse…" />
            <button className="pjd-ai-run" onClick={run} disabled={busy || !input.trim()}>
              {busy ? '⏳ L’IA travaille…' : '✨ Lancer le Centre IA'}
            </button>
            {error && <div className="pjd-ai-error">{error}</div>}
            {result && <pre className="pjd-ai-result">{result}</pre>}
          </main>
        </div>
      </div>
    </div>
  );
}
