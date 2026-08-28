import React,{useState}from'react';import{supabase}from'../lib/supabase';
export default function MarketingAssistant({products=[]}){
 const[productId,setProductId]=useState(products[0]?.id||'');const[channels,setChannels]=useState(['WhatsApp','Facebook','Instagram','SMS']);const[result,setResult]=useState(null);const[busy,setBusy]=useState(false);const[error,setError]=useState('');
 const product=products.find(p=>p.id===productId)||products[0];
 const toggle=c=>setChannels(x=>x.includes(c)?x.filter(v=>v!==c):[...x,c]);
 const generate=async()=>{if(!product)return;setBusy(true);setError('');try{const{data,error}=await supabase.functions.invoke('pjd-ai-marketing',{body:{product,channels}});if(error)throw new Error(error.message);if(data?.error)throw new Error(data.error);setResult(data.result)}catch(e){setError(e.message||'Impossible de générer la campagne.')}finally{setBusy(false)}};
 return <section className="pjd-ai-shell"><div className="pjd-ai-shell-header"><div><span className="pjd-ai-badge">IA MARKETING PJD · IA 2</span><h3>🤖 Générateur de campagne</h3><p>Transformez un produit en contenus adaptés à chaque canal, prêts à être publiés après votre validation.</p></div></div>
 <div className="pjd-ai-select"><select value={productId} onChange={e=>setProductId(e.target.value)} aria-label="Choisir un produit"><option value="">Choisir un produit</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} · {Number(p.price||0).toLocaleString('fr-FR')} FCFA</option>)}</select></div>
 <div className="pjd-ai-channels" aria-label="Canaux marketing">{['WhatsApp','Facebook','Instagram','SMS'].map(c=><button className={`pjd-ai-channel ${channels.includes(c)?'active':''}`} key={c} onClick={()=>toggle(c)}>{channels.includes(c)?'✓ ':''}{c}</button>)}</div>
 <button className="pjd-ai-btn primary" onClick={generate} disabled={busy||!product||!channels.length}>{busy?'Génération…':'✨ Générer la campagne'}</button>
 {error&&<div className="pjd-ai-error">{error}</div>}
 {result&&<div className="pjd-ai-result-grid"><div className="pjd-ai-result-card"><b>{result.campaign_title}</b><p>{result.strategy}</p></div>{Object.entries(result.posts||{}).map(([c,text])=><article className="pjd-ai-campaign-card" key={c}><strong>{c}</strong><p>{text}</p><button className="pjd-ai-copy" onClick={()=>navigator.clipboard?.writeText(text)}>Copier</button></article>)}{(result.hashtags||[]).length>0&&<small>Hashtags : {result.hashtags.join(' ')}</small>}</div>}
 <small className="pjd-ai-note">Aucune publication ni dépense publicitaire automatique. Le vendeur garde la validation finale.</small></section>;
}
