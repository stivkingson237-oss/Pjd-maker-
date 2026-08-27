import React from 'react';
import { SELLER_NAVIGATION } from './config/sellerNavigation';

export default function SellerSpaceNav({ active='dashboard', onNavigate }) {
  return (
    <nav className="seller-space-nav" aria-label="Navigation espace vendeur">
      <div className="seller-space-nav-title">PJD MAKER · ESPACE VENDEUR</div>
      {SELLER_NAVIGATION.map(({ id, label }) => (
        <button key={id} type="button" className={active === id ? 'active' : ''} aria-current={active === id ? 'page' : undefined} onClick={() => onNavigate?.(id)}>
          {label}
        </button>
      ))}
    </nav>
  );
}
