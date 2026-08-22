import React, { useState } from 'react';
import MarketplaceShell from './MarketplaceShell.jsx';
import AuthGate from './AuthGate.jsx';
import SellerDashboard from './SellerDashboard.jsx';
import AdminDashboard from './AdminDashboard.jsx';

export default function App(){
  const [screen,setScreen]=useState('market');
  const handleClick=e=>{const b=e.target.closest?.('button');if(!b)return;const t=(b.textContent||'').toLowerCase();if(t.includes('devenir vendeur')||t.includes('commencer à vendre')){e.preventDefault();setScreen('seller')}if(t.includes('administration')){e.preventDefault();setScreen('admin')}};
  return <AuthGate><div onClickCapture={handleClick}>{screen==='seller'?<SellerDashboard onBack={()=>setScreen('market')}/>:screen==='admin'?<AdminDashboard onBack={()=>setScreen('market')}/>:<MarketplaceShell/>}</div></AuthGate>;
}
