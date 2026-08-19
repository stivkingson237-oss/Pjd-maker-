import React, { useState } from 'react';
import { X, MailCheck, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

export default function AuthGate({ children }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
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
      setMode('verify');
      setMessage(`Un code de confirmation a été envoyé à ${email.trim()}.`);
    } else {
      setMessage('Compte créé avec succès. Vous êtes maintenant connecté.');
      setMode('done');
    }
  }

  async function verifyCode(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'signup',
    });
    setLoading(false);
    if (verifyError) {
      setError('Code incorrect ou expiré. Demandez un nouveau code.');
      return;
    }
    setMessage('E-mail confirmé avec succès. Votre compte PJD Maker est activé.');
    setMode('done');
  }

  async function resendCode() {
    setError('');
    setLoading(true);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    setLoading(false);
    if (resendError) {
      setError(resendError.message);
    } else {
      setMessage(`Un nouveau code a été envoyé à ${email.trim()}.`);
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
      setCode('');
      setMode('signup');
      setOpen(true);
    }
  }

  return <div onClickCapture={captureCreateAccount}>
    {children}
    {open && <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Compte PJD Maker" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{mode === 'verify' ? <><MailCheck size={21}/> Confirmer votre e-mail</> : mode === 'done' ? <><MailCheck size={21}/> Compte confirmé</> : <><UserPlus size={21}/> Créer un compte</>}</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer"><X/></button>
        </div>
        {mode === 'verify' ? <form onSubmit={verifyCode}>
          <div className="auth-success"><MailCheck size={42}/><p>{message || `Entrez le code envoyé à ${email}.`}</p></div>
          {error && <div className="auth-error">{error}</div>}
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            required
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Code à 6 chiffres"
            aria-label="Code de confirmation"
          />
          <button className="primary" disabled={loading || code.length !== 6}>
            {loading ? <><Loader2 className="spin"/> Vérification...</> : <><MailCheck size={18}/> Confirmer le code</>}
          </button>
          <button className="secondary" type="button" disabled={loading} onClick={resendCode}>Renvoyer le code</button>
        </form> : mode === 'done' ? <div className="auth-success"><MailCheck size={42}/><p>{message}</p><button className="primary" type="button" onClick={() => setOpen(false)}>Continuer</button></div> : <form onSubmit={signup}>
          {error && <div className="auth-error">{error}</div>}
          <label>E-mail<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="exemple@email.com"/></label>
          <label>Mot de passe<input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6 caractères minimum"/></label>
          <button className="primary" disabled={loading}>{loading ? <><Loader2 className="spin"/> Création...</> : <><UserPlus size={18}/> Créer mon compte</>}</button>
        </form>}
      </div>
    </div>}
  </div>;
}
