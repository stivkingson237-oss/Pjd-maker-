import React, { useState } from 'react';
import MarketplaceShell from './MarketplaceShell.jsx';
import AuthGate from './AuthGate.jsx';
import SellerDashboard from './SellerDashboard.jsx';
import AdminDashboard from './AdminDashboard.jsx';

export default function App(){
  const [screen,setScreen]=useState('market');
  return <AuthGate>
    {screen==='seller' ? <SellerDashboard onBack={()=>setScreen('market')}/> : screen==='admin' ? <AdminDashboard onBack={()=>setScreen('market')}/> : <MarketplaceShell onOpenSeller={()=>setScreen('seller')} onOpenAdmin={()=>setScreen('admin')}/>} 
  </AuthGate>;
}
