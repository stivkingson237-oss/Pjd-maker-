import React,{useEffect,useState}from"react";
import{Heart,ShoppingCart,Store,User,LogIn,UserPlus,Gift}from"lucide-react";
import MultiVendorCheckout from"./MultiVendorCheckout";

export default function MarketplaceTopNav({session,shop,onOpenAffiliate,onOpenAccount,onOpenCart,onOpenSeller,onOpenAuth}){
 const[cartCount,setCartCount]=useState(0),[cartPulse,setCartPulse]=useState(false),[cartNotice,setCartNotice]=useState("");
 useEffect(()=>{
  const read=()=>{try{const c=JSON.parse(localStorage.getItem("pjd-cart")||"[]");setCartCount(c.reduce((n,x)=>n+Number(x.quantity||0),0))}catch{setCartCount(0)}};
  const added=e=>{read();setCartPulse(true);setTimeout(()=>setCartPulse(false),450);const p=e.detail?.product;setCartNotice(`✓ ${p?.name||p?.title||"Produit"} ajouté au panier`);setTimeout(()=>setCartNotice(""),1800);setTimeout(()=>window.dispatchEvent(new CustomEvent("pjd-open-cart")),60)};
  read();window.addEventListener("storage",read);window.addEventListener("pjd-cart-updated",added);
  const timer=setInterval(read,500);
  return()=>{window.removeEventListener("storage",read);window.removeEventListener("pjd-cart-updated",added);clearInterval(timer)};
 },[]);
 const openShop=()=>{if(shop){window.dispatchEvent(new CustomEvent("pjd-open-shop",{detail:{shopId:shop.id,shop}}));return}onOpenSeller?.(null)};
 return <>
  <MultiVendorCheckout session={session}/>
  <style>{`@keyframes pjdCartPulse{0%{transform:scale(1)}35%{transform:scale(1.16)}65%{transform:scale(.94)}100%{transform:scale(1)}}@keyframes pjdBadgePop{0%{transform:scale(.4);opacity:0}70%{transform:scale(1.12);opacity:1}100%{transform:scale(1);opacity:1}}@keyframes pjdNoticeIn{from{transform:translateY(12px);opacity:0}to{transform:translateY(0);opacity:1}}.pjd-cart-action{position:relative}.pjd-cart-action.pjd-pulse svg{animation:pjdCartPulse .45s ease}.pjd-cart-badge{position:absolute;top:-7px;right:-7px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#f97316;color:#fff;border:2px solid #fff;font:800 11px/16px Inter,system-ui,sans-serif;text-align:center;z-index:3;animation:pjdBadgePop .28s ease}.pjd-cart-notice{position:fixed;right:16px;bottom:18px;z-index:100000;background:#111827;color:#fff;padding:12px 16px;border-radius:14px;box-shadow:0 12px 35px rgba(0,0,0,.25);font:800 14px/1.3 Inter,system-ui,sans-serif;animation:pjdNoticeIn .25s ease}`}</style>
  <div className="pjd-topnav"><div className="pjd-topnav-brand"><b>PJD</b><span>MAKER</span></div><div className="pjd-topnav-actions">
   {session?<>
    <button className="pjd-action"onClick={()=>onOpenAffiliate?.()}><Gift/><span>Affiliation</span></button>
    <button className="pjd-action"onClick={()=>onOpenAccount?.("favorites")}><Heart/><span>Favoris</span></button>
    <button className={`pjd-action pjd-cart-action ${cartPulse?"pjd-pulse":""}`}onClick={onOpenCart}aria-label={`Panier${cartCount?` (${cartCount})`:""}`}><ShoppingCart/>{cartCount>0&&<span className="pjd-cart-badge">{cartCount>99?"99+":cartCount}</span>}<span>Panier</span></button>
    <button className="pjd-action pjd-shop"onClick={openShop}><Store/><span>{shop?"Ma boutique":"Créer ma boutique"}</span></button>
    <button className="pjd-action"onClick={()=>onOpenAccount?.("account")}><User/><span>Mon compte</span></button>
   </>:<>
    <button className="pjd-action"onClick={()=>onOpenAuth?.("login")}><LogIn/><span>Se connecter</span></button>
    <button className="pjd-action pjd-create-shop"onClick={()=>onOpenAuth?.("signup")}><UserPlus/><span>S'inscrire</span></button>
   </>}
  </div></div>
  {cartNotice&&<div className="pjd-cart-notice"role="status">{cartNotice}</div>}
 </>;
}
