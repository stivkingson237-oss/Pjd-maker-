import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_HASH = Deno.env.get("NOTCHPAY_WEBHOOK_HASH") || "";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-notch-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function hex(bytes: Uint8Array) { return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join(""); }
async function hmac(payload: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))));
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function first(...values: unknown[]) {
  for (const value of values) if (typeof value === "string" && value.trim()) return value.trim();
  return "";
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);
  if (!WEBHOOK_HASH) return json({ error: "NOTCHPAY_WEBHOOK_HASH non configurée." }, 500);
  try {
    const raw = await req.text();
    const signature = req.headers.get("x-notch-signature") || "";
    if (!signature) return json({ error: "Signature manquante." }, 401);
    if (!safeEqual((await hmac(raw, WEBHOOK_HASH)).toLowerCase(), signature.trim().toLowerCase())) {
      return json({ error: "Signature Notch Pay invalide." }, 403);
    }

    let event: any;
    try { event = JSON.parse(raw); } catch { return json({ error: "Payload JSON invalide." }, 400); }

    const type = String(event?.type || event?.event || "").toLowerCase();
    const data = event?.data || event?.transaction || event?.payload || {};
    const transaction = data?.transaction && typeof data.transaction === "object" ? data.transaction : (data?.payment && typeof data.payment === "object" ? data.payment : {});
    const reference = first(
      data?.reference, transaction?.reference, data?.customer_meta?.order_id,
      data?.customer_meta?.pjd_order_id, data?.metadata?.order_id,
      data?.metadata?.pjd_order_id, event?.metadata?.order_id, event?.metadata?.pjd_order_id
    );
    const providerId = first(data?.transaction_id, transaction?.id, transaction?.trxref, data?.id, event?.id);
    if (!reference && !providerId) return json({ received: true, ignored: true, reason: "reference_missing" });

    let payment: any = null;
    if (reference) {
      const q = await supabase.from("payments")
        .select("id,order_id,user_id,amount,status,provider_reference,provider_transaction_id,payment_ref")
        .eq("provider", "notchpay")
        .or(`provider_reference.eq.${reference},provider_transaction_id.eq.${reference},payment_ref.eq.${reference}`)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (q.error) throw q.error;
      payment = q.data;
    }
    if (!payment && providerId) {
      const q = await supabase.from("payments")
        .select("id,order_id,user_id,amount,status,provider_reference,provider_transaction_id,payment_ref")
        .eq("provider", "notchpay").eq("provider_transaction_id", providerId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (q.error) throw q.error;
      payment = q.data;
    }
    if (!payment) return json({ received: true, ignored: true, reason: "payment_not_found" });

    const amount = Number(data?.amount ?? transaction?.amount);
    const currency = String(data?.currency ?? transaction?.currency ?? "XAF").toUpperCase();
    if (Number.isFinite(amount) && Math.round(amount) !== Math.round(Number(payment.amount))) {
      return json({ error: "Montant webhook différent du montant PJD Market." }, 400);
    }
    if (currency !== "XAF") return json({ error: "Devise webhook inattendue." }, 400);

    const successEvents = new Set(["payment.complete", "payment.completed", "payment.success", "payment.succeeded", "transaction.complete", "transaction.completed", "transaction.success", "transaction.succeeded"]);
    const failedEvents = new Set(["payment.failed", "payment.failure", "payment.canceled", "payment.cancelled", "payment.expired", "transaction.failed", "transaction.failure", "transaction.canceled", "transaction.cancelled", "transaction.expired"]);

    if (successEvents.has(type)) {
      const update = await supabase.from("payments").update({
        status: "completed", statut: "payé",
        provider_reference: payment.provider_reference || reference || null,
        provider_transaction_id: providerId || payment.provider_transaction_id,
        raw_response: event,
        metadata: { provider: "notchpay", event_type: type, event_id: event?.id || null, reference: reference || null, completed_at: data?.completed_at || event?.created_at || new Date().toISOString() },
        settled_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq("id", payment.id);
      if (update.error) throw update.error;

      const settled = await supabase.rpc("settle_marketplace_payment", {
        p_order_id: payment.order_id, p_tx_id: providerId || reference || payment.provider_transaction_id
      });
      if (settled.error) throw settled.error;
      return json({ received: true, processed: true, status: "completed", order_id: payment.order_id });
    }

    if (failedEvents.has(type)) {
      if (String(payment.status).toLowerCase() === "completed") {
        return json({ received: true, processed: false, ignored: true, reason: "already_completed" });
      }
      const update = await supabase.from("payments").update({
        status: "failed", statut: "échoué",
        provider_reference: payment.provider_reference || reference || null,
        provider_transaction_id: providerId || payment.provider_transaction_id,
        failure_reason: type, raw_response: event,
        metadata: { provider: "notchpay", event_type: type, event_id: event?.id || null, reference: reference || null },
        updated_at: new Date().toISOString()
      }).eq("id", payment.id).neq("status", "completed");
      if (update.error) throw update.error;
      await supabase.from("orders").update({ payment_status: "FAILED" }).eq("id", payment.order_id).neq("status", "paid");
      return json({ received: true, processed: true, status: "failed", order_id: payment.order_id });
    }

    return json({ received: true, processed: false, event_type: type });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erreur webhook Notch Pay." }, 500);
  }
});