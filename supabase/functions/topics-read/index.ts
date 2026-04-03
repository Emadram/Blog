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

const trimText = (value, maxLength) => {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const normalizeStatus = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "archived" || raw === "all") {
    return raw;
  }
  return "open";
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

  const action = String(payload.action || "").trim().toLowerCase();
  if (!action) {
    return jsonResponse({ error: "Action is required." }, 400);
  }

  if (action === "list") {
    const status = normalizeStatus(payload.status);
    const includeUnlisted = Boolean(payload.include_unlisted);
    const limit = Number(payload.limit) || 0;

    let query = supabase
      .from("topics")
      .select(
        "id, title, slug, body, author_name, status, is_locked, is_unlisted, voice_enabled, created_at, last_activity_at"
      )
      .order("last_activity_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (!includeUnlisted) {
      query = query.eq("is_unlisted", false);
    }

    if (limit > 0) {
      query = query.limit(limit);
    }

    const { data, error } = await query;
    if (error) {
      return jsonResponse({ error: "Failed to load topics." }, 500);
    }

    return jsonResponse({ topics: data || [] });
  }

  if (action === "detail") {
    const topicId = trimText(payload.topic_id, 120);
    const slug = trimText(payload.slug, 200);
    if (!topicId && !slug) {
      return jsonResponse({ error: "Topic reference is required." }, 400);
    }

    let query = supabase
      .from("topics")
      .select(
        "id, title, slug, body, author_name, status, is_locked, is_unlisted, voice_enabled, created_at, last_activity_at"
      )
      .in("status", ["open", "archived"])
      .maybeSingle();

    if (topicId) {
      query = query.eq("id", topicId);
    } else {
      query = query.eq("slug", slug);
    }

    const { data, error } = await query;
    if (error) {
      return jsonResponse({ error: "Failed to load topic." }, 500);
    }
    if (!data) {
      return jsonResponse({ error: "Topic not found." }, 404);
    }

    return jsonResponse({ topic: data });
  }

  if (action === "comments") {
    const topicId = trimText(payload.topic_id, 120);
    if (!topicId) {
      return jsonResponse({ error: "Topic reference is required." }, 400);
    }

    const { data, error } = await supabase
      .from("topic_comments")
      .select("id, topic_id, body, author_name, created_at")
      .eq("topic_id", topicId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true });

    if (error) {
      return jsonResponse({ error: "Failed to load comments." }, 500);
    }

    return jsonResponse({ comments: data || [] });
  }

  return jsonResponse({ error: "Unsupported action." }, 400);
});
