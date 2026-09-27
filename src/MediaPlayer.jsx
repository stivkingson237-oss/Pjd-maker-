import React,{useEffect,useMemo,useRef,useState}from'react';
import{BookOpen,Download,FileText,Loader2,Pause,Play,RotateCcw,Volume2}from'lucide-react';
import{supabase}from'./lib/supabase';

const getKind=p=>{
 const t=String(p?.file_type||'').toLowerCase(), c=String(p?.category||'').toLowerCase(), title=String(p?.title||'').toLowerCase();
 if(t.startsWith('audio/')||c.includes('audio')||c.includes('musique')||title.includes('audiobook')||title.includes('livre audio'))return'audio';
 if(t.startsWith('video/'))return'video';
 if(t==='application/pdf'||t.includes('pdf')||/\.pdf$/i.test(String(p?.file_url||'')))return'pdf';
 if(t.includes('epub')||/\.epub$/i.test(String(p?.file_url||'')))return'ebook';
 return'file';
};
const fmt=s=>{s=Math.max(0,Math.floor(Number(s)||0));const m=Math.floor(s/60),h=Math.floor(m/60),mm=m%60,ss=String(s%60).padStart(2,'0');return h?\`${h}:${String(mm).padStart(2,'0')}:${ss}\`:\`${mm}:${ss}\`};

export default function MediaPlayer({product}){
 const kind=useMemo(()=>getKind(product),[product]), ref=useRef(null);
 const key=\`pjd-media-progress:${product?.id}\`;
 const [url,setUrl]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(''),[playing,setPlaying]=useState(false),[current,setCurrent]=useState(()=>Number(localStorage.getItem(key)||0)),[duration,setDuration]=useState(0);
 useEffect(()=>{setUrl('');setError('');setPlaying(false);setCurrent(Number(localStorage.getItem(key)||0));setDuration(0)},[product?.id,key]);
 if(!product?.id||kind==='file')return null;
 async function openMedia(){
  if(url){if(kind==='pdf'||kind==='ebook'){window.open(url,'_blank','noopener,noreferrer');return}return ref.current?.play?.().catch(()=>{})}
  setLoading(true);setError('');
  try{
   const{data:session}=await supabase.auth.getSession();
   if(!session?.session?.user){window.dispatchEvent(new CustomEvent('pjd-require-auth',{detail:{action:'media',product}}));return}
   const{data,error}=await supabase.functions.invoke('media-access',{body:{product_id:product.id}});
   if(error||!data?.signed_url)throw new Error(data?.error||'Contenu indisponible. Après un achat, l’accès est activé automatiquement.');
   setUrl(data.signed_url);
   if(data.event_type==='listen'){try{await supabase.rpc('track_pjd_content_event',{p_product_id:product.id,p_event_type:'listen',p_visitor_id:localStorage.getItem('pjd-visitor-id')||null})}catch{}}
  }catch(e){setError(e?.message||'Impossible de charger ce contenu.')}finally{setLoading(false)}
 }
 function onLoaded(e){const d=Number(e.currentTarget.duration)||0;setDuration(d);const p=Number(localStorage.getItem(key)||0);if(p>0&&p<d)e.currentTarget.currentTime=p}
 function onTime(e){const t=Number(e.currentTarget.currentTime)||0;setCurrent(t);if(Math.floor(t)%5===0)localStorage.setItem(key,String(t))}
 function onEnded(){localStorage.removeItem(key);setPlaying(false)}
 if(kind==='pdf'||kind==='ebook')return <div className="pjd-media-card"><div className="pjd-media-head"><div><span className="pjd-media-kicker">LECTURE</span><h3><BookOpen size={18}/>{kind==='pdf'?'Lire le livre':'Ouvrir le livre numérique'}</h3></div><button className="pjd-media-main-btn"onClick={openMedia}disabled={loading}>{loading?<Loader2 className="pjd-spin"/>:<BookOpen size={18}/>} {loading?'Chargement...':'Lire maintenant'}</button></div>{url&&<div className="pjd-book-frame"><iframe title={product.title||'Livre numérique'}src={url}/></div>}{error&&<p className="pjd-media-error">{error}</p>}</div>;
 return <div className="pjd-media-card"><div className="pjd-media-head"><div><span className="pjd-media-kicker">{kind==='audio'?'AUDIO':'VIDÉO'}</span><h3>{kind==='audio'?<><Volume2 size={18}/>Écouter maintenant</>:<><Play size={18}/>Regarder maintenant</>}</h3></div><button className="pjd-media-main-btn"onClick={openMedia}disabled={loading}>{loading?<Loader2 className="pjd-spin"/>:playing?<Pause size={18}/>:<Play size={18}/>} {loading?'Chargement...':url?(playing?'Pause':'Lire'):kind==='audio'?'Écouter':'Regarder'}</button></div>{url&&<>{kind==='audio'?<audio ref={ref}src={url}controls preload="metadata"onLoadedMetadata={onLoaded}onTimeUpdate={onTime}onPlay={()=>setPlaying(true)}onPause={()=>setPlaying(false)}onEnded={onEnded}/>:<video ref={ref}src={url}controls playsInline preload="metadata"onLoadedMetadata={onLoaded}onTimeUpdate={onTime}onPlay={()=>setPlaying(true)}onPause={()=>setPlaying(false)}onEnded={onEnded}/>}<div className="pjd-media-progress"><span>{fmt(current)}</span><span>{fmt(duration)}</span></div><button className="pjd-reset-btn"onClick={()=>{localStorage.removeItem(key);setCurrent(0);if(ref.current)ref.current.currentTime=0}}><RotateCcw size={14}/>Reprendre depuis le début</button></>}{!url&&<p className="pjd-media-help">{kind==='audio'?'La lecture se fait directement dans PJD Market. Votre progression est mémorisée.':'La vidéo se lit directement dans PJD Market. Votre progression est mémorisée.'}</p>}{error&&<p className="pjd-media-error">{error}</p>}<p className="pjd-media-download-note"><Download size={14}/>Le fichier original reste protégé. Le téléchargement est séparé de la lecture.</p></div>
}