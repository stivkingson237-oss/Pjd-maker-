import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"Content-Type":"application/json"}});

Deno.serve(async req=>{
 if(req.method!=="POST"&&req.method!=="PUT") return json({error:"Method not allowed"},405);
 try{
  const raw=await req.text(); let body:any={}; try{body=raw?JSON.parse(raw):{}}catch{}
  const referenceId=String(body.referenceId||body.reference_id||body["X-Reference-Id"]||req.headers.get("X-Reference-Id")||body.id||body.transactionId||body.transaction_id||"").trim();
  if(!referenceId) return json({ok:true,ignored:true,reason:"reference_id_missing"});

  // Do not trust the callback body as proof of payment. Reconcile against MTN's GET status endpoint.
  const r=await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/mtn-status`,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${Deno.env.get("SUPABASE_ANON_KEY")||""}`},body:JSON.stringify({referenceId})});
  const result=await r.text();
  if(!r.ok) return json({error:"status_reconciliation_failed",details:result},502);
  return json({ok:true,reconciled:true,result:JSON.parse(result)});
 }catch(e){return json({error:e instanceof Error?e.message:"Webhook error"},500)}
});
