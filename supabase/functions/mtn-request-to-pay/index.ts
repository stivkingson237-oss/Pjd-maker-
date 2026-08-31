import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MTN_BASE_URL = "https://sandbox.momodeveloper.mtn.com";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const apiUser = Deno.env.get("MTN_API_USER");
    const apiKey = Deno.env.get("MTN_API_KEY");
    const subscriptionKey = Deno.env.get("MTN_SUBSCRIPTION_KEY");

    if (!apiUser || !apiKey || !subscriptionKey) {
      return json({ error: "MTN secrets are not configured" }, 500);
    }

    const input = await req.json();
    const amount = String(input.amount ?? "");
    const currency = String(input.currency ?? "XAF");
    const externalId = String(input.externalId ?? `PJD-${crypto.randomUUID()}`);
    const partyId = String(input.partyId ?? "").replace(/\s+/g, "");

    if (!amount || !partyId) {
      return json({ error: "amount and partyId are required" }, 400);
    }

    // 1. Create an OAuth access token using API User + API Key.
    const basic = btoa(`${apiUser}:${apiKey}`);
    const tokenResponse = await fetch(`${MTN_BASE_URL}/collection/token/`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResponse.ok) {
      const details = await tokenResponse.text();
      return json({ error: "MTN token request failed", status: tokenResponse.status, details }, 502);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return json({ error: "MTN did not return an access token" }, 502);

    // 2. Create the Request-to-Pay transaction.
    const referenceId = crypto.randomUUID();
    const requestResponse = await fetch(`${MTN_BASE_URL}/collection/v1_0/requesttopay`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Reference-Id": referenceId,
        "X-Target-Environment": "sandbox",
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency,
        externalId,
        payer: { partyIdType: "MSISDN", partyId },
        payerMessage: String(input.payerMessage ?? "Paiement PJD Maker"),
        payeeNote: String(input.payeeNote ?? "Paiement PJD Maker"),
      }),
    });

    const details = await requestResponse.text();
    if (!requestResponse.ok && requestResponse.status !== 202) {
      return json({ error: "MTN Request-to-Pay failed", status: requestResponse.status, details }, 502);
    }

    return new Response(JSON.stringify({
      success: true,
      status: requestResponse.status,
      referenceId,
      message: "Payment request created",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
