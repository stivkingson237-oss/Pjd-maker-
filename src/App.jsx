import React,{useState}from'react';
import MarketplaceShell from'./MarketplaceShell.jsx';
import AuthGate from'./AuthGate.jsx';
import SellerDashboard from'./SellerDashboard.jsx';
import AdminDashboard from'./AdminDashboard.jsx';
import AccountPage from'./AccountPage.jsx';
import ProfileSettings from'./ProfileSettings.jsx';
import PhotoPickerEnhancer from'./PhotoPickerEnhancer.jsx';
import PjdMakerFeatures from'./PjdMakerFeatures.jsx';
import MultiVendorCheckout from'./MultiVendorCheckout.jsx';
import SellerOperations from'./SellerOperations.jsx';
import CustomerOrders from'./CustomerOrders.jsx';
import CustomerDeliveryReview from'./CustomerDeliveryReview.jsx';
import SellerGrowthHub from'./SellerGrowthHub.jsx';
import SellerCRM from'./SellerCRM.jsx';
import MarketplaceTopNav,{CreateShopFlow}from'./MarketplaceTopNav.jsx';
import SellerSpaceNav from'./SellerSpaceNav.jsx';
import'./pjd-seller-space.css';

export default function App(){
 const[screen,setScreen]=useState('market');
 const[accountSession,setAccountSession]=useState(null);
 const[shopFlow,setShopFlow]=useState(false);
 const[shop,setShop]=useState(null);
 const handleClick=e=>{const b=e.target.closest?.('button');if(!b)return;const t=(b.textContent||'').toLowerCase();if(t.includes('toutes les fonctionnalités'))setScreen('features');if(t.includes('devenir vendeur')||t.includes('commencer à vendre'))setScreen('seller');if(t.includes('administration'))setScreen('admin');if(t.includes('mon compte'))setScreen('account');if(t.includes('paramètres du profil'))setScreen('profile-settings');if(t.includes('opérations vendeur'))setScreen('seller-operations');if(t.includes('mes commandes'))setScreen('orders');if(t.includes('mes livraisons'))setScreen('deliveries');if(t.includes('écosystème vendeur')||t.includes('pjd assistant')||t.includes('marketing ia'))setScreen('growth');if(t.includes('crm clients'))setScreen('crm')};
 function openCart(){document.querySelector('.marketplace .actions .icon-btn')?.click()}
 function openAccount(section='account'){setScreen('account');window.dispatchEvent(new CustomEvent('pjd-account-section',{detail:section}))}
 function openSeller(existingShop){if(existingShop){setShop(existingShop);setScreen('seller')}else setShopFlow(true)}
 function finishShop(data){setShop(data||null);setShopFlow(false);setScreen('seller');window.dispatchEvent(new CustomEvent('pjd-shop-updated',{detail:data}))}
 function navigateSeller(id){
   const routes={dashboard:'seller',shop:'seller',products:'seller',stock:'seller',orders:'seller',finance:'seller',settings:'profile-settings',crm:'crm',messages:'seller-operations',marketing:'growth',loyalty:'growth',referral:'growth',ads:'growth',ai:'growth',opportunities:'growth',notifications:'seller'};
   setScreen(routes[id]||'seller');
 }
 const sellerSpace=<div className="pjd-seller-space">
   <div className="pjd-seller-space-nav">
     <div><b>PJD MAKER · ESPACE VENDEUR</b><span>Gérez votre boutique et développez votre activité.</span></div>
     <button onClick={()=>setScreen('growth')}>🚀 Écosystème vendeur PJD Maker</button>
   </div>
   <div className="pjd-seller-workspace">
     <SellerSpaceNav active={screen==='seller'?'dashboard':screen==='growth'?'ai':screen==='crm'?'crm':screen==='seller-operations'?'messages':screen==='profile-settings'?'settings':'dashboard'} onNavigate={navigateSeller}/>
     <SellerDashboard onBack={()=>setScreen('market')}/>
   </div>
 </div>;
 return <AuthGate onSessionChange={setAccountSession}>
   <PhotoPickerEnhancer session={accountSession}/>
   {screen==='market'&&<MarketplaceTopNav session={accountSession} onOpenCart={openCart} onOpenSeller={openSeller} onOpenAccount={openAccount}/>} 
   <div onClickCapture={handleClick}>
    {screen==='features'?<PjdMakerFeatures onBack={()=>setScreen('market')}/>:screen==='seller'?sellerSpace:screen==='growth'?<SellerGrowthHub session={accountSession} onBack={()=>setScreen('seller')}/>:screen==='crm'?<SellerCRM session={accountSession} onBack={()=>setScreen('seller')}/>:screen==='seller-operations'?<SellerOperations session={accountSession} onBack={()=>setScreen('seller')}/>:screen==='orders'?<CustomerOrders session={accountSession} onBack={()=>setScreen('market')}/>:screen==='deliveries'?<CustomerDeliveryReview session={accountSession}/>:screen==='admin'?<AdminDashboard onBack={()=>setScreen('market')}/>:screen==='profile-settings'?<ProfileSettings onBack={()=>setScreen('account')}/>:screen==='account'?<AccountPage session={accountSession} onBack={()=>setScreen('market')}/>:<div><MarketplaceShell/><MultiVendorCheckout session={accountSession}/></div>}
   </div>
   {shopFlow&&<CreateShopFlow session={accountSession} onClose={()=>setShopFlow(false)} onDone={finishShop}/>} 
 </AuthGate>
}
