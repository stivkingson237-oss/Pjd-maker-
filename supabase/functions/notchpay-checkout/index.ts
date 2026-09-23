import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NOTCHPAY_API_KEY = Deno.env.get("NOTCHPAY_API_KEY") || "";
const APP_URL = (Deno.env.get("PJD_APP_URL") || "https://pjd-maker.vercel.app").replace(/\/$/, "");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const API = "https://api.notchpay.co";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

function phone(v: unknown) {
  const raw = String(v ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  if (/^\+2376\d{8}$/.test(raw)) return raw;
  if (/^6\d{8}$/.test(digits)) return "+237" + digits;
  if (/^2376\d{8}$/.test(digits)) return "+" + digits;
  return "";
}

function channel(v: unknown) {
  const n = String(v ?? "").toUpperCase().replace(/\s+/g, "");
  if (n === "MTN" || n === "MTNMOBILEMONEY") return "cm.mtn";
  if (n === "ORANGE" || n === "ORANGEMONEY") return "cm.orange";
  return "";
}

function pick(obj: any, ...paths: string[]) {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, key) => acc?.[key], obj);
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return null;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  try {
    if (!NOTCHPAY_API_KEY) return json({ error: "NOTCHPAY_API_KEY non configurée." }, 500);

    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Authentification requise." }, 401);

    const { data: authData, error: authError } =
      await supabase.auth.getUser(auth.slice(7));
    if (authError || !authData?.user)
      return json({ error: "Session utilisateur invalide ou expirée." }, 401);

    const body = await req.json();
    const orderId = String(body?.orderId ?? "").trim();
    const payerPhone = phone(body?.phone);
    const selectedChannel = channel(body?.network);

    if (!orderId) return json({ error: "orderId requis." }, 400);
    if (!payerPhone)
      return json({ error: "Numéro camerounais invalide. Utilisez +2376XXXXXXXX." }, 400);
    if (!selectedChannel)
      return json({ error: "Réseau Mobile Money invalide." }, 400);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id,user_id,total,status,payment_status")
      .eq("id", orderId)
      .maybeSingle();

    if (orderError) return json({ error: orderError.message }, 500);
    if (!order) return json({ error: "Commande introuvable." }, 404);
    if (String(order.user_id) !== String(authData.user.id))
      return json({ error: "Cette commande ne vous appartient pas." }, 403);

    const current = String(order.payment_status || order.status || "").toLowerCase();
    if (["paid", "completed", "confirmed", "processing", "shipped", "delivered"].includes(current)) {
      return json({ success: true, already_paid: true, orderId });
    }

    const amount = Number(order.total);
    if (!Number.isFinite(amount) || amount <= 0)
      return json({ error: "Montant de commande invalide." }, 400);

    // Avoid creating a second provider transaction when the customer taps Pay twice.
    const { data: existing } = await supabase
      .from("payments")
      .select("id,status,provider_transaction_id,provider_reference,payment_ref,amount")
      .eq("order_id", orderId)
      .eq("provider", "notchpay")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const existingStatus = String(existing?.status || "").toLowerCase();
    if (existing?.provider_transaction_id && ["pending", "processing"].includes(existingStatus)) {
      return json({
        success: true,
        pending: true,
        orderId,
        paymentId: existing.provider_transaction_id,
        tx_ref: existing.provider_transaction_id,
        status: "pending",
        mobile_money_request: selectedChannel === "cm.mtn",
        instruction:
          selectedChannel === "cm.mtn"
            ? "Une demande MTN Mobile Money est déjà en attente. Validez-la sur votre téléphone."
            : "Une demande Mobile Money est déjà en attente. Validez-la sur votre téléphone.",
      });
    }

    const paymentReference = `PJD-${orderId}-${Date.now()}`;
    const initializePayload = {
      amount: Math.round(amount),
      currency: "XAF",
      customer: {
        email: authData.user.email || undefined,
        phone: payerPhone,
      },
      description: "PJD Market - Commande " + orderId,
      reference: paymentReference,
      callback: APP_URL + "/notchpay-callback.html",
      locked_country: "CM",
      metadata: {
        order_id: orderId,
        pjd_order_id: orderId,
        user_id: authData.user.id,
        preferred_channel: selectedChannel,
      },
    };

    const initResponse = await fetch(API + "/payments", {
      method: "POST",
      headers: {
        Authorization: NOTCHPAY_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(initializePayload),
    });

    const initText = await initResponse.text();
    let initData: any = {};
    try {
      initData = initText ? JSON.parse(initText) : {};
    } catch {
      initData = { raw: initText };
    }

    if (!initResponse.ok) {
      return json(
        {
          error:
            initData?.message ||
            initData?.error?.message ||
            "Notch Pay a refusé l'initialisation.",
          provider_status: initResponse.status,
          details: initData?.errors || null,
        },
        502
      );
    }

    const transaction = initData?.transaction || initData?.data?.transaction || initData?.data || initData;
    const reference = String(
      pick(transaction, "reference") ||
      pick(initData, "data.reference", "reference") ||
      ""
    ).trim();

    const merchantReference = String(
      pick(transaction, "trxref", "merchant_reference") ||
      pick(initData, "data.trxref", "data.merchant_reference") ||
      paymentReference
    ).trim();

    const hostedUrl =
      pick(transaction, "authorization_url") ||
      pick(initData, "authorization_url", "data.authorization_url") ||
      null;

    if (!reference)
      return json({ error: "Notch Pay n'a pas retourné la référence de transaction." }, 502);

    // This is the important part for MTN Mobile Money:
    // charge the selected channel directly with the customer's phone.
    // We intentionally DO NOT redirect MTN customers to the hosted checkout.
    const chargeResponse = await fetch(API + "/payments/" + encodeURIComponent(reference), {
      method: "POST",
      headers: {
        Authorization: NOTCHPAY_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        channel: selectedChannel,
        phone: payerPhone.replace(/\D/g, ""),
        email: authData.user.email || undefined,
      }),
    });

    const chargeText = await chargeResponse.text();
    let chargeData: any = {};
    try {
      chargeData = chargeText ? JSON.parse(chargeText) : {};
    } catch {
      chargeData = { raw: chargeText };
    }

    // Notch Pay charge is asynchronous. A successful 202 means the request was
    // accepted and the customer should approve it on the Mobile Money client.
    if (!chargeResponse.ok && chargeResponse.status !== 202) {
      return json(
        {
          error:
            chargeData?.message ||
            chargeData?.error?.message ||
            "Notch Pay n'a pas pu déclencher le paiement Mobile Money.",
          provider_status: chargeResponse.status,
          details: chargeData?.errors || null,
          paymentId: reference,
        },
        502
      );
    }

    const chargeTransaction =
      chargeData?.transaction ||
      chargeData?.data?.transaction ||
      chargeData?.data ||
      chargeData ||
      {};

    const chargeStatus = String(
      chargeTransaction?.status ||
      chargeData?.status ||
      "pending"
    ).toLowerCase();

    // MTN must remain on the native Mobile Money approval flow. If Notch also
    // returns an authorization URL, keep it in metadata for diagnostics but do
    // not send the customer away from the PJD checkout.
    const isDirectMobileMoney = selectedChannel === "cm.mtn" || selectedChannel === "cm.orange";
    const authorizationUrl = isDirectMobileMoney ? null : hostedUrl;

    const instruction =
      selectedChannel === "cm.mtn"
        ? "Une demande MTN Mobile Money vient d'être envoyée au numéro " +
          payerPhone +
          ". Ouvrez la notification MTN et entrez votre code PIN pour confirmer le paiement."
        : selectedChannel === "cm.orange"
          ? "Une demande Orange Money vient d'être envoyée au numéro " +
            payerPhone +
            ". Validez-la sur votre téléphone."
          : "Validez le paiement sur la page sécurisée.";

    const paymentRow = {
      user_id: authData.user.id,
      order_id: orderId,
      amount,
      currency: "XAF",
      method: "notchpay",
      status: "pending",
      statut: "en_attente",
      tx_id: reference,
      payment_ref: paymentReference,
      item_ref: orderId,
      phone: payerPhone,
      operator: selectedChannel,
      provider: "notchpay",
      provider_reference: merchantReference,
      provider_transaction_id: reference,
      metadata: {
        provider: "notchpay",
        network: selectedChannel,
        authorization_url: hostedUrl,
        flow: isDirectMobileMoney ? "direct_mobile_money_charge" : "hosted_collect",
        charge_status: chargeStatus,
        mobile_money_request: selectedChannel === "cm.mtn",
      },
      raw_response: {
        initialize: initData,
        charge: chargeData,
      },
      updated_at: new Date().toISOString(),
    };

    const write = existing?.id
      ? await supabase.from("payments").update(paymentRow).eq("id", existing.id)
      : await supabase.from("payments").insert(paymentRow);

    if (write.error) {
      return json(
        {
          error: "Paiement initialisé mais impossible d'enregistrer la transaction PJD Market.",
          details: write.error.message,
        },
        500
      );
    }

    const orderUpdate = await supabase
      .from("orders")
      .update({
        payment_method: "notchpay",
        payment_status: "PENDING",
      })
      .eq("id", orderId);

    if (orderUpdate.error) {
      return json({ error: orderUpdate.error.message }, 500);
    }

    return json({
      success: true,
      pending: true,
      orderId,
      paymentId: reference,
      tx_ref: reference,
      status: chargeStatus || "pending",
      authorization_url: authorizationUrl,
      mobile_money_request: selectedChannel === "cm.mtn",
      instruction,
      flow: isDirectMobileMoney ? "direct_mobile_money_charge" : "hosted_collect",
    });
  } catch (error) {
    return json({
      error: error instanceof Error ? error.message : "Erreur Notch Pay.",
    }, 500);
  }
});
