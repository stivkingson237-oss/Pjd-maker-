import { createClient } from "npm:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 try{
  const auth=req.headers.get("Authorization")||"";
  const token=auth.replace(/^Bearer\s+/i,"");
  if(!token)return json({error:"Connexion requise."},401);
  const url=Deno.env.get("SUPABASE_URL")||"";
  const pubs=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
  const secrets=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const publishable=pubs.default||Deno.env.get("SUPABASE_ANON_KEY")||"";
  const secret=secrets.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  const userClient=createClient(url,publishable,{global:{headers:{Authorization:`Bearer ${token}`}}});
  const {data:{user},error:userError}=await userClient.auth.getUser(token);
  if(userError||!user)return json({error:"Session invalide. Reconnectez-vous."},401);
  const admin=createClient(url,secret);
  const body=await req.json().catch(()=>({}));
  const productId=String(body?.product_id||"");
  if(!productId)return json({error:"Produit manquant."},400);
  const {data:product,error:productError}=await admin.from("digital_products").select("id,title,file_url,file_type,is_free,seller_id").eq("id",productId).maybeSingle();
  if(productError||!product)return json({error:"Contenu introuvable."},404);
  if(!product.file_url)return json({error:"Aucun fichier média n'est associé à ce produit."},404);
  let allowed=Boolean(product.is_free);
  if(!allowed&&product.seller_id===user.id)allowed=true;
  if(!allowed){
   const {data:tokenRow}=await admin.from("download_tokens").select("id,expires_at,max_downloads,downloads_used").eq("product_id",productId).eq("user_id",user.id).order("created_at",{ascending:false}).limit(1).maybeSingle();
   if(tokenRow&&(!tokenRow.expires_at||new Date(tokenRow.expires_at)>new Date())&&Number(tokenRow.downloads_used||0)<Number(tokenRow.max_downloads||999999))allowed=true;
  }
  if(!allowed){
   const {data:paid}=await admin.from("order_items").select("order_id,orders!inner(user_id,payment_status)").eq("product_id",productId).eq("orders.user_id",user.id).eq("orders.payment_status","paid").limit(1).maybeSingle();
   if(paid)allowed=true;
  }
  if(!allowed)return json({error:"Accès verrouillé. Achetez ce contenu pour pouvoir le lire directement sur PJD Market."},403);
  const {data:signed,error:signedError}=await admin.storage.from("product-files").createSignedUrl(product.file_url,3600);
  if(signedError||!signed?.signedUrl)return json({error:signedError?.message||"Impossible de préparer la lecture."},500);
  const t=String(product.file_type||"").toLowerCase();
  const eventType=t.startsWith("audio/")||t.startsWith("video/")?"listen":null;
  return json({signed_url:signed.signedUrl,title:product.title,file_type:product.file_type,event_type:eventType});
 }catch(e){console.error(e);return json({error:e?.message||"Erreur serveur."},500)}
});