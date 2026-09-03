import React from 'react';

const items = [
  ['dashboard','🏠','Tableau de bord','dashboard'],
  ['products','📦','Produits','products'],
  ['add','➕','Ajouter un produit','products'],
  ['orders','🛒','Commandes','orders'],
  ['revenue','💰','Ventes & revenus','finance'],
  ['stats','📊','Statistiques','dashboard'],
  ['payments','💳','Paiements','finance'],
  ['coupons','🎟️','Coupons','marketing'],
  ['referral','👥','Parrainage','referral'],
  ['messages','💬','Messages','messages'],
  ['notifications','🔔','Notifications','notifications'],
  ['settings','⚙️','Paramètres','settings'],
  ['support','🆘','Aide & support','settings'],
];

export default function SellerSpaceNav({ active='dashboard', onNavigate }) {
  const go = id => onNavigate?.(id);
  const activeFor = id => id === active || (id === 'revenue' && active === 'finance');

  return (
    <>
      <style>{`
        .pjd-seller-menu{width:245px;flex:0 0 245px;background:#fff;border-right:1px solid #e8e8e8;padding:16px 12px;box-sizing:border-box}
        .pjd-seller-menu-title{font-size:11px;font-weight:800;color:#98a2b3;text-transform:uppercase;letter-spacing:.08em;padding:4px 10px 10px}
        .pjd-seller-menu-list{display:grid;gap:4px}
        .pjd-seller-menu button{width:100%;border:0;background:transparent;text-align:left;padding:11px 12px;border-radius:10px;cursor:pointer;font-size:14px;color:#555;display:flex;align-items:center;gap:10px;transition:.15s}
        .pjd-seller-menu button:hover{background:#f7f7f7;color:#111}
        .pjd-seller-menu button.active{background:#fff1e8;color:#ea580c;font-weight:700}
        .pjd-seller-menu .icon{width:23px;text-align:center;font-size:16px}
        .pjd-seller-mobile{display:none}
        @media(max-width:800px){
          .pjd-seller-menu{display:none}
          .pjd-seller-mobile{position:fixed;display:grid;grid-template-columns:repeat(5,1fr);left:0;right:0;bottom:0;height:64px;background:#fff;border-top:1px solid #ddd;z-index:1000;padding-bottom:env(safe-area-inset-bottom)}
          .pjd-seller-mobile button{border:0;background:transparent;color:#667085;font-size:10px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}
          .pjd-seller-mobile button.active{color:#ea580c;font-weight:800}
          .pjd-seller-mobile .micon{font-size:19px;line-height:20px}
        }
      `}</style>
      <aside className="pjd-seller-menu">
        <div className="pjd-seller-menu-title">Menu vendeur</div>
        <nav className="pjd-seller-menu-list">
          {items.map(([id, icon, label, target]) => (
            <button key={id} className={activeFor(id) ? 'active' : ''} onClick={() => go(target)}>
              <span className="icon">{icon}</span><span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <nav className="pjd-seller-mobile">
        {[
          ['dashboard','🏠','Accueil'],
          ['products','📦','Produits'],
          ['orders','🛒','Commandes'],
          ['finance','💰','Revenus'],
          ['settings','👤','Profil'],
        ].map(([id, icon, label]) => (
          <button key={id} className={active === id ? 'active' : ''} onClick={() => go(id === 'settings' ? 'settings' : id)}>
            <span className="micon">{icon}</span>{label}
          </button>
        ))}
      </nav>
    </>
  );
}
