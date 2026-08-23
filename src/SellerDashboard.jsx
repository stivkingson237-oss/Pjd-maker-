import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Store, PackagePlus, ShoppingBag, Wallet, ArrowLeft, Loader2, Save, LayoutDashboard, Boxes, ClipboardList, Settings, Trash2, Pencil, X, CheckCircle2, TrendingUp, AlertTriangle, Sparkles, FileText, Image, Megaphone, BarChart3, Search, Bot, DollarSign } from 'lucide-react';
import './seller.css';

const money = v => `${Number(v || 0).toLocaleString('fr-FR')} FCFA`;
const categories = ['Applications & APK','E-books & PDF','Formations','Design & Création','Templates','Documents','Mode','Électronique','Maison','Beauté','Alimentation','Services'];
const orderStatuses = ['en_attente','confirmee','preparation','expedition','livree','terminee','annulee'];

export default function SellerDashboard({ onBack }) {
  const [session,setSession]=useState(null),[shop,setShop]=useState(null),[products,setProducts]=useState([]),[orders,setOrders]=useState([]),[balance,setBalance]=useState(0),[transactions,setTransactions]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
  const [tab,setTab]=useState('dashboard'),[editing,setEditing]=useState(null);
  const [shopName,setShopName]=useState(''),[shopDescription,setShopDescription]=useState(''),[category,setCategory]=useState('Applications & APK'),[shopPhone,setShopPhone]=useState(''),[shopAddress,setShopAddress]=useState(''),[shopCity,setShopCity]=useState(''),[shopCountry,setShopCountry]=useState('Cameroun'),[shopLogo,setShopLogo]=useState(''),[shopBanner,setShopBanner]=useState('');
  const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[price,setPrice]=useState(''),[promoPrice,setPromoPrice]=useState(''),[stock,setStock]=useState('0'),[sku,setSku]=useState(''),[productCategory,setProductCategory]=useState('Applications & APK'),[fileUrl,setFileUrl]=useState('');

  useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);if(data.session)load(data.session.user.id);else setLoading(false)})},[]);

  async function load(uid){
    setLoading(true);
    const {data:s}=await supabase.from('shops').select('*').eq('owner_id',uid).order('created_at',{ascending:false}).limit(1).maybeSingle();
    setShop(s);
    if(s){setShopName(s.shop_name||'');setShopDescription(s.description||'');setCategory(s.category||categories[0]);setShopPhone(s.phone||'');setShopAddress(s.address||'');setShopCity(s.city||'');setShopCountry(s.country||'Cameroun');setShopLogo(s.logo||'');setShopBanner(s.banner||'')}
    const {data:p}=await supabase.from('digital_products').select('*').eq('seller_id',uid).order('created_at',{ascending:false}); setProducts(p||[]);
    const {data:oi}=await supabase.from('order_items').select('id,order_id,product_id,name,price,quantity,seller_id,orders(status,created_at)').eq('seller_id',uid).order('id',{ascending:false}); setOrders(oi||[]);
    const {data:u}=await supabase.from('users').select('balance').eq('id',uid).maybeSingle(); setBalance(Number(u?.balance||0));
    const {data:wt}=await supabase.from('wallet_transactions').select('id,type,amount,description,status,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(10); setTransactions(wt||[]);
    setLoading(false);
  }

  async function uploadShopImage(file,kind){
    if(!session||!file)return;
    if(!file.type.startsWith('image/')){setMessage('Sélectionnez une image depuis la galerie.');return}
    if(file.size>6*1024*1024){setMessage('Image trop volumineuse. Maximum 6 Mo.');return}
    setSaving(true);setMessage('');
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
    const path=`${session.user.id}/shop-${kind}-${Date.now()}.${ext}`;
    const {error}=await supabase.storage.from('profile-media').upload(path,file,{upsert:false,contentType:file.type,cacheControl:'3600'});
    if(error){setMessage(`Impossible d’importer l’image : ${error.message}`);setSaving(false);return}
    const {data}=supabase.storage.from('profile-media').getPublicUrl(path);const url=data?.publicUrl||'';
    if(kind==='logo')setShopLogo(url);else setShopBanner(url);
    if(shop){const field=kind==='logo'?'logo':'banner';const result=await supabase.from('shops').update({[field]:url}).eq('id',shop.id);if(result.error)setMessage(result.error.message);else setShop(prev=>({...prev,[field]:url}))}
    setMessage(kind==='logo'?'Photo de profil de la boutique ajoutée.':'Bannière de la boutique ajoutée.');setSaving(false);
  }

  async function saveShop(e){
    e.preventDefault(); if(!session)return; setSaving(true); setMessage('');
    const slug=shop?.slug||`${shopName.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-')}-${session.user.id.slice(0,6)}`;
    const payload={owner_id:session.user.id,shop_name:shopName.trim(),slug,description:shopDescription.trim(),logo:shopLogo||null,banner:shopBanner||null,category,status:'active',phone:shopPhone.trim()||null,address:shopAddress.trim()||null,city:shopCity.trim()||null,country:shopCountry.trim()||'Cameroun'};
    const result=shop?await supabase.from('shops').update(payload).eq('id',shop.id).select().single():await supabase.from('shops').insert(payload).select().single();
    if(result.error){setMessage(result.error.message);setSaving(false);return;}
    setShop(result.data);
    await supabase.from('users').update({role:'seller',shop_id:result.data.id}).eq('id',session.user.id);
    setMessage('Boutique enregistrée et activée.');
    setTab('dashboard');
    await load(session.user.id);
    setSaving(false);
  }

  function resetProduct(){setTitle('');setDescription('');setPrice('');setPromoPrice('');setStock('0');setSku('');setFileUrl('');setProductCategory(category||categories[0]);setEditing(null)}
  function startEdit(p){setEditing(p);setTitle(p.title||'');setDescription(p.description||'');setPrice(p.price||'');setPromoPrice(p.promo_price??'');setStock(p.stock??0);setSku(p.sku||'');setFileUrl(p.file_url||'');setProductCategory(p.category||categories[0]);setTab('products')}

  async function addOrUpdateProduct(e){
    e.preventDefault(); if(!session||!shop){setMessage('Crée d’abord ta boutique.');return} setSaving(true);setMessage('');
    const payload={seller_id:session.user.id,shop_id:shop.id,title:title.trim(),description:description.trim(),category:productCategory,price:Number(price),promo_price:promoPrice?Number(promoPrice):null,stock:Math.max(0,Number(stock)||0),sku:sku.trim()||null,file_url:fileUrl.trim()||null};
    const result=editing?await supabase.from('digital_products').update(payload).eq('id',editing.id):await supabase.from('digital_products').insert({...payload,status:'en_attente'});
    if(result.error)setMessage(result.error.message);else{setMessage(editing?'Produit modifié.':'Produit envoyé pour validation.');resetProduct();await load(session.user.id)}
    setSaving(false);
  }

  async function deleteProduct(id){if(!window.confirm('Supprimer ce produit ?'))return;const {error}=await supabase.from('digital_products').delete().eq('id',id);if(error)setMessage(error.message);else{setMessage('Produit supprimé.');await load(session.user.id)}}
  async function updateOrderStatus(id,status){const {error}=await supabase.from('orders').update({status}).eq('id',id);if(error)setMessage(error.message);else{setMessage('Commande mise à jour.');await load(session.user.id)}}

  if(loading)return <div className="seller-page"><div className="loading"><Loader2 className="spin"/> Chargement de l’espace vendeur...</div></div>;
  if(!session)return <div className="seller-page"><button onClick={onBack}><ArrowLeft/> Retour</button><div className="seller-empty"><h1>Connecte-toi pour vendre</h1><p>Ton espace vendeur est sécurisé par Supabase Auth.</p></div></div>;

  const revenue=orders.reduce((s,x)=>s+Number(x.price||0)*Number(x.quantity||1),0);
  const pending=orders.filter(x=>['en_attente','pending'].includes(x.orders?.status)).length;
  const lowStock=products.filter(p=>Number(p.stock||0)<=5);
  const activeProducts=products.filter(p=>p.status==='actif'||p.status==='active').length;
  const nav=[['dashboard','Tableau de bord',LayoutDashboard],['shop','Ma boutique',Store],['products','Produits & stock',Boxes],['orders','Commandes',ClipboardList],['finance','Finances',Wallet],['ai','IA',Sparkles],['settings','Paramètres',Settings]];

  return <div className="seller-page">
    <div className="seller-topbar"><div className="seller-brand"><button className="back-btn" onClick={onBack}><ArrowLeft size={18}/> Retour à l'accueil</button><div><span className="eyebrow">PJD MAKER · ESPACE VENDEUR</span><h1>{shop?.shop_name||'Ma boutique'}</h1></div></div><div className="shop-status"><span className="status-dot"/> {shop?'Boutique active':'Boutique à créer'}</div></div>
    <div className="seller-layout">
      <aside className="seller-sidebar">{nav.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={19}/>{label}</button>)}</aside>
      <main className="seller-main">
        {message&&<div className="seller-message"><CheckCircle2 size={18}/>{message}<button onClick={()=>setMessage('')}><X size={16}/></button></div>}
        {tab==='dashboard'&&<>
          <div className="page-title"><div><span className="eyebrow">VUE GÉNÉRALE</span><h2>Bienvenue dans votre espace vendeur</h2><p>Gérez votre boutique, vos produits, vos commandes et vos revenus au même endroit.</p></div><button className="primary compact" onClick={()=>setTab('products')}><PackagePlus size={18}/> Ajouter un produit</button></div>
          <div className="seller-stats-grid"><div><Store/><span>Boutique</span><strong>{shop?'Active':'À créer'}</strong></div><div><Boxes/><span>Produits</span><strong>{products.length}</strong><small>{activeProducts} actifs</small></div><div><ShoppingBag/><span>Articles vendus</span><strong>{orders.reduce((s,x)=>s+Number(x.quantity||0),0)}</strong><small>{pending} commande(s) en attente</small></div><div><Wallet/><span>Chiffre d’affaires</span><strong>{money(revenue)}</strong><small>Ventes enregistrées</small></div></div>
          {lowStock.length>0&&<div className="stock-alert"><AlertTriangle size={19}/><div><b>Stock à surveiller</b><span>{lowStock.length} produit(s) ont 5 unités ou moins.</span></div><button onClick={()=>setTab('products')}>Gérer le stock</button></div>}
          <div className="seller-columns"><div className="seller-card"><div className="seller-card-title"><Store/><div><h3>Votre boutique</h3><p>{shop?.description||'Créez votre vitrine professionnelle.'}</p></div></div>{shop?<div className="shop-preview-mini"><strong>{shop.shop_name}</strong><span>{shop.category}</span><p>{shop.description||'Aucune description.'}</p><button onClick={()=>setTab('shop')}><Pencil size={16}/> Gérer la boutique</button></div>:<button className="primary" onClick={()=>setTab('shop')}>Créer ma boutique</button>}</div><div className="seller-card"><div className="seller-card-title"><ClipboardList/><div><h3>Dernières commandes</h3><p>Suivez les commandes de vos clients.</p></div></div>{orders.slice(0,5).map(o=><div className="seller-row" key={o.id}><div><b>{o.name}</b><small>{money(o.price)} × {o.quantity}</small></div><span>{o.orders?.status||'en_attente'}</span></div>)}{orders.length===0&&<p>Aucune commande pour le moment.</p>}<button className="link-btn" onClick={()=>setTab('orders')}>Voir toutes les commandes →</button></div></div>
        </>}

        {tab==='shop'&&<form className="seller-card wide-card" onSubmit={saveShop}><div className="page-title"><div><span className="eyebrow">VITRINE</span><h2>{shop?'Modifier ma boutique':'Créer ma boutique'}</h2><p>Configurez les informations visibles par vos clients.</p></div><Store size={34}/></div><div className="shop-media-grid"><div className="shop-media-card">{shopLogo?<img src={shopLogo} alt="Logo de la boutique"/>:<div className="media-placeholder"><Store size={34}/><span>Photo de profil</span></div>}<label className="secondary media-button">Choisir une photo<input type="file" accept="image/*" onChange={e=>uploadShopImage(e.target.files?.[0],'logo')} /></label></div><div className="shop-banner-card">{shopBanner?<img src={shopBanner} alt="Bannière de la boutique"/>:<div className="media-placeholder"><Image size={34}/><span>Bannière de la boutique</span></div>}<label className="secondary media-button">Choisir une bannière<input type="file" accept="image/*" onChange={e=>uploadShopImage(e.target.files?.[0],'banner')} /></label></div></div><div className="form-grid"><label>Nom de la boutique<input required value={shopName} onChange={e=>setShopName(e.target.value)} placeholder="Ex. PJD Digital Store"/></label><label>Catégorie<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Téléphone<input value={shopPhone} onChange={e=>setShopPhone(e.target.value)} placeholder="+237 ..."/></label><label>Ville<input value={shopCity} onChange={e=>setShopCity(e.target.value)} placeholder="Yaoundé"/></label><label className="full-label">Adresse<input value={shopAddress} onChange={e=>setShopAddress(e.target.value)} placeholder="Adresse de la boutique"/></label><label>Pays<input value={shopCountry} onChange={e=>setShopCountry(e.target.value)} placeholder="Cameroun"/></label></div><label>Description<textarea value={shopDescription} onChange={e=>setShopDescription(e.target.value)} placeholder="Présentez votre activité, vos produits et vos services..."/></label><div className="shop-checklist"><div><CheckCircle2/> Boutique publique</div><div><CheckCircle2/> Catalogue produits</div><div><CheckCircle2/> Commandes clients</div><div><CheckCircle2/> Suivi des revenus</div></div><button className="primary" disabled={saving}><Save size={18}/>{saving?'Enregistrement...':'Enregistrer la boutique'}</button></form>}

        {tab==='products'&&<><div className="page-title"><div><span className="eyebrow">CATALOGUE</span><h2>Produits & gestion du stock</h2><p>Ajoutez, modifiez vos prix et contrôlez vos quantités disponibles.</p></div></div><div className="seller-columns"><form className="seller-card" onSubmit={addOrUpdateProduct}><div className="seller-card-title"><PackagePlus/><div><h3>{editing?'Modifier le produit':'Ajouter un produit'}</h3><p>{editing?'Mettez à jour votre fiche et votre stock.':'Les nouveaux produits sont soumis à validation.'}</p></div></div><input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="Nom du produit"/><textarea required value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description du produit"/><div className="seller-two"><input required type="number" min="0" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Prix en FCFA"/><input type="number" min="0" value={promoPrice} onChange={e=>setPromoPrice(e.target.value)} placeholder="Prix promotionnel"/></div><div className="seller-two"><input type="number" min="0" value={stock} onChange={e=>setStock(e.target.value)} placeholder="Stock disponible"/><input value={sku} onChange={e=>setSku(e.target.value)} placeholder="Référence / SKU"/></div><select value={productCategory} onChange={e=>setProductCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select><input value={fileUrl} onChange={e=>setFileUrl(e.target.value)} placeholder="URL sécurisée du fichier (optionnel)"/><div className="form-actions"><button className="primary" disabled={saving}><Save size={18}/>{saving?(editing?'Modification...':'Publication...'):(editing?'Enregistrer les modifications':'Publier le produit')}</button>{editing&&<button type="button" className="secondary" onClick={resetProduct}><X size={18}/> Annuler</button>}</div></form><div className="seller-card"><h3>Catalogue ({products.length})</h3>{products.length===0?<p>Aucun produit pour le moment.</p>:products.map(p=><div className="seller-row product-row" key={p.id}><div><b>{p.title}</b><small>{p.category} · {money(p.promo_price||p.price)} {p.promo_price&&<del>{money(p.price)}</del>}</small><small>Stock : <strong className={Number(p.stock||0)<=5?'stock-low':''}>{p.stock??0}</strong> · SKU : {p.sku||'—'}</small></div><div className="row-actions"><span>{p.status||'en_attente'}</span><button title="Modifier" onClick={()=>startEdit(p)}><Pencil size={16}/></button><button title="Supprimer" onClick={()=>deleteProduct(p.id)}><Trash2 size={16}/></button></div></div>)}</div></div></>}

        {tab==='orders'&&<div className="seller-card wide-card"><div className="page-title"><div><span className="eyebrow">VENTES</span><h2>Gestion des commandes</h2><p>Préparez, suivez et mettez à jour les commandes de votre boutique.</p></div><ClipboardList size={34}/></div>{orders.length===0?<div className="empty-state"><ShoppingBag size={42}/><h3>Aucune commande</h3><p>Vos commandes apparaîtront ici dès vos premières ventes.</p></div>:orders.map(o=><div className="order-card" key={o.id}><div><b>{o.name}</b><span>Commande #{String(o.order_id).slice(0,8)} · {money(Number(o.price)*Number(o.quantity))}</span><small>{o.orders?.created_at?new Date(o.orders.created_at).toLocaleString('fr-FR'):''}</small></div><select value={o.orders?.status||'en_attente'} onChange={e=>updateOrderStatus(o.order_id,e.target.value)}>{orderStatuses.map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>)}</div>}

        {tab==='finance'&&<div className="seller-card wide-card"><div className="page-title"><div><span className="eyebrow">FINANCES</span><h2>Revenus, portefeuille et transactions</h2><p>Suivez vos ventes et le solde disponible de votre compte vendeur.</p></div><Wallet size={34}/></div><div className="finance-grid"><div><span>Chiffre d’affaires</span><strong>{money(revenue)}</strong></div><div><span>Solde vendeur</span><strong>{money(balance)}</strong></div><div><span>Commandes</span><strong>{orders.length}</strong></div></div><div className="finance-summary"><TrendingUp size={20}/><span>Articles vendus : <b>{orders.reduce((s,x)=>s+Number(x.quantity||0),0)}</b></span><span>Commission standard : <b>5 %</b></span></div><h3>Dernières transactions</h3>{transactions.length===0?<p>Aucune transaction de portefeuille pour le moment.</p>:transactions.map(t=><div className="seller-row" key={t.id}><div><b>{t.description||t.type}</b><small>{t.created_at?new Date(t.created_at).toLocaleString('fr-FR'):''}</small></div><span>{money(t.amount)} · {t.status}</span></div>)}<div className="notice-box">Les retraits restent soumis aux règles de validation et aux moyens de paiement configurés sur PJD Maker.</div></div>}

        {tab==='ai'&&<div className="seller-card wide-card"><div className="page-title"><div><span className="eyebrow">ASSISTANT INTELLIGENT</span><h2>IA de la boutique</h2><p>Tous les outils IA du vendeur regroupés dans un seul espace.</p></div><Sparkles size={34}/></div><div className="ai-tools-grid"><button onClick={()=>setMessage('IA Rédacteur : génération de titres et descriptions de produits.') }><FileText/><b>IA Rédacteur</b><span>Créer des descriptions et titres vendeurs.</span></button><button onClick={()=>setMessage('IA Image : amélioration et préparation des visuels produits.') }><Image/><b>IA Image</b><span>Améliorer et préparer vos visuels.</span></button><button onClick={()=>setMessage('IA Marketing : création de textes publicitaires et publications.') }><Megaphone/><b>IA Marketing</b><span>Créer vos publicités et publications.</span></button><button onClick={()=>setMessage('IA Analyse : analyse des ventes et performances.') }><BarChart3/><b>IA Analyse</b><span>Comprendre ventes, produits et performances.</span></button><button onClick={()=>setMessage('IA Assistant : aide quotidienne pour gérer votre boutique.') }><Bot/><b>IA Assistant vendeur</b><span>Un assistant pour vos tâches quotidiennes.</span></button><button onClick={()=>setMessage('IA Prix : aide à définir un prix compétitif.') }><DollarSign/><b>IA Prix</b><span>Obtenir une aide pour vos prix.</span></button><button onClick={()=>setMessage('IA SEO : optimisation des titres et mots-clés.') }><Search/><b>IA SEO</b><span>Optimiser vos fiches pour la recherche.</span></button><button onClick={()=>setMessage('IA Catalogue : préparer rapidement plusieurs fiches produits.') }><PackagePlus/><b>IA Catalogue</b><span>Accélérer la création de votre catalogue.</span></button></div></div>}

        {tab==='settings'&&<div className="seller-card wide-card"><div className="page-title"><div><span className="eyebrow">CONFIGURATION</span><h2>Paramètres de la boutique</h2><p>Gérez les règles essentielles de votre activité.</p></div><Settings size={34}/></div><div className="settings-list"><div><b>Statut de la boutique</b><span>{shop?'Active':'Non configurée'}</span></div><div><b>Validation des produits</b><span>Activée</span></div><div><b>Gestion du stock</b><span>{products.length} produit(s) suivi(s)</span></div><div><b>Notifications</b><span>Commandes, ventes et avis</span></div><div><b>Livraison</b><span>Configuration selon les zones</span></div><div><b>Commission marketplace</b><span>5 % par défaut</span></div></div><button className="secondary" onClick={()=>setTab('shop')}><Store size={18}/> Modifier les informations de la boutique</button></div>}
      </main>
    </div>
  </div>;
}