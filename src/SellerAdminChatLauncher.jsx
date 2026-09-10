import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import AdminSellerChat from './AdminSellerChat.jsx';

export default function SellerAdminChatLauncher({ session }) {
  const [open, setOpen] = useState(false);
  if (!session?.user?.id) return null;
  return <>
    <button type='button' onClick={() => setOpen(true)} style={{ width:'100%', border:0, borderRadius:12, padding:14, background:'#fff7ed', color:'#c2410c', fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', gap:8, cursor:'pointer' }}>
      <MessageCircle size={18}/> Chat avec l’administration
    </button>
    {open && <div style={{ position:'fixed', inset:0, zIndex:10000, background:'#fff', overflow:'auto' }}>
      <button type='button' onClick={() => setOpen(false)} style={{ position:'fixed', top:14, right:14, zIndex:10001, border:0, borderRadius:10, padding:10, background:'#111827', color:'#fff', cursor:'pointer' }}><X size={18}/></button>
      <AdminSellerChat session={session} mode='seller' onBack={() => setOpen(false)} />
    </div>}
  </>;
}
