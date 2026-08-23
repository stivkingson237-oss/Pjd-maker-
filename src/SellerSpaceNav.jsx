import React from 'react';

const items = [
  ['dashboard','📊 Tableau de bord'],
  ['shop','🏪 Ma boutique'],
  ['products','📦 Produits'],
  ['stock','📦 Stock'],
  ['orders','📋 Commandes'],
  ['crm','👥 Clients / CRM'],
  ['messages','💬 Messages'],
  ['finance','💰 Finances'],
  ['marketing','📣 Marketing'],
  ['loyalty','🎁 Fidélité'],
  ['referral','🚀 Parrainage'],
  ['ads','📢 PJD Ads'],
  ['ai','🤖 PJD AI'],
  ['opportunities','💡 Opportunités'],
  ['notifications','🔔 Notifications'],
  ['settings','⚙️ Paramètres'],
];

const available = new Set(['dashboard','shop','products','stock','orders','crm','messages','finance','marketing','loyalty','referral','ads','ai','opportunities','notifications','settings']);

export default function SellerSpaceNav({ active='dashboard', onNavigate }) {
  return (
    <nav className="seller-space-nav" aria-label="Navigation espace vendeur">
      <div className="seller-space-nav-title">PJD MAKER · ESPACE VENDEUR</div>
      {items.map(([id, label]) => {
        const enabled = available.has(id);
        return (
          <button
            key={id}
            type="button"
            className={`${active === id ? 'active' : ''}${enabled ? '' : ' coming-soon'}`}
            aria-current={active === id ? 'page' : undefined}
            aria-disabled={!enabled}
            onClick={() => enabled && onNavigate?.(id)}
          >
            {label}
            {!enabled && <small> Bientôt disponible</small>}
          </button>
        );
      })}
    </nav>
  );
}
