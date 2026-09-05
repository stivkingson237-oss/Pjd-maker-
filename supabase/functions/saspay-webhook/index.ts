import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("SASPAY_WEBHOOK_SECRET") || "";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function validSignature(raw: string, signature: string, timestamp: string) {
  if (!WEBHOOK_SECRET || !signature || !timestamp) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${raw}`)));
  const expected = Array.from(digest).map(b => b.toString(16).padStart(2, "0")).join("");
  if (expected.length !== signature.length) return false;
  let diff = 0; for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i); return diff === 0;
}

const SUCCESS_EVENTS = new Set(["transaction.success", "transaction.succeeded", "transaction.completed", "payment.success", "payment.succeeded", "payment.completed", "success", "succeeded", "completed"]);
const FAILED_EVENTS = new Set(["transaction.failed", "transaction.cancelled", "transaction.canceled", "payment.failed", "payment.cancelled", "payment.canceled", "failed", "cancelled", "canceled", "expired"]);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get("X-Webhook-Signature") || "", req.headers.get("X-Webhook-Timestamp") || ""))) return json({ error: "invalid_signature" }, 403);
  try {
    const payload = JSON.parse(raw);
    const event = String(payload?.event || payload?.type || req.headers.get("X-Webhook-Event") || "").toLowerCase();
    const d = payload?.data || payload?.payment || payload?.transaction || payload;
    const txId = String(d?.id || d?.payment_id || d?.transaction_id || d?.tx_id || d?.reference || d?.transaction_reference || "").trim();
    if (!txId || (!SUCCESS_EVENTS.has(event) && !FAILED_EVENTS.has(event))) return json({ ok: true, ignored: true, event });

    let { data: payment, error: findError } = await supabase.from("payments").select("id,order_id,amount,status,metadata").eq("tx_id", txId).eq("method", "saspay").maybeSingle();
    if (findError) return json({ error: "payment_lookup_failed" }, 500);
    if (!payment) {
      const { data: byMeta } = await supabase.from("payments").select("id,order_id,amount,status,metadata").eq("method", "saspay").filter("metadata->saspay->>id", "eq", txId).maybeSingle();
      payment = byMeta || null;
    }
    if (!payment) return json({ ok: true, ignored: true, reason: "payment_not_found" });

    const incomingAmount = Number(d?.amount ?? d?.requested_amount ?? d?.paid_amount ?? d?.money?.amount ?? 0);
    if (incomingAmount > 0 && Math.abs(incomingAmount - Number(payment.amount)) > 0.01) return json({ error: "amount_mismatch" }, 409);

    const status = String(d?.status || event).toLowerCase();
    const meta = {
      ...(payment.metadata || {}),
      provider: "saspay",
      webhook_event: event,
      webhook_status: status,
      reference: d?.reference || d?.transaction_reference || null,
      network: d?.network || d?.operator || null,
      msisdn: d?.msisdn || d?.phone || d?.customer?.phone || null,
      net_amount: d?.net_amount || null,
      webhook_received_at: new Date().toISOString()
    };

    if (SUCCESS_EVENTS.has(event)) {
      if (payment.status !== "completed") {
        const { error } = await supabase.from("payments").update({ status: "completed", statut: "payé", fee: Number(d?.fee || 0), metadata: meta, updated_at: new Date().toISOString() }).eq("id", payment.id);
        if (error) return json({ error: "payment_update_failed" }, 500);
      }
      if (payment.order_id) {
        const { data: order } = await supabase.from("orders").select("status").eq("id", payment.order_id).maybeSingle();
        if (order?.status !== "paid") {
          const { error: settleError } = await supabase.rpc("settle_marketplace_payment", { p_order_id: payment.order_id, p_tx_id: txId });
          if (settleError) return json({ error: "settlement_failed", details: settleError.message }, 500);
        }
      }
    } else if (payment.status !== "completed") {
      await supabase.from("payments").update({ status: "failed", statut: event.includes("cancel") ? "annulé" : event.includes("expired") ? "expiré" : "échoué", metadata: meta, updated_at: new Date().toISOString() }).eq("id", payment.id);
      if (payment.order_id) await supabase.from("orders").update({ status: "failed" }).eq("id", payment.order_id).in("status", ["pending", "en_attente"]);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "webhook_error" }, 500);
  }
});
