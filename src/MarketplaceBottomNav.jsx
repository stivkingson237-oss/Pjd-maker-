import React from 'react';
import { Heart, Home, ShoppingCart, Store, UserPlus, User } from 'lucide-react';
import './marketplace-bottomnav.css';

export default function MarketplaceBottomNav({ session, shop, onHome, onFavorites, onCatalog, onCart, onAccount, onSeller }) {
  return <nav className="pjd-bottom-nav" aria-label="Navigation principale">
    <button onClick={onHome}><Home/><span>Accueil</span></button>
    <button onClick={onCatalog}><ShoppingCart/><span>Catalogue</span></button>
    <button className="pjd-bottom-main" onClick={()=>onSeller?.(shop || null)}>
      {session ? <Store/> : <UserPlus/>}
      <span>{session ? 'Ma boutique' : "S'inscrire"}</span>
    </button>
    <button onClick={onFavorites}><Heart/><span>Favoris</span></button>
    <button onClick={onAccount}><User/><span>Compte</span></button>
  </nav>;
}
