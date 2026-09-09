import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE = Deno.env.get("MTN_BASE_URL") || "https://sandbox.momodeveloper.mtn.com";
const TARGET = Deno.env.get("MTN_TARGET_ENVIRONMENT") || "sandbox";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"}});

async function token(){
 const user=Deno.env.get("MTN_API_USER"),key=Deno.env.get("MTN_API_KEY"),sub=Deno.env.get("MTN_SUBSCRIPTION_KEY");
 if(!user||!key||!sub) throw new Error("MTN secrets are not configured");
 const r=await fetch(`${BASE}/collection/token/`,{method:"POST",headers:{Authorization:`Basic ${btoa(`${user}:${key}`)}`,"Ocp-Apim-Subscription-Key":sub,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials"});
 if(!r.ok) throw new Error(`MTN token failed: ${await r.text()}`);
 return (await r.json()).access_token;
}

Deno.serve(async req=>{
 if(req.method==="OPTIONS") return json({ok:true});
 if(req.method!=="POST") return json({error:"Method not allowed"},405);
 try{
  const b=await req.json();
  const referenceId=String(b.referenceId||b.provider_reference||"").trim();
  if(!referenceId) return json({error:"referenceId is required"},400);
  const access=await token();
  const sub=Deno.env.get("MTN_SUBSCRIPTION_KEY")!;
  const r=await fetch(`${BASE}/collection/v1_0/requesttopay/${encodeURIComponent(referenceId)}`,{headers:{Authorization:`Bearer ${access}`,"X-Target-Environment":TARGET,"Ocp-Apim-Subscription-Key":sub}});
  const raw=await r.text(); let data:any={}; try{data=raw?JSON.parse(raw):{}}catch{}
  if(!r.ok) return json({error:"MTN status request failed",provider_status:r.status,details:data},502);
  const status=String(data.status||"PENDING").toUpperCase();
  const {data:payment}=await supabase.from("payments").select("id,order_id,amount,status").eq("provider","mtn").eq("provider_reference",referenceId).maybeSingle();
  if(payment){
   const now=new Date().toISOString();
   if(status==="SUCCESSFUL"){
    await supabase.from("payments").update({status:"completed",statut:"payé",provider_transaction_id:data.financialTransactionId||data.externalId||referenceId,raw_response:data,updated_at:now,settled_at:now}).eq("id",payment.id);
    if(payment.order_id) await supabase.from("orders").update({status:"paid",payment_status:"SUCCESSFUL",paid_at:now,payment_method:"MTN_MOMO"}).eq("id",payment.order_id);
   } else if(["FAILED","REJECTED","CANCELLED","EXPIRED"].includes(status)){
    await supabase.from("payments").update({status:"failed",statut:status.toLowerCase(),failure_reason:status,raw_response:data,updated_at:now}).eq("id",payment.id).neq("status","completed");
    if(payment.order_id) await supabase.from("orders").update({status:"failed",payment_status:status}).eq("id",payment.order_id).in("status",["pending","en_attente"]);
   } else {
    await supabase.from("payments").update({status:"pending",raw_response:data,updated_at:now}).eq("id",payment.id);
   }
  }
  return json({success:true,status,referenceId,paymentId:payment?.id||null});
 }catch(e){return json({error:e instanceof Error?e.message:"Unexpected error"},500)}
});
