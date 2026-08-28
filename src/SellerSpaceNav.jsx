import React from 'react';
import { SELLER_NAVIGATION } from './config/sellerNavigation';

const GROUPS = [
  ['Général', ['dashboard','shop']],
  ['Catalogue', ['products','stock','orders','crm']],
  ['Activité', ['messages','finance','notifications']],
  ['Développement', ['marketing','loyalty','referral','ads','opportunities']],
  ['Configuration', ['settings']],
];

export default function SellerSpaceNav({ active='dashboard', onNavigate }) {
  const byId = Object.fromEntries(SELLER_NAVIGATION.map(item => [item.id, item]));
  return (
    <aside className="seller-space-nav" aria-label="Navigation espace vendeur">
      <div className="seller-space-nav-title">PJD MAKER · ESPACE VENDEUR</div>
      {GROUPS.map(([group, ids]) => (
        <div className="seller-nav-group" key={group}>
          <div className="seller-nav-group-title">{group}</div>
          {ids.map(id => {
            const item = byId[id];
            if (!item) return null;
            return <button key={id} type="button" className={active === id ? 'active' : ''} aria-current={active === id ? 'page' : undefined} onClick={() => onNavigate?.(id)}><span>{item.label}</span></button>;
          })}
        </div>
      ))}
    </aside>
  );
}
