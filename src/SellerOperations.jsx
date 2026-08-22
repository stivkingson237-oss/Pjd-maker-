import React, { useEffect, useState } from 'react';
import { Bell, Truck, Star, Wallet, RefreshCw, PackageCheck, CheckCircle2 } from 'lucide-react';
import { supabase } from './lib/supabase.js';

const money = n => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
const steps = ['pending','confirmed','processing','shipped','delivered'];
const labels = {pending:'En attente',confirmed:'Confirmée',processing:'Préparation',shipped:'Expédiée',delivered:'Livrée',cancelled:'Annulée'};
const card = { background:'#fff', border:'1px solid #e3e6ec', borderRadius:14, padding:16, boxShadow:'0 4px 16px rgba(16,24,40,.04)' };
const input = { width:'100%', boxSizing:'border-box', padding:12, border:'1px solid #d0d5dd', borderRadius:10, background:'#fff' };

export default function SellerOperations({ session, onBack }) {
  const [tab,setTab]=useState('orders'); const [orders,setOrders]=useState([]); const [notifications,setNotifications]=useState([]);
  const [wallet,setWallet]=useState(0); const [withdrawals,setWithdrawals]=useState([]); const [reviews,setReviews]=useState([]);
  const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  const [withdraw,setWithdraw]=useState({amount:'',method:'Mobile Money',destination:''});
  const userId=session?.user?.id;

  const load=async()=>{
    if(!userId)return; setLoading(true); setError('');
    try{
      const [o,n,w,tx,r]=await Promise.all([
        supabase.rpc('get_seller_operations'),
        supabase.from('notifications').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(30),
        supabase.from('withdrawal_requests').select('*').eq('user_id',userId).order('requested_at',{ascending:false}).limit(20),
        supabase.from('wallet_transactions').select('type,amount,status').eq('user_id',userId),
        supabase.from('reviews').select('*').eq('seller_id',userId).order('created_at',{ascending:false}).limit(30)
      ]);
      const err=[o,n,w,tx,r].find(x=>x.error)?.error; if(err)throw err;
      setOrders(o.data||[]); setNotifications(n.data||[]); setWithdrawals(w.data||[]); setReviews(r.data||[]);
      setWallet((tx.data||[]).reduce((s,x)=>['completed','success','pending'].includes(x.status)?s+(['withdrawal','debit'].includes(x.type)?-Number(x.amount):Number(x.amount)):s,0));
    }catch(e){setError(e.message||'Impossible de charger les opérations.');}finally{setLoading(false);}
  };
  useEffect(()=>{load()},[userId]);

  const updateStatus=async(orderId,status)=>{
    setError(''); const {error}=await supabase.rpc('set_seller_order_status',{p_order_id:orderId,p_status:status});
    if(error)setError(error.message); else load();
  };
  const markRead=async id=>{await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('user_id',userId);load()};
  const requestWithdrawal=async e=>{
    e.preventDefault(); const amount=Number(withdraw.amount);
    if(!amount||amount<=0||amount>wallet)return setError('Montant de retrait invalide ou supérieur au solde.');
    if(!withdraw.destination.trim())return setError('Indique le numéro ou compte de destination.');
    const {error}=await supabase.from('withdrawal_requests').insert({user_id:userId,amount,method:withdraw.method,phone:withdraw.destination,currency:'XAF',status:'pending'});
    if(error)return setError(error.message); setWithdraw({amount:'',method:'Mobile Money',destination:''}); load();
  };
  const unread=notifications.filter(n=>!n.read_at).length;
  const tabs=[['orders','Commandes',PackageCheck],['delivery','Livraisons',Truck],['notifications','Notifications',Bell],['reviews','Avis',Star],['wallet','Portefeuille',Wallet]];

  return <div style={{minHeight:'100vh',background:'#f7f8fb',padding:'24px 16px',fontFamily:'Inter,system-ui,sans-serif'}}><div style={{maxWidth:1100,margin:'0 auto'}}>
    <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:18}}><div><h1 style={{margin:0,color:'#101b2d'}}>Centre des opérations</h1><p style={{margin:'6px 0',color:'#667085'}}>Commandes, livraison, avis, notifications et finances</p></div><button onClick={onBack} style={{border:0,borderRadius:10,padding:'10px 14px',background:'#101b2d',color:'#fff'}}>Retour</button></header>
    {error&&<div style={{background:'#fff1f0',color:'#b42318',padding:12,borderRadius:10,marginBottom:12}}>{error}</div>}
    <nav style={{display:'grid',gridTemplateColumns:'repeat(5,minmax(0,1fr))',gap:8,marginBottom:16}}>{tabs.map(([k,l,I])=><button key={k} onClick={()=>setTab(k)} style={{position:'relative',border:'1px solid #e3e6ec',borderRadius:12,padding:'12px 6px',background:tab===k?'#f9631a':'#fff',color:tab===k?'#fff':'#101b2d',fontWeight:800}}><I size={16}/> {l}{k==='notifications'&&unread>0&&<span style={{position:'absolute',top:4,right:5,fontSize:10,background:'#fff',color:'#f9631a',borderRadius:99,padding:'1px 5px'}}>{unread}</span>}</button>)}</nav>
    {loading?<div style={{...card,textAlign:'center'}}><RefreshCw size={18}/> Chargement…</div>:<>
      {tab==='orders'&&<section style={{display:'grid',gap:12}}>{orders.length===0?<Empty text="Aucune commande pour cette boutique."/>:orders.map(o=><div key={o.order_id} style={card}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><div><b>Commande #{String(o.order_id).slice(0,8)}</b><div style={{color:'#667085',fontSize:13}}>{new Date(o.order_created_at).toLocaleString('fr-FR')} · {o.item_count} article(s)</div></div><strong>{money(o.order_total)}</strong></div><div style={{marginTop:12,display:'flex',gap:8,alignItems:'center'}}><span style={{fontWeight:800}}>{labels[o.order_status]||o.order_status}</span><select value={o.order_status} onChange={e=>updateStatus(o.order_id,e.target.value)} style={{...input,maxWidth:190,marginLeft:'auto'}}><option value="pending">En attente</option><option value="confirmed">Confirmée</option><option value="processing">Préparation</option><option value="shipped">Expédiée</option><option value="delivered">Livrée</option><option value="cancelled">Annulée</option></select></div><div style={{display:'flex',gap:4,marginTop:12}}>{steps.map(s=><div key={s} style={{flex:1,height:7,borderRadius:9,background:steps.indexOf(s)<=steps.indexOf(o.order_status)?'#f9631a':'#e3e6ec'}}/> )}</div></div>)}</section>}
      {tab==='delivery'&&<section style={{display:'grid',gap:12}}>{orders.length===0?<Empty text="Aucune livraison."/>:orders.map(o=><div key={o.order_id} style={card}><div><b>Commande #{String(o.order_id).slice(0,8)}</b><div style={{color:'#667085'}}>{o.delivery_address||'Adresse non renseignée'}</div></div><div style={{marginTop:10}}><b>{labels[o.delivery_status]||o.delivery_status||'Pas encore attribuée'}</b> {o.delivered_at&&<span style={{color:'#667085'}}>· livrée le {new Date(o.delivered_at).toLocaleString('fr-FR')}</span>}</div>{o.delivery_fee!=null&&<small style={{color:'#667085'}}>Frais : {money(o.delivery_fee)}</small>}</div>)}</section>}
      {tab==='notifications'&&<section style={{display:'grid',gap:10}}>{notifications.length===0?<Empty text="Aucune notification."/>:notifications.map(n=><button key={n.id} onClick={()=>!n.read_at&&markRead(n.id)} style={{...card,textAlign:'left',border:n.read_at?'1px solid #e3e6ec':'1px solid #f9631a'}}><b>{n.title}</b><div style={{margin:'5px 0',color:'#475467'}}>{n.body||n.message}</div><small style={{color:'#98a2b3'}}>{new Date(n.created_at).toLocaleString('fr-FR')} · {n.read_at?'Lu':'Nouveau'}</small></button>)}</section>}
      {tab==='reviews'&&<section style={{display:'grid',gap:10}}>{reviews.length===0?<Empty text="Aucun avis reçu pour le moment."/>:reviews.map(r=><div key={r.id} style={card}><div style={{color:'#f2a93b'}}>{'★'.repeat(Math.max(0,Math.min(5,r.rating)))}{'☆'.repeat(5-Math.max(0,Math.min(5,r.rating)))}</div><div style={{marginTop:6}}>{r.comment||'Sans commentaire'}</div><small style={{color:'#98a2b3'}}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</small></div>)}</section>}
      {tab==='wallet'&&<section style={{display:'grid',gap:14}}><div style={{...card,background:'#101b2d',color:'#fff'}}><small>Solde calculé</small><div style={{fontSize:30,fontWeight:900,marginTop:5}}>{money(wallet)}</div></div><form onSubmit={requestWithdrawal} style={card}><h3 style={{marginTop:0}}>Demander un retrait</h3><div style={{display:'grid',gap:9}}><input type="number" min="1" max={wallet} placeholder="Montant FCFA" value={withdraw.amount} onChange={e=>setWithdraw({...withdraw,amount:e.target.value})} style={input}/><select value={withdraw.method} onChange={e=>setWithdraw({...withdraw,method:e.target.value})} style={input}><option>Mobile Money</option><option>Virement bancaire</option><option>Autre</option></select><input placeholder="Numéro / compte de destination" value={withdraw.destination} onChange={e=>setWithdraw({...withdraw,destination:e.target.value})} style={input}/><button style={{border:0,borderRadius:10,padding:12,background:'#f9631a',color:'#fff',fontWeight:800}}>Envoyer la demande</button></div></form><div style={card}><h3 style={{marginTop:0}}>Historique des retraits</h3>{withdrawals.length===0?<Empty text="Aucune demande de retrait."/>:withdrawals.map(w=><div key={w.id} style={{padding:'10px 0',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between'}}><span>{money(w.amount)} · {w.method}</span><b>{w.status}</b></div>)}</div></section>}
    </>}
    <button onClick={load} style={{marginTop:18,border:'1px solid #e3e6ec',background:'#fff',borderRadius:10,padding:'10px 14px'}}><RefreshCw size={15}/> Actualiser</button>
  </div></div>;
}
function Empty({text}){return <div style={{background:'#fff',border:'1px solid #e3e6ec',borderRadius:14,padding:16,textAlign:'center',color:'#667085'}}>{text}</div>}
