import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NOTCHPAY_API_KEY=Deno.env.get("NOTCHPAY_API_KEY")||"";
const supabase=createClient(SUPABASE_URL,SERVICE_ROLE_KEY);
const CORS={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...CORS,"Content-Type":"application/json"}});

const norm=(v:unknown)=>String(v??"").trim().toLowerCase();
const success=new Set(["complete","completed","paid","success","successful","succeeded","confirmed"]);
const failed=new Set(["failed","failure","canceled","cancelled","expired","declined","rejected"]);

Deno.serve(async req=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:CORS});
  if(req.method!=="POST") return json({error:"Méthode non autorisée."},405);
  try{
    if(!NOTCHPAY_API_KEY) return json({error:"NOTCHPAY_API_KEY non configurée."},500);
    const auth=req.headers.get("authorization");
    if(!auth?.startsWith("Bearer ")) return json({error:"Authentification requise."},401);
    const {data:user,error:userError}=await supabase.auth.getUser(auth.slice(7));
    if(userError||!user?.user) return json({error:"Session utilisateur invalide ou expirée."},401);

    const body=await req.json();
    const orderId=String(body?.orderId??"").trim();
    const requestedRef=String(body?.paymentId??body?.reference??"").trim();
    if(!orderId) return json({error:"orderId requis."},400);

    const {data:order,error:orderError}=await supabase.from("orders")
      .select("id,user_id,total,status,payment_status").eq("id",orderId).maybeSingle();
    if(orderError) throw orderError;
    if(!order) return json({error:"Commande introuvable."},404);
    if(String(order.user_id)!==String(user.user.id)) return json({error:"Cette commande ne vous appartient pas."},403);

    const {data:payment,error:paymentError}=await supabase.from("payments")
      .select("id,amount,status,provider_reference,provider_transaction_id,payment_ref,order_id")
      .eq("order_id",orderId).eq("provider","notchpay")
      .order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(paymentError) throw paymentError;

    const reference=requestedRef || payment?.provider_transaction_id || payment?.provider_reference || payment?.payment_ref || "";
    if(!reference) return json({pending:true,status:"pending",message:"Référence Notch Pay introuvable."},200);

    const r=await fetch("https://api.notchpay.co/payments/"+encodeURIComponent(reference),{
      method:"GET",headers:{Authorization:NOTCHPAY_API_KEY,"Content-Type":"application/json"}
    });
    const txt=await r.text();
    let provider:any={}; try{provider=txt?JSON.parse(txt):{}}catch{provider={raw:txt}};
    if(!r.ok) return json({error:provider?.message||provider?.error?.message||"Impossible de vérifier le paiement Notch Pay.",provider_status:r.status,paymentId:reference},502);

    const tx=provider?.transaction||provider?.data?.transaction||provider?.payment||provider?.data||provider||{};
    const status=norm(tx?.status||tx?.payment_status||tx?.state||provider?.status||provider?.payment_status||"pending");
    const amount=Number(tx?.amount??tx?.amount_total??tx?.amount_paid??provider?.amount??provider?.data?.amount);
    const currency=String(tx?.currency??provider?.currency??provider?.data?.currency??"XAF").toUpperCase();

    if(Number.isFinite(amount) && payment && Math.round(amount)!==Math.round(Number(payment.amount))) {
      return json({error:"Montant Notch Pay différent du montant de la commande."},400);
    }
    if(currency!=="XAF") return json({error:"Devise Notch Pay inattendue."},400);

    if(success.has(status)){
      if(payment){
        const up=await supabase.from("payments").update({
          status:"completed",statut:"payé",provider_transaction_id:payment.provider_transaction_id||reference,
          raw_response:provider,updated_at:new Date().toISOString(),settled_at:new Date().toISOString()
        }).eq("id",payment.id);
        if(up.error) throw up.error;
      }
      const settled=await supabase.rpc("settle_marketplace_payment",{
        p_order_id:orderId,p_tx_id:reference
      });
      if(settled.error) throw settled.error;
      return json({confirmed:true,success:true,status:"completed",reference,paymentId:reference,orderId});
    }

    if(failed.has(status)){
      if(payment) await supabase.from("payments").update({
        status:"failed",statut:"échoué",failure_reason:status,raw_response:provider,updated_at:new Date().toISOString()
      }).eq("id",payment.id).neq("status","completed");
      await supabase.from("orders").update({payment_status:"FAILED"}).eq("id",orderId).neq("status","paid");
      return json({confirmed:false,failed:true,status,reference,paymentId:reference,orderId});
    }

    return json({confirmed:false,pending:true,status:status||"pending",reference,paymentId:reference,orderId});
  }catch(error){
    return json({error:error instanceof Error?error.message:"Erreur de vérification Notch Pay."},500);
  }
});