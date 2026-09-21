import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!,SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase=createClient(SUPABASE_URL,SERVICE_ROLE_KEY);
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
Deno.serve(async req=>{
 if(req.method!=="POST")return json({error:"Méthode non autorisée."},405);
 try{
  const raw=await req.text();let e:any;try{e=JSON.parse(raw)}catch{return json({error:"Payload JSON invalide."},400)}
  const event=String(e?.event||"").toLowerCase(),token=String(e?.tokenPay||e?.data?.tokenPay||"").trim(),status=String(e?.statut||e?.data?.statut||"").toLowerCase();
  const info=Array.isArray(e?.personal_Info)?e.personal_Info[0]:Array.isArray(e?.data?.personal_Info)?e.data.personal_Info[0]:null;
  const orderId=String(info?.orderId||e?.order_id||e?.data?.order_id||"").trim();
  if(!token&&!orderId)return json({received:true,ignored:true,reason:"missing_reference"});
  let q=supabase.from("payments").select("id,order_id,user_id,amount,status,provider_reference,provider_transaction_id,payment_ref").eq("provider","moneyfusion");
  if(token)q=q.eq("provider_transaction_id",token);else q=q.eq("order_id",orderId);
  const {data:payment,error}=await q.order("created_at",{ascending:false}).limit(1).maybeSingle();if(error)throw error;if(!payment)return json({received:true,ignored:true,reason:"payment_not_found"});
  const amount=Number(e?.Montant??e?.amount??e?.data?.Montant);if(Number.isFinite(amount)&&Math.round(amount)!==Math.round(Number(payment.amount)))return json({error:"Montant webhook différent du montant PJD Market."},400);
  const completed=event==="payin.session.completed"||status==="paid";
  const failed=event==="payin.session.cancelled"||status==="failure"||status==="no paid";
  if(completed){
   if(String(payment.status).toLowerCase()==="completed")return json({received:true,processed:false,ignored:true,reason:"already_completed"});
   const u=await supabase.from("payments").update({status:"completed",statut:"payé",provider_transaction_id:token||payment.provider_transaction_id,raw_response:e,metadata:{provider:"moneyfusion",event,status,tokenPay:token},settled_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",payment.id);
   if(u.error)throw u.error;
   const s=await supabase.rpc("settle_marketplace_payment",{p_order_id:payment.order_id,p_tx_id:token||payment.provider_transaction_id||payment.payment_ref});if(s.error)throw s.error;
   return json({received:true,processed:true,status:"completed",order_id:payment.order_id});
  }
  if(failed){
   if(String(payment.status).toLowerCase()==="completed")return json({received:true,processed:false,ignored:true,reason:"already_completed"});
   const u=await supabase.from("payments").update({status:"failed",statut:"échoué",provider_transaction_id:token||payment.provider_transaction_id,failure_reason:event||status,raw_response:e,updated_at:new Date().toISOString()}).eq("id",payment.id).neq("status","completed");if(u.error)throw u.error;
   await supabase.from("orders").update({payment_status:"FAILED"}).eq("id",payment.order_id).neq("status","paid");
   return json({received:true,processed:true,status:"failed",order_id:payment.order_id});
  }
  return json({received:true,processed:false,event,status});
 }catch(err){return json({error:err instanceof Error?err.message:"Erreur webhook MoneyFusion."},500)}
});