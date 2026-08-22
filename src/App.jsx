import React, { useState } from 'react';
import MarketplaceShell from './MarketplaceShell.jsx';
import AuthGate from './AuthGate.jsx';
import SellerDashboard from './SellerDashboard.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import AccountPage from './AccountPage.jsx';
import ProfileSettings from './ProfileSettings.jsx';
import PhotoPickerEnhancer from './PhotoPickerEnhancer.jsx';
import PjdMakerFeatures from './PjdMakerFeatures.jsx';
import MultiVendorCheckout from './MultiVendorCheckout.jsx';

export default function App(){
  const [screen,setScreen]=useState('market');
  const [accountSession,setAccountSession]=useState(null);
  const handleClick=e=>{const b=e.target.closest?.('button');if(!b)return;const t=(b.textContent||'').toLowerCase();if(t.includes('toutes les fonctionnalités')){e.preventDefault();setScreen('features')}if(t.includes('devenir vendeur')||t.includes('commencer à vendre')){e.preventDefault();setScreen('seller')}if(t.includes('administration')){e.preventDefault();setScreen('admin')}if(t.includes('mon compte')){e.preventDefault();setScreen('account')}if(t.includes('paramètres du profil')){e.preventDefault();setScreen('profile-settings')}};
  return <AuthGate onSessionChange={setAccountSession}><PhotoPickerEnhancer session={accountSession}/><div onClickCapture={handleClick}>{screen==='features'?<PjdMakerFeatures onBack={()=>setScreen('market')}/>:screen==='seller'?<SellerDashboard onBack={()=>setScreen('market')}/>:screen==='admin'?<AdminDashboard onBack={()=>setScreen('market')}/>:screen==='profile-settings'?<ProfileSettings onBack={()=>setScreen('account')}/>:screen==='account'?<div><div style={{maxWidth:1180,margin:'12px auto',padding:'0 16px',display:'flex',justifyContent:'space-between',gap:10}}><button onClick={()=>setScreen('features')} style={{border:0,borderRadius:12,padding:'10px 14px',background:'#f97316',color:'#fff',fontWeight:700,cursor:'pointer'}}>✨ Toutes les fonctionnalités</button><button onClick={()=>setScreen('profile-settings')} style={{border:0,borderRadius:12,padding:'10px 14px',background:'#111827',color:'#fff',fontWeight:700,cursor:'pointer'}}>⚙️ Paramètres du profil</button></div><AccountPage session={accountSession} onBack={()=>setScreen('market')}/></div>:<div><div style={{position:'fixed',right:16,bottom:16,zIndex:50}}><button onClick={()=>setScreen('features')} style={{border:0,borderRadius:999,padding:'13px 18px',background:'#f97316',color:'#fff',fontWeight:800,cursor:'pointer',boxShadow:'0 10px 30px #11182733'}}>✨ Toutes les fonctionnalités</button></div><MarketplaceShell/><MultiVendorCheckout session={accountSession}/></div>}</div></AuthGate>;
}
