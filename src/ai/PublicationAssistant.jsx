import React,{useEffect,useRef,useState}from'react';
import{supabase}from'../lib/supabase';

const W=1536,H=1024,MAX=2*1024*1024,AI_TIMEOUT=20000;
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
 const[product,setProduct]=useState({title:'',category:'',price:'',description:''});const[image,setImage]=useState(null);const[preview,setPreview]=useState('');const[busy,setBusy]=useState(false);const[ready,setReady]=useState(false);const[error,setError]=useState('');const[status,setStatus]=useState('');const requestRef=useRef(0);const abortRef=useRef(null);
 useEffect(()=>()=>{abortRef.current?.();if(preview)URL.revokeObjectURL(preview)},[preview]);
 const fileChange=async e=>{const f=e.target.files?.[0];if(!f)return;setError('');setStatus('Préparation de la photo…');setReady(false);const id=++requestRef.current;try{const normalized=await prepareImage(f);if(id!==requestRef.current)return;setImage(normalized);setPreview(old=>{if(old)URL.revokeObjectURL(old);return URL.createObjectURL(normalized)});setStatus('Photo prête ✓')}catch(err){if(id===requestRef.current)setError(err.message||'Image invalide');setStatus('')}};
 const update=k=>e=>{setProduct(p=>({...p,[k]:e.target.value}));if(error)setError('');};
 const prepare=async()=>{
  if(!image){setError('Ajoutez une photo du produit.');return}
  if(busy)return;
  const id=++requestRef.current;abortRef.current?.();
  setBusy(true);setReady(false);setError('');setStatus('Analyse de la photo…');
  try{
   const imageData=await toDataUrl(image);if(id!==requestRef.current)return;
   setStatus('L’IA rédige votre fiche…');
   const timeout=new Promise((_,reject)=>setTimeout(()=>reject(new Error('L’IA met trop de temps à répondre. Vous pouvez réessayer ou compléter la fiche manuellement.')),AI_TIMEOUT));
   const ai=supabase.functions.invoke('pjd-ai-product',{body:{image_data:imageData,hints:product}});
   const{data,error}=await Promise.race([ai,timeout]);
   if(id!==requestRef.current)return;
   if(error)throw new Error(error.message);if(data?.error)throw new Error(data.error);
   const r=data.result||{};setProduct(p=>({...p,title:r.title||p.title,category:r.category||p.category,description:r.description||p.description,short_description:r.short_description||'',keywords:r.keywords||[],selling_points:r.selling_points||[],alt_text:r.alt_text||''}));setReady(true);setStatus('Fiche prête ✓');
  }catch(err){if(id===requestRef.current){setError(err.message||'Impossible de contacter l’IA.');setStatus('')}}finally{if(id===requestRef.current)setBusy(false)}
 };
 const publish=async()=>{if(!ready||busy)return;setBusy(true);setError('');setStatus('Enregistrement de la photo…');try{let imageUrl='';if(image){const path=`${crypto.randomUUID()}.jpg`;const{error:up}=await supabase.storage.from('public-assets').upload(path,image,{contentType:'image/jpeg',upsert:false,cacheControl:'31536000'});if(up)throw new Error(`Photo : ${up.message}`);imageUrl=supabase.storage.from('public-assets').getPublicUrl(path).data.publicUrl}setStatus('Enregistrement du produit…');await onPublished?.({...product,imageUrl,image});setStatus('Enregistré ✓');onClose?.()}catch(err){setError(err.message||'Publication impossible.');setStatus('')}finally{setBusy(false)}};
 return <div className="pjd-ai-overlay"><div className="pjd-ai-card"><div className="pjd-ai-head"><div><span className="pjd-ai-badge">IA PJD MAKER</span><h2>Publication produit intelligente</h2><p>La photo est préparée rapidement puis analysée par l’IA.</p></div><button onClick={onClose} disabled={busy}>✕</button></div>
 <div className="pjd-ai-grid"><label>Photo du produit<input type="file" accept="image/*" onChange={fileChange} disabled={busy}/>{preview&&<img src={preview} alt="Aperçu produit"/>}<small>1536×1024 · JPEG optimisé {status&&`· ${status}`}</small></label><label>Nom du produit<input value={product.title} onChange={update('title')} placeholder="Ex. Chaussures homme"/></label><label>Catégorie<input value={product.category} onChange={update('category')} placeholder="Ex. Mode"/></label><label>Prix FCFA<input value={product.price} onChange={update('price')} placeholder="Ex. 15000" inputMode="numeric"/></label><label className="full">Description<textarea value={product.description} onChange={update('description')} placeholder="Laissez l’IA rédiger la description à partir de la photo…"/></label></div>
 {error&&<div style={{marginTop:12,padding:12,borderRadius:10,background:'#fee2e2',color:'#991b1b'}}>{error}<button type="button" onClick={prepare} style={{marginLeft:10}}>Réessayer</button></div>}
 {ready&&<div className="pjd-ai-result"><b>✓ Fiche générée par l’IA</b><p>{product.description}</p>{product.short_description&&<p><strong>Résumé :</strong> {product.short_description}</p>}<small>Mots-clés : {(product.keywords||[]).join(' · ')}</small>{(product.selling_points||[]).length>0&&<ul>{product.selling_points.map((x,i)=><li key={i}>{x}</li>)}</ul>}</div>}
 <div className="pjd-ai-actions"><button onClick={prepare} disabled={busy}>{busy?'Analyse en cours…':'✨ Analyser la photo + générer la fiche'}</button>{ready&&<button className="primary" onClick={publish} disabled={busy}>📤 Enregistrer en brouillon</button>}</div><small className="pjd-ai-note">L’analyse IA ne bloque plus l’interface. Si elle dépasse 20 secondes, vous pouvez réessayer.</small></div></div>;
}
