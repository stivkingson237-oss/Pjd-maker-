import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!, SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, NOTCHPAY_API_KEY=Deno.env.get("NOTCHPAY_API_KEY")||"";
const supabase=createClient(SUPABASE_URL,SERVICE_ROLE_KEY),API="https://api.notchpay.co";
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...CORS,"Content-Type":"application/json"}});
function phone(v:unknown){const raw=String(v??"").trim(),d=raw.replace(/\D/g,"");if(/^\+2376\d{8}$/.test(raw))return raw;if(/^6\d{8}$/.test(d))return"+237"+d;if(/^2376\d{8}$/.test(d))return"+"+d;return""}
function channel(v:unknown){const n=String(v??"").toUpperCase().replace(/\s+/g,"");if(n==="MTN"||n==="MTNMOBILEMONEY")return"cm.mtn";if(n==="ORANGE"||n==="ORANGEMONEY")return"cm.orange";return""}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});if(req.method!=="POST")return json({error:"Méthode non autorisée."},405);
 try{
  if(!NOTCHPAY_API_KEY)return json({error:"NOTCHPAY_API_KEY non configurée."},500);
  const auth=req.headers.get("authorization");if(!auth?.startsWith("Bearer "))return json({error:"Authentification requise."},401);
  const {data:a,error:ae}=await supabase.auth.getUser(auth.slice(7));if(ae||!a.user)return json({error:"Session utilisateur invalide ou expirée."},401);
  const b=await req.json(),orderId=String(b?.orderId??"").trim(),p=phone(b?.phone),ch=channel(b?.network);
  if(!orderId)return json({error:"orderId requis."},400);if(!p)return json({error:"Numéro camerounais invalide. Utilisez +2376XXXXXXXX."},400);if(!ch)return json({error:"Réseau Mobile Money invalide."},400);
  const {data:o,error:oe}=await supabase.from("orders").select("id,user_id,total,status,payment_status").eq("id",orderId).maybeSingle();
  if(oe||!o)return json({error:"Commande introuvable."},404);if(String(o.user_id)!==String(a.user.id))return json({error:"Cette commande ne vous appartient pas."},403);
  const current=String(o.payment_status||o.status||"").toLowerCase();if(["paid","completed","confirmed","processing","shipped","delivered"].includes(current))return json({success:true,already_paid:true,orderId});
  const amount=Number(o.total);if(!Number.isFinite(amount)||amount<=0)return json({error:"Montant de commande invalide."},400);
  const paymentReference=orderId+"-"+Date.now();
  const payload={amount:Math.round(amount),currency:"XAF",customer:{email:a.user.email||undefined,phone:p},description:"PJD Market - Commande "+orderId,reference:paymentReference,callback:"https://pjd-maker.vercel.app/?notchpay=1&order_id="+encodeURIComponent(orderId),metadata:{order_id:orderId,pjd_order_id:orderId,user_id:a.user.id,preferred_channel:ch}};
  const r=await fetch(API+"/payments",{method:"POST",headers:{Authorization:NOTCHPAY_API_KEY,"Content-Type":"application/json"},body:JSON.stringify(payload)}),txt=await r.text();let provider:any={};try{provider=txt?JSON.parse(txt):{}}catch{provider={raw:txt}}
  if(!r.ok)return json({error:provider?.message||provider?.error?.message||"Notch Pay a refusé l'initialisation.",provider_status:r.status,details:provider?.errors||null},502);
  const t=provider?.transaction||provider?.data?.transaction||null,ref=String(t?.reference||t?.trxref||provider?.data?.reference||"").trim(),url=provider?.authorization_url||provider?.data?.authorization_url||null;
  if(!ref)return json({error:"Notch Pay n'a pas retourné la référence de transaction."},502);
  const cr=await fetch(API+"/payments/"+encodeURIComponent(ref),{method:"POST",headers:{Authorization:NOTCHPAY_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({channel:ch,phone:p})});
  const ct=await cr.text();let charge:any={};try{charge=ct?JSON.parse(ct):{}}catch{charge={raw:ct}}
  if(!cr.ok){
   return json({error:charge?.message||charge?.error?.message||"Notch Pay a refusé la demande Mobile Money.",provider_status:cr.status,details:charge?.errors||null,paymentId:ref,authorization_url:url},502);
  }
  const chargeStatus=String(charge?.transaction?.status||charge?.data?.transaction?.status||charge?.status||"pending").toLowerCase();
  const ins=await supabase.from("payments").insert({user_id:a.user.id,order_id:orderId,amount,currency:"XAF",method:"notchpay",status:"pending",statut:"en_attente",tx_id:ref,payment_ref:paymentReference,item_ref:orderId,phone:p,operator:ch,provider:"notchpay",provider_reference:paymentReference,provider_transaction_id:ref,metadata:{provider:"notchpay",network:ch,authorization_url:url,charge_status:chargeStatus},raw_response:{initialize:provider,charge},updated_at:new Date().toISOString()});
  if(ins.error)return json({error:"Paiement initialisé mais impossible d'enregistrer la transaction PJD Market.",details:ins.error.message},500);
  await supabase.from("orders").update({payment_method:"notchpay",payment_status:"PENDING"}).eq("id",orderId);
  return json({success:true,pending:true,orderId,paymentId:ref,authorization_url:url,status:chargeStatus,instruction:charge?.message||charge?.data?.message||null,charge_error:false});
 }catch(error){return json({error:error instanceof Error?error.message:"Erreur Notch Pay."},500)}
});