import React,{useEffect,useMemo,useState}from'react';

const CHANNELS=['WhatsApp','Facebook','Instagram','TikTok','SMS'];

async function invokeAI(body){
 const response=await fetch('/api/pjd-ai-marketing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data?.error||`Erreur serveur (${response.status}).`);
 if(data?.error)throw new Error(data.error);
 return data;
}

export default function MarketingAssistant({products=[]}){
 const[productId,setProductId]=useState(products[0]?.id||'');
 const[channels,setChannels]=useState(['WhatsApp','Facebook','Instagram','SMS']);
 const[result,setResult]=useState(null);
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState('');
 const[copied,setCopied]=useState('');
 useEffect(()=>{if(!products.some(p=>p.id===productId))setProductId(products[0]?.id||'')},[products,productId]);
 const product=useMemo(()=>products.find(p=>p.id===productId)||products[0],[products,productId]);
 const toggle=c=>setChannels(x=>x.includes(c)?x.filter(v=>v!==c):[...x,c]);
 const copy=async(text,key)=>{try{await navigator.clipboard.writeText(text);setCopied(key);setTimeout(()=>setCopied(''),1600)}catch{setError('La copie n’est pas disponible sur cet appareil.')}};
 const generate=async()=>{
  if(!product)return setError('Ajoutez d’abord un produit à votre boutique.');
  if(!channels.length)return setError('Sélectionnez au moins un canal.');
  setBusy(true);setError('');setResult(null);
  try{const data=await invokeAI({product,channels});setResult(data.result)}catch(e){setError(e.message||'Impossible de générer la campagne.')}finally{setBusy(false)}
 };
 return <section className="pjd-ai-shell">
  <div className="pjd-ai-shell-header"><div><span className="pjd-ai-badge">IA MARKETING PJD · IA 2</span><h3>🤖 Générateur de campagne</h3><p>Transformez un produit en contenus adaptés à chaque canal, prêts à être publiés après votre validation.</p></div></div>
  {!products.length?<div className="pjd-ai-error">Aucun produit n’est disponible dans votre boutique. Publiez d’abord un produit.</div>:<>
   <div className="pjd-ai-select"><select value={productId} onChange={e=>{setProductId(e.target.value);setResult(null)}} aria-label="Choisir un produit"><option value="">Choisir un produit</option>{products.map(p=><option key={p.id} value={p.id}>{p.title||p.name||'Produit sans nom'} · {Number(p.promo_price??p.price??0).toLocaleString('fr-FR')} FCFA</option>)}</select></div>
   {product&&<div style={{display:'flex',gap:12,alignItems:'center',margin:'10px 0',padding:12,borderRadius:12,background:'#f8fafc'}}>{Array.isArray(product.images)&&product.images[0]&&<img src={product.images[0]} alt="" style={{width:64,height:64,objectFit:'cover',borderRadius:10}}/>}<div><b>{product.title||product.name}</b><div style={{fontSize:13,color:'#667085'}}>{Number(product.promo_price??product.price??0).toLocaleString('fr-FR')} FCFA</div></div></div>}
   <div className="pjd-ai-channels" aria-label="Canaux marketing">{CHANNELS.map(c=><button type="button" className={`pjd-ai-channel ${channels.includes(c)?'active':''}`} key={c} onClick={()=>toggle(c)}>{channels.includes(c)?'✓ ':''}{c}</button>)}</div>
   <button type="button" className="pjd-ai-btn primary" onClick={generate} disabled={busy||!product||!channels.length}>{busy?'Génération…':'✨ Générer la campagne'}</button>
  </>}
  {error&&<div className="pjd-ai-error">{error}</div>}
  {result&&<div className="pjd-ai-result-grid">
   <div className="pjd-ai-result-card"><b>{result.campaign_title||'Campagne PJD Market'}</b><p>{result.strategy||''}</p></div>
   {Object.entries(result.posts||{}).map(([c,text])=><article className="pjd-ai-campaign-card" key={c}><strong>{c}</strong>{result.headlines?.[c]&&<><small style={{display:'block',marginTop:6,color:'#f97316',fontWeight:800}}>ACCROCHE</small><p>{result.headlines[c]}</p></>}<p style={{whiteSpace:'pre-wrap'}}>{text}</p>{result.ctas?.[c]&&<small style={{display:'block',marginBottom:8}}><b>CTA :</b> {result.ctas[c]}</small>}<button type="button" className="pjd-ai-copy" onClick={()=>copy(text,c)}>{copied===c?'✓ Copié':'Copier'}</button></article>)}
   {(result.hashtags||[]).length>0&&<div className="pjd-ai-result-card"><b>Hashtags</b><p>{result.hashtags.join(' ')}</p><button type="button" className="pjd-ai-copy" onClick={()=>copy(result.hashtags.join(' '),'hashtags')}>{copied==='hashtags'?'✓ Copié':'Copier'}</button></div>}
  </div>}
  <small className="pjd-ai-note">Aucune publication ni dépense publicitaire automatique. Le vendeur garde la validation finale.</small>
 </section>;
}
