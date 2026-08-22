import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Truck, Star, Wallet, RefreshCw, CheckCircle2, Clock3, PackageCheck } from 'lucide-react';
import { supabase } from './lib/supabase.js';

const money = n => `${Number(n || 0).toLocaleString('fr-FR')} FCFA`;
const deliverySteps = ['pending','assigned','picked_up','in_transit','delivered'];

export default function SellerOperations({ session, onBack }) {
  const [tab, setTab] = useState('delivery');
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [wallet, setWallet] = useState(0);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [withdraw, setWithdraw] = useState({ amount:'', method:'Mobile Money', destination:'' });

  const userId = session?.user?.id;

  const load = async () => {
    if (!userId) return;
    setLoading(true); setError('');
    try {
      const [n, w, d, tx] = await Promise.all([
        supabase.from('notifications').select('*').eq('user_id', userId).order('created_at',{ascending:false}).limit(30),
        supabase.from('withdrawal_requests').select('*').eq('user_id', userId).order('requested_at',{ascending:false}).limit(20),
        supabase.from('deliveries').select('*').eq('customer_id', userId).order('created_at',{ascending:false}).limit(30),
        supabase.from('wallet_transactions').select('type,amount,status').eq('user_id', userId)
      ]);
      const firstError = [n,w,d,tx].find(x=>x.error)?.error;
      if (firstError) throw firstError;
      setNotifications(n.data || []); setWithdrawals(w.data || []); setOrders(d.data || []);
      const balance = (tx.data || []).reduce((sum, r) => {
        if (!['completed','success','pending'].includes(r.status)) return sum;
        return sum + (['withdrawal','debit'].includes(r.type) ? -Number(r.amount) : Number(r.amount));
      },0);
      setWallet(balance);
    } catch (e) { setError(e.message || 'Impossible de charger les opérations.'); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, [userId]);

  const markRead = async id => {
    await supabase.from('notifications').update({read_at:new Date().toISOString()}).eq('id',id).eq('user_id',userId);
    setNotifications(v=>v.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n));
  };

  const requestWithdrawal = async e => {
    e.preventDefault(); setError('');
    const amount = Number(withdraw.amount);
    if (!amount || amount <= 0 || amount > wallet) return setError('Montant de retrait invalide ou supérieur au solde.');
    if (!withdraw.destination.trim()) return setError('Indique le numéro ou compte de destination.');
    const { error } = await supabase.from('withdrawal_requests').insert({
      user_id:userId, amount, method:withdraw.method, phone:withdraw.destination, currency:'XAF', status:'pending'
    });
    if (error) return setError(error.message);
    setWithdraw({amount:'',method:'Mobile Money',destination:''}); await load();
  };

  const tabs = [
    ['delivery','Livraisons',Truck], ['notifications','Notifications',Bell], ['reviews','Avis',Star], ['wallet','Portefeuille',Wallet]
  ];
  const unread = notifications.filter(n=>!n.read_at).length;
  const statusLabel = {pending:'En attente',assigned:'Attribuée',picked_up:'Récupérée',in_transit:'En transit',delivered:'Livrée'};

  return <div style={{minHeight:'100vh',background:'#f7f8fb',padding:'24px 16px',fontFamily:'Inter,system-ui,sans-serif'}}>
    <div style={{maxWidth:1100,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:18}}>
        <div><h1 style={{margin:0,color:'#101b2d'}}>Centre des opérations</h1><p style={{margin:'6px 0',color:'#667085'}}>Livraison, notifications, avis et finances vendeur</p></div>
        <button onClick={onBack} style={{border:0,borderRadius:10,padding:'10px 14px',background:'#101b2d',color:'#fff'}}>Retour</button>
      </div>
      {error && <div style={{background:'#fff1f0',color:'#b42318',padding:12,borderRadius:10,marginBottom:12}}>{error}</div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,minmax(0,1fr))',gap:10,marginBottom:16}}>
        {tabs.map(([key,label,Icon])=><button key={key} onClick={()=>setTab(key)} style={{position:'relative',border:'1px solid #e3e6ec',borderRadius:12,padding:'12px 8px',background:tab===key?'#f9631a':'#fff',color:tab===key?'#fff':'#101b2d',fontWeight:800}}><Icon size={17}/> {label}{key==='notifications'&&unread>0&&<span style={{position:'absolute',top:5,right:7,fontSize:11,background:'#fff',color:'#f9631a',borderRadius:99,padding:'1px 5px'}}>{unread}</span>}</button>)}
      </div>
      {loading && <div style={{background:'#fff',padding:20,borderRadius:14,textAlign:'center'}}><RefreshCw size={18} style={{verticalAlign:'middle'}}/> Chargement…</div>}
      {!loading && tab==='delivery' && <section style={{display:'grid',gap:12}}>{orders.length===0?<Empty text="Aucune livraison associée à ce compte."/>:orders.map(d=><div key={d.id} style={card}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><div><b>Livraison #{String(d.id).slice(0,8)}</b><div style={{color:'#667085',fontSize:13}}>{d.delivery_address || 'Adresse non renseignée'}</div></div><b>{money(d.fee)}</b></div><div style={{display:'flex',gap:5,marginTop:14}}>{deliverySteps.map(s=><div key={s} style={{flex:1,height:7,borderRadius:9,background:deliverySteps.indexOf(s)<=deliverySteps.indexOf(d.status)?'#f9631a':'#e3e6ec'}}/> )}</div><div style={{marginTop:8,color:'#667085'}}><PackageCheck size={15} style={{verticalAlign:'middle'}}/> {statusLabel[d.status] || d.status}</div></div>)}</section>}
      {!loading && tab==='notifications' && <section style={{display:'grid',gap:10}}>{notifications.length===0?<Empty text="Aucune notification."/>:notifications.map(n=><button key={n.id} onClick={()=>!n.read_at&&markRead(n.id)} style={{...card,textAlign:'left',border:n.read_at?'1px solid #e3e6ec':'1px solid #f9631a',background:'#fff'}}><b>{n.title}</b><div style={{margin:'5px 0',color:'#475467'}}>{n.body || n.message}</div><small style={{color:'#98a2b3'}}>{new Date(n.created_at).toLocaleString('fr-FR')} {n.read_at?'· Lu':'· Nouveau'}</small></button>)}</section>}
      {!loading && tab==='reviews' && <Reviews userId={userId}/>} 
      {!loading && tab==='wallet' && <section style={{display:'grid',gap:14}}><div style={{...card,background:'#101b2d',color:'#fff'}}><small>Solde calculé</small><div style={{fontSize:30,fontWeight:900,marginTop:5}}>{money(wallet)}</div></div><form onSubmit={requestWithdrawal} style={card}><h3 style={{marginTop:0}}>Demander un retrait</h3><div style={{display:'grid',gap:9}}><input type="number" min="1" max={wallet} placeholder="Montant FCFA" value={withdraw.amount} onChange={e=>setWithdraw({...withdraw,amount:e.target.value})} style={input}/><select value={withdraw.method} onChange={e=>setWithdraw({...withdraw,method:e.target.value})} style={input}><option>Mobile Money</option><option>Virement bancaire</option><option>Autre</option></select><input placeholder="Numéro / compte de destination" value={withdraw.destination} onChange={e=>setWithdraw({...withdraw,destination:e.target.value})} style={input}/><button style={{border:0,borderRadius:10,padding:12,background:'#f9631a',color:'#fff',fontWeight:800}}>Envoyer la demande</button></div></form><div style={card}><h3 style={{marginTop:0}}>Historique des retraits</h3>{withdrawals.length===0?<Empty text="Aucune demande de retrait."/>:withdrawals.map(w=><div key={w.id} style={{padding:'10px 0',borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between'}}><span>{money(w.amount)} · {w.method}</span><b>{w.status}</b></div>)}</div></section>}
      <button onClick={load} style={{marginTop:18,border:'1px solid #e3e6ec',background:'#fff',borderRadius:10,padding:'10px 14px'}}><RefreshCw size={15} style={{verticalAlign:'middle'}}/> Actualiser</button>
    </div>
  </div>;
}

const card={background:'#fff',border:'1px solid #e3e6ec',borderRadius:14,padding:16,boxShadow:'0 4px 16px rgba(16,24,40,.04)'};
const input={width:'100%',boxSizing:'border-box',padding:12,border:'1px solid #d0d5dd',borderRadius:10,background:'#fff'};
function Empty({text}){return <div style={{...card,textAlign:'center',color:'#667085'}}>{text}</div>}
function Reviews({userId}){const [rows,setRows]=useState([]);useEffect(()=>{supabase.from('reviews').select('*').eq('seller_id',userId).order('created_at',{ascending:false}).limit(30).then(({data})=>setRows(data||[]));},[userId]);return <section style={{display:'grid',gap:10}}>{rows.length===0?<Empty text="Aucun avis reçu pour le moment."/>:rows.map(r=><div key={r.id} style={card}><div style={{color:'#f2a93b'}}>{'★'.repeat(Math.max(0,Math.min(5,r.rating)))}{'☆'.repeat(5-Math.max(0,Math.min(5,r.rating)))}</div><div style={{marginTop:6}}>{r.comment||'Sans commentaire'}</div><small style={{color:'#98a2b3'}}>{new Date(r.created_at).toLocaleDateString('fr-FR')}</small></div>)}</section>}
