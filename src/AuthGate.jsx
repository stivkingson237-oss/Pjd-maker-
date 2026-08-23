import React, { useState } from 'react';
import { X, MailCheck, UserPlus, LogIn, Loader2 } from 'lucide-react';
import { supabase } from './lib/supabase';

const PRODUCTION_URL = 'https://pjd-maker.vercel.app';
const OTP_LENGTH = 6;

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

  function resetAuth(nextMode) { setMode(nextMode); setError(''); setMessage(''); setCode(''); setPassword(''); }

  async function signup(e) {
    e.preventDefault(); setError(''); setMessage('');
    if (!lastName.trim() || !firstName.trim()) return setError('Veuillez renseigner votre nom et votre prénom.');
    if (!email.trim() || password.length < 6) return setError('Saisissez un e-mail valide et un mot de passe d’au moins 6 caractères.');
    setLoading(true);
    const cleanFirstName = firstName.trim(), cleanLastName = lastName.trim(), cleanEmail = email.trim().toLowerCase();
    const { data, error: signUpError } = await supabase.auth.signUp({ email: cleanEmail, password, options: { data: { name: `${cleanLastName} ${cleanFirstName}`, first_name: cleanFirstName, last_name: cleanLastName }, emailRedirectTo: PRODUCTION_URL } });
    setLoading(false);
    if (signUpError) return setError(signUpError.message);
    if (data?.user && !data.session) { setCode(''); setMode('verify'); setMessage(`Bonjour ${cleanFirstName} 👋 Un code de confirmation à ${OTP_LENGTH} chiffres a été envoyé à ${cleanEmail}.`); }
    else { setMessage(`Bienvenue ${cleanFirstName} ! Votre compte PJD Maker est créé.`); setMode('done'); }
  }

  async function login(e) {
    e.preventDefault(); setError(''); setLoading(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (loginError) return setError('E-mail ou mot de passe incorrect.');
    setMessage('Connexion réussie. Bienvenue sur PJD Maker !'); setMode('done');
  }

  async function verifyCode(e) {
    e.preventDefault(); setError('');
    const cleanEmail = email.trim().toLowerCase(), cleanCode = code.replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(cleanCode)) return setError(`Saisissez exactement le code à ${OTP_LENGTH} chiffres reçu par e-mail.`);
    setLoading(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanCode, type: 'email' });
    setLoading(false);
    if (verifyError) return setError('Code incorrect ou expiré. Demandez un nouveau code.');
    setCode(''); setMessage(`Félicitations ${firstName.trim()} ! Votre e-mail est confirmé et votre compte PJD Maker est activé.`); setMode('done');
  }

  async function resendCode() {
    setError(''); setMessage(''); const cleanEmail = email.trim().toLowerCase(); setLoading(true);
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: cleanEmail });
    setLoading(false);
    if (resendError) setError(resendError.message); else setMessage(`Un nouveau code à 6 chiffres a été envoyé à ${cleanEmail}.`);
  }

  function captureAuth(event) {
    const target = event.target?.closest?.('button'); if (!target) return;
    const text = (target.textContent || '').trim().toLowerCase();
    if (text.includes('créer un compte') || text.includes("s'inscrire") || text.includes('s’inscrire')) { event.preventDefault(); event.stopPropagation(); setError(''); setMessage(''); setFirstName(''); setLastName(''); setEmail(''); setPassword(''); setCode(''); setMode('signup'); setOpen(true); }
    else if (text.includes('se connecter') || text.includes('connexion')) { event.preventDefault(); event.stopPropagation(); setError(''); setMessage(''); setPassword(''); setMode('login'); setOpen(true); }
  }

  return <div onClickCapture={captureAuth}>{children}{open && <div className="modal-backdrop" role="presentation" onClick={() => setOpen(false)}><div className="auth-modal" role="dialog" aria-modal="true" aria-label={mode === 'login' ? 'Connexion PJD Maker' : 'Inscription PJD Maker'} onClick={e => e.stopPropagation()}><div className="modal-head"><h2>{mode === 'verify' ? <><MailCheck size={21}/> Confirmer votre e-mail</> : mode === 'login' ? <><LogIn size={21}/> Se connecter</> : mode === 'done' ? <><MailCheck size={21}/> Terminé</> : <><UserPlus size={21}/> Créer un compte</>}</h2><button type="button" onClick={() => setOpen(false)} aria-label="Fermer"><X/></button></div>{mode === 'verify' ? <form onSubmit={verifyCode}><div className="auth-success"><MailCheck size={42}/><p>{message || `Bonjour ${firstName}. Entrez le code envoyé à ${email}.`}</p></div>{error && <div className="auth-error">{error}</div>}<input type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={OTP_LENGTH} pattern="[0-9]{6}" required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))} placeholder="Code à 6 chiffres" aria-label="Code de confirmation"/><button className="primary" disabled={loading || code.length !== OTP_LENGTH}>{loading ? <><Loader2 className="spin"/> Vérification...</> : <><MailCheck size={18}/> Confirmer le code</>}</button><button className="secondary" type="button" disabled={loading} onClick={resendCode}>Renvoyer le code</button></form> : mode === 'done' ? <div className="auth-success"><MailCheck size={42}/><p>{message}</p><button className="primary" type="button" onClick={() => setOpen(false)}>Continuer</button></div> : mode === 'login' ? <form onSubmit={login}>{error && <div className="auth-error">{error}</div>}<label>Adresse e-mail<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="exemple@email.com"/></label><label>Mot de passe<input type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Votre mot de passe"/></label><button className="primary" disabled={loading}>{loading ? <><Loader2 className="spin"/> Connexion...</> : <><LogIn size={18}/> Se connecter</>}</button><button className="secondary" type="button" onClick={() => resetAuth('signup')}>S’inscrire</button></form> : <form onSubmit={signup}>{error && <div className="auth-error">{error}</div>}<label>Nom<input type="text" required autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Votre nom"/></label><label>Prénom<input type="text" required autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Votre prénom"/></label><label>Adresse e-mail<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="exemple@email.com"/></label><label>Mot de passe<input type="password" required minLength={6} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6 caractères minimum"/></label><button className="primary" disabled={loading}>{loading ? <><Loader2 className="spin"/> Création...</> : <><UserPlus size={18}/> S’inscrire</>}</button><button className="secondary" type="button" onClick={() => resetAuth('login')}><LogIn size={18}/> Se connecter</button></form>}</div></div>}</div>;
}
