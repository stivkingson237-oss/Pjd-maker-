import React from 'react';

const items = [
  ['dashboard','🏠','Tableau de bord'],
  ['products','📦','Mes produits'],
  ['add','➕','Ajouter un produit'],
  ['orders','🛒','Commandes'],
  ['revenue','💰','Ventes & revenus'],
  ['stats','📊','Statistiques'],
  ['payments','💳','Paiements'],
  ['coupons','🎟️','Coupons'],
  ['affiliate','👥','Parrainage'],
  ['messages','💬','Messages'],
  ['notifications','🔔','Notifications'],
  ['settings','⚙️','Paramètres'],
  ['support','🆘','Aide & support'],
];

export default function VendorLayout({ children, active='dashboard', onNavigate, sellerName='Vendeur', notificationCount=0, messageCount=0, orderCount=0 }) {
  const go = (id) => onNavigate?.(id);
  return (
    <div className="vendor-layout">
      <style>{`
        .vendor-layout{min-height:100vh;background:#f7f7f8;color:#171717;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .vendor-top{height:68px;background:#fff;border-bottom:1px solid #e8e8e8;display:flex;align-items:center;justify-content:space-between;padding:0 22px;position:sticky;top:0;z-index:50}
        .vendor-brand{font-weight:800;font-size:20px;letter-spacing:-.4px;white-space:nowrap}.vendor-brand span{color:#f97316}
        .vendor-actions{display:flex;align-items:center;gap:8px}.vendor-action{height:40px;border:0;background:transparent;border-radius:10px;padding:0 11px;display:flex;align-items:center;gap:7px;font-weight:600;cursor:pointer;position:relative}.vendor-action:hover{background:#f5f5f5}.vendor-add{background:#f97316;color:#fff;padding:0 15px}.vendor-add:hover{background:#ea580c}
        .vendor-badge{position:absolute;right:2px;top:1px;min-width:17px;height:17px;padding:0 4px;border-radius:99px;background:#ef4444;color:#fff;font-size:10px;display:grid;place-items:center;border:2px solid #fff}
        .vendor-body{display:flex}.vendor-sidebar{width:245px;background:#fff;border-right:1px solid #e8e8e8;min-height:calc(100vh - 68px);padding:18px 12px;position:fixed;top:68px;bottom:0;overflow:auto}.vendor-nav{display:grid;gap:4px}.vendor-nav button{width:100%;border:0;background:transparent;text-align:left;padding:11px 12px;border-radius:10px;cursor:pointer;font-size:14px;color:#555;display:flex;align-items:center;gap:10px}.vendor-nav button:hover{background:#f7f7f7;color:#111}.vendor-nav button.active{background:#fff1e8;color:#ea580c;font-weight:700}.vendor-nav .icon{width:23px;text-align:center}.vendor-main{margin-left:245px;flex:1;min-width:0;padding:24px;max-width:1500px;width:100%;box-sizing:border-box}
        .vendor-welcome{margin-bottom:20px}.vendor-welcome h1{margin:0 0 4px;font-size:25px;letter-spacing:-.5px}.vendor-welcome p{margin:0;color:#777}
        @media(max-width:800px){.vendor-top{padding:0 12px;height:62px}.vendor-brand{font-size:18px}.vendor-action{padding:0 8px}.vendor-action .label{display:none}.vendor-add{font-size:0;width:40px;padding:0;justify-content:center}.vendor-add .label{display:block;font-size:22px}.vendor-sidebar{display:none}.vendor-main{margin-left:0;padding:16px 12px 82px}.vendor-body{display:block}.vendor-mobile-nav{position:fixed;display:grid;grid-template-columns:repeat(5,1fr);bottom:0;left:0;right:0;height:64px;background:#fff;border-top:1px solid #ddd;z-index:60}.vendor-mobile-nav button{border:0;background:transparent;font-size:10px;color:#666;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px}.vendor-mobile-nav button.active{color:#ea580c;font-weight:700}.vendor-mobile-nav .micon{font-size:19px}.vendor-desktop-only{display:none!important}}
        @media(min-width:801px){.vendor-mobile-nav{display:none}}
      `}</style>
      <header className="vendor-top">
        <button className="vendor-brand" onClick={() => go('dashboard')} aria-label="PJD Maker">PJD <span>Maker</span></button>
        <div className="vendor-actions">
          <button className="vendor-action vendor-add" onClick={() => go('add')}><span className="label">➕ Ajouter un produit</span><span className="label" style={{display:'none'}}>＋</span></button>
          <button className="vendor-action" onClick={() => go('notifications')}><span>🔔</span><span className="label">Notifications</span>{notificationCount>0&&<b className="vendor-badge">{notificationCount>99?'99+':notificationCount}</b>}</button>
          <button className="vendor-action" onClick={() => go('messages')}><span>💬</span><span className="label">Messages</span>{messageCount>0&&<b className="vendor-badge">{messageCount>99?'99+':messageCount}</b>}</button>
          <button className="vendor-action" onClick={() => go('orders')}><span>📦</span><span className="label">Commandes</span>{orderCount>0&&<b className="vendor-badge">{orderCount>99?'99+':orderCount}</b>}</button>
          <button className="vendor-action" onClick={() => go('profile')}><span>👤</span><span className="label">{sellerName}</span></button>
        </div>
      </header>
      <div className="vendor-body">
        <aside className="vendor-sidebar"><nav className="vendor-nav">{items.map(([id,icon,label])=><button key={id} className={active===id?'active':''} onClick={()=>go(id)}><span className="icon">{icon}</span>{label}</button>)}</nav></aside>
        <main className="vendor-main">{children}</main>
      </div>
      <nav className="vendor-mobile-nav">{[['dashboard','🏠','Accueil'],['products','📦','Produits'],['orders','🛒','Commandes'],['revenue','💰','Revenus'],['profile','👤','Profil']].map(([id,icon,label])=><button key={id} className={active===id?'active':''} onClick={()=>go(id)}><span className="micon">{icon}</span>{label}</button>)}</nav>
    </div>
  );
}
