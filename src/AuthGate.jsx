import React, { useState } from 'react';
import { X, MailCheck, UserPlus, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

const PRODUCTION_URL = 'https://pjd-maker.vercel.app';

export default function AuthGate({ children }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
    if (!lastName.trim() || !firstName.trim()) {
      setError('Veuillez renseigner votre nom et votre prénom.');
      return;
    }
    if (!email.trim() || password.length < 6) {
      setError('Saisissez un e-mail valide et un mot de passe d’au moins 6 caractères.');
      return;
    }
    setLoading(true);
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const fullName = `${cleanLastName} ${cleanFirstName}`;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: fullName,
          first_name: cleanFirstName,
          last_name: cleanLastName,
        },
        emailRedirectTo: PRODUCTION_URL,
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data?.user && !data.session) {
      setCode('');
      setMode('verify');
      setMessage(`Bonjour ${cleanFirstName} 👋 Un code de confirmation à 6 chiffres a été envoyé à ${cleanEmail}.`);
    } else {
      setMessage(`Bienvenue ${cleanFirstName} ! Votre compte PJD Maker est créé.`);
      setMode('done');
    }
  }

  async function verifyCode(e) {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.replace(/\D/g, '').slice(0, 6);

    if (!/^\d{6}$/.test(cleanCode)) {
      setError('Saisissez exactement le code à 6 chiffres reçu par e-mail.');
      return;
    }

    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanCode,
      type: 'email',
    });
    setLoading(false);

    if (verifyError) {
      setError('Code incorrect ou expiré. Demandez un nouveau code.');
      return;
    }

    setCode('');
    setMessage(`Félicitations ${firstName.trim()} ! Votre e-mail est confirmé et votre compte PJD Maker est activé.`);
    setMode('done');
  }

  async function resendCode() {
    setError('');
    setMessage('');
    const cleanEmail = email.trim().toLowerCase();
    setLoading(true);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
    });
    setLoading(false);
    if (resendError) {
      setError(resendError.message);
    } else {
      setCode('');
      setMessage(`Bonjour ${firstName.trim()} 👋 Un nouveau code a été envoyé à ${cleanEmail}. Utilisez uniquement le dernier code reçu.`);
    }
  }

  function captureCreateAccount(event) {
    const target = event.target?.closest?.('button');
    if (!target) return;
    const text = (target.textContent || '').trim().toLowerCase();
    if (text.includes('créer un compte')) {
      event.preventDefault();
      event.stopPropagation();
      setError(''); setMessage(''); setFirstName(''); setLastName(''); setEmail(''); setPassword(''); setCode(''); setMode('signup'); setOpen(true);
    }
  }

  return <div onClickCapture={captureCreateAccount}>
    {children}
    {open && <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Inscription PJD Maker" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{mode === 'verify' ? <><MailCheck size={21}/> Confirmer votre e-mail</> : mode === 'done' ? <><MailCheck size={21}/> Inscription terminée</> : <><UserPlus size={21}/> Créer un compte</>}</h2>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fermer"><X/></button>
        </div>
        {mode === 'verify' ? <form onSubmit={verifyCode}>
          <div className="auth-success"><MailCheck size={42}/><p>{message || `Bonjour ${firstName}. Entrez le code envoyé à ${email}.`}</p></div>
          {error && <div className="auth-error">{error}</div>}
          <input type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} pattern="[0-9]{6}" required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Code à 6 chiffres" aria-label="Code de confirmation" />
          <button className="primary" disabled={loading || code.length !== 6}>{loading ? <><Loader2 className="spin"/> Vérification...</> : <><MailCheck size={18}/> Confirmer le code</>}</button>
          <button className="secondary" type="button" disabled={loading} onClick={resendCode}>Renvoyer le code</button>
        </form> : mode === 'done' ? <div className="auth-success"><MailCheck size={42}/><p>{message}</p><button className="primary" type="button" onClick={() => setOpen(false)}>Continuer</button></div> : <form onSubmit={signup}>
          {error && <div className="auth-error">{error}</div>}
          <label>Nom<input type="text" required autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Votre nom" /></label>
          <label>Prénom<input type="text" required autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Votre prénom" /></label>
          <label>Adresse e-mail<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="exemple@email.com" /></label>
          <label>Mot de passe<input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6 caractères minimum" /></label>
          <button className="primary" disabled={loading}>{loading ? <><Loader2 className="spin"/> Création...</> : <><UserPlus size={18}/> Créer mon compte</>}</button>
        </form>}
      </div>
    </div>}
  </div>;
}
