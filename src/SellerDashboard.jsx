import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Boxes, Image as ImageIcon, PackagePlus, Save, ShoppingBag, TrendingUp, Upload, Wallet, Percent, Loader2, CheckCircle2, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import './seller.css';

const money = (v) => `${Number(v || 0).toLocaleString('fr-FR')} FCFA`;
const imageOf = (p) => p?.cover_image || p?.image_url || (Array.isArray(p?.images) ? p.images[0] : typeof p?.images === 'string' ? p.images : null);
const DIGITAL_CATEGORIES = ['Applications & APK','E-books & PDF','Formations','Design & Création','Templates','Documents','Musique & Audio','Vidéos','Photos & Images','Autres'];

export default function SellerDashboard({ session, shop, activeTab = 'dashboard' }) {
  const [tab, setTab] = useState(activeTab);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ title:'', description:'', category:'E-books & PDF', price:'', free:false, stock:'0', sku:'', file:null, cover:null });
  const [edits, setEdits] = useState({});

  useEffect(() => setTab(activeTab || 'dashboard'), [activeTab]);
  useEffect(() => { if (session?.user?.id) load(); }, [session?.user?.id]);

  async function load() {
    if (!session?.user?.id) return;
    setLoading(true);
    setMsg('');
    const uid = session.user.id;
    try {
      const [digital, physical] = await Promise.all([
        supabase.from('digital_products').select('*').eq('seller_id', uid).order('created_at', { ascending:false }),
        supabase.from('marketplace_products').select('*').eq('seller_id', uid).order('created_at', { ascending:false })
      ]);
      if (digital.error) throw digital.error;
      if (physical.error) throw physical.error;
      setProducts([
        ...(digital.data || []).map(p => ({ ...p, product_type:'digital' })),
        ...(physical.data || []).map(p => ({ ...p, product_type:'physical' }))
      ]);
      try {
        const oi = await supabase.from('order_items').select('order_id,name,price,unit_price,line_total,quantity,commission,seller_net').eq('seller_id', uid);
        if (!oi.error && oi.data?.length) {
          const ids = [...new Set(oi.data.map(x => x.order_id).filter(Boolean))];
          if (ids.length) {
            const or = await supabase.from('orders').select('id,status,total,created_at').in('id', ids);
            if (!or.error) setOrders((or.data || []).map(o => ({ ...o, items:oi.data.filter(i => i.order_id === o.id) })));
          }
        } else {
          setOrders([]);
        }
      } catch {
        setOrders([]);
      }
    } catch (e) {
      setMsg(e.message || 'Impossible de charger les produits.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  const stats = useMemo(() => {
    const valid = orders.filter(o => !['cancelled','canceled','refunded'].includes(String(o.status || '').toLowerCase()));
    const line = i => Number(i.line_total ?? (Number(i.unit_price ?? i.price ?? 0) * Number(i.quantity ?? 1)));
    const revenue = valid.reduce((s,o) => s + (o.items || []).reduce((a,i) => a + line(i), 0), 0);
    const commission = valid.reduce((s,o) => s + (o.items || []).reduce((a,i) => a + Number(i.commission || 0), 0), 0);
    const units = valid.reduce((s,o) => s + (o.items || []).reduce((a,i) => a + Number(i.quantity || 1), 0), 0);
    return { revenue, commission, net:revenue - commission, units, orders:valid.length, avg:valid.length ? revenue / valid.length : 0 };
  }, [orders]);

  const update = (key, value) => setForm(f => ({ ...f, [key]:value }));

  async function publish() {
    if (!session?.user?.id || !shop?.id) return setMsg('Votre boutique doit être active avant de publier.');
    if (!form.title.trim()) return setMsg('Indiquez le nom du produit.');
    if (!form.file) return setMsg('Sélectionnez le fichier du produit.');
    if (!form.free && (!form.price || Number(form.price) < 0)) return setMsg('Indiquez le prix du produit ou choisissez Gratuit.');
    setSaving(true);
    setMsg('Publication en cours…');
    const uid = session.user.id;
    const safe = form.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${uid}/${shop.id}/${Date.now()}-${safe}`;
    const up = await supabase.storage.from('product-files').upload(path, form.file, { upsert:false, contentType:form.file.type || 'application/octet-stream' });
    if (up.error) { setMsg(`Fichier : ${up.error.message}`); setSaving(false); return; }
    let image = null;
    if (form.cover) {
      const ext = (form.cover.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
      const coverPath = `${uid}/${shop.id}/cover-${Date.now()}.${ext}`;
      const cu = await supabase.storage.from('public-assets').upload(coverPath, form.cover, { upsert:false, contentType:form.cover.type || 'image/jpeg' });
      if (cu.error) { await supabase.storage.from('product-files').remove([path]); setMsg(`Photo : ${cu.error.message}`); setSaving(false); return; }
      image = supabase.storage.from('public-assets').getPublicUrl(coverPath).data?.publicUrl || null;
    }
    const result = await supabase.from('digital_products').insert({
      seller_id:uid, shop_id:shop.id, title:form.title.trim(), description:form.description.trim(), category:form.category,
      price:form.free ? 0 : Number(form.price || 0), promo_price:null, stock:Number(form.stock) || 0, sku:form.sku.trim() || null,
      file_url:path, file_type:form.file.type || null, file_size:form.file.size || null, image_url:image, cover_image:image,
      is_free:form.free, status:'actif', source_type:'digital'
    }).select().single();
    if (result.error) {
      await supabase.storage.from('product-files').remove([path]);
      setMsg(`Produit : ${result.error.message}`);
    } else {
      setMsg('Produit publié avec succès.');
      setForm({ title:'', description:'', category:'E-books & PDF', price:'', free:false, stock:'0', sku:'', file:null, cover:null });
      await load();
    }
    setSaving(false);
  }

  async function savePrice(p) {
    const key = `${p.product_type}:${p.id}`;
    const edit = edits[key] || { price:String(p.price ?? 0), promo:p.promo_price == null ? '' : String(p.promo_price) };
    const price = Number(edit.price);
    const promo = edit.promo === '' ? null : Number(edit.promo);
    if (!Number.isFinite(price) || price < 0) return setMsg('Prix invalide.');
    if (promo != null && (!Number.isFinite(promo) || promo < 0 || promo >= price)) return setMsg('Le prix promotionnel doit être inférieur au prix normal.');
    setSaving(true);
    const table = p.product_type === 'digital' ? 'digital_products' : 'marketplace_products';
    const changes = p.product_type === 'digital' ? { price, promo_price:promo, is_free:price === 0 } : { price };
    const r = await supabase.from(table).update(changes).eq('id', p.id).eq('seller_id', session.user.id);
    setMsg(r.error ? `Prix : ${r.error.message}` : 'Prix enregistré.');
    if (!r.error) await load();
    setSaving(false);
  }

  if (tab === 'dashboard') return <Dashboard stats={stats} products={products} loading={loading} refresh={load} />;
  if (tab === 'finance') return <Simple title="Finances" icon={<Wallet size={30} />}><Cards stats={stats} /></Simple>;
  if (tab === 'stock') return <Simple title="Gestion du stock" icon={<Boxes size={30} />}><div>{products.map(p => <div key={`${p.product_type}:${p.id}`} style={{display:'flex',justifyContent:'space-between',padding:12,borderBottom:'1px solid #eee'}}><span>{p.title}</span><b>{Number(p.stock || 0)} unité(s)</b></div>)}</div></Simple>;
  if (tab !== 'products') return <Simple title="Espace vendeur" icon={<Boxes size={30} />}><p>Utilisez le menu vendeur pour accéder aux produits, finances et stock.</p></Simple>;

  return <Simple title="Produits & configuration des prix" icon={<PackagePlus size={30} />}>
    <div className="digital-import-card">
      <h3>Publier un produit</h3>
      <div className="form-grid">
        <label>Nom<input value={form.title} onChange={e => update('title', e.target.value)} /></label>
        <label>Catégorie<select value={form.category} onChange={e => update('category', e.target.value)}>{DIGITAL_CATEGORIES.map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="full-label">Description<textarea rows="4" value={form.description} onChange={e => update('description', e.target.value)} /></label>
        <label>Prix FCFA<input type="number" min="0" disabled={form.free} value={form.price} onChange={e => update('price', e.target.value)} /></label>
        <label className="dpu-free"><input type="checkbox" checked={form.free} onChange={e => update('free', e.target.checked)} /> Produit gratuit</label>
        <label>Stock<input type="number" min="0" value={form.stock} onChange={e => update('stock', e.target.value)} /></label>
        <label>SKU<input value={form.sku} onChange={e => update('sku', e.target.value)} /></label>
      </div>
      <label className="dpu-file"><input type="file" onChange={e => update('file', e.target.files?.[0] || null)} /><Upload size={28} /><div><b>{form.file ? form.file.name : 'Sélectionner le fichier du produit'}</b><small>{form.file ? 'Fichier sélectionné' : 'PDF, vidéo, audio, ZIP, APK, etc.'}</small></div></label>
      <label className="dpu-cover"><input type="file" accept="image/*" onChange={e => update('cover', e.target.files?.[0] || null)} /><ImageIcon size={20} /><span>{form.cover ? form.cover.name : 'Ajouter une photo / couverture'}</span></label>
      {form.cover ? <div style={{marginTop:12}}><img src={URL.createObjectURL(form.cover)} alt="Aperçu" style={{width:110,height:110,objectFit:'cover',borderRadius:12,border:'1px solid #ddd'}} /></div> : null}
      {msg ? <div className="seller-message"><CheckCircle2 size={17} />{msg}<button onClick={() => setMsg('')}><X size={15} /></button></div> : null}
      <button className="primary" onClick={publish} disabled={saving}>{saving ? <><Loader2 className="spin" /> Publication…</> : <><Upload size={17} /> Publier le produit</>}</button>
    </div>
    <h3>Catalogue et configuration des prix</h3>
    {loading ? <p>Chargement des produits…</p> : <div style={{display:'grid',gap:12}}>{products.map(p => {
      const key = `${p.product_type}:${p.id}`;
      const edit = edits[key] || { price:String(p.price ?? 0), promo:p.promo_price == null ? '' : String(p.promo_price) };
      const productImage = imageOf(p);
      return <div key={key} style={{display:'grid',gridTemplateColumns:'72px minmax(0,1fr) auto',gap:12,alignItems:'center',padding:12,border:'1px solid #e5e7eb',borderRadius:14}}>
        <div style={{width:72,height:72,borderRadius:10,overflow:'hidden',background:'#f3f4f6',display:'grid',placeItems:'center'}}>{productImage ? <img src={productImage} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e => { e.currentTarget.style.display='none'; }} /> : <ImageIcon size={24} />}</div>
        <div><b>{p.title}</b><small style={{display:'block'}}>Stock : {Number(p.stock || 0)}</small><div style={{display:'flex',gap:8,marginTop:7}}><input type="number" min="0" value={edit.price} onChange={e => setEdits(x => ({...x,[key]:{...edit,price:e.target.value}}))} style={{width:120,padding:8}} />{p.product_type === 'digital' ? <input type="number" min="0" value={edit.promo} onChange={e => setEdits(x => ({...x,[key]:{...edit,promo:e.target.value}}))} style={{width:120,padding:8}} /> : null}</div></div>
        <button className="primary" disabled={saving} onClick={() => savePrice(p)}><Save size={16} /> Enregistrer</button>
      </div>;
    })}</div>}
  </Simple>;
}

function Simple({title,icon,children}) { return <div className="seller-card wide-card"><div className="page-title"><div><span className="eyebrow">ESPACE VENDEUR</span><h2>{title}</h2></div>{icon}</div>{children}</div>; }
function Cards({stats}) { return <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',gap:12}}>{[['CA',stats.revenue,TrendingUp],['Commandes',stats.orders,ShoppingBag],['Panier moyen',stats.avg,BarChart3],['Net vendeur',stats.net,Wallet],['Commission',stats.commission,Percent],['Unités',stats.units,PackagePlus]].map(([label,value,Icon]) => <div key={label} style={{padding:16,border:'1px solid #e5e7eb',borderRadius:14}}><Icon size={18} /><small style={{display:'block'}}>{label}</small><strong>{label === 'Commandes' || label === 'Unités' ? Number(value).toLocaleString('fr-FR') : money(value)}</strong></div>)}</div>; }
function Dashboard({stats,products,loading,refresh}) { return <Simple title="Tableau de bord — Analyse" icon={<BarChart3 size={30} />}><button className="primary" onClick={refresh} style={{marginBottom:14}}><BarChart3 size={17} /> Actualiser les analyses</button>{loading ? <p>Chargement des analyses…</p> : <><Cards stats={stats} /><div style={{marginTop:14,padding:14,borderRadius:12,background:'#f5f7fa'}}><b>{products.length}</b> produit(s) au catalogue.</div>{stats.orders === 0 ? <p style={{color:'#667085'}}>Aucune commande vendue pour le moment. Les analyses se rempliront automatiquement dès les premières ventes.</p> : null}</>}</Simple>; }
