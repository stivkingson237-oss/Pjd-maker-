import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SASPAY_API_KEY = Deno.env.get("SASPAY_API_KEY") || "";
const API = "https://api.saspay.me/api/v1";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

function norm(v: unknown) { const d = String(v || "").replace(/\D/g, ""); return /^6\d{8}$/.test(d) ? `237${d}` : /^2376\d{8}$/.test(d) ? d : ""; }
function cls(v: unknown) { const s = String(v || "").toLowerCase().replace(/\s+/g, "_"); if (["success", "successful", "succeeded", "completed", "complete", "paid", "confirmed", "paye", "payé"].includes(s)) return "completed"; if (["failed", "failure", "declined", "rejected", "cancelled", "canceled", "expired", "expire", "échoué", "annulé"].includes(s)) return "failed"; return "pending"; }

async function reconcile(orderId: string, paymentId: string) {
  const urls = [`${API}/payments/softpay/${encodeURIComponent(paymentId)}`, `${API}/payments/softpay/${encodeURIComponent(paymentId)}/`];
  for (let a = 0; a < 18; a++) {
    try {
      for (const url of urls) {
        const r = await fetch(url, { headers: { Authorization: `Bearer ${SASPAY_API_KEY}`, Accept: "application/json" } });
        const raw = await r.text(); let b: any = {}; try { b = raw ? JSON.parse(raw) : {}; } catch {}
        if (!r.ok) continue;
        const d = b?.data || b?.payment || b?.transaction || b;
        const ps = d?.status ?? d?.payment_status ?? d?.transaction_status, c = cls(ps);
        const { data: p } = await supabase.from("payments").select("id,status,metadata,amount").eq("order_id", orderId).eq("tx_id", paymentId).maybeSingle();
        if (!p) return;
        const meta = { ...(p.metadata || {}), provider: "saspay", status_check: { at: new Date().toISOString(), endpoint: url, http_status: r.status, provider_status: ps ?? null, response: d } };
        if (c === "completed") {
          await supabase.from("payments").update({ status: "completed", statut: "payé", fee: Number(d?.fee || p.metadata?.saspay?.fee || 0), metadata: meta, updated_at: new Date().toISOString() }).eq("id", p.id);
          const { data: order } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
          if (order?.status !== "paid") await supabase.rpc("settle_marketplace_payment", { p_order_id: orderId, p_tx_id: paymentId });
          return;
        }
        if (c === "failed") {
          const reason = d?.message || d?.failure_reason || d?.reason || d?.error || ps || "failed";
          await supabase.from("payments").update({ status: "failed", statut: String(reason), metadata: { ...meta, failure_reason: String(reason) }, updated_at: new Date().toISOString() }).eq("id", p.id).neq("status", "completed");
          await supabase.from("orders").update({ status: "failed" }).eq("id", orderId).in("status", ["pending", "en_attente"]);
          return;
        }
      }
    } catch {}
    await new Promise(r => setTimeout(r, 10000));
  }
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Authentification requise." }, 401);
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: auth } });
    if (!u.ok) return json({ error: "Session utilisateur invalide ou expirée." }, 401);
    const user = await u.json();
    const body = await req.json(); const orderId = String(body.orderId || "").trim();
    if (!orderId) return json({ error: "orderId requis." }, 400);
    const { data: order, error: oe } = await supabase.from("orders").select("id,user_id,total,status").eq("id", orderId).maybeSingle();
    if (oe || !order) return json({ error: "Commande introuvable." }, 404);
    if (String(order.user_id) !== String(user.id)) return json({ error: "Cette commande ne vous appartient pas." }, 403);
    if (["paid", "completed", "confirmed", "processing", "shipped", "delivered"].includes(String(order.status || "").toLowerCase())) return json({ error: "Cette commande est déjà payée." }, 409);
    const phone = norm(body.phone), operator = String(body.operator || "").toUpperCase(), network = operator === "MTN" ? "mtn_cm" : operator === "ORANGE" ? "orange_cm" : "";
    if (!phone) return json({ error: "Numéro camerounais invalide." }, 400);
    if (!network) return json({ error: "Choisissez MTN Mobile Money ou Orange Money." }, 400);
    if (!SASPAY_API_KEY) return json({ error: "SASPAY_API_KEY non configurée." }, 500);
    const amount = Number(order.total); if (!Number.isFinite(amount) || amount <= 0) return json({ error: "Montant invalide." }, 400);
    const { data: existing } = await supabase.from("payments").select("id,tx_id,status,metadata").eq("order_id", orderId).eq("method", "saspay").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (existing?.tx_id && ["pending", "processing"].includes(String(existing.status || "").toLowerCase())) {
      try { (globalThis as any).EdgeRuntime?.waitUntil(reconcile(orderId, String(existing.tx_id))); } catch {}
      return json({ success: true, pending: true, paymentId: existing.tx_id, message: "Demande SasPay déjà en attente. Validez le paiement sur votre téléphone." });
    }
    const idempotency = crypto.randomUUID();
    const payload = { amount: amount.toFixed(2), currency: "XAF", country: "CM", network, description: `PJD Maker - Commande ${orderId}`, customer: { email: user.email || "", first_name: String(user.user_metadata?.first_name || user.user_metadata?.name || "Client"), last_name: String(user.user_metadata?.last_name || "PJD Maker"), phone }, metadata: { order_id: orderId, pjd_order_id: orderId } };
    const r = await fetch(`${API}/payments/softpay/`, { method: "POST", headers: { Authorization: `Bearer ${SASPAY_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": idempotency }, body: JSON.stringify(payload) });
    const raw = await r.text(); let response: any = {}; try { response = raw ? JSON.parse(raw) : {}; } catch {}
    const data = response?.data || response;
    if (!r.ok) return json({ error: response?.error?.message || response?.message || "SasPay a refusé le paiement.", code: response?.error?.code || response?.code || "saspay_error", provider_status: r.status }, 502);
    const paymentId = String(data?.id || data?.payment_id || data?.transaction_id || data?.reference || "").trim();
    if (!paymentId) return json({ error: "SasPay n'a pas retourné d'identifiant de paiement." }, 502);
    const metadata = { provider: "saspay", network, idempotency_key: idempotency, saspay: data, http_status: r.status, last_provider_status: String(data?.status || "PENDING").toUpperCase() };
    const pp = { user_id: user.id, order_id: orderId, amount, currency: "XAF", method: "saspay", status: "pending", statut: "en_attente", tx_id: paymentId, payment_ref: orderId, item_ref: orderId, phone, operator: network, fee: Number(data?.fee || 0), metadata };
    const w = await supabase.from("payments").insert(pp); if (w.error) return json({ error: "Paiement lancé mais impossible d'enregistrer la transaction PJD Maker." }, 500);
    try { (globalThis as any).EdgeRuntime?.waitUntil(reconcile(orderId, paymentId)); } catch {}
    return json({ success: true, pending: true, paymentId, status: String(data?.status || "PENDING"), message: "Demande envoyée à SasPay. Validez le paiement sur votre téléphone. PJD Maker vérifie automatiquement la confirmation SasPay." });
  } catch (e) { return json({ error: e instanceof Error ? e.message : "Erreur SasPay." }, 500); }
});
