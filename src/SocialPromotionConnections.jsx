import React,{useEffect,useState}from'react';
import{supabase}from'./lib/supabase';

const providers=[
 ['facebook','📘','Facebook','Page Facebook'],['instagram','📸','Instagram','Compte professionnel'],['tiktok','🎵','TikTok','Compte TikTok'],['youtube','▶️','YouTube','Chaîne YouTube'],['whatsapp','💬','WhatsApp','WhatsApp Business'],['telegram','✈️','Telegram','Canal ou groupe']
];
export default function SocialPromotionConnections({session}){
 const[rows,setRows]=useState([]),[busy,setBusy]=useState(''),[notice,setNotice]=useState('');
 const load=async()=>{if(!session?.user?.id)return;const{data,error}=await supabase.from('social_connections').select('provider,account_name,status,updated_at').eq('user_id',session.user.id);if(error)setNotice(error.message);else setRows(data||[])};
 useEffect(()=>{load()},[session?.user?.id]);
 const row=p=>rows.find(x=>x.provider===p);
 const connect=async p=>{setBusy(p);setNotice('');
   /* OAuth endpoints are deliberately provider-specific. The UI never asks the seller to paste access tokens. */
   const urls={facebook:'/api/social/oauth/facebook',instagram:'/api/social/oauth/instagram',tiktok:'/api/social/oauth/tiktok',youtube:'/api/social/oauth/youtube',whatsapp:'/api/social/oauth/whatsapp',telegram:'/api/social/oauth/telegram'};
   try{const r=await fetch(urls[p],{credentials:'include'});if(!r.ok)throw new Error('OAuth non configuré pour ce réseau');const j=await r.json();if(j.url)window.location.href=j.url;else throw new Error(j.error||'Lien de connexion indisponible')}catch(e){setNotice(`${p}: ${e.message}. Configurez les identifiants OAuth officiels dans Supabase/Vercel avant la connexion.`)}finally{setBusy('')}
 };
 return <section style={{marginTop:18,padding:16,border:'1px solid #e5e7eb',borderRadius:16,background:'#fff'}}><h2 style={{marginTop:0}}>🌐 Réseaux sociaux pour les promotions</h2><p style={{color:'#667085'}}>Connectez vos comptes une seule fois. Après validation d'une promotion, PJD Market peut créer une publication dans la file de partage des comptes réellement connectés.</p>{notice&&<div style={{padding:11,background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:10,marginBottom:10}}>{notice}</div>}<div style={{display:'grid',gap:9}}>{providers.map(([id,icon,name,desc])=>{const r=row(id);return <div key={id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,padding:12,border:'1px solid #eee',borderRadius:12}}><div><b>{icon} {name}</b><small style={{display:'block',color:'#667085'}}>{r?.account_name||desc}</small></div><button disabled={busy===id} onClick={()=>connect(id)} style={{padding:'9px 12px',border:0,borderRadius:9,background:r?.status==='connected'?'#16a34a':'#111',color:'#fff',fontWeight:800}}>{busy===id?'Connexion…':r?.status==='connected'?'✓ Connecté':'Connecter'}</button></div>})}</div><small style={{display:'block',marginTop:12,color:'#667085'}}>Les publications automatiques nécessitent l'autorisation officielle de chaque plateforme. TikTok exige notamment l'autorisation de Content Posting API et des scopes correspondants; Instagram nécessite un compte professionnel et les permissions de publication. citeturn0search0turn0search6</small></section>
}
