import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Send, Store, UserRound, CheckCircle2, Paperclip } from 'lucide-react';
import { supabase } from './lib/supabase';
import './admin-seller-chat.css';

const ADMIN_ID = 'ef5f94b8-8f3b-498b-8b78-a93083053704';

export default function AdminSellerChat({ session, mode = 'seller', onBack }) {
  const [messages, setMessages] = useState([]), [text, setText] = useState('');
  const [loading, setLoading] = useState(true), [sending, setSending] = useState(false), [error, setError] = useState('');
  const [sellers, setSellers] = useState([]), [selected, setSelected] = useState(null);
  const composerRef = useRef(null), bottomRef = useRef(null);
  const me = session?.user?.id, adminMode = mode === 'admin';

  async function load() {
    if (!me) return;
    setLoading(true); setError('');
    const { data: rows, error: e } = await supabase.from('messages').select('id,sender_id,receiver_id,content,attachment_url,read_at,created_at').order('created_at', { ascending: true });
    if (e) { setError(`Impossible de charger les messages : ${e.message}`); setLoading(false); return; }
    const all = rows || [];
    if (adminMode) {
      const { data: shops, error: se } = await supabase.from('shops').select('id,owner_id,shop_name,slug,logo,banner,certification_status,status').not('owner_id','is',null).order('shop_name',{ascending:true});
      if (se) setError(`Impossible de charger les vendeurs : ${se.message}`);
      const ownerIds = (shops || []).map(s => s.owner_id).filter(Boolean);
      let profiles = [];
      if (ownerIds.length) { const { data } = await supabase.from('profiles').select('id,name,email,prenom,phone,telephone,role').in('id', ownerIds); profiles = data || []; }
      const merged = (shops || []).map(shop => { const p = profiles.find(x => x.id === shop.owner_id) || {}; return { id: shop.owner_id, name:p.name, prenom:p.prenom, email:p.email, phone:p.phone||p.telephone, shop, hasMessages:all.some(m => m.sender_id===shop.owner_id || m.receiver_id===shop.owner_id) }; });
      setSellers(merged); if (selected && !merged.some(s=>s.id===selected)) setSelected(null);
    }
    setMessages(all); setLoading(false);
  }
  useEffect(() => { load(); }, [me, adminMode]);
  useEffect(() => { if (!me) return; const channel=supabase.channel(`pjd-admin-chat-${me}`).on('postgres_changes',{event:'*',schema:'public',table:'messages'},load).subscribe(); return()=>{supabase.removeChannel(channel)}; }, [me,adminMode]);
  const other = adminMode ? selected : ADMIN_ID;
  const visible = useMemo(()=>messages.filter(r=>other&&((r.sender_id===me&&r.receiver_id===other)||(r.sender_id===other&&r.receiver_id===me))),[messages,other,me]);
  const selectedSeller=sellers.find(s=>s.id===selected);
  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[visible.length]);
  useEffect(()=>{ if (other) setTimeout(()=>composerRef.current?.focus(),80); },[other]);

  async function send(e) {
    e.preventDefault(); const content=text.trim(); if(!content||!me||!other||sending)return;
    setSending(true); setError('');
    const { error:e2 }=await supabase.from('messages').insert({sender_id:me,receiver_id:other,content});
    if(e2) setError(`Message non envoyé : ${e2.message}`); else { setText(''); await load(); setTimeout(()=>composerRef.current?.focus(),50); }
    setSending(false);
  }
  function chooseSeller(id){ setSelected(id); setText(''); }
  if(!me) return <div className='pjd-chat-page'>Connectez-vous pour accéder à la messagerie.</div>;
  return <div className='pjd-chat-page'>
    <header className='pjd-chat-header'><button onClick={onBack}><ArrowLeft size={17}/> Retour</button><div><span><MessageCircle size={14}/> MESSAGERIE</span><h2>{adminMode?'Messagerie des vendeurs':'Chat avec l’administration'}</h2><p>{adminMode?'Sélectionnez un vendeur puis écrivez directement dans la conversation.':'Échangez directement avec l’administration PJD Market.'}</p></div><button onClick={load} aria-label='Actualiser'>↻</button></header>
    {error&&<div className='pjd-chat-error'>{error}</div>}
    <main className='pjd-chat-layout'>
      {adminMode&&<aside className='pjd-chat-list'>{sellers.length===0?<div className='pjd-chat-empty'>Aucune boutique vendeuse disponible.</div>:sellers.map(s=>{const photo=s.shop?.logo||s.shop?.banner||'';const name=s.shop?.shop_name||s.name||s.prenom||s.email||'Vendeur';const certified=String(s.shop?.certification_status||'').toLowerCase()==='certified';return <button key={s.id} className={selected===s.id?'active':''} onClick={()=>chooseSeller(s.id)}><span className='pjd-seller-avatar'>{photo?<img src={photo} alt={name}/>:<UserRound size={22}/>}</span><span className='pjd-seller-meta'><b>{name}</b><small>{certified?'✓ Boutique certifiée':'Vendeur PJD Market'}{s.hasMessages?' · Conversation':''}</small></span>{certified?<CheckCircle2 size={17}/>:<MessageCircle size={18}/>}</button>})}</aside>}
      <section className='pjd-chat-window'>
        {adminMode&&selectedSeller&&<div className='pjd-chat-contact'><span className='pjd-seller-avatar'>{selectedSeller.shop?.logo?<img src={selectedSeller.shop.logo} alt=''/>:<Store size={20}/>}</span><div><b>{selectedSeller.shop?.shop_name||selectedSeller.name||selectedSeller.prenom||'Vendeur'}</b><small>{selectedSeller.email||selectedSeller.phone||'Conversation vendeur'}</small></div></div>}
        <div className='pjd-chat-messages'>{!other?<div className='pjd-chat-empty'><MessageCircle size={34}/><b>Sélectionnez un vendeur</b><span>Le tableau de discussion apparaîtra ici.</span></div>:loading&&!visible.length?<div className='pjd-chat-empty'>Chargement…</div>:!visible.length?<div className='pjd-chat-empty'><MessageCircle size={30}/><b>Aucun message</b><span>Écrivez votre premier message ci-dessous.</span></div>:visible.map(m=><div key={m.id} className={m.sender_id===me?'mine pjd-chat-bubble':'theirs pjd-chat-bubble'}><div>{m.content}</div><small>{new Date(m.created_at).toLocaleString('fr-FR')}</small></div>)}<div ref={bottomRef}/></div>
        {other&&<form className='pjd-chat-composer' onSubmit={send}><div className='pjd-chat-input-wrap'><button type='button' className='pjd-chat-attach' title='Pièce jointe (bientôt disponible)' onClick={()=>setError('Les pièces jointes seront ajoutées dans une prochaine étape.')}><Paperclip size={18}/></button><input ref={composerRef} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(e)}}} placeholder='Écrire votre message au vendeur…' autoComplete='off'/></div><button type='submit' disabled={!text.trim()||sending}><Send size={17}/>{sending?'Envoi…':'Envoyer'}</button></form>}
      </section>
    </main>
  </div>;
}
