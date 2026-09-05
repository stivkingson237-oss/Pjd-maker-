import React, { useEffect, useState } from 'react';
import MarketplaceHome from './MarketplaceHome.jsx';
import ProductDetail from './ProductDetail.jsx';
import AuthGate from './AuthGate.jsx';
import AuthModal from './AuthModal.jsx';
import SellerDashboard from './SellerDashboard.jsx';
import SellerProductManager from './SellerProductManager.jsx';
import ShopManager from './ShopManager.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import PromoCodesPage from './PromoCodesPage.jsx';
import AccountPage from './AccountPage.jsx';
import ProfileSettings from './ProfileSettings.jsx';
import PhotoPickerEnhancer from './PhotoPickerEnhancer.jsx';
import PjdMakerFeatures from './PjdMakerFeatures.jsx';
import MultiVendorCheckout from './MultiVendorCheckout.jsx';
import SellerOperations from './SellerOperations.jsx';
import CustomerOrders from './CustomerOrders.jsx';
import CustomerDeliveryReview from './CustomerDeliveryReview.jsx';
import SellerGrowthHub from './SellerGrowthHub.jsx';
import SellerCRM from './SellerCRM.jsx';
import MarketplaceTopNav, { CreateShopFlow } from './MarketplaceTopNav.jsx';
import SellerSpaceNav from './SellerSpaceNav.jsx';
import PublicShopPage from './PublicShopPage.jsx';
import FavoritesPage from './FavoritesPage.jsx';
import DigitalProductUploader from './DigitalProductUploader.jsx';
import AffiliatePage from './AffiliatePage.jsx';
import PublicationAssistant from './ai/PublicationAssistant.jsx';
import AICenter from './ai/AICenter.jsx';
import SellerPlanPage from './SellerPlanPage.jsx';
import { supabase } from './lib/supabase';
import './pjd-seller-space.css';

const SELLER_ROUTES = {
  dashboard: 'dashboard', shop: 'shop', products: 'products', stock: 'stock',
  orders: 'orders', finance: 'finance', settings: 'settings', crm: 'crm',
  messages: 'messages', marketing: 'marketing', loyalty: 'loyalty',
  referral: 'referral', ads: 'ads', opportunities: 'opportunities',
  notifications: 'notifications'
};

