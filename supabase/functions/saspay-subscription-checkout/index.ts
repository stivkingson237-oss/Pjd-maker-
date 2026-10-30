import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const URL=Deno.env.get("SUPABASE_URL")!, SERVICE=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, ANON=Deno.env.get("SUPABASE_ANON_KEY")||"", KEY=Deno.env.get("SASPAY_API_KEY")||"", API="https://api.saspay.me/api/v1";
const db=createClient(URL,SERVICE,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const out=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...cors,"Content-Type":"application/json"}});
function norm(v:unknown){const d=String(v||"").replace(/\D/g,"");return /^6\d{8}$/.test(d)?"237"+d:/^2376\d{8}$/.test(d)?d:""}
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response("ok",{headers:cors});if(req.method!=="POST")return out({error:"Méthode non autorisée."},405);try{
const auth=req.headers.get("authorization");if(!auth?.startsWith("Bearer "))return out({error:"Authentification requise."},401);
const ur=await fetch(URL+"/auth/v1/user",{headers:{apikey:ANON,Authorization:auth}});if(!ur.ok)return out({error:"Session utilisateur invalide."},401);const user=await ur.json();
const b=await req.json(),code=String(b.planCode||"").toLowerCase(),cycle=b.billingCycle==="annual"?"annual":"monthly",network=String(b.operator||"").toUpperCase(),phone=norm(b.phone);
if(!["standard","gold","platinum","diamond"].includes(code))return out({error:"Formule vendeur invalide."},400);if(!phone)return out({error:"Numéro camerounais invalide."},400);if(!["MTN","ORANGE"].includes(network))return out({error:"Choisis MTN ou Orange Money."},400);if(!KEY)return out({error:"SASPAY_API_KEY non configurée dans Supabase."},500);
const {data:shop,error:se}=await db.from("shops").select("id,owner_id,shop_name").eq("owner_id",user.id).maybeSingle();if(se||!shop)return out({error:"Aucune boutique associée à ce compte vendeur."},404);
const {data:plan,error:pe}=await db.from("seller_plans").select("code,name,monthly_price,annual_price,commission_rate,active").eq("code",code).eq("active",true).maybeSingle();if(pe||!plan)return out({error:"Cette formule est indisponible."},404);
const amount=Number(cycle==="annual"?(plan.annual_price||Number(plan.monthly_price)*10):plan.monthly_price);if(!Number.isFinite(amount)||amount<=0)return out({error:"Montant de abonnement invalide."},400);
const cutoff=new Date(Date.now()-10*60*1000).toISOString();
const {data:pendingSubs,error:pendingErr}=await db.from("subscriptions").select("id,plan_code,billing_cycle,created_at,payment_reference").eq("user_id",user.id).eq("shop_id",shop.id).eq("status","pending").gte("created_at",cutoff).order("created_at",{ascending:false}).limit(1);
if(pendingErr)return out({error:"Impossible de vérifier les demandes d’abonnement en cours."},500);
if(pendingSubs?.length){
 const pendingSub=pendingSubs[0];
 const {data:pendingPayment}=await db.from("payments").select("tx_id,status").eq("payment_ref",pendingSub.id).eq("method","saspay").order("created_at",{ascending:false}).limit(1).maybeSingle();
 if(pendingPayment?.tx_id && pendingPayment.status!=="failed")return out({success:true,pending:true,reused:true,subscriptionId:pendingSub.id,paymentId:pendingPayment.tx_id,status:pendingPayment.status,message:"Une demande SasPay est déjà en attente. Confirme-la sur ton téléphone ; aucun second paiement n’a été créé."});
 return out({error:"Une demande d’abonnement est déjà en cours de préparation. Réessaie dans quelques instants."},409);
}
const {data:sub,error:ie}=await db.from("subscriptions").insert({user_id:user.id,shop_id:shop.id,plan:plan.name,plan_code:plan.code,amount,currency:"XAF",status:"pending",billing_cycle:cycle}).select("id").single();if(ie||!sub)return out({error:"Impossible de créer la demande d’abonnement.",details:ie?.message},500);
const idem=sub.id,networkCode=network==="MTN"?"mtn_cm":"orange_cm";
const payload={amount:amount.toFixed(2),currency:"XAF",country:"CM",network:networkCode,description:"PJD Market - Abonnement "+plan.name+" ("+cycle+")",customer:{email:user.email||"",first_name:String(user.user_metadata?.first_name||user.user_metadata?.name||"Vendeur"),last_name:String(user.user_metadata?.last_name||"PJD Market"),phone},metadata:{subscription_id:sub.id,shop_id:shop.id,user_id:user.id,plan_code:plan.code,billing_cycle:cycle,pjd_type:"seller_subscription"}};
const resp=await fetch(API+"/payments/softpay/",{method:"POST",headers:{Authorization:"Bearer "+KEY,"Content-Type":"application/json","Idempotency-Key":idem,Accept:"application/json"},body:JSON.stringify(payload)});const raw=await resp.text();let body:any={};try{body=raw?JSON.parse(raw):{}}catch{}const d=body?.data||body;
if(!resp.ok){await db.from("subscriptions").update({status:"failed"}).eq("id",sub.id);return out({error:body?.error?.message||body?.message||"SasPay a refusé la demande.",provider_status:resp.status},502)}
const tx=String(d?.id||d?.payment_id||d?.transaction_id||d?.reference||"").trim();if(!tx){await db.from("subscriptions").update({status:"failed"}).eq("id",sub.id);return out({error:"SasPay n’a pas retourné de référence de paiement."},502)}
const metadata={provider:"saspay",pjd_type:"seller_subscription",subscription_id:sub.id,shop_id:shop.id,plan_code:plan.code,billing_cycle:cycle,network,idempotency_key:idem,saspay:d};
const {error:payErr}=await db.from("payments").insert({user_id:user.id,order_id:null,amount,method:"saspay",currency:"XAF",status:"pending",statut:"en_attente",tx_id:tx,payment_ref:sub.id,item_ref:sub.id,phone,operator:networkCode,metadata,provider:"saspay",provider_reference:tx,provider_transaction_id:tx});
if(payErr){await db.from("subscriptions").update({status:"failed"}).eq("id",sub.id);return out({error:"Demande SasPay lancée mais enregistrement local impossible.",details:payErr.message},500)}
await db.from("subscriptions").update({payment_reference:tx}).eq("id",sub.id);return out({success:true,pending:true,subscriptionId:sub.id,paymentId:tx,status:d?.status||"PENDING",message:"Demande envoyée à SasPay. Confirme le paiement sur ton téléphone. L’abonnement sera activé après confirmation vérifiée."});
}catch(e){return out({error:e instanceof Error?e.message:"Erreur SasPay inattendue."},500)}});