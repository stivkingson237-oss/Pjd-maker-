import React,{useEffect,useState}from'react';
import AdminDashboard from'./AdminDashboard.jsx';
import AdminSellerChat from'./AdminSellerChat.jsx';
import ShopVerificationAdmin from'./ShopVerificationAdmin.jsx';
import PromoCodesPage from'./PromoCodesPage.jsx';
import{supabase}from'./lib/supabase';

const ADMIN_UI_CSS=`
.pjd-admin-shell{min-height:100vh;background:#f5f7fa}
.pjd-admin-shell header{position:sticky!important;top:0;z-index:50;min-height:72px;box-sizing:border-box;box-shadow:0 1px 0 rgba(15,23,42,.08)}
.pjd-admin-shell main{max-width:none!important;margin:0!important;padding:24px 28px 110px!important;box-sizing:border-box}
.pjd-admin-shell main>div:has(>button){display:flex!important;flex-direction:column!important;align-items:stretch!important;gap:7px!important;position:fixed!important;left:0!important;top:73px!important;bottom:0!important;width:238px!important;padding:18px 12px 150px!important;margin:0!important;background:#fff!important;border-right:1px solid #e5e7eb!important;overflow-y:auto!important;z-index:40!important;box-shadow:2px 0 16px rgba(15,23,42,.04)!important}
.pjd-admin-shell main>div:has(>button) button{width:100%!important;min-height:44px!important;flex:0 0 auto!important;justify-content:flex-start!important;border-radius:10px!important;padding:10px 12px!important;font-size:13px!important;box-sizing:border-box!important;white-space:normal!important}
.pjd-admin-shell main>div:has(>button) button:last-child{margin:10px 0 0!important}
.pjd-admin-shell main>div:has(>button)+*{margin-left:260px!important;max-width:calc(100% - 260px)!important}
.pjd-admin-shell main>div:has(>button)~section,.pjd-admin-shell main>div:has(>button)~div{max-width:calc(100% - 260px)}
.pjd-admin-shell main section{box-shadow:0 5px 22px rgba(15,23,42,.05)!important;border-radius:16px!important}
.pjd-admin-shell .pjd-admin-tools{position:fixed;left:14px;bottom:18px;z-index:10001;display:flex;flex-direction:column;gap:9px;width:210px;padding:9px;background:#fff;border:1px solid #e5e7eb;border-radius:15px;box-shadow:0 10px 30px rgba(15,23,42,.16);box-sizing:border-box}
.pjd-admin-shell .pjd-admin-tools::before{content:'Actions rapides';display:block;padding:1px 3px 2px;color:#64748b;font:800 10px/1.2 Inter,system-ui,sans-serif;text-transform:uppercase;letter-spacing:.06em}
.pjd-admin-shell .pjd-admin-tools button{display:flex;align-items:center;justify-content:flex-start;width:100%;min-height:42px;border:0;border-radius:10px;padding:10px 12px;font:800 12px/1.2 Inter,system-ui,sans-serif;cursor:pointer;text-align:left;box-sizing:border-box;box-shadow:0 4px 12px rgba(15,23,42,.10);transition:transform .16s ease,box-shadow .16s ease}
.pjd-admin-shell .pjd-admin-tools button:hover{transform:translateY(-1px);box-shadow:0 7px 16px rgba(15,23,42,.15)}
.pjd-admin-shell .verify{background:#111827;color:#fff}.pjd-admin-shell .promo{background:#f97316;color:#fff}.pjd-admin-shell .chat{background:#fff;color:#111827;border:1px solid #dbe1e8!important}
.pjd-admin-shell~div[style*="position:fixed"]{display:none!important}
@media(max-width:900px){
 .pjd-admin-shell header{position:relative!important}
 .pjd-admin-shell main{padding:14px 12px 170px!important}
 .pjd-admin-shell main>div:has(>button){position:sticky!important;top:0!important;left:auto!important;bottom:auto!important;width:100%!important;height:auto!important;flex-direction:row!important;align-items:center!important;overflow-x:auto!important;overflow-y:hidden!important;padding:8px!important;margin:0 0 14px!important;border:1px solid #e5e7eb!important;border-radius:14px!important;box-shadow:0 4px 16px rgba(15,23,42,.06)!important}
 .pjd-admin-shell main>div:has(>button) button{width:auto!important;min-width:max-content!important;justify-content:center!important;white-space:nowrap!important}
 .pjd-admin-shell main>div:has(>button) button:last-child{margin:0!important}
 .pjd-admin-shell main>div:has(>button)+*{margin-left:0!important;max-width:100%!important}
 .pjd-admin-shell main>div:has(>button)~section,.pjd-admin-shell main>div:has(>button)~div{max-width:100%}
 .pjd-admin-shell .pjd-admin-tools{left:10px;right:10px;bottom:10px;width:auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;padding:8px}
 .pjd-admin-shell .pjd-admin-tools::before{grid-column:1/-1;padding:0 2px 1px}
 .pjd-admin-shell .pjd-admin-tools button{min-height:43px;justify-content:center;text-align:center;padding:9px 6px;font-size:11px;line-height:1.15}
}
@media(max-width:560px){.pjd-admin-shell header h1{font-size:20px!important}.pjd-admin-shell header small{font-size:11px!important}.pjd-admin-shell main{padding-left:9px!important;padding-right:9px!important}.pjd-admin-shell main section{padding:13px!important}}
`;

export default function AdminDashboardV2(props){
 const[admin,setAdmin]=useState(false),[chat,setChat]=useState(false),[verify,setVerify]=useState(false),[promo,setPromo]=useState(false),[session,setSession]=useState(null);
 useEffect(()=>{supabase.auth.getSession().then(async({data})=>{setSession(data.session);if(!data.session)return;const[{data:u},{data:p}]=await Promise.all([supabase.from('users').select('role').eq('id',data.session.user.id).maybeSingle(),supabase.from('profiles').select('role').eq('id',data.session.user.id).maybeSingle()]);setAdmin(u?.role==='admin'||String(p?.role||'').toLowerCase()==='admin')})},[]);
 return <div className="pjd-admin-shell">
   <style>{ADMIN_UI_CSS}</style>
   <AdminDashboard {...props}/>
   {admin&&<div className="pjd-admin-tools" aria-label="Actions administrateur">
     <button className="verify" onClick={()=>setVerify(true)}>✓ Vérification des boutiques</button>
     <button className="promo" onClick={()=>setPromo(true)}>🏷️ Codes promo</button>
     <button className="chat" onClick={()=>setChat(true)}>💬 Messages vendeurs</button>
   </div>}
   {verify&&<div style={{position:'fixed',inset:0,zIndex:10000,background:'#fff',overflow:'auto'}}><ShopVerificationAdmin onBack={()=>setVerify(false)}/></div>}
   {promo&&<div style={{position:'fixed',inset:0,zIndex:10000,background:'#fff',overflow:'auto'}}><PromoCodesPage session={session} onBack={()=>setPromo(false)}/></div>}
   {chat&&<div style={{position:'fixed',inset:0,zIndex:10000,background:'#fff',overflow:'auto'}}><AdminSellerChat session={session} mode='admin' onBack={()=>setChat(false)}/></div>}
 </div>
}
