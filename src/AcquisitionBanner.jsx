import React from "react";
import { Store, Users, Share2, ArrowRight, Sparkles } from "lucide-react";

export default function AcquisitionBanner({ onSell, onAffiliate }) {
  const share = async () => {
    const url = window.location.origin;
    const text = "Découvre PJD Market : achète, vends et développe ta boutique en ligne depuis ton téléphone.";
    try {
      if (navigator.share) {
        await navigator.share({ title: "PJD Market", text, url });
      } else {
        await navigator.clipboard.writeText(url);
        alert("Lien PJD Market copié. Partage-le sur WhatsApp ou Facebook.");
      }
    } catch {}
  };

  return (
    <section aria-label="Développer PJD Market" style={{maxWidth:1200,margin:"18px auto 0",padding:"0 16px"}}>
      <div style={{borderRadius:24,padding:"22px",background:"linear-gradient(135deg,#111827 0%,#1f2937 55%,#f97316 160%)",color:"#fff",boxShadow:"0 14px 38px rgba(15,23,42,.16)"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:900,letterSpacing:".08em",textTransform:"uppercase",opacity:.9}}>
          <Sparkles size={15}/> PJD MARKET · COMMUNAUTÉ
        </div>
        <h2 style={{margin:"7px 0 6px",fontSize:"clamp(22px,4vw,32px)"}}>Achetez, vendez et faites connaître PJD Market.</h2>
        <p style={{margin:"0 0 16px",maxWidth:720,lineHeight:1.55,color:"rgba(255,255,255,.82)"}}>
          Les vendeurs peuvent créer leur boutique depuis leur téléphone. Les acheteurs découvrent des produits physiques et numériques. Chaque membre peut aussi inviter sa communauté.
        </p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:10}}>
          <button type="button" onClick={onSell} style={btn("#f97316")}>
            <Store size={18}/><span><b>Commencer à vendre</b><small>Créer ma boutique gratuitement</small></span><ArrowRight size={17}/>
          </button>
          <button type="button" onClick={onAffiliate} style={btn("rgba(255,255,255,.12)")}>
            <Users size={18}/><span><b>Inviter des membres</b><small>Partager mon lien PJD Market</small></span><ArrowRight size={17}/>
          </button>
          <button type="button" onClick={share} style={btn("rgba(255,255,255,.12)")}>
            <Share2 size={18}/><span><b>Partager PJD Market</b><small>WhatsApp, Facebook ou autre</small></span><ArrowRight size={17}/>
          </button>
        </div>
      </div>
    </section>
  );
}

function btn(background) {
  return {display:"flex",alignItems:"center",gap:10,width:"100%",textAlign:"left",padding:"13px 14px",border:"1px solid rgba(255,255,255,.14)",borderRadius:15,background,color:"#fff",cursor:"pointer"};
}
