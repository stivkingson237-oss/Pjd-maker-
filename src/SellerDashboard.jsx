import React,{useEffect,useState}from'react';
import{supabase}from'./lib/supabase';
import{PackagePlus,Upload,FileText,Image as ImageIcon,Video,Music,Archive,BookOpen,Loader2,X,CheckCircle2,Boxes}from'lucide-react';
import'./seller.css';

const categories=['Applications & APK','E-books & PDF','Formations','Design & Création','Templates','Documents','Mode','Électronique','Maison','Beauté','Alimentation','Services','Musique & Audio','Vidéos','Photos & Images','Autres'];
const iconFor=t=>{if(t?.startsWith('video/'))return Video;if(t?.startsWith('audio/'))return Music;if(t?.startsWith('image/'))return ImageIcon;if(t?.includes('zip')||t?.includes('rar'))return Archive;if(t?.includes('pdf')||t?.includes('epub'))return BookOpen;return FileText};
const money=v=>`${Number(v||0).toLocaleString('fr-FR')} FCFA`;

export default function SellerDashboard({session,shop,activeTab='dashboard',onBack}){
 const[tab,setTab]=useState(activeTab),[products,setProducts]=useState([]),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
 const[title,setTitle]=useState(''),[description,setDescription]=useState(''),[category,setCategory]=useState('E-books & PDF'),[price,setPrice]=useState(''),[free,setFree]=useState(false),[stock,setStock]=useState('0'),[sku,setSku]=useState(''),[file,setFile]=useState(null),[cover,setCover]=useState(null),[imageUrl,setImageUrl]=useState('');
 useEffect(()=>setTab(activeTab||'dashboard'),[activeTab]);
 useEffect(()=>{if(session?.user?.id)loadProducts()},[session?.user?.id]);
 async function loadProducts(){setLoading(true);const{data,error}=await supabase.from('digital_products').select('*').eq('seller_id',session.user.id).order('created_at',{ascending:false});if(error)setMessage(error.message);setProducts(data||[]);setLoading(false)}
 function reset(){setTitle('');setDescription('');setCategory('E-books & PDF');setPrice('');setFree(false);setStock('0');setSku('');setFile(null);setCover(null);setImageUrl('')}
 async function uploadDigital(){
  if(!session?.user?.id||!shop?.id)return setMessage('Votre boutique doit être active avant de publier.');
  if(!title.trim())return setMessage('Indiquez le nom du produit.');
  if(!file)return setMessage('Sélectionnez le fichier à vendre.');
  if(!free&&(!price||Number(price)<0))return setMessage('Indiquez un prix ou activez « Gratuit ».');
  setSaving(true);setMessage('');
  const safe=(file.name||'fichier').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'_');
  const path=`${session.user.id}/${shop.id}/${Date.now()}-${safe}`;
  const up=await supabase.storage.from('product-files').upload(path,file,{upsert:false,contentType:file.type||'application/octet-stream',cacheControl:'3600'});
  if(up.error){setMessage(`Import du fichier impossible : ${up.error.message}`);setSaving(false);return}
  let coverUrl=null;
  if(cover){const ext=(cover.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase()||'jpg';const cp=`${session.user.id}/${shop.id}/cover-${Date.now()}.${ext}`;const cu=await supabase.storage.from('public-assets').upload(cp,cover,{upsert:false,contentType:cover.type,cacheControl:'3600'});if(cu.error){await supabase.storage.from('product-files').remove([path]);setMessage(`Couverture impossible : ${cu.error.message}`);setSaving(false);return}coverUrl=supabase.storage.from('public-assets').getPublicUrl(cp).data?.publicUrl||null}
  const payload={seller_id:session.user.id,shop_id:shop.id,title:title.trim(),description:description.trim(),category,price:free?0:Number(price||0),promo_price:null,stock:Math.max(0,Number(stock)||0),sku:sku.trim()||null,file_url:path,file_type:file.type||null,image_url:coverUrl||imageUrl||null,is_free:free,status:'actif',source_type:'digital'};
  const r=await supabase.from('digital_products').insert(payload).select().single();
  if(r.error){await supabase.storage.from('product-files').remove([path]);setMessage(`Produit non créé : ${r.error.message}`);setSaving(false);return}
  setMessage('Produit numérique publié avec son fichier.');reset();await loadProducts();setSaving(false)
 }
 if(tab!=='products')return <div className="seller-card wide-card"><div className="page-title"><div><span className="eyebrow">ESPACE VENDEUR</span><h2>Produits & gestion du stock</h2><p>Ajoutez et gérez vos produits physiques ou numériques.</p></div><Boxes size={34}/></div><button className="primary" onClick={()=>setTab('products')}>Ajouter un produit</button></div>;
 return <div className="seller-card wide-card"><div className="page-title"><div><span className="eyebrow">CATALOGUE</span><h2>Produits & gestion du stock</h2><p>Importez directement vos PDF, e-books, formations, vidéos, audios, photos, ZIP, APK et autres fichiers.</p></div><PackagePlus size={34}/></div>
  <div className="digital-import-card"><div className="digital-import-head"><Upload/><div><h3>Importer un fichier à vendre</h3><p>Le fichier original est conservé dans le stockage privé PJD Maker et sera livré de manière sécurisée après achat.</p></div></div>
   <div className="form-grid"><label>Nom du produit<input value={title}onChange={e=>setTitle(e.target.value)}placeholder="Ex. Mon e-book"/></label><label>Catégorie<select value={category}onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label className="full-label">Description<textarea rows="4" value={description}onChange={e=>setDescription(e.target.value)}placeholder="Décrivez le contenu du fichier..."/></label><label>Prix (FCFA)<input type="number" min="0" value={price}disabled={free}onChange={e=>setPrice(e.target.value)}/></label><label className="dpu-free"><input type="checkbox" checked={free}onChange={e=>setFree(e.target.checked)}/> Produit gratuit</label><label>Stock<input type="number" min="0" value={stock}onChange={e=>setStock(e.target.value)}/></label><label>SKU<input value={sku}onChange={e=>setSku(e.target.value)}placeholder="Optionnel"/></label></div>
   <label className="dpu-file"><input type="file" onChange={e=>setFile(e.target.files?.[0]||null)}/>{React.createElement(iconFor(file?.type),{size:32})}<div><strong>{file?file.name:'Sélectionner le fichier à vendre'}</strong><small>{file?`${(file.size/1024/1024).toFixed(2)} Mo · ${file.type||'fichier'}`:'PDF · e-book · vidéo · audio · photo · ZIP · APK · autres'}</small></div><Upload size={20}/></label>
   <label className="dpu-cover"><input type="file" accept="image/*" onChange={e=>setCover(e.target.files?.[0]||null)}/><ImageIcon size={20}/><span>{cover?cover.name:'Ajouter une couverture / miniature (facultatif)'}</span></label>
   {message&&<div className="seller-message"><CheckCircle2 size={17}/>{message}<button onClick={()=>setMessage('')}><X size={15}/></button></div>}
   <button className="primary" onClick={uploadDigital} disabled={saving}>{saving?<><Loader2 className="spin"/> Importation...</>:<><Upload size={17}/> Publier et vendre</>}</button>
  </div>
  <div className="seller-card-title"><Boxes/><div><h3>Produits numériques</h3><p>{loading?'Chargement...':`${products.length} produit(s)`}</p></div></div>{products.map(p=><div className="seller-row" key={p.id}><div><b>{p.title}</b><small>{money(p.price)} · {p.file_type||'fichier'}</small></div><span>{p.is_free?'Gratuit':p.status}</span></div>)}
  <style>{`.digital-import-card{border:1px solid #e2e5e8;border-radius:18px;padding:20px;margin-bottom:24px}.digital-import-head{display:flex;gap:12px;align-items:flex-start;margin-bottom:18px}.digital-import-head svg{width:28px;height:28px}.digital-import-head h3{margin:0 0 5px}.digital-import-head p{margin:0;color:#6d737b;font-size:13px}.dpu-file{margin-top:14px;border:2px dashed #cfd4da;border-radius:15px;padding:20px;display:flex;align-items:center;gap:14px;cursor:pointer}.dpu-file input,.dpu-cover input{display:none}.dpu-file div{display:grid;gap:4px;flex:1}.dpu-file small{color:#777}.dpu-cover{margin-top:12px;display:flex;align-items:center;gap:9px;border:1px solid #e0e3e6;border-radius:11px;padding:11px;cursor:pointer}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
 </div>
}
