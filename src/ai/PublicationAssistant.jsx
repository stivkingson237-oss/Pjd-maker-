import React,{useMemo,useState}from'react';

export default function PublicationAssistant({onClose,onPublished}){
 const [product,setProduct]=useState({title:'',category:'',price:'',description:''});
 const [image,setImage]=useState(null); const [preview,setPreview]=useState(''); const [busy,setBusy]=useState(false); const [ready,setReady]=useState(false);
 const fileChange=e=>{const f=e.target.files?.[0];if(!f)return;setImage(f);setPreview(URL.createObjectURL(f));};
 const generated=useMemo(()=>{const title=product.title.trim()||'Nouveau produit';const desc=product.description.trim()||`Découvrez ${title}, un produit sélectionné pour répondre à vos besoins. Commandez facilement sur PJD Market.`;return {...product,title,description:desc,keywords:[title,product.category,'qualité','PJD Market'].filter(Boolean)}},[product]);
 const prepare=async()=>{setBusy(true);await new Promise(r=>setTimeout(r,500));setReady(true);setBusy(false)};
 const publish=()=>{onPublished?.({...generated,image});onClose?.()};
 return <div className="pjd-ai-overlay"><div className="pjd-ai-card"><div className="pjd-ai-head"><div><span className="pjd-ai-badge">IA PJD MARKET</span><h2>Assistant de publication</h2><p>Préparez votre produit en quelques secondes.</p></div><button onClick={onClose}>✕</button></div>
 <div className="pjd-ai-grid"><label>Photo du produit<input type="file" accept="image/*" onChange={fileChange}/>{preview&&<img src={preview} alt="Aperçu"/>}</label><label>Nom du produit<input value={product.title} onChange={e=>setProduct({...product,title:e.target.value})} placeholder="Ex. Chaussures homme"/></label><label>Catégorie<input value={product.category} onChange={e=>setProduct({...product,category:e.target.value})} placeholder="Ex. Mode"/></label><label>Prix FCFA<input value={product.price} onChange={e=>setProduct({...product,price:e.target.value})} placeholder="Ex. 15000" inputMode="numeric"/></label><label className="full">Description<textarea value={product.description} onChange={e=>setProduct({...product,description:e.target.value})} placeholder="Décrivez brièvement le produit..."/></label></div>
 {ready&&<div className="pjd-ai-result"><b>✓ Fiche prête</b><p>{generated.description}</p><small>Mots-clés : {generated.keywords.join(' · ')}</small></div>}
 <div className="pjd-ai-actions"><button onClick={prepare} disabled={busy}>{busy?'Préparation…':'✨ Préparer avec l’IA'}</button>{ready&&<button className="primary" onClick={publish}>📤 Partager et publier</button>}</div><small className="pjd-ai-note">La publication n’est jamais automatique : le vendeur doit cliquer sur « Partager et publier ».</small>
 </div></div>;
}