export default function App() {
  const [screen, setScreen] = useState('market');
  const [accountSession, setAccountSession] = useState(null);
  const [shopFlow, setShopFlow] = useState(false);
  const [shop, setShop] = useState(null);
  const [publicShopId, setPublicShopId] = useState(null);
  const [accountSection, setAccountSection] = useState('account');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sellerTab, setSellerTab] = useState('dashboard');
  const [showUploader, setShowUploader] = useState(false);
  const [showAIPublisher, setShowAIPublisher] = useState(false);
  const [showAICenter, setShowAICenter] = useState(false);
  const [authMode, setAuthMode] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAccountSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setAccountSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!accountSession?.user?.id) { setShop(null); return; }
    const load = async () => {
      const { data } = await supabase.from('shops').select('*').eq('owner_id', accountSession.user.id).maybeSingle();
      setShop(data || null);
    };
    load();
    const handler = (event) => setShop(event.detail || null);
    window.addEventListener('pjd-shop-updated', handler);
    return () => window.removeEventListener('pjd-shop-updated', handler);
  }, [accountSession?.user?.id]);

  useEffect(() => {
    const handler = (event) => {
      const id = event.detail?.shopId;
      if (id) { setPublicShopId(id); setScreen('public-shop'); }
    };
    window.addEventListener('pjd-open-shop', handler);
    return () => window.removeEventListener('pjd-open-shop', handler);
  }, []);

  useEffect(() => {
    const loadProductFromUrl = async () => {
      const match = window.location.pathname.match(/^\/produit\/([^/]+)/);
      if (!match) return;
      const id = decodeURIComponent(match[1]);
      const [digitalResult, physicalResult] = await Promise.all([
        supabase.from('digital_products').select('id,seller_id,shop_id,title,description,category,price,promo_price,cover_image,image_url,file_type,file_url,is_free,downloads,sales,stock,status,created_at,source_type,product_type,type,seller_name,preview_url').eq('id', id).maybeSingle(),
        supabase.from('marketplace_products').select('id,seller_id,shop_id,title,description,category,price,stock,images,status,created_at,updated_at').eq('id', id).maybeSingle()
      ]);
      const data = digitalResult.data ? { ...digitalResult.data, product_type: digitalResult.data.product_type || 'digital' } : physicalResult.data ? { ...physicalResult.data, product_type: 'physical', cover_image: physicalResult.data.images?.[0] || null } : null;
      if (data) { setSelectedProduct(data); setScreen('product'); }
    };
    loadProductFromUrl();
    window.addEventListener('popstate', loadProductFromUrl);
    return () => window.removeEventListener('popstate', loadProductFromUrl);
  }, []);

  async function downloadProductByTitle(title) {
    if (!title || !accountSession?.user) return;
    const { data } = await supabase.from('digital_products').select('id,title,file_url,is_free,price').eq('title', title).maybeSingle();
    if (!data?.file_url) { alert('Le fichier de ce produit n’est pas encore disponible.'); return; }
    const { data: result, error } = await supabase.functions.invoke('download-product', { body: { product_id: data.id } });
    if (error || !result?.signed_url) { alert(result?.error || 'Le téléchargement n’est pas disponible.'); return; }
    window.open(result.signed_url, '_blank', 'noopener,noreferrer');
  }

  async function openProductByTitle(title) {
    if (!title) return;
    const [digitalResult, physicalResult] = await Promise.all([
      supabase.from('digital_products').select('id,seller_id,shop_id,title,description,category,price,promo_price,cover_image,image_url,file_type,file_url,is_free,downloads,sales,stock,status,created_at,source_type,product_type,type,seller_name,preview_url').eq('title', title).maybeSingle(),
      supabase.from('marketplace_products').select('id,seller_id,shop_id,title,description,category,price,stock,images,status,created_at,updated_at').eq('title', title).maybeSingle()
    ]);
    const data = digitalResult.data ? { ...digitalResult.data, product_type: digitalResult.data.product_type || 'digital' } : physicalResult.data ? { ...physicalResult.data, product_type: 'physical', cover_image: physicalResult.data.images?.[0] || null } : null;
    if (data) { setSelectedProduct(data); setScreen('product'); window.history.pushState({ productId: data.id }, '', `/produit/${encodeURIComponent(data.id)}`); }
  }

  const handleClick = (event) => {
    const button = event.target.closest?.('button');
    if (button && (button.textContent || '').toLowerCase().includes('télécharger gratuitement')) {
      event.stopPropagation(); downloadProductByTitle(button.closest('.product-card')?.querySelector('h3')?.textContent?.trim()); return;
    }
    const productCard = event.target.closest?.('.product-card');
    if (productCard && !event.target.closest('button')) { openProductByTitle(productCard.querySelector('h3')?.textContent?.trim()); return; }
    if (!button) return;
    const text = (button.textContent || '').toLowerCase();
    if (text.includes('toutes les fonctionnalités')) setScreen('features');
    if (text.includes('devenir vendeur') || text.includes('commencer à vendre')) openSeller(shop);
    if (text.includes('administration')) setScreen('admin');
    if (text.includes('mon compte')) openAccount('account');
    if (text.includes('affiliation')) setScreen('affiliate');
    if (text.includes('paramètres du profil')) setScreen('profile-settings');
    if (text.includes('opérations vendeur')) setScreen('seller-operations');
    if (text.includes('mes commandes')) setScreen('orders');
    if (text.includes('mes livraisons')) setScreen('deliveries');
    if (text.includes('écosystème vendeur')) setScreen('growth');
    if (text.includes('publier avec ia')) setShowAIPublisher(true);
    if (text.includes('centre ia') || text.includes('toutes les ia')) setShowAICenter(true);
  };

  function openCart() { window.dispatchEvent(new CustomEvent('pjd-open-cart')); }
  function openAccount(section = 'account') { setAccountSection(section); setScreen('account'); }
  function handleAuthSession(session) { setAccountSession(session); setAuthMode(null); if (session?.user) setScreen('market'); }
  function openSeller(existingShop) {
    if (existingShop) { setShop(existingShop); setPublicShopId(existingShop.id); setSellerTab('dashboard'); setScreen('seller'); }
    else setShopFlow(true);
  }
  function finishShop(data) {
    setShop(data || null); setShopFlow(false);
    if (data?.id) { setPublicShopId(data.id); setSellerTab('dashboard'); setScreen('seller'); } else setScreen('market');
    window.dispatchEvent(new CustomEvent('pjd-shop-updated', { detail: data }));
  }
  function navigateSeller(id) {
    if (id === 'plans') { setScreen('seller-plans'); return; }
    const route = SELLER_ROUTES[id];
    if (route) { setSellerTab(route); setScreen('seller'); }
  }

  const saveAIDraft = async (data) => {
    if (!accountSession?.user?.id) throw new Error('Connectez-vous pour enregistrer le produit.');
    if (!shop?.id) throw new Error('Créez d’abord votre boutique.');
    const payload = { seller_id: accountSession.user.id, shop_id: shop.id, title: data.title?.trim() || 'Nouveau produit', description: data.description?.trim() || null, category: data.category?.trim() || null, price: Number(data.price) || 0, stock: 0, images: data.imageUrl ? [data.imageUrl] : [], status: 'draft' };
    const { data: row, error } = await supabase.from('marketplace_products').insert(payload).select().single();
    if (error) throw error;
    return row;
  };

  const renderSellerTab = () => {
    switch (sellerTab) {
      case 'shop': return <ShopManager session={accountSession} shop={shop} onBack={() => setSellerTab('dashboard')} onAddProduct={() => setShowUploader(true)} />;
      case 'products': return <SellerProductManager session={accountSession} onAddProduct={() => setShowUploader(true)} />;
      case 'crm': return <SellerCRM session={accountSession} onBack={() => setSellerTab('dashboard')} />;
      case 'orders': return <SellerOperations session={accountSession} initialTab="orders" onBack={() => setSellerTab('dashboard')} />;
      case 'messages': case 'notifications': return <SellerOperations session={accountSession} initialTab="notifications" onBack={() => setSellerTab('dashboard')} />;
      case 'finance': return <SellerDashboard session={accountSession} shop={shop} activeTab="finance" />;
      case 'stock': return <SellerDashboard session={accountSession} shop={shop} activeTab="stock" />;
      case 'marketing': case 'loyalty': case 'referral': case 'ads': case 'opportunities': return <SellerGrowthHub session={accountSession} onBack={() => setSellerTab('dashboard')} />;
      default: return <SellerDashboard session={accountSession} shop={shop} activeTab={sellerTab} />;
    }
  };

  const sellerSpace = (
    <div className="pjd-seller-space">
      <div className="pjd-seller-space-nav">
        <div className="pjd-seller-brand"><b>PJD MAKER <i>•</i><br /><span>ESPACE VENDEUR</span></b><span>Gérez votre boutique et développez votre activité.</span></div>
        <div className="pjd-seller-quick-actions">
          <button className="quick-add" onClick={() => setShowUploader(true)}><strong>＋</strong><span>Ajouter<br />un produit</span></button>
          <button onClick={() => setShowAICenter(true)}><strong>🤖</strong><span>Centre IA</span></button>
          <button onClick={() => navigateSeller('notifications')}><strong>🔔</strong><span>Notifications</span></button>
          <button onClick={() => navigateSeller('messages')}><strong>💬</strong><span>Messages</span></button>
          <button onClick={() => navigateSeller('orders')}><strong>📦</strong><span>Commandes</span></button>
          <button onClick={() => setScreen('profile-settings')}><strong>👤</strong><span>Profil</span></button>
        </div>
      </div>
      <div className="pjd-seller-feature-actions">
        <button onClick={() => setShowUploader(true)}><span>📁</span><div><b>Importer un fichier à vendre</b><small>Vendez vos fichiers numériques facilement</small></div><strong>›</strong></button>
        <button onClick={() => setShowAICenter(true)}><span>✨</span><div><b>Centre IA PJD Maker</b><small>Produit, marketing, commercial, vendeur et client</small></div><strong>›</strong></button>
        <button onClick={() => setScreen('growth')}><span>🚀</span><div><b>Écosystème vendeur PJD Maker</b><small>Outils, ressources et accompagnement</small></div><strong>›</strong></button>
      </div>
      <div className="pjd-seller-workspace"><SellerSpaceNav active={sellerTab} onNavigate={navigateSeller} onAddProduct={() => setShowUploader(true)} onOpenPlans={() => setScreen('seller-plans')} /><div className="seller-space-content">{renderSellerTab()}</div></div>
    </div>
  );

  const renderScreen = () => {
    if (screen === 'product' && selectedProduct) return <ProductDetail product={selectedProduct} onBack={() => { window.history.replaceState({}, '', '/'); setSelectedProduct(null); setScreen('market'); }} onBuy={(product) => { setSelectedProduct(null); setScreen('market'); window.dispatchEvent(new CustomEvent('pjd-add-to-cart', { detail: product })); }} />;
    if (screen === 'public-shop') return <PublicShopPage shopId={publicShopId} onBack={() => { setPublicShopId(null); setScreen('market'); }} onAdd={(product) => window.dispatchEvent(new CustomEvent('pjd-add-to-cart', { detail: product }))} />;
    if (screen === 'favorites') return <FavoritesPage onBack={() => setScreen('market')} />;
    if (screen === 'features') return <PjdMakerFeatures onBack={() => setScreen('market')} />;
    if (screen === 'affiliate') return <AffiliatePage session={accountSession} onBack={() => setScreen('market')} />;
    if (screen === 'seller') return sellerSpace;
    if (screen === 'seller-plans') return <SellerPlanPage session={accountSession} onBack={() => setScreen('seller')} />;
    if (screen === 'growth') return <SellerGrowthHub session={accountSession} onBack={() => setScreen('seller')} />;
    if (screen === 'crm') return <SellerCRM session={accountSession} onBack={() => setScreen('seller')} />;
    if (screen === 'seller-operations') return <SellerOperations session={accountSession} onBack={() => setScreen('seller')} />;
    if (screen === 'orders') return <CustomerOrders session={accountSession} onBack={() => setScreen('market')} />;
    if (screen === 'deliveries') return <CustomerDeliveryReview session={accountSession} />;
    if (screen === 'admin') return <><AdminDashboard onBack={() => setScreen('market')} /><button onClick={() => setScreen('promo-codes')} style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 9999, padding: '13px 18px', border: 0, borderRadius: 12, background: '#f97316', color: '#fff', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 30px rgba(0,0,0,.2)' }}>🏷️ Codes promo</button></>;
    if (screen === 'promo-codes') return <PromoCodesPage session={accountSession} onBack={() => setScreen('admin')} />;
    if (screen === 'profile-settings') return <ProfileSettings onBack={() => setScreen('account')} />;
    if (screen === 'account') return <AccountPage session={accountSession} initialSection={accountSection} onBack={() => setScreen('market')} />;
    return <><MarketplaceHome /><MultiVendorCheckout session={accountSession} /></>;
  };

  return (
    <AuthGate onSessionChange={handleAuthSession}>
      <PhotoPickerEnhancer session={accountSession} />
      {screen === 'market' && <MarketplaceTopNav session={accountSession} onOpenCart={openCart} onOpenSeller={openSeller} onOpenAccount={(section) => section === 'favorites' ? setScreen('favorites') : openAccount(section)} onOpenAffiliate={() => setScreen('affiliate')} onOpenAuth={(mode) => setAuthMode(mode)} />}
      <div onClickCapture={handleClick}>{renderScreen()}</div>
      {showUploader && <DigitalProductUploader session={accountSession} shop={shop} onClose={() => setShowUploader(false)} onSaved={() => setShowUploader(false)} />}
      {showAIPublisher && <PublicationAssistant onClose={() => setShowAIPublisher(false)} onPublished={async (data) => { try { const row = await saveAIDraft(data); alert(`Produit « ${row.title} » enregistré en brouillon dans votre catalogue.`); } catch (error) { alert(error.message || 'Impossible d’enregistrer le produit'); } }} />}
      {showAICenter && <AICenter onClose={() => setShowAICenter(false)} />}
      {shopFlow && <CreateShopFlow session={accountSession} onClose={() => setShopFlow(false)} onDone={finishShop} />}
      {authMode && <AuthModal mode={authMode} onClose={() => setAuthMode(null)} onSuccess={handleAuthSession} onSignup={() => setAuthMode('signup')} />}
    </AuthGate>
  );
}
