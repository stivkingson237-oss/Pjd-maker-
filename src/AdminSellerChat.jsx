import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, MessageCircle, Send, Store, UserRound } from 'lucide-react';
import { supabase } from './lib/supabase';
import './admin-seller-chat.css';

const ADMIN_ID = 'ef5f94b8-8f3b-498b-8b78-a93083053704';

export default function AdminSellerChat({ session, mode = 'seller', onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sellers, setSellers] = useState([]);
  const [selected, setSelected] = useState(null);
  const me = session?.user?.id;
  const adminMode = mode === 'admin';

  async function load() {
    if (!me) return;
    setLoading(true);
    setError('');
    const { data: rows, error: e } = await supabase
      .from('messages')
      .select('id,sender_id,receiver_id,content,attachment_url,read_at,created_at')
      .order('created_at', { ascending: true });
    if (e) {
      setError(`Impossible de charger les messages : ${e.message}`);
      setMessages([]);
      setLoading(false);
      return;
    }

    const allMessages = rows || [];
    if (adminMode) {
      const { data: profiles, error: pe } = await supabase
        .from('profiles')
        .select('id,name,email,prenom,role,store_id')
        .eq('role', 'seller')
        .order('name', { ascending: true });

      if (pe) {
        setError(`Impossible de charger les vendeurs : ${pe.message}`);
        setSellers([]);
      } else {
        const sellerRows = profiles || [];
        const ownerIds = sellerRows.map(s => s.id).filter(Boolean);
        let shops = [];
        if (ownerIds.length) {
          const { data: shopRows, error: se } = await supabase
            .from('shops')
            .select('id,owner_id,shop_name,slug,logo,banner,certification_status')
            .in('owner_id', ownerIds);
          if (se) setError(`Impossible de charger les boutiques : ${se.message}`);
          shops = shopRows || [];
        }
        const merged = sellerRows.map(s => ({
          ...s,
          shop: shops.find(x => x.owner_id === s.id) || null,
          hasMessages: allMessages.some(m => m.sender_id === s.id || m.receiver_id === s.id)
        }));
        setSellers(merged);
        if (selected && !merged.some(s => s.id === selected)) setSelected(null);
      }
    }
    setMessages(allMessages);
    setLoading(false);
  }

  useEffect(() => { load(); }, [me, adminMode]);

  useEffect(() => {
    if (!me) return;
    const channel = supabase
      .channel(`pjd-admin-chat-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [me, adminMode]);

  const other = adminMode ? selected : ADMIN_ID;
  const visible = useMemo(() => messages.filter(r => other && ((r.sender_id === me && r.receiver_id === other) || (r.sender_id === other && r.receiver_id === me))), [messages, other, me]);
  const selectedSeller = sellers.find(s => s.id === selected);

  async function send(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !me || !other) return;
    setError('');
    const { error: e2 } = await supabase.from('messages').insert({ sender_id: me, receiver_id: other, content });
    if (e2) {
      setError(`Message non envoyé : ${e2.message}`);
      return;
    }
    setText('');
    await load();
  }

  if (!me) return <div className='pjd-chat-page'>Connectez-vous pour accéder à la messagerie.</div>;

  return <div className='pjd-chat-page'>
    <header className='pjd-chat-header'>
      <button onClick={onBack}><ArrowLeft size={17}/> Retour</button>
      <div>
        <span><MessageCircle size={14}/> MESSAGERIE</span>
        <h2>{adminMode ? 'Messagerie des vendeurs' : 'Chat avec l’administration'}</h2>
        <p>{adminMode ? 'Tous les vendeurs sont disponibles ici. Cliquez sur un vendeur pour discuter.' : 'Échangez directement avec l’administration PJD Market.'}</p>
      </div>
      <button onClick={load} aria-label='Actualiser'>↻</button>
    </header>
    {error && <div className='pjd-chat-error'>{error}</div>}
    <main className='pjd-chat-layout'>
      {adminMode && <aside className='pjd-chat-list'>
        {sellers.length === 0 ? <div className='pjd-chat-empty'>Aucun vendeur disponible.</div> : sellers.map(s => {
          const photo = s.shop?.logo || s.shop?.banner || '';
          const name = s.shop?.shop_name || s.name || s.prenom || s.email || 'Vendeur';
          return <button key={s.id} className={selected === s.id ? 'active' : ''} onClick={() => setSelected(s.id)}>
            <span className='pjd-seller-avatar'>{photo ? <img src={photo} alt={name}/> : <UserRound size={22}/>}</span>
            <span className='pjd-seller-meta'><b>{name}</b><small>{s.shop?.certification_status === 'certified' ? '✓ Boutique certifiée' : 'Vendeur PJD Market'}{s.hasMessages ? ' · Conversation' : ''}</small></span>
            <MessageCircle size={18}/>
          </button>;
        })}
      </aside>}
      <section className='pjd-chat-window'>
        {adminMode && selectedSeller && <div className='pjd-chat-contact'>
          <span className='pjd-seller-avatar'>{selectedSeller.shop?.logo ? <img src={selectedSeller.shop.logo} alt=''/> : <Store size={20}/>}</span>
          <div><b>{selectedSeller.shop?.shop_name || selectedSeller.name || selectedSeller.prenom || 'Vendeur'}</b><small>{selectedSeller.email || selectedSeller.phone || ''}</small></div>
        </div>}
        <div className='pjd-chat-messages'>
          {!other ? <div className='pjd-chat-empty'>Sélectionnez un vendeur pour voir la conversation.</div> : loading && !visible.length ? <div className='pjd-chat-empty'>Chargement…</div> : !visible.length ? <div className='pjd-chat-empty'>Aucun message. Commencez la conversation.</div> : visible.map(m => <div key={m.id} className={m.sender_id === me ? 'mine pjd-chat-bubble' : 'theirs pjd-chat-bubble'}><div>{m.content}</div><small>{new Date(m.created_at).toLocaleString('fr-FR')}</small></div>)}
        </div>
        {other && <form className='pjd-chat-composer' onSubmit={send}><input value={text} onChange={e => setText(e.target.value)} placeholder='Écrire un message…'/><button disabled={!text.trim()}><Send size={17}/> Envoyer</button></form>}
      </section>
    </main>
  </div>;
}
