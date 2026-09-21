import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MF_API_URL=Deno.env.get("MONEYFUSION_API_URL")||"";
const MF_API_KEY=Deno.env.get("MONEYFUSION_API_KEY")||"";
const supabase=createClient(SUPABASE_URL,SERVICE_ROLE_KEY);
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...CORS,"Content-Type":"application/json"}});
function phone(v:unknown){const d=String(v??"").replace(/\D/g,"");if(/^6\d{8}$/.test(d))return d;if(/^2376\d{8}$/.test(d))return d.slice(3);return ""}

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
 if(req.method!=="POST")return json({error:"Méthode non autorisée."},405);
 try{
  if(!MF_API_URL)return json({error:"MONEYFUSION_API_URL non configurée. Ajoute l'URL API générée par MoneyFusion dans les secrets Supabase."},500);
  const auth=req.headers.get("authorization");if(!auth?.startsWith("Bearer "))return json({error:"Authentification requise."},401);
  const {data:a,error:ae}=await supabase.auth.getUser(auth.slice(7));if(ae||!a.user)return json({error:"Session utilisateur invalide ou expirée."},401);
  const b=await req.json(),orderId=String(b?.orderId??"").trim(),p=phone(b?.phone);
  if(!orderId)return json({error:"orderId requis."},400);if(!p)return json({error:"Numéro camerounais invalide."},400);
  const {data:o,error:oe}=await supabase.from("orders").select("id,user_id,total,status,payment_status").eq("id",orderId).maybeSingle();
  if(oe||!o)return json({error:"Commande introuvable."},404);if(String(o.user_id)!==String(a.user.id))return json({error:"Cette commande ne vous appartient pas."},403);
  const current=String(o.payment_status||o.status||"").toLowerCase();if(["paid","completed","confirmed","processing","shipped","delivered"].includes(current))return json({success:true,already_paid:true,orderId});
  const amount=Math.round(Number(o.total));if(!Number.isFinite(amount)||amount<=0)return json({error:"Montant de commande invalide."},400);
  const paymentReference=orderId+"-"+Date.now();
  const articles=Array.isArray(b?.articles)&&b.articles.length?b.articles:[{["Commande "+orderId]:amount}];
  const payload={totalPrice:amount,article:articles,numeroSend:p,nomclient:String(a.user.user_metadata?.full_name||a.user.email||"Client PJD Market"),personal_Info:[{userId:a.user.id,orderId}],return_url:"https://pjd-maket.vercel.app/?moneyfusion=1&order_id="+encodeURIComponent(orderId),webhook_url:SUPABASE_URL+"/functions/v1/moneyfusion-webhook"};
  const headers:Record<string,string>={"Content-Type":"application/json"};if(MF_API_KEY)headers["moneyfusion-private-key"]=MF_API_KEY;
  const r=await fetch(MF_API_URL,{method:"POST",headers,body:JSON.stringify(payload)}),txt=await r.text();let provider:any={};try{provider=txt?JSON.parse(txt):{}}catch{provider={raw:txt}}
  if(!r.ok||provider?.statut===false)return json({error:provider?.message||"MoneyFusion a refusé l'initialisation du paiement.",provider_status:r.status,details:provider},502);
  const token=String(provider?.token||provider?.data?.token||"").trim(),url=provider?.url||provider?.data?.url||null;
  if(!token)return json({error:"MoneyFusion n'a pas retourné de token de paiement.",details:provider},502);
  const ins=await supabase.from("payments").insert({user_id:a.user.id,order_id:orderId,amount,currency:"XAF",method:"moneyfusion",status:"pending",statut:"en_attente",tx_id:token,payment_ref:paymentReference,item_ref:orderId,phone:p,operator:"moneyfusion",provider:"moneyfusion",provider_reference:paymentReference,provider_transaction_id:token,metadata:{provider:"moneyfusion",tokenPay:token,checkout_url:url},raw_response:provider,updated_at:new Date().toISOString()});
  if(ins.error)return json({error:"Paiement MoneyFusion initialisé mais impossible d'enregistrer la transaction PJD Market.",details:ins.error.message},500);
  await supabase.from("orders").update({payment_method:"moneyfusion",payment_status:"PENDING"}).eq("id",orderId);
  return json({success:true,pending:true,orderId,paymentId:token,token,url,status:"pending"});
 }catch(error){return json({error:error instanceof Error?error.message:"Erreur MoneyFusion."},500)}
});