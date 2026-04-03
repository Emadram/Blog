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
const serviceRoleKey =
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";

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
    return "";
  }
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const containsHtml = (value) => /[<>]/.test(String(value || ""));

const ensureUniqueSlug = async (baseSlug) => {
  let candidate = baseSlug || "topic";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("topics")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (error) {
      return candidate;
    }
    if (!data) {
      return candidate;
    }
    const suffix = crypto.randomUUID().slice(0, 6);
    candidate = `${baseSlug}-${suffix}`;
  }
  return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
};

const checkRateLimit = async (ip, action, limit, windowMs) => {
  if (!ip) {
    return false;
  }
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await supabase
    .from("topic_audit")
    .select("id", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("action", action)
    .gte("created_at", since);
  if (error) {
    return false;
  }
  return (count || 0) >= limit;
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

  const title = trimText(payload.title, 120);
  const body = trimText(payload.body, 4000);
  const authorName = trimText(payload.author_name, 40) || "Anon";
  const isUnlisted = Boolean(payload.is_unlisted);
  const voiceEnabled = Boolean(payload.voice_enabled);

  if (!title || title.length < 3) {
    return jsonResponse({ error: "Title must be at least 3 characters." }, 400);
  }
  if (!body || body.length < 10) {
    return jsonResponse({ error: "Body must be at least 10 characters." }, 400);
  }
  if (containsHtml(title) || containsHtml(body)) {
    return jsonResponse({ error: "Text only. HTML is not allowed." }, 400);
  }

  const ip = getClientIp(req);
  const rateLimited = await checkRateLimit(ip, "topic:create", 3, 10 * 60 * 1000);
  if (rateLimited) {
    return jsonResponse({ error: "Too many topics. Try again in a few minutes." }, 429);
  }

  const baseSlug = slugify(title) || "topic";
  const slug = await ensureUniqueSlug(baseSlug);
  const now = new Date().toISOString();

  const { data: topic, error } = await supabase
    .from("topics")
    .insert({
      title,
      slug,
      body,
      author_name: authorName,
      status: "open",
      is_locked: false,
      is_unlisted: isUnlisted,
      voice_enabled: voiceEnabled,
      last_activity_at: now,
    })
    .select(
      "id, title, slug, body, author_name, status, is_locked, is_unlisted, voice_enabled, created_at, last_activity_at"
    )
    .single();

  if (error) {
    return jsonResponse({ error: "Failed to create topic." }, 500);
  }

  await supabase.from("topic_audit").insert({
    topic_id: topic.id,
    action: "topic:create",
    ip,
    user_agent: trimText(req.headers.get("user-agent"), 240),
  });

  return jsonResponse({ topic });
});
