import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import AdminSellerChat from './AdminSellerChat.jsx';

export default function SellerAdminChatLauncher({ session }) {
  const [open, setOpen] = useState(false);
  if (!session?.user?.id) return null;

  return <>
    <div style={{ width:'100%', border:'1px solid #fed7aa', borderRadius:14, padding:14, background:'#fffaf5', boxSizing:'border-box', marginBottom:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
        <span style={{ width:40, height:40, borderRadius:12, background:'#f97316', color:'#fff', display:'grid', placeItems:'center', flex:'0 0 40px' }}><MessageCircle size={20}/></span>
        <div>
          <b style={{ display:'block', color:'#111827', fontSize:15 }}>Messages avec l’administration</b>
          <span style={{ display:'block', color:'#667085', fontSize:12, marginTop:3 }}>Contactez directement l’équipe PJD Market. Seuls le vendeur et l’administration peuvent échanger ici.</span>
        </div>
      </div>
      <button type='button' onClick={() => setOpen(true)} style={{ width:'100%', border:0, borderRadius:11, padding:'12px 14px', background:'#f97316', color:'#fff', fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer' }}>
        <MessageCircle size={18}/> Ouvrir la messagerie
      </button>
    </div>
    {open && <div style={{ position:'fixed', inset:0, zIndex:10000, background:'#fff', overflow:'auto' }}>
      <button type='button' onClick={() => setOpen(false)} style={{ position:'fixed', top:14, right:14, zIndex:10001, border:0, borderRadius:10, padding:10, background:'#111827', color:'#fff', cursor:'pointer' }} aria-label='Fermer la messagerie'><X size={18}/></button>
      <AdminSellerChat session={session} mode='seller' onBack={() => setOpen(false)} />
    </div>}
  </>;
}
