import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Send, Store, UserRound, CheckCircle2, Paperclip, Search, MoreVertical, Smile, CheckCheck, Image as ImageIcon } from 'lucide-react';
import { supabase } from './lib/supabase';
import './admin-seller-chat.css';

const ADMIN_ID = 'ef5f94b8-8f3b-498b-8b78-a93083053704';
const MAX_MESSAGE_LENGTH = 2000;

export default function AdminSellerChat({ session, mode = 'seller', onBack }) {
  const [messages, setMessages] = useState([]), [text, setText] = useState('');
  const [loading, setLoading] = useState(true), [sending, setSending] = useState(false), [error, setError] = useState('');
  const [sellers, setSellers] = useState([]), [selected, setSelected] = useState(null), [search, setSearch] = useState('');
  const [mobileConversation, setMobileConversation] = useState(false);
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
      const merged = (shops || []).map(shop => {
        const p = profiles.find(x => x.id === shop.owner_id) || {};
        const shopMessages = all.filter(m => m.sender_id === shop.owner_id || m.receiver_id === shop.owner_id);
        const last = shopMessages[shopMessages.length - 1];
        const unread = shopMessages.filter(m => m.receiver_id === me && !m.read_at).length;
        return { id: shop.owner_id, name:p.name, prenom:p.prenom, email:p.email, phone:p.phone||p.telephone, shop, hasMessages:shopMessages.length>0, last, unread };
      });
      setSellers(merged); if (selected && !merged.some(s=>s.id===selected)) setSelected(null);
    }
    setMessages(all); setLoading(false);
  }

  useEffect(() => { load(); }, [me, adminMode]);
  useEffect(() => {
    if (!me) return;
    const channel=supabase.channel(`pjd-admin-chat-${me}`).on('postgres_changes',{event:'*',schema:'public',table:'messages'},load).subscribe();
    return()=>{supabase.removeChannel(channel)};
  }, [me,adminMode]);

  const other = adminMode ? selected : ADMIN_ID;
  const visible = useMemo(()=>messages.filter(r=>other&&((r.sender_id===me&&r.receiver_id===other)||(r.sender_id===other&&r.receiver_id===me))),[messages,other,me]);
  const selectedSeller=sellers.find(s=>s.id===selected);
  const filteredSellers=useMemo(()=>sellers.filter(s=>{
    const q=search.trim().toLowerCase();
    if(!q) return true;
    return [s.shop?.shop_name,s.name,s.prenom,s.email,s.phone].filter(Boolean).join(' ').toLowerCase().includes(q);
  }),[sellers,search]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}); },[visible.length]);
  useEffect(()=>{ if (other) setTimeout(()=>composerRef.current?.focus(),80); },[other]);

  async function send(e) {
    e.preventDefault();
    const content=text.trim().slice(0,MAX_MESSAGE_LENGTH);
    if(!content||!me||!other||sending)return;
    setSending(true); setError('');
    const { error:e2 }=await supabase.from('messages').insert({sender_id:me,receiver_id:other,content});
    if(e2) setError(`Message non envoyé : ${e2.message}`); else { setText(''); await load(); setTimeout(()=>composerRef.current?.focus(),50); }
    setSending(false);
  }

  function chooseSeller(id){ setSelected(id); setText(''); setMobileConversation(true); }
  function backToList(){ setMobileConversation(false); }
  function insertEmoji(){ setText(v=>(v ? `${v} 🙂` : '🙂')); setTimeout(()=>composerRef.current?.focus(),50); }

  if(!me) return <div className='pjd-chat-page'>Connectez-vous pour accéder à la messagerie.</div>;

  const contactName=adminMode ? (selectedSeller?.shop?.shop_name||selectedSeller?.name||selectedSeller?.prenom||'Vendeur') : 'Administration PJD Market';
  const contactPhoto=adminMode ? (selectedSeller?.shop?.logo||selectedSeller?.shop?.banner||'') : '';

  return <div className={`pjd-chat-page ${mobileConversation?'pjd-mobile-conversation':''}`}>
    <header className='pjd-chat-header'>
      <button onClick={onBack} className='pjd-chat-back'><ArrowLeft size={17}/> Retour</button>
      <div><span><MessageCircle size={14}/> PJD MARKET · MESSAGERIE</span><h2>{adminMode?'Messages vendeurs':'Chat avec l’administration'}</h2><p>Une messagerie rapide, claire et en temps réel.</p></div>
      <button onClick={load} aria-label='Actualiser' className='pjd-chat-refresh'>↻</button>
    </header>
    {error&&<div className='pjd-chat-error'>{error}</div>}

    <main className='pjd-chat-layout'>
      {adminMode&&<aside className='pjd-chat-list'>
        <div className='pjd-chat-list-top'><div><b>Discussions</b><small>{sellers.length} vendeur{sellers.length>1?'s':''}</small></div><button type='button' aria-label='Options'><MoreVertical size={19}/></button></div>
        <label className='pjd-chat-search'><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder='Rechercher une conversation…'/></label>
        <div className='pjd-chat-list-scroll'>
          {filteredSellers.length===0?<div className='pjd-chat-empty small'>Aucune conversation trouvée.</div>:filteredSellers.map(s=>{
            const photo=s.shop?.logo||s.shop?.banner||''; const name=s.shop?.shop_name||s.name||s.prenom||s.email||'Vendeur';
            const certified=String(s.shop?.certification_status||'').toLowerCase()==='certified';
            return <button key={s.id} className={`pjd-chat-person ${selected===s.id?'active':''}`} onClick={()=>chooseSeller(s.id)}>
              <span className='pjd-seller-avatar'>{photo?<img src={photo} alt={name}/>:<UserRound size={21}/>}<i className='pjd-online-dot'/></span>
              <span className='pjd-seller-meta'><b>{name}</b><small>{s.last?.content||'Démarrer une nouvelle conversation'}</small></span>
              <span className='pjd-person-right'>{s.last&&<time>{new Date(s.last.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</time>}{s.unread>0&&<em>{s.unread>99?'99+':s.unread}</em>}{certified&&!s.unread&&<CheckCircle2 size={15}/>}</span>
            </button>;
          })}
        </div>
      </aside>}

      <section className='pjd-chat-window'>
        {other&&<div className='pjd-chat-contact'>
          <button type='button' className='pjd-mobile-only' onClick={backToList}><ArrowLeft size={19}/></button>
          <span className='pjd-seller-avatar'>{contactPhoto?<img src={contactPhoto} alt=''/ >:<Store size={20}/>}<i className='pjd-online-dot'/></span>
          <div><b>{contactName}</b><small>{adminMode?(selectedSeller?.email||selectedSeller?.phone||'Vendeur PJD Market'):'Administration · PJD Market'}</small><span className='pjd-online-label'>● En ligne</span></div>
          <button type='button' className='pjd-contact-more' aria-label='Options'><MoreVertical size={20}/></button>
        </div>}

        <div className='pjd-chat-messages'>
          {!other?<div className='pjd-chat-welcome'><div className='pjd-welcome-icon'><MessageCircle size={34}/></div><b>Vos messages PJD Market</b><span>Sélectionnez un vendeur pour continuer la conversation.</span></div>:
          loading&&!visible.length?<div className='pjd-chat-empty'>Chargement…</div>:
          !visible.length?<div className='pjd-chat-welcome'><div className='pjd-welcome-icon'><MessageCircle size={30}/></div><b>Nouvelle conversation</b><span>Écrivez votre premier message ci-dessous.</span></div>:
          visible.map((m,i)=>{const mine=m.sender_id===me; const prev=visible[i-1]; const same=prev&&prev.sender_id===m.sender_id; return <div key={m.id} className={`pjd-message-row ${mine?'mine':'theirs'} ${same?'same-sender':''}`}><div className='pjd-chat-bubble'>{m.content&&<div className='pjd-message-text'>{m.content}</div>}{m.attachment_url&&<a className='pjd-attachment' href={m.attachment_url} target='_blank' rel='noreferrer'><ImageIcon size={16}/> Pièce jointe</a>}<div className='pjd-message-meta'><time>{new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</time>{mine&&<CheckCheck size={14} className={m.read_at?'read':''}/>}</div></div></div>})}
          <div ref={bottomRef}/>
        </div>

        {other&&<form className='pjd-chat-composer' onSubmit={send}>
          <button type='button' className='pjd-composer-icon' title='Pièce jointe' onClick={()=>setError('Les pièces jointes seront activées avec l’envoi sécurisé de fichiers.')}><Paperclip size={19}/></button>
          <div className='pjd-chat-input-wrap'><input ref={composerRef} maxLength={MAX_MESSAGE_LENGTH} value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send(e)}}} placeholder='Écrire un message…' autoComplete='off'/><button type='button' className='pjd-composer-emoji' onClick={insertEmoji} aria-label='Ajouter un emoji'><Smile size={19}/></button></div>
          {text.trim()?<button type='submit' className='pjd-send-circle' disabled={sending} aria-label='Envoyer'><Send size={18}/></button>:<button type='button' className='pjd-send-circle idle' onClick={insertEmoji} aria-label='Ajouter un emoji'><Smile size={18}/></button>}
        </form>}
      </section>
    </main>
  </div>;
}
