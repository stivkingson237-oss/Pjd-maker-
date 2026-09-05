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

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const raw = await req.text();
  if (!(await validSignature(raw, req.headers.get("X-Webhook-Signature") || "", req.headers.get("X-Webhook-Timestamp") || ""))) return json({ error: "invalid_signature" }, 403);
  try {
    const payload = JSON.parse(raw);
    const event = String(payload?.event || req.headers.get("X-Webhook-Event") || "");
    const d = payload?.data || {};
    const txId = String(d?.id || "").trim();
    if (!txId || !['transaction.success','transaction.failed','transaction.cancelled'].includes(event)) return json({ ok: true, ignored: true });

    const { data: payment, error: findError } = await supabase.from("payments").select("id,order_id,amount,status").eq("tx_id", txId).eq("method", "saspay").maybeSingle();
    if (findError) return json({ error: "payment_lookup_failed" }, 500);
    if (!payment) return json({ ok: true, ignored: true, reason: "payment_not_found" });
    const incomingAmount = Number(d?.amount ?? d?.requested_amount ?? 0);
    if (incomingAmount > 0 && Math.abs(incomingAmount - Number(payment.amount)) > 0.01) return json({ error: "amount_mismatch" }, 409);

    const meta = { provider: "saspay", webhook_event: event, reference: d?.reference || null, network: d?.network || null, msisdn: d?.msisdn || null, net_amount: d?.net_amount || null };
    if (event === "transaction.success") {
      if (payment.status !== "completed") {
        const { error } = await supabase.from("payments").update({ status: "completed", statut: "payé", fee: Number(d?.fee || 0), metadata: meta, updated_at: new Date().toISOString() }).eq("id", payment.id);
        if (error) return json({ error: "payment_update_failed" }, 500);
      }
      if (payment.order_id) {
        const { data: order } = await supabase.from("orders").select("status").eq("id", payment.order_id).maybeSingle();
        if (order?.status !== "paid") {
          try { await supabase.rpc("settle_marketplace_payment", { p_order_id: payment.order_id, p_tx_id: txId }); }
          catch (e) { return json({ error: "settlement_failed", details: String(e) }, 500); }
        }
      }
    } else if (payment.status !== "completed") {
      await supabase.from("payments").update({ status: "failed", statut: event === "transaction.cancelled" ? "annulé" : "échoué", metadata: meta, updated_at: new Date().toISOString() }).eq("id", payment.id);
      if (payment.order_id) await supabase.from("orders").update({ status: "failed" }).eq("id", payment.order_id).eq("status", "pending");
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "webhook_error" }, 500);
  }
});
