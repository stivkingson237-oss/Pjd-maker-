import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const apiKey = Deno.env.get("AI_GATEWAY_API_KEY");
  const baseUrl = (Deno.env.get("AI_GATEWAY_BASE_URL") || "").replace(/\/$/, "");
  const model = Deno.env.get("AI_GATEWAY_MODEL") || "";

  if (!apiKey) return json({ error: "AI_GATEWAY_API_KEY is not configured" }, 500);
  if (!baseUrl) return json({ error: "AI_GATEWAY_BASE_URL is not configured" }, 500);

  let input: Record<string, unknown>;
  try {
    input = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const messages = input.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "messages is required" }, 400);
  }

  const payload: Record<string, unknown> = { messages };
  if (model) payload.model = model;
  if (typeof input.temperature === "number") payload.temperature = input.temperature;
  if (typeof input.max_tokens === "number") payload.max_tokens = input.max_tokens;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await response.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    return json(data, response.status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI gateway request failed";
    return json({ error: message }, 502);
  } finally {
    clearTimeout(timeout);
  }
});
