import React, { useState } from 'react';
import { X, MailCheck, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

export default function AuthGate({ children }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function signup(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email.trim() || password.length < 6) {
      setError('Saisissez un e-mail valide et un mot de passe d’au moins 6 caractères.');
      return;
    }
    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: email.trim().split('@')[0] } },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data?.user && !data.session) {
      setMessage(`Compte créé pour ${email.trim()}. Vérifiez votre boîte e-mail et cliquez sur le lien de confirmation avant de vous connecter.`);
    } else {
      setMessage('Compte créé avec succès. Vous êtes maintenant connecté.');
    }
  }

  function captureCreateAccount(event) {
    const target = event.target?.closest?.('button');
    if (!target) return;
    const text = (target.textContent || '').trim().toLowerCase();
    if (text.includes('créer un compte')) {
      event.preventDefault();
      event.stopPropagation();
      setError('');
      setMessage('');
      setEmail('');
      setPassword('');
      setOpen(true);
    }
  }

  return <div onClickCapture={captureCreateAccount}>
    {children}
    {open && <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Créer un compte" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2><UserPlus size={21}/> Créer un compte</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer"><X/></button>
        </div>
        {message ? <div className="auth-success"><MailCheck size={42}/><p>{message}</p><button className="primary" type="button" onClick={() => setOpen(false)}>Fermer</button></div> : <form onSubmit={signup}>
          {error && <div className="auth-error">{error}</div>}
          <label>E-mail<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="exemple@email.com"/></label>
          <label>Mot de passe<input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6 caractères minimum"/></label>
          <button className="primary" disabled={loading}>{loading ? <><Loader2 className="spin"/> Création...</> : <><UserPlus size={18}/> Créer mon compte</>}</button>
        </form>}
      </div>
    </div>}
  </div>;
}
