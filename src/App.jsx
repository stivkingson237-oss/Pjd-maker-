import React, { useState } from 'react';
import MarketplaceShell from './MarketplaceShell.jsx';
import AuthGate from './AuthGate.jsx';
import SellerDashboard from './SellerDashboard.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AccountPage from './AccountPage.jsx';
import ProfileSettings from './ProfileSettings.jsx';
import PhotoPickerEnhancer from './PhotoPickerEnhancer.jsx';

export default function App(){
  const [screen,setScreen]=useState('market');
  const [accountSession,setAccountSession]=useState(null);
  const handleClick=e=>{const b=e.target.closest?.('button');if(!b)return;const t=(b.textContent||'').toLowerCase();if(t.includes('devenir vendeur')||t.includes('commencer à vendre')){e.preventDefault();setScreen('seller')}if(t.includes('administration')){e.preventDefault();setScreen('admin')}if(t.includes('mon compte')){e.preventDefault();setScreen('account')}if(t.includes('paramètres du profil')){e.preventDefault();setScreen('profile-settings')}};
  return <AuthGate onSessionChange={setAccountSession}><PhotoPickerEnhancer session={accountSession}/><div onClickCapture={handleClick}>{screen==='seller'?<SellerDashboard onBack={()=>setScreen('market')}/>:screen==='admin'?<AdminDashboard onBack={()=>setScreen('market')}/>:screen==='profile-settings'?<ProfileSettings onBack={()=>setScreen('account')}/>:screen==='account'?<div><div style={{maxWidth:1180,margin:'12px auto',padding:'0 16px',textAlign:'right'}}><button style={{border:0,borderRadius:12,padding:'10px 14px',background:'#111827',color:'#fff',fontWeight:700,cursor:'pointer'}}>⚙️ Paramètres du profil</button></div><AccountPage session={accountSession} onBack={()=>setScreen('market')}/></div>:<MarketplaceShell/>}</div></AuthGate>;
}
