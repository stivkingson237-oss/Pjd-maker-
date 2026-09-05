import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SASPAY_API_KEY = Deno.env.get("SASPAY_API_KEY") || "";
const API = "https://api.saspay.me/api/v1";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);
  try {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Authentification requise." }, 401);
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: auth } });
    if (!u.ok) return json({ error: "Session utilisateur invalide ou expirée." }, 401);
    const user = await u.json();
    if (!SASPAY_API_KEY) return json({ error: "SASPAY_API_KEY n'est pas configurée dans Supabase." }, 500);

    const body = await req.json();
    const orderId = String(body.orderId || "").trim();
    const phone = String(body.phone || "").replace(/\D/g, "");
    const operator = String(body.operator || "").toUpperCase();
    if (!orderId) return json({ error: "orderId requis." }, 400);
    if (!/^2376\d{8}$/.test(phone)) return json({ error: "Numéro camerounais invalide. Utilisez 6XXXXXXXX." }, 400);
    const network = operator === "MTN" ? "mtn_cm" : operator === "ORANGE" ? "orange_cm" : "";
    if (!network) return json({ error: "Choisissez MTN Mobile Money ou Orange Money." }, 400);

    const { data: order, error: orderError } = await supabase.from("orders").select("id,user_id,total,status").eq("id", orderId).maybeSingle();
    if (orderError) return json({ error: "Impossible de lire la commande." }, 500);
    if (!order) return json({ error: "Commande introuvable." }, 404);
    if (String(order.user_id) !== String(user.id)) return json({ error: "Cette commande ne vous appartient pas." }, 403);
    if (!['pending','en_attente'].includes(String(order.status || 'pending'))) return json({ error: "Cette commande n'est plus payable." }, 409);

    const amount = Number(order.total);
    if (!Number.isFinite(amount) || amount <= 0) return json({ error: "Montant de commande invalide." }, 400);

    const { data: existing } = await supabase.from("payments").select("id,tx_id,status").eq("order_id", orderId).eq("method", "saspay").in("status", ["pending", "processing"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (existing?.tx_id) return json({ success: true, pending: true, paymentId: existing.tx_id, message: "Un paiement SasPay est déjà en attente. Validez la demande sur votre téléphone." });

    const idempotency = crypto.randomUUID();
    const payload = {
      amount: amount.toFixed(2), currency: "XAF", country: "CM", network,
      description: `PJD Maker - Commande ${orderId}`,
      customer: { email: user.email || "", first_name: String(user.user_metadata?.first_name || user.user_metadata?.name || "Client"), last_name: String(user.user_metadata?.last_name || "PJD Maker"), phone },
      metadata: { order_id: orderId, pjd_order_id: orderId }
    };

    const r = await fetch(`${API}/payments/softpay/`, { method: "POST", headers: { Authorization: `Bearer ${SASPAY_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": idempotency }, body: JSON.stringify(payload) });
    const raw = await r.text();
    let response: any = {}; try { response = raw ? JSON.parse(raw) : {}; } catch { response = {}; }
    if (!r.ok) return json({ error: response?.error?.message || response?.message || "SasPay a refusé le paiement.", code: response?.error?.code || response?.code || "saspay_error" }, 502);

    const data = response?.data || response;
    const paymentId = String(data?.id || "").trim();
    if (!paymentId) return json({ error: "SasPay n'a pas retourné d'identifiant de paiement." }, 502);

    const paymentPayload = {
      user_id: user.id, order_id: orderId, amount, method: "saspay", currency: "XAF",
      status: "pending", statut: "en_attente", tx_id: paymentId, payment_ref: orderId, item_ref: orderId,
      phone, operator: network, fee: Number(data?.fee || 0), metadata: { provider: "saspay", network, idempotency_key: idempotency, saspay: data }
    };
    const { error: writeError } = await supabase.from("payments").insert(paymentPayload);
    if (writeError) return json({ error: "Paiement lancé mais impossible d'enregistrer la transaction PJD Maker." }, 500);

    return json({ success: true, pending: true, paymentId, status: data?.status || "PENDING", checkout_url: data?.checkout_url || "", instructions: data?.instructions || "Validez la demande de paiement sur votre téléphone." });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Erreur SasPay." }, 500);
  }
});
