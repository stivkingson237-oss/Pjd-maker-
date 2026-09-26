import React,{useEffect,useState}from'react';
import{supabase}from'./lib/supabase';

export default function AdminVisitorProspects({onBack}){
 const[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[selected,setSelected]=useState(null),[message,setMessage]=useState('Bonjour, nous avons remarqué votre activité sur PJD Market. Vous pouvez maintenant vendre vos produits ou proposer vos services directement sur notre plateforme. Créez votre espace vendeur et commencez à publier dès maintenant.'),[sending,setSending]=useState(false),[notice,setNotice]=useState('');
 const load=async()=>{setLoading(true);const{data,error}=await supabase.rpc('get_pjd_admin_prospects');if(error)setNotice(error.message);else setRows(data||[]);setLoading(false)};
 useEffect(()=>{load()},[]);
 const send=async()=>{if(!selected||!message.trim())return;setSending(true);setNotice('');const{error}=await supabase.rpc('send_pjd_admin_prospect_invite',{p_user_id:selected.user_id,p_message:message.trim()});if(error)setNotice(error.message);else{setNotice('Invitation envoyée dans la messagerie/notifications PJD Market.');setSelected(null);await load()}setSending(false)};
 return <div style={{minHeight:'100vh',background:'#f5f7fa',padding:18,fontFamily:'system-ui,sans-serif'}}>
  <div style={{maxWidth:1250,margin:'0 auto'}}>
   <button onClick={onBack} style={{border:0,borderRadius:10,padding:'10px 14px',background:'#111827',color:'#fff',fontWeight:800}}>← Retour</button>
   <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center',margin:'18px 0'}}><div><h1 style={{margin:0}}>👥 Visiteurs avec compte</h1><p style={{color:'#64748b'}}>Uniquement visible par l’administrateur. Les visiteurs anonymes ne sont pas identifiés.</p></div><button onClick={load} style={{padding:'10px 14px',borderRadius:10,border:'1px solid #ddd',background:'#fff'}}>Actualiser</button></div>
   {notice&&<div style={{background:'#fff7ed',padding:12,borderRadius:10,marginBottom:12}}>{notice}</div>}
   {loading?<p>Chargement…</p>:<div style={{display:'grid',gap:10}}>{rows.map(r=><div key={r.user_id} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:14,padding:15,display:'grid',gridTemplateColumns:'1fr auto',gap:12}}>
    <div><strong>{r.name||'Utilisateur PJD Market'}</strong><div style={{fontSize:13,color:'#64748b'}}>{r.email||'—'} · {r.phone||'—'}</div><div style={{fontSize:13,marginTop:6}}>Dernière activité : {r.last_seen_at?new Date(r.last_seen_at).toLocaleString('fr-FR'):'—'} · {r.last_path||'/'}</div><div style={{fontSize:12,marginTop:5}}>{r.facebook_connected?'🔵 Facebook connecté':'Compte PJD Market'} {r.shop_name?' · Boutique : '+r.shop_name:' · Pas encore de boutique'}</div></div>
    <button onClick={()=>setSelected(r)} style={{alignSelf:'center',border:0,borderRadius:10,padding:'11px 14px',background:'#f97316',color:'#fff',fontWeight:900}}>Inviter à vendre</button>
   </div>)}</div>}
   {!loading&&!rows.length&&<div style={{background:'#fff',padding:25,borderRadius:14}}>Aucun visiteur avec compte détecté pour le moment.</div>}
  </div>
  {selected&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',display:'grid',placeItems:'center',padding:18,zIndex:10002}}><div style={{background:'#fff',borderRadius:16,padding:20,maxWidth:620,width:'100%'}}><h2 style={{marginTop:0}}>Inviter {selected.name||'cet utilisateur'} à vendre</h2><p style={{color:'#64748b'}}>Le message sera envoyé uniquement dans PJD Market.</p><textarea value={message} onChange={e=>setMessage(e.target.value)} rows={7} style={{width:'100%',boxSizing:'border-box',padding:12,borderRadius:10,border:'1px solid #ddd',resize:'vertical'}}/><div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:12}}><button onClick={()=>setSelected(null)} style={{padding:'11px 15px',borderRadius:10,border:'1px solid #ddd',background:'#fff'}}>Annuler</button><button disabled={sending} onClick={send} style={{padding:'11px 15px',borderRadius:10,border:0,background:'#f97316',color:'#fff',fontWeight:900}}>{sending?'Envoi…':'Envoyer l’invitation'}</button></div></div></div>}
 </div>
}
