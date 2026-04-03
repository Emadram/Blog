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
    return "";
  }
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const containsHtml = (value) => /[<>]/.test(String(value || ""));

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

const resolveTopic = async ({ topic_id, topic_slug }) => {
  if (topic_id) {
    const { data, error } = await supabase
      .from("topics")
      .select("id, status, is_locked, last_activity_at")
      .eq("id", topic_id)
      .maybeSingle();
    if (error) {
      return { error: "Failed to load topic." };
    }
    return { topic: data };
  }

  if (topic_slug) {
    const { data, error } = await supabase
      .from("topics")
      .select("id, status, is_locked, last_activity_at")
      .eq("slug", topic_slug)
      .maybeSingle();
    if (error) {
      return { error: "Failed to load topic." };
    }
    return { topic: data };
  }

  return { error: "Topic reference is required." };
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

  const body = trimText(payload.body, 3000);
  const authorName = trimText(payload.author_name, 40) || "Anon";
  const topicId = String(payload.topic_id || "").trim();
  const topicSlug = String(payload.topic_slug || "").trim();

  if (!body || body.length < 3) {
    return jsonResponse({ error: "Comment must be at least 3 characters." }, 400);
  }
  if (containsHtml(body)) {
    return jsonResponse({ error: "Text only. HTML is not allowed." }, 400);
  }

  const { topic, error } = await resolveTopic({ topic_id: topicId, topic_slug: topicSlug });
  if (error || !topic) {
    return jsonResponse({ error: error || "Topic not found." }, 404);
  }

  if (topic.status === "archived" || topic.is_locked) {
    return jsonResponse({ error: "This topic is locked." }, 403);
  }

  const ip = getClientIp(req);
  const rateLimited = await checkRateLimit(ip, "comment:create", 10, 5 * 60 * 1000);
  if (rateLimited) {
    return jsonResponse({ error: "Too many comments. Try again soon." }, 429);
  }

  const now = new Date().toISOString();
  const { data: comment, error: insertError } = await supabase
    .from("topic_comments")
    .insert({
      topic_id: topic.id,
      body,
      author_name: authorName,
    })
    .select("id, topic_id, body, author_name, created_at")
    .single();

  if (insertError) {
    return jsonResponse({ error: "Failed to create comment." }, 500);
  }

  await supabase
    .from("topics")
    .update({ last_activity_at: now })
    .eq("id", topic.id);

  await supabase.from("topic_audit").insert({
    topic_id: topic.id,
    comment_id: comment.id,
    action: "comment:create",
    ip,
    user_agent: trimText(req.headers.get("user-agent"), 240),
  });

  return jsonResponse({ comment });
});
