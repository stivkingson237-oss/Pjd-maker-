import React,{useState}from'react';
import{supabase}from'../lib/supabase';

const W=1536,H=1024,MAX=2*1024*1024;
async function prepareImage(file){
 if(!file?.type?.startsWith('image/'))throw new Error('Sélectionnez une image valide.');
 if(file.size>12*1024*1024)throw new Error('Image trop volumineuse. Maximum 12 Mo.');
 const b=await createImageBitmap(file),target=W/H,source=b.width/b.height;let sx=0,sy=0,sw=b.width,sh=b.height;
 if(source>target){sw=Math.round(b.height*target);sx=Math.round((b.width-sw)/2)}else if(source<target){sh=Math.round(b.width/target);sy=Math.round((b.height-sh)/2)}
 const c=document.createElement('canvas');c.width=W;c.height=H;const ctx=c.getContext('2d');if(!ctx)throw new Error('Préparation image impossible.');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(b,sx,sy,sw,sh,0,0,W,H);b.close?.();
 let blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.88));if(!blob)throw new Error('Compression impossible.');if(blob.size>MAX)blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.78));if(!blob||blob.size>MAX)throw new Error('L’image reste trop volumineuse.');
 return new File([blob],'produit.jpg',{type:'image/jpeg',lastModified:Date.now()});
}
const toDataUrl=f=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(f)});

export default function PublicationAssistant({onClose,onPublished}){
 const[product,setProduct]=useState({title:'',category:'',price:'',description:''});const[image,setImage]=useState(null);const[preview,setPreview]=useState('');const[busy,setBusy]=useState(false);const[ready,setReady]=useState(false);const[error,setError]=useState('');
 const fileChange=async e=>{const f=e.target.files?.[0];if(!f)return;setError('');try{const normalized=await prepareImage(f);setImage(normalized);setPreview(URL.createObjectURL(normalized));setReady(false)}catch(err){setError(err.message||'Image invalide')}};
 const update=k=>e=>setProduct(p=>({...p,[k]:e.target.value}));
 const prepare=async()=>{if(!image){setError('Ajoutez une photo du produit.');return}setBusy(true);setError('');try{const imageData=await toDataUrl(image);const{data,error}=await supabase.functions.invoke('pjd-ai-product',{body:{image_data:imageData,hints:product}});if(error)throw new Error(error.message);if(data?.error)throw new Error(data.error);const r=data.result||{};setProduct(p=>({...p,title:r.title||p.title,category:r.category||p.category,description:r.description||p.description,short_description:r.short_description||'',keywords:r.keywords||[],selling_points:r.selling_points||[],alt_text:r.alt_text||''}));setReady(true)}catch(err){setError(err.message||'Impossible de contacter l’IA.')}finally{setBusy(false)}};
 const publish=async()=>{if(!ready)return;setBusy(true);setError('');try{let imageUrl='';if(image){const path=`${crypto.randomUUID()}.jpg`;const{error:up}=await supabase.storage.from('public-assets').upload(path,image,{contentType:'image/jpeg',upsert:false,cacheControl:'31536000'});if(up)throw new Error(`Photo : ${up.message}`);imageUrl=supabase.storage.from('public-assets').getPublicUrl(path).data.publicUrl}await onPublished?.({...product,imageUrl,image});onClose?.()}catch(err){setError(err.message||'Publication impossible.')}finally{setBusy(false)}};
 return <div className="pjd-ai-overlay"><div className="pjd-ai-card"><div className="pjd-ai-head"><div><span className="pjd-ai-badge">IA PJD MAKER</span><h2>Publication produit intelligente</h2><p>La photo est normalisée en 1536×1024 puis analysée par l’IA pour générer la fiche produit.</p></div><button onClick={onClose}>✕</button></div>
 <div className="pjd-ai-grid"><label>Photo du produit<input type="file" accept="image/*" onChange={fileChange}/>{preview&&<img src={preview} alt="Aperçu produit"/>}<small>Format publication : 1536×1024 · JPEG optimisé</small></label><label>Nom du produit<input value={product.title} onChange={update('title')} placeholder="Ex. Chaussures homme"/></label><label>Catégorie<input value={product.category} onChange={update('category')} placeholder="Ex. Mode"/></label><label>Prix FCFA<input value={product.price} onChange={update('price')} placeholder="Ex. 15000" inputMode="numeric"/></label><label className="full">Description<textarea value={product.description} onChange={update('description')} placeholder="Laissez l’IA rédiger la description à partir de la photo…"/></label></div>
 {error&&<div style={{marginTop:12,padding:12,borderRadius:10,background:'#fee2e2',color:'#991b1b'}}>{error}</div>}
 {ready&&<div className="pjd-ai-result"><b>✓ Fiche générée par l’IA</b><p>{product.description}</p>{product.short_description&&<p><strong>Résumé :</strong> {product.short_description}</p>}<small>Mots-clés : {(product.keywords||[]).join(' · ')}</small>{(product.selling_points||[]).length>0&&<ul>{product.selling_points.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>}
 <div className="pjd-ai-actions"><button onClick={prepare} disabled={busy}>{busy?'Analyse en cours…':'✨ Analyser la photo + générer la fiche'}</button>{ready&&<button className="primary" onClick={publish} disabled={busy}>📤 Enregistrer en brouillon</button>}</div><small className="pjd-ai-note">Aucune publication publique automatique : le vendeur valide l’enregistrement en brouillon.</small></div></div>;
}
