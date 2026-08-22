import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { User, Store, Wallet, Package, Heart, Bell, Shield, Globe, Gift, HelpCircle, LogOut, ChevronRight, Pencil, Settings, ArrowLeft } from 'lucide-react';
import './account.css';

const sections = [
  ['personal','Informations personnelles','Nom, téléphone, e-mail, adresse et mot de passe',User],
  ['shop','Ma boutique','Boutique, logo, contacts, horaires et paiement',Store],
  ['wallet','Paiements & portefeuille','Solde, transactions, retraits et commissions',Wallet],
  ['orders','Mes commandes','Commandes, retours, remboursements et factures',Package],
  ['favorites','Mes favoris','Produits favoris et boutiques suivies',Heart],
  ['notifications','Notifications','Commandes, promotions, messages et paiements',Bell],
  ['security','Sécurité','Mot de passe, 2FA, appareils et connexions',Shield],
  ['preferences','Préférences','Langue, devise, pays, thème et notifications',Globe],
  ['referral','Parrainage','Code, filleuls, commissions et récompenses',Gift],
  ['help','Aide & assistance','Centre d’aide, support, FAQ et signalement',HelpCircle],
];

const detailItems = {
  shop:['Nom de la boutique','Logo','Description','Catégories','Adresse','Contacts','Horaires','Informations de paiement','Gestion des vendeurs/employés'],
  wallet:['Solde disponible','Historique des transactions','Moyens de paiement','Compte de retrait','Demander un retrait','Commissions'],
  orders:['Commandes en cours','Commandes livrées','Commandes annulées','Retours / remboursements','Factures'],
  favorites:['Produits favoris','Boutiques suivies'],
  notifications:['Notifications de commandes','Promotions','Messages','Alertes de paiement','Activer / désactiver les notifications'],
  security:['Modifier le mot de passe','Vérification du numéro','Authentification à deux facteurs','Appareils connectés','Historique des connexions','Déconnexion de tous les appareils'],
  preferences:['Langue : Français / English','Devise : FCFA / autres','Mode clair / sombre','Pays','Notifications'],
  referral:['Mon code de parrainage','Inviter un ami','Nombre de filleuls','Commissions gagnées','Historique des récompenses'],
  help:['Centre d’aide','Contacter le support','Signaler un problème','FAQ','Conditions générales','Politique de confidentialité']
};

export default function AccountPage({ session, onBack }) {
  const [profile,setProfile]=useState({}); const [active,setActive]=useState(null); const [saving,setSaving]=useState(false);
  useEffect(()=>{ if(session?.user) load(); },[session]);
  async function load(){ const {data}=await supabase.from('users').select('*').eq('id',session.user.id).maybeSingle(); setProfile(data||{}); }
  async function save(e){ e.preventDefault(); setSaving(true); const fields={name:profile.name||'',phone:profile.phone||'',city:profile.city||'',address:profile.address||''}; const {error}=await supabase.from('users').update(fields).eq('id',session.user.id); if(error) alert(error.message); else alert('Profil enregistré.'); setSaving(false); }
  async function logout(){ await supabase.auth.signOut(); onBack?.(); }
  const name=profile.name || session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'Mon compte';
  const email=session?.user?.email || profile.email || '';
  const role=profile.role || session?.user?.user_metadata?.role || 'Acheteur';
  return <main className="account-page"><div className="account-wrap">
    <button className="account-back" onClick={onBack}><ArrowLeft/> MON COMPTE</button>
    <section className="account-hero"><div className="avatar">{name.charAt(0).toUpperCase()}</div><div className="account-identity"><h1>{name}</h1><p>{profile.phone || 'Téléphone non renseigné'} · {email}</p><span className="role-badge">{role === 'vendeur' || role === 'seller' ? 'Client • Vendeur' : 'Client'}</span></div><button className="edit-profile" onClick={()=>setActive('personal')}><Pencil size={17}/> Modifier le profil</button></section>
    <div className="account-layout"><aside className="account-menu">{sections.map(([id,title,desc,Icon])=><button key={id} className={active===id?'active':''} onClick={()=>setActive(id)}><span><Icon/><b>{title}</b></span><small>{desc}</small><ChevronRight/></button>)}<button className="logout-btn" onClick={logout}><LogOut/><b>Se déconnecter</b></button></aside>
    <section className="account-content">{!active?<><div className="account-welcome"><Settings/><div><h2>Bienvenue dans votre compte</h2><p>Gérez votre profil, votre boutique, vos commandes, vos paiements et vos préférences.</p></div></div><div className="account-grid">{sections.slice(0,8).map(([id,title,desc,Icon])=><button key={id} onClick={()=>setActive(id)}><Icon/><div><b>{title}</b><small>{desc}</small></div><ChevronRight/></button>)}</div></>:active==='personal'?<form className="account-panel" onSubmit={save}><h2>👤 Informations personnelles</h2><label>Nom et prénom<input value={profile.name||''} onChange={e=>setProfile({...profile,name:e.target.value})}/></label><label>Numéro de téléphone<input value={profile.phone||''} onChange={e=>setProfile({...profile,phone:e.target.value})}/></label><label>Adresse e-mail<input value={email} disabled/></label><label>Ville<input value={profile.city||''} onChange={e=>setProfile({...profile,city:e.target.value})}/></label><label>Adresse<input value={profile.address||''} onChange={e=>setProfile({...profile,address:e.target.value})}/></label><button className="save-btn" disabled={saving}>{saving?'Enregistrement...':'Enregistrer les modifications'}</button></form>:<section className="account-panel"><h2>{sections.find(x=>x[0]===active)?.[1]}</h2><p>{sections.find(x=>x[0]===active)?.[2]}</p><div className="feature-list">{(detailItems[active]||[]).map(x=><button key={x}>{x}<ChevronRight/></button>)}</div></section>}</section></div>
  </div></main>;
}
