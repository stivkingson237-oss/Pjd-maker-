import React,{useEffect,useMemo,useState}from'react';
import{ShoppingCart,X,CheckCircle,Loader2,Store,ShieldCheck,Minus,Plus,Trash2,MapPin,Tag,Check}from'lucide-react';
import{createMultivendorOrder,validatePromoCode}from'./lib/multivendorCheckout';
import{supabase}from'./lib/supabase';
import'./multivendor-checkout.css';
const money=v=>`${Number(v||0).toLocaleString('fr-FR')} FCFA`;
const normalizeItem=p=>{const productId=p?.product_id??p?.id;if(!productId)return null;const type=p?.product_type??p?.type??(p?.source_type==='digital'?'digital':'physical');return{...p,id:productId,product_id:productId,name:p?.name??p?.title??'Produit',title:p?.title??p?.name??'Produit',price:Number(p?.price??0),quantity:Math.max(1,Number(p?.quantity??1)),shop_id:p?.shop_id??null,product_type:type}};
const cartCount=c=>c.reduce((n,x)=>n+Math.max(1,Number(x.quantity||1)),0);
function readCart(){try{const raw=JSON.parse(localStorage.getItem('pjd-cart')||'[]');return Array.isArray(raw)?raw.map(normalizeItem).filter(Boolean):[]}catch{return[]}}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function errorMessage(e){return e?.context?.body?.error||e?.message||'Impossible de vérifier le paiement.'}
export default function MultiVendorCheckout({session}){
 const[cart,setCart]=useState(readCart),[open,setOpen]=useState(false),[loading,setLoading]=useState(false),[message,setMessage]=useState(''),[orderId,setOrderId]=useState(null),[paymentRef,setPaymentRef]=useState(null),[method,setMethod]=useState('mobile_money'),[phone,setPhone]=useState(''),[address,setAddress]=useState(''),[promoCode,setPromoCode]=useState(''),[promo,setPromo]=useState(null),[promoLoading,setPromoLoading]=useState(false),[promoMessage,setPromoMessage]=useState('');
 useEffect(()=>{const sync=()=>setCart(readCart());const openCart=()=>{sync();setOpen(true)};const add=e=>{const p=normalizeItem(e.detail);if(!p)return;const current=readCart();const i=current.findIndex(x=>String(x.product_id)===String(p.product_id)&&String(x.product_type||'physical')===String(p.product_type||'physical'));const next=i>=0?current.map((x,n)=>n===i?{...x,quantity:Number(x.quantity||1)+1}:x):[...current,{...p,quantity:1}];localStorage.setItem('pjd-cart',JSON.stringify(next));setCart(next);setOpen(true);window.dispatchEvent(new CustomEvent('pjd-cart-updated',{detail:{cart:next,product:p,count:cartCount(next)}}))};window.addEventListener('storage',sync);window.addEventListener('pjd-cart-updated',sync);window.addEventListener('pjd-open-cart',openCart);window.addEventListener('pjd-add-to-cart',add);return()=>{window.removeEventListener('storage',sync);window.removeEventListener('pjd-cart-updated',sync);window.removeEventListener('pjd-open-cart',openCart);window.removeEventListener('pjd-add-to-cart',add)}},[]);
 useEffect(()=>{if(!session?.user?.id)return;supabase.from('users').select('phone').eq('id',session.user.id).maybeSingle().then(({data})=>{if(data?.phone)setPhone(String(data.phone))})},[session?.user?.id]);
 const subtotal=useMemo(()=>cart.reduce((s,x)=>s+Number(x.price||0)*Number(x.quantity||1),0),[cart]);
 const discount=Number(promo?.discount_amount||0),total=useMemo(()=>Math.max(0,subtotal-discount),[subtotal,discount]),hasPhysical=useMemo(()=>cart.some(x=>String(x.product_type||'').toLowerCase()==='physical'),[cart]);
 function persist(next){const clean=next.map(normalizeItem).filter(Boolean);setCart(clean);localStorage.setItem('pjd-cart',JSON.stringify(clean));window.dispatchEvent(new CustomEvent('pjd-cart-updated',{detail:{cart:clean,count:cartCount(clean)}}));setPromo(null);setPromoMessage('')}
 function changeQty(id,delta){persist(cart.map(x=>String(x.product_id)===String(id)?{...x,quantity:Math.max(1,Number(x.quantity||1)+delta)}:x))}
 function remove(id){persist(cart.filter(x=>String(x.product_id)!==String(id)))}
 async function applyPromo(){if(!session){setPromoMessage('Connectez-vous pour utiliser un code promo.');return}if(!promoCode.trim()){setPromoMessage('Entrez un code promo.');return}setPromoLoading(true);setPromoMessage('');try{const data=await validatePromoCode({code:promoCode,userId:session.user.id,subtotal});setPromo(data);setPromoCode(data.code||promoCode.trim().toUpperCase());setPromoMessage(`Code appliqué : −${money(data.discount_amount)}`)}catch(e){setPromo(null);setPromoMessage(e.message||'Code promo invalide.')}finally{setPromoLoading(false)}}
 async function checkout(){
  if(!session){setMessage('Connectez-vous pour finaliser votre commande.');return}
  if(hasPhysical&&!address.trim()){setMessage('Ajoutez votre adresse de livraison pour les produits physiques.');return}
  if(method==='mobile_money'&&!phone.trim()){setMessage('Entrez le numéro MTN MoMo à débiter.');return}
  if(method==='card'){setMessage('Le paiement Visa/Mastercard n’est pas encore relié à un processeur de paiement. MTN MoMo est actuellement disponible.');return}
  setLoading(true);setMessage('');setPaymentRef(null);
  try{
   const id=await createMultivendorOrder({userId:session.user.id,items:cart,paymentMethod:'mobile_money',promoCode:promo?.code||null});
   setOrderId(id);
   const cleanPhone=phone.replace(/\D/g,'');
   const{data:payment,error}=await supabase.functions.invoke('mtn-request-to-pay',{body:{orderId:id,partyId:cleanPhone}});
   if(error)throw error;
   if(!payment?.success)throw new Error(payment?.error||'MTN MoMo n’a pas accepté la demande de paiement.');
   setPaymentRef(payment.referenceId||null);
   setMessage('Demande MTN MoMo envoyée. Validez le paiement sur votre téléphone.');
   let finalStatus='pending';
   for(let attempt=0;attempt<10;attempt++){
    await sleep(2000);
    const seconds=Math.min((attempt+1)*2,20);
    const{data:status,error:statusError}=await supabase.functions.invoke('order-status',{body:{orderId:id}});
    if(statusError){setMessage(`Vérification du paiement… ${seconds}/20 s`);continue;}
    finalStatus=status?.status||'pending';
    if(finalStatus==='paid'){
      localStorage.removeItem('pjd-cart');setCart([]);setPromo(null);setPromoCode('');
      window.dispatchEvent(new CustomEvent('pjd-cart-updated',{detail:{cart:[],count:0}}));
      setMessage('Paiement confirmé ✅ Votre commande est maintenant payée.');
      break;
    }
    if(finalStatus==='failed'){
      setMessage('Le paiement MTN MoMo a échoué ou a été annulé. Votre commande reste en attente.');
      break;
    }
    setMessage(`Vérification du paiement… ${seconds}/20 s`);
   }
   if(finalStatus==='pending')setMessage('Confirmation MTN en attente. Votre commande reste en attente ; vous pourrez la vérifier depuis Mes commandes.');
  }catch(e){setMessage(errorMessage(e))}finally{setLoading(false)}
 }
 if(!cart.length&&!open)return null;
 return <>{open&&<div className="mv-backdrop"onClick={()=>setOpen(false)}><div className="mv-modal"onClick={e=>e.stopPropagation()}><header><div><span>CHECKOUT PJD MAKER</span><h2>Votre panier</h2><small>{cartCount(cart)} article{cartCount(cart)>1?'s':''}</small></div><button onClick={()=>setOpen(false)}><X/></button></header>{orderId&&!cart.length?<div className="mv-success"><CheckCircle size={48}/><h3>Commande enregistrée</h3><p>Référence : <strong>{orderId}</strong></p>{paymentRef&&<p>Référence MTN : <strong>{paymentRef}</strong></p>}<p>{message}</p><p>La commande ne sera marquée comme payée qu’après confirmation MTN.</p></div>:<><div className="mv-items">{cart.map(x=><div className="mv-item"key={`${x.product_id}-${x.product_type}`}><div><b>{x.name}</b><small>{money(x.price)} · {String(x.product_type||'produit').toLowerCase()==='physical'?'Physique':'Numérique'}</small><div className="mv-qty"><button onClick={()=>changeQty(x.product_id,-1)}><Minus size={14}/></button><strong>{x.quantity}</strong><button onClick={()=>changeQty(x.product_id,1)}><Plus size={14}/></button><button className="mv-remove"onClick={()=>remove(x.product_id)}><Trash2 size={14}/></button></div></div><strong>{money(Number(x.price)*Number(x.quantity||1))}</strong></div>)}</div><div className="mv-promo"style={{margin:'16px 0',padding:12,border:'1px solid rgba(0,0,0,.1)',borderRadius:12}}><label style={{display:'flex',alignItems:'center',gap:7,fontWeight:700,marginBottom:8}}><Tag size={16}/> Code promo</label><div style={{display:'flex',gap:8}}><input value={promoCode}onChange={e=>{setPromoCode(e.target.value.toUpperCase());if(promo)setPromo(null);setPromoMessage('')}}onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();applyPromo()}}}placeholder="Ex. BIENVENUE10"style={{flex:1,minWidth:0}}/><button type="button"onClick={applyPromo}disabled={promoLoading}>{promoLoading?<Loader2 className="spin" size={16}/>:<Check size={16}/>} {promoLoading?'Vérification...':'Appliquer'}</button></div>{promoMessage&&<small style={{display:'block',marginTop:8}}>{promoMessage}</small>}</div><div className="mv-total"><div><span>Sous-total</span><strong>{money(subtotal)}</strong></div>{discount>0&&<div><span>Réduction promo</span><strong>−{money(discount)}</strong></div>}<div><span>Total</span><strong>{money(total)}</strong></div></div>{hasPhysical&&<div className="mv-address"><label><MapPin size={16}/> Adresse de livraison</label><textarea value={address}onChange={e=>setAddress(e.target.value)}placeholder="Quartier, rue, ville, téléphone du destinataire…"rows={3}/></div>}<div className="mv-method"style={{marginTop:16}}><b style={{display:'block',marginBottom:10}}>Paiement</b><div style={{display:'grid',gap:10}}><div role="button"tabIndex={0}onClick={()=>setMethod('mobile_money')}style={{display:'flex',alignItems:'center',gap:12,padding:14,borderRadius:14,border:`2px solid ${method==='mobile_money'?'#f59e0b':'rgba(0,0,0,.1)'}`,background:method==='mobile_money'?'#fff7ed':'#fff',cursor:'pointer'}}><span style={{width:48,height:32,borderRadius:8,background:'#ffcc00',display:'grid',placeItems:'center',fontWeight:900,fontSize:12,color:'#111'}}>MTN</span><span style={{flex:1}}><strong>MTN MoMo</strong><small style={{display:'block',opacity:.65}}>Paiement mobile</small></span><span style={{width:20,height:20,borderRadius:'50%',border:'2px solid #f59e0b',display:'grid',placeItems:'center'}}>{method==='mobile_money'&&<span style={{width:10,height:10,borderRadius:'50%',background:'#f59e0b'}}/>}</span></div><div role="button"tabIndex={0}onClick={()=>setMethod('card')}style={{display:'flex',alignItems:'center',gap:12,padding:14,borderRadius:14,border:`2px solid ${method==='card'?'#2563eb':'rgba(0,0,0,.1)'}`,background:'#fff',cursor:'pointer'}}><span style={{flex:1}}><strong>Carte bancaire</strong><small style={{display:'block',opacity:.65}}>Visa ou Mastercard</small></span><span style={{display:'flex',alignItems:'center',gap:6}}><span style={{fontWeight:900,fontStyle:'italic',fontSize:16,color:'#1d4ed8'}}>VISA</span><span style={{display:'inline-flex',alignItems:'center',fontWeight:900,fontSize:12}}>◉◉</span></span></div></div><div style={{marginTop:10,padding:10,borderRadius:10,background:'#f8fafc',fontSize:12,display:'flex',alignItems:'center',gap:8}}><ShieldCheck size={16}/> MTN MoMo est sélectionné par défaut.</div>{method==='mobile_money'&&<div style={{marginTop:12}}><label>Numéro MTN MoMo<input value={phone}onChange={e=>setPhone(e.target.value)}inputMode="tel"placeholder="6XXXXXXXX"required style={{width:'100%',marginTop:6}}/></label></div>}</div><div className="mv-security"><ShieldCheck size={18}/> Paiement sécurisé — votre demande MTN est envoyée via Supabase.</div><button className="mv-submit"disabled={loading}onClick={checkout}>{loading?<><Loader2 className="spin"/>Vérification du paiement…</>:<><ShoppingCart/>Payer avec MTN MoMo</>}</button></>}{message&&<div className="mv-message">{message}</div>}</div></div>}</>;
}
