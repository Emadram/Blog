// @ts-nocheck
export const config = { verify_jwt: false };
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  : null;

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const getClientIp = (req) =>
  req.headers.get("x-forwarded-for") ||
  req.headers.get("x-real-ip") ||
  req.headers.get("cf-connecting-ip") ||
  null;

const trimText = (value, maxLength) => {
  const text = String(value || "").trim();
  if (!text) {
    return null;
  }
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  if (!supabase) {
    return jsonResponse({ error: "Missing Supabase service role configuration." }, 500);
  }

  let payload = {};
  try {
    payload = await req.json();
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const path = trimText(payload.path, 200);
  const referrer = trimText(payload.referrer, 400);
  const ip = getClientIp(req);
  const userAgent = trimText(req.headers.get("user-agent"), 240);

  const { error } = await supabase.from("visitor_logs").insert({
    path,
    referrer,
    ip,
    user_agent: userAgent,
  });

  if (error) {
    return jsonResponse({ error: "Failed to log visit." }, 500);
  }

  return jsonResponse({ ok: true });
});
