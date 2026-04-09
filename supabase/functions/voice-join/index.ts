        // @ts-nocheck
export const config = { verify_jwt: false };
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_PARTICIPANTS = 10;
const ACTIVE_WINDOW_MS = 120000;

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

const countActive = async (topicId, since) => {
  const { count } = await supabase
    .from("topic_voice_sessions")
    .select("id", { count: "exact", head: true })
    .eq("topic_id", topicId)
    .gte("last_seen_at", since);
  return count || 0;
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

  const topicId = String(payload.topic_id || "").trim();
  const sessionId = String(payload.session_id || "").trim();
  const displayName = trimText(payload.display_name, 40) || null;

  if (!topicId || !sessionId) {
    return jsonResponse({ error: "Topic and session are required." }, 400);
  }

  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .select("id, status, is_locked")
    .eq("id", topicId)
    .maybeSingle();
  if (topicError || !topic) {
    return jsonResponse({ error: "Topic not found." }, 404);
  }
  if (topic.status === "archived" || topic.is_locked) {
    return jsonResponse({ error: "Topic is locked." }, 403);
  }

  const now = new Date().toISOString();
  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString();

  await supabase
    .from("topic_voice_sessions")
    .delete()
    .eq("topic_id", topicId)
    .lt("last_seen_at", activeSince);

  const { data: existing } = await supabase
    .from("topic_voice_sessions")
    .select("id")
    .eq("topic_id", topicId)
    .eq("session_id", sessionId)
    .maybeSingle();

  if (!existing) {
    const activeCount = await countActive(topicId, activeSince);
    if (activeCount >= MAX_PARTICIPANTS) {
      return jsonResponse({
        allowed: false,
        error: "Room is full.",
        activeCount,
        limit: MAX_PARTICIPANTS,
      }, 429);
    }

    await supabase.from("topic_voice_sessions").insert({
      topic_id: topicId,
      session_id: sessionId,
      display_name: displayName,
      ip: getClientIp(req),
      user_agent: trimText(req.headers.get("user-agent"), 240),
      last_seen_at: now,
    });
  } else {
    await supabase
      .from("topic_voice_sessions")
      .update({ last_seen_at: now, display_name: displayName })
      .eq("topic_id", topicId)
      .eq("session_id", sessionId);
  }

  const activeCount = await countActive(topicId, activeSince);
  return jsonResponse({ allowed: true, activeCount, limit: MAX_PARTICIPANTS });
});
