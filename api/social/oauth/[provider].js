const crypto = require('crypto');

const providers = new Set(['facebook','instagram','tiktok','youtube','whatsapp','telegram']);
const env = (name) => process.env[name] || '';
const b64 = (v) => Buffer.from(v).toString('base64url');

function sign(value){return crypto.createHmac('sha256',env('SOCIAL_OAUTH_STATE_SECRET')).update(value).digest('base64url')}
function stateFor(userId,provider,returnTo){const body=b64(JSON.stringify({u:userId,p:provider,r:returnTo||'/'}));return `${body}.${sign(body)}`}
function origin(req){return env('APP_URL') || `${req.headers['x-forwarded-proto']||'https'}://${req.headers.host}`}

module.exports = async (req,res)=>{
  const provider=req.query?.provider;
  if(req.method!=='GET')return res.status(405).json({error:'Méthode non autorisée'});
  if(!providers.has(provider))return res.status(404).json({error:'Réseau social inconnu'});
  if(!env('SOCIAL_OAUTH_STATE_SECRET'))return res.status(503).json({error:'SOCIAL_OAUTH_STATE_SECRET non configuré'});
  const auth=String(req.headers.authorization||'');
  if(!auth.startsWith('Bearer '))return res.status(401).json({error:'Session PJD Market requise'});
  const token=auth.slice(7);
  const supaUrl=env('VITE_SUPABASE_URL');
  const supaKey=env('VITE_SUPABASE_PUBLISHABLE_KEY');
  const u=await fetch(`${supaUrl}/auth/v1/user`,{headers:{apikey:supaKey,Authorization:`Bearer ${token}`}}).then(r=>r.ok?r.json():null).catch(()=>null);
  if(!u?.id)return res.status(401).json({error:'Session Supabase invalide'});
  const callback=`${origin(req)}/api/social/oauth/callback`;
  const state=stateFor(u.id,provider,req.query?.return_to||'/');
  let url='';
  if(provider==='facebook'||provider==='instagram'||provider==='whatsapp'){
    if(!env('META_CLIENT_ID'))return res.status(503).json({error:'META_CLIENT_ID non configuré'});
    const scopes=provider==='whatsapp'?'business_management,whatsapp_business_management,whatsapp_business_messaging':'pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish';
    url=`https://www.facebook.com/v23.0/dialog/oauth?client_id=${encodeURIComponent(env('META_CLIENT_ID'))}&redirect_uri=${encodeURIComponent(callback)}&state=${encodeURIComponent(state)}&scope=${encodeURIComponent(scopes)}`;
  }else if(provider==='tiktok'){
    if(!env('TIKTOK_CLIENT_KEY'))return res.status(503).json({error:'TIKTOK_CLIENT_KEY non configuré'});
    url=`https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(env('TIKTOK_CLIENT_KEY'))}&scope=${encodeURIComponent('user.info.basic,video.publish')}&response_type=code&redirect_uri=${encodeURIComponent(callback)}&state=${encodeURIComponent(state)}`;
  }else if(provider==='youtube'){
    if(!env('GOOGLE_CLIENT_ID'))return res.status(503).json({error:'GOOGLE_CLIENT_ID non configuré'});
    url=`https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(env('GOOGLE_CLIENT_ID'))}&redirect_uri=${encodeURIComponent(callback)}&response_type=code&access_type=offline&prompt=consent&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.upload')}&state=${encodeURIComponent(state)}`;
  }else{
    return res.status(501).json({error:'Telegram se connecte via un bot, pas via OAuth. Configurez TELEGRAM_BOT_TOKEN et le chat_id/canal.'});
  }
  return res.status(200).json({url});
};
