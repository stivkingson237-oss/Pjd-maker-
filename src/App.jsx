import React,{useEffect,useState}from'react';
import MarketplaceShell from'./MarketplaceShell.jsx';
import ProductDetail from'./ProductDetail.jsx';
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
import PublicShopPage from'./PublicShopPage.jsx';
import{supabase}from'./lib/supabase';
import'./pjd-seller-space.css';

export default function App(){
 const[screen,setScreen]=useState('market'),[accountSession,setAccountSession]=useState(null),[shopFlow,setShopFlow]=useState(false),[shop,setShop]=useState(null),[publicShopId,setPublicShopId]=useState(null),[accountSection,setAccountSection]=useState('account'),[selectedProduct,setSelectedProduct]=useState(null),[sellerTab,setSellerTab]=useState('dashboard');
 useEffect(()=>{supabase.auth.getSession().then(({data})=>setAccountSession(data.session));const{data:listener}=supabase.auth.onAuthStateChange((_event,session)=>setAccountSession(session));return()=>listener.subscription.unsubscribe()},[]);
 useEffect(()=>{if(!accountSession?.user?.id){setShop(null);return}const load=async()=>{const{data}=await supabase.from('shops').select('*').eq('owner_id',accountSession.user.id).maybeSingle();setShop(data||null)};load();const handler=e=>setShop(e.detail||null);window.addEventListener('pjd-shop-updated',handler);return()=>window.removeEventListener('pjd-shop-updated',handler)},[accountSession?.user?.id]);
 useEffect(()=>{const handler=e=>{const id=e.detail?.shopId;if(id){setPublicShopId(id);setScreen('public-shop')}};window.addEventListener('pjd-open-shop',handler);return()=>window.removeEventListener('pjd-open-shop',handler)},[]);
 async function openProductByTitle(title){if(!title)return;const{data}=await supabase.from('digital_products').select('id,seller_id,shop_id,title,description,category,price,promo_price,cover_image,file_type,file_url,preview_url,is_free,downloads,sales,status,created_at').eq('title',title).maybeSingle();if(data)setSelectedProduct(data)}
 const handleClick=e=>{const productCard=e.target.closest?.('.product-card');if(productCard&&!e.target.closest('button')){openProductByTitle(productCard.querySelector('h3')?.textContent?.trim());return}const b=e.target.closest?.('button');if(!b)return;const t=(b.textContent||'').toLowerCase();if(t.includes('toutes les fonctionnalités'))setScreen('features');if(t.includes('devenir vendeur')||t.includes('commencer à vendre'))openSeller(shop);if(t.includes('administration'))setScreen('admin');if(t.includes('mon compte'))openAccount('account');if(t.includes('paramètres du profil'))setScreen('profile-settings');if(t.includes('opérations vendeur'))setScreen('seller-operations');if(t.includes('mes commandes'))setScreen('orders');if(t.includes('mes livraisons'))setScreen('deliveries');if(t.includes('écosystème vendeur')||t.includes('pjd assistant')||t.includes('marketing ia'))setScreen('growth');if(t.includes('crm clients'))setScreen('crm')};
 function openCart(){window.dispatchEvent(new CustomEvent('pjd-open-cart'))}
 function openAccount(section='account'){setAccountSection(section);setScreen('account')}
 function handleAuthSession(session){setAccountSession(session);if(session?.user)openAccount('account')}
 function openSeller(existingShop){if(existingShop){setShop(existingShop);setPublicShopId(existingShop.id);setSellerTab('dashboard');setScreen('seller')}else setShopFlow(true)}
 function finishShop(data){setShop(data||null);setShopFlow(false);if(data?.id){setPublicShopId(data.id);setSellerTab('dashboard');setScreen('seller')}else setScreen('market');window.dispatchEvent(new CustomEvent('pjd-shop-updated',{detail:data}))}
 function navigateSeller(id){const routes={dashboard:'dashboard',shop:'shop',products:'products',stock:'products',orders:'orders',finance:'finance',settings:'settings',crm:'crm',messages:'messages',marketing:'marketing',loyalty:'loyalty',referral:'referral',ads:'ads',ai:'ai',opportunities:'opportunities',notifications:'notifications'};const route=routes[id];if(!route)return;setSellerTab(route);setScreen('seller')}
 const renderSellerTab=()=>{switch(sellerTab){case'crm':return <SellerCRM session={accountSession} onBack={()=>setSellerTab('dashboard')}/>;case'messages':return <SellerOperations session={accountSession} onBack={()=>setSellerTab('dashboard')}/>;case'marketing':case'loyalty':case'referral':case'ads':case'ai':case'opportunities':case'notifications':return <SellerGrowthHub session={accountSession} onBack={()=>setSellerTab('dashboard')}/>;default:return <SellerDashboard session={accountSession} shop={shop} activeTab={sellerTab} onBack={()=>setScreen('market')} onNavigate={navigateSeller}/>}}
 const sellerSpace=<div className="pjd-seller-space"><div className="pjd-seller-space-nav"><div><b>PJD MAKER · ESPACE VENDEUR</b><span>Gérez votre boutique et développez votre activité.</span></div><button onClick={()=>setScreen('growth')}>🚀 Écosystème vendeur PJD Maker</button></div><div className="pjd-seller-workspace"><SellerSpaceNav active={sellerTab} onNavigate={navigateSeller}/><div className="seller-space-content">{renderSellerTab()}</div></div></div>;
 return <AuthGate onSessionChange={handleAuthSession}><PhotoPickerEnhancer session={accountSession}/>{screen==='market'&&<MarketplaceTopNav session={accountSession} onOpenCart={openCart} onOpenSeller={openSeller} onOpenAccount={openAccount}/>}<div onClickCapture={handleClick}>{screen==='public-shop'?<PublicShopPage shopId={publicShopId} onBack={()=>{setPublicShopId(null);setScreen('market')}} onAdd={p=>document.dispatchEvent(new CustomEvent('pjd-add-to-cart',{detail:p}))}/>:screen==='features'?<PjdMakerFeatures onBack={()=>setScreen('market')}/>:screen==='seller'?sellerSpace:screen==='growth'?<SellerGrowthHub session={accountSession} onBack={()=>setScreen('seller')}/>:screen==='crm'?<SellerCRM session={accountSession} onBack={()=>setScreen('seller')}/>:screen==='seller-operations'?<SellerOperations session={accountSession} onBack={()=>setScreen('seller')}/>:screen==='orders'?<CustomerOrders session={accountSession} onBack={()=>setScreen('market')}/>:screen==='deliveries'?<CustomerDeliveryReview session={accountSession}/>:screen==='admin'?<AdminDashboard onBack={()=>setScreen('market')}/>:screen==='profile-settings'?<ProfileSettings onBack={()=>setScreen('account')}/>:screen==='account'?<AccountPage session={accountSession} initialSection={accountSection} onBack={()=>setScreen('market')}/>:<div><MarketplaceShell/><MultiVendorCheckout session={accountSession}/></div>}{selectedProduct&&<div className="product-detail-overlay"><ProductDetail product={selectedProduct} onBack={()=>setSelectedProduct(null)} onBuy={p=>{setSelectedProduct(null);document.dispatchEvent(new CustomEvent('pjd-add-to-cart',{detail:p}))}}/></div>}</div>{shopFlow&&<CreateShopFlow session={accountSession} onClose={()=>setShopFlow(false)} onDone={finishShop}/>}</AuthGate>;
}