import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const API_KEY = (Deno.env.get("SASPAY_API_KEY") || "").trim();
const SECRET = (Deno.env.get("SASPAY_WEBHOOK_SECRET") || "").trim();
const API = "https://api.saspay.me/api/v1";
const db = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const normalize = (v: unknown) => String(v ?? "").trim().toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_ ]/g, "").replace(/\s+/g, "_");

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function base64(buffer: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
function safeEqual(a: string, b: string) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
async function hmac(hash: "SHA-256" | "SHA-512", value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(SECRET), {
    name: "HMAC", hash,
  }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
}
async function verifySignature(req: Request, raw: string) {
  if (!SECRET) return { ok: false, reason: "webhook_secret_missing" };
  const signature = req.headers.get("X-Webhook-Signature")
    || req.headers.get("X-SasPay-Signature")
    || req.headers.get("X-SASPAY-Signature")
    || req.headers.get("X-SasPay-Webhook-Signature") || "";
  if (!signature) return { ok: false, reason: "signature_missing" };
  const supplied = signature.trim().replace(/^hmac-sha(256|512)=/i, "")
    .replace(/^sha(256|512)=/i, "").trim();
  const timestamp = req.headers.get("X-Webhook-Timestamp")
    || req.headers.get("X-SasPay-Timestamp")
    || req.headers.get("X-SASPAY-Timestamp") || "";
  if (timestamp) {
    const n = Number(timestamp), ms = n < 1e12 ? n * 1000 : n;
    if (!Number.isFinite(ms) || Math.abs(Date.now() - ms) > 300000) {
      return { ok: false, reason: "stale_timestamp" };
    }
  }
  const messages = timestamp ? [`${timestamp}.${raw}`, raw] : [raw];
  for (const message of messages) {
    for (const alg of ["SHA-256", "SHA-512"] as const) {
      const mac = await hmac(alg, message);
      if (safeEqual(supplied.toLowerCase(), hex(mac)) || safeEqual(supplied, base64(mac))) {
        return { ok: true, scheme: `hmac-${alg.toLowerCase()}` };
      }
    }
  }
  return { ok: false, reason: "signature_mismatch" };
}
function extract(value: any, depth = 0): any {
  if (!value || typeof value !== "object" || depth > 8) return {};
  const result: any = {};
  const keys = ["id", "payment_id", "paymentId", "transaction_id", "transactionId", "tx_id",
    "reference", "transaction_reference", "transactionReference", "external_reference",
    "externalReference", "status", "payment_status", "transaction_status", "state",
    "amount", "paid_amount", "currency"];
  for (const key of keys) if (value[key] != null && typeof value[key] !== "object") result[key] = value[key];
  if (result.id || result.payment_id || result.paymentId || result.transaction_id ||
      result.transactionId || result.tx_id || result.reference || result.transaction_reference ||
      result.transactionReference || result.external_reference || result.externalReference) return result;
  for (const child of Object.values(value)) {
    const nested = extract(child, depth + 1);
    if (Object.keys(nested).length) return nested;
  }
  return result;
}
function classify(value: unknown) {
  const status = normalize(value);
  if (["success", "successful", "succeeded", "completed", "complete", "paid", "confirmed",
    "payment_success", "payment_succeeded", "transaction_success", "transaction_completed",
    "paye", "paid_successfully"].includes(status)) return "success";
  if (["failed", "failure", "declined", "rejected", "cancelled", "canceled", "expired",
    "payment_failed", "transaction_failed", "transaction_cancelled", "echoue", "annule"].includes(status)) return "failed";
  return "pending";
}
async function verifyWithSasPay(tx: string, expectedAmount: number) {
  if (!API_KEY) return { confirmed: false, failed: false, reason: "saspay_api_key_missing" };
  const endpoints = [
    `${API}/payments/softpay/${encodeURIComponent(tx)}`,
    `${API}/payments/softpay/${encodeURIComponent(tx)}/`,
    `${API}/payments/${encodeURIComponent(tx)}`,
    `${API}/payments/${encodeURIComponent(tx)}/`,
    `${API}/transactions/${encodeURIComponent(tx)}`,
    `${API}/transactions/${encodeURIComponent(tx)}/`,
  ];
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${API_KEY}`, Accept: "application/json" },
      });
      if (!response.ok) continue;
      const payload = await response.json();
      const data = payload?.data || payload?.payment || payload?.transaction || payload;
      const item = extract(data);
      const status = classify(item.status || item.payment_status || item.transaction_status || item.state);
      const providerId = String(item.id || item.payment_id || item.paymentId || item.transaction_id ||
        item.transactionId || item.tx_id || item.reference || item.transaction_reference || "");
      if (providerId && providerId !== tx) continue;
      const amount = Number(item.amount ?? item.paid_amount);
      if (Number.isFinite(amount) && amount > 0 && Math.abs(amount - expectedAmount) > 0.01) {
        return { confirmed: false, failed: false, reason: "provider_amount_mismatch" };
      }
      const currency = String(item.currency || data?.currency || "XAF").toUpperCase();
      if (currency !== "XAF") return { confirmed: false, failed: false, reason: "provider_currency_mismatch" };
      return { confirmed: status === "success", failed: status === "failed", status: item.status || null,
        amount: Number.isFinite(amount) ? amount : null, endpoint };
    } catch {
      // Try the next documented/compatible status route.
    }
  }
  return { confirmed: false, failed: false, reason: "provider_status_unavailable" };
}

Deno.serve(async (req) => {
  if (req.method === "GET") return json({ ok: true, service: "saspay-webhook-v3", status: "active",
    signature_verification: Boolean(SECRET), provider_verification: Boolean(API_KEY) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const raw = await req.text();
  const signature = await verifySignature(req, raw);
  if (!signature.ok) return json({ ok: false, error: "invalid_webhook_signature", reason: signature.reason }, 401);

  let body: any;
  try { body = JSON.parse(raw); } catch { return json({ ok: false, error: "invalid_json" }, 400); }

  const event = String(body?.event || body?.type || req.headers.get("X-Webhook-Event") ||
    req.headers.get("X-SasPay-Event") || "");
  const item = extract(body?.data ?? body);
  const tx = String(item.id || item.payment_id || item.paymentId || item.transaction_id ||
    item.transactionId || item.tx_id || item.reference || item.transaction_reference ||
    item.transactionReference || item.external_reference || item.externalReference || "").trim();
  if (!tx) return json({ ok: true, received: true, ignored: true, reason: "transaction_id_missing" });

  let payment: any = null;
  const primary = await db.from("payments")
    .select("id,user_id,order_id,amount,status,metadata,currency,tx_id")
    .eq("tx_id", tx).eq("method", "saspay").maybeSingle();
  if (primary.error) return json({ error: "payment_lookup_failed" }, 500);
  payment = primary.data;
  if (!payment) {
    const fallback = await db.from("payments")
      .select("id,user_id,order_id,amount,status,metadata,currency,tx_id")
      .eq("method", "saspay").filter("metadata->saspay->>id", "eq", tx).maybeSingle();
    if (fallback.error) return json({ error: "payment_lookup_failed" }, 500);
    payment = fallback.data;
  }
  if (!payment) return json({ ok: true, received: true, ignored: true, reason: "payment_not_found" });

  const expectedAmount = Number(payment.amount);
  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) return json({ error: "invalid_local_amount" }, 409);
  if (item.amount != null && Math.abs(Number(item.amount) - expectedAmount) > 0.01) {
    return json({ error: "amount_mismatch" }, 409);
  }
  if (String(item.currency || payment.currency || "XAF").toUpperCase() !== "XAF") {
    return json({ error: "currency_mismatch" }, 409);
  }

  const eventClass = classify(item.status || item.payment_status || item.transaction_status || item.state) === "pending"
    ? classify(event) : classify(item.status || item.payment_status || item.transaction_status || item.state);
  let provider = { confirmed: false, failed: false, reason: "not_checked" } as any;
  if (eventClass === "success" || eventClass === "failed") {
    provider = await verifyWithSasPay(tx, expectedAmount);
  }
  const effective = provider.confirmed ? "success" : provider.failed ? "failed" : "pending";

  const deliveryId = req.headers.get("X-Webhook-Id") || req.headers.get("X-SasPay-Event-Id") ||
    req.headers.get("X-Delivery-Id") ||
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(
      `${tx}.${event}.${item.amount ?? ""}.${item.status ?? ""}`,
    )).then(hex);
  const dedupe = await db.from("payment_webhook_events").insert({
    provider: "saspay", delivery_id: deliveryId, event_type: event,
    payload: { transaction_id: tx, event, status: item.status ?? null,
      received_at: new Date().toISOString(), signature_verified: true,
      provider_verified: effective !== "pending" },
  });
  if (dedupe.error?.code === "23505") return json({ ok: true, duplicate: true });
  if (dedupe.error) return json({ error: "webhook_record_failed" }, 500);

  const metadata = { ...(payment.metadata || {}), provider: "saspay",
    webhook_received_at: new Date().toISOString(), webhook_event: event,
    webhook_status: item.status ?? null, signature_verified: true,
    signature_scheme: signature.scheme, provider_verified: effective !== "pending",
    provider_status: provider.status ?? null, provider_check_reason: provider.reason ?? null };

  if (effective === "success") {
    const subscriptionId = String(payment.metadata?.subscription_id || "");
    if (payment.metadata?.pjd_type === "seller_subscription" && subscriptionId) {
      const lookup = await db.from("subscriptions")
        .select("id,user_id,shop_id,plan_code,billing_cycle,status,payment_reference")
        .eq("id", subscriptionId).maybeSingle();
      if (lookup.error || !lookup.data) return json({ error: "subscription_lookup_failed" }, 500);
      const sub = lookup.data;
      if (sub.user_id !== payment.user_id ||
          String(sub.shop_id) !== String(payment.metadata?.shop_id || "") ||
          String(sub.plan_code) !== String(payment.metadata?.plan_code || "")) {
        return json({ error: "subscription_payment_mismatch" }, 409);
      }
      if (sub.status === "active" && sub.payment_reference === tx) {
        return json({ ok: true, duplicate: true, classification: "subscription_already_active" });
      }
      const planResult = await db.from("seller_plans").select("commission_rate")
        .eq("code", sub.plan_code).eq("active", true).maybeSingle();
      if (planResult.error || !planResult.data) return json({ error: "seller_plan_not_found" }, 409);

      const now = new Date();
      const end = new Date(now);
      if (sub.billing_cycle === "annual") end.setFullYear(end.getFullYear() + 1);
      else end.setMonth(end.getMonth() + 1);

      const paid = await db.from("payments").update({
        status: "completed", statut: "payé", metadata,
        updated_at: now.toISOString(),
      }).eq("id", payment.id).neq("status", "completed");
      if (paid.error) return json({ error: "payment_update_failed" }, 500);

      const activated = await db.from("subscriptions").update({
        status: "active", starts_at: now.toISOString(), ends_at: end.toISOString(),
        payment_reference: tx,
      }).eq("id", sub.id).eq("user_id", payment.user_id);
      if (activated.error) return json({ error: "subscription_activation_failed" }, 500);

      const shopUpdate = await db.from("shops").update({
        plan_code: sub.plan_code, commission_rate: Number(planResult.data.commission_rate),
      }).eq("id", sub.shop_id).eq("owner_id", payment.user_id);
      if (shopUpdate.error) return json({ error: "shop_plan_update_failed" }, 500);
      return json({ ok: true, processed: true, classification: "subscription_success",
        subscription_id: sub.id, provider_verified: true });
    }

    const paid = await db.from("payments").update({
      status: "completed", statut: "payé", metadata,
      updated_at: new Date().toISOString(),
    }).eq("id", payment.id).neq("status", "completed");
    if (paid.error) return json({ error: "payment_update_failed" }, 500);
    if (payment.order_id) {
      const settled = await db.rpc("settle_marketplace_payment", {
        p_order_id: payment.order_id, p_tx_id: tx,
      });
      if (settled.error) return json({ error: "settlement_failed" }, 500);
    }
    return json({ ok: true, processed: true, classification: "success", provider_verified: true });
  }

  if (effective === "failed") {
    if (payment.status !== "completed") {
      const failed = await db.from("payments").update({
        status: "failed", statut: String(item.status || event || "failed"),
        metadata, updated_at: new Date().toISOString(),
      }).eq("id", payment.id).neq("status", "completed");
      if (failed.error) return json({ error: "payment_update_failed" }, 500);
      const subscriptionId = String(payment.metadata?.subscription_id || "");
      if (subscriptionId && payment.metadata?.pjd_type === "seller_subscription") {
        await db.from("subscriptions").update({ status: "failed" })
          .eq("id", subscriptionId).eq("user_id", payment.user_id).eq("status", "pending");
      }
      if (payment.order_id) {
        await db.from("orders").update({ status: "failed", payment_status: "failed" })
          .eq("id", payment.order_id).in("status", ["pending", "en_attente"]);
      }
    }
    return json({ ok: true, processed: true, classification: "failed", provider_verified: true });
  }

  // Do not consume the webhook delivery ID while SasPay still reports pending.
  // SasPay may retry the same delivery after the transaction settles.
  return json({ ok: true, received: true, pending: true,
    reason: provider.reason || "provider_not_confirmed", provider_status: provider.status ?? item.status ?? null }, 202);
});