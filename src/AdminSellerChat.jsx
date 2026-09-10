import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, Send } from 'lucide-react';
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
    const { data, error: e } = await supabase
      .from('messages')
      .select('id,sender_id,receiver_id,content,read_at,created_at')
      .order('created_at', { ascending: true });
    if (e) {
      setError(`Impossible de charger les messages : ${e.message}`);
      setMessages([]);
      setLoading(false);
      return;
    }
    const rows = data || [];
    if (adminMode) {
      const ids = [...new Set(rows.flatMap(r => [r.sender_id, r.receiver_id]).filter(id => id && id !== me))];
      if (ids.length) {
        const { data: profiles, error: pe } = await supabase
          .from('profiles')
          .select('id,name,email,prenom,role,store_id')
          .in('id', ids);
        if (pe) setError(`Impossible de charger les vendeurs : ${pe.message}`);
        setSellers(profiles || []);
      } else {
        setSellers([]);
      }
    }
    setMessages(rows);
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
  const visible = messages.filter(r => other && ((r.sender_id === me && r.receiver_id === other) || (r.sender_id === other && r.receiver_id === me)));

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
      <div><span><MessageCircle size={14}/> MESSAGERIE</span><h2>{adminMode ? 'Messages des vendeurs' : 'Chat avec l’administration'}</h2><p>{adminMode ? 'Répondez aux vendeurs PJD Market.' : 'Échangez directement avec l’administration PJD Market.'}</p></div>
      <button onClick={load}>↻</button>
    </header>
    {error && <div className='pjd-chat-error'>{error}</div>}
    <main className='pjd-chat-layout'>
      {adminMode && <aside className='pjd-chat-list'>
        {sellers.length === 0 ? <div className='pjd-chat-empty'>Aucun vendeur n’a encore envoyé de message.</div> : sellers.map(s => <button key={s.id} className={selected === s.id ? 'active' : ''} onClick={() => setSelected(s.id)}><b>🏪</b><span>{s.name || s.prenom || s.email || 'Vendeur'}</span></button>)}
      </aside>}
      <section className='pjd-chat-window'>
        <div className='pjd-chat-messages'>
          {!other ? <div className='pjd-chat-empty'>Sélectionnez un vendeur pour voir la conversation.</div> : loading && !visible.length ? <div className='pjd-chat-empty'>Chargement…</div> : !visible.length ? <div className='pjd-chat-empty'>Aucun message. Commencez la conversation.</div> : visible.map(m => <div key={m.id} className={m.sender_id === me ? 'mine pjd-chat-bubble' : 'theirs pjd-chat-bubble'}><div>{m.content}</div><small>{new Date(m.created_at).toLocaleString('fr-FR')}</small></div>)}
        </div>
        {other && <form className='pjd-chat-composer' onSubmit={send}><input value={text} onChange={e => setText(e.target.value)} placeholder='Écrire un message…'/><button disabled={!text.trim()}><Send size={17}/> Envoyer</button></form>}
      </section>
    </main>
  </div>;
}
