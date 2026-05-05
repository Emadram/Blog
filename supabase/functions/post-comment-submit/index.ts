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

const isPostCommentable = (post) => {
  if (!post) {
    return false;
  }
  if (post.draft) {
    return false;
  }
  const published = new Date(post.published_at).valueOf();
  if (Number.isNaN(published)) {
    return false;
  }
  return published <= Date.now();
};

const resolvePost = async ({ post_id, post_slug }) => {
  if (post_id) {
    const { data, error } = await supabase
      .from("posts")
      .select("id, slug, draft, published_at")
      .eq("id", post_id)
      .maybeSingle();
    if (error) {
      return { error: "Failed to load post." };
    }
    return { post: data };
  }

  if (post_slug) {
    const { data, error } = await supabase
      .from("posts")
      .select("id, slug, draft, published_at")
      .eq("slug", post_slug)
      .maybeSingle();
    if (error) {
      return { error: "Failed to load post." };
    }
    return { post: data };
  }

  return { error: "Post reference is required." };
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
  const postId = String(payload.post_id || "").trim();
  const postSlug = String(payload.post_slug || "").trim();

  if (!body || body.length < 3) {
    return jsonResponse({ error: "Comment must be at least 3 characters." }, 400);
  }
  if (containsHtml(body)) {
    return jsonResponse({ error: "Text only. HTML is not allowed." }, 400);
  }

  const { post, error } = await resolvePost({ post_id: postId, post_slug: postSlug });
  if (error || !post) {
    return jsonResponse({ error: error || "Post not found." }, 404);
  }

  if (!isPostCommentable(post)) {
    return jsonResponse({ error: "Comments are not open for this post." }, 403);
  }

  const ip = getClientIp(req);
  const rateLimited = await checkRateLimit(ip, "post_comment:create", 10, 5 * 60 * 1000);
  if (rateLimited) {
    return jsonResponse({ error: "Too many comments. Try again soon." }, 429);
  }

  const { data: comment, error: insertError } = await supabase
    .from("post_comments")
    .insert({
      post_id: post.id,
      body,
      author_name: authorName,
    })
    .select("id, post_id, body, author_name, created_at")
    .single();

  if (insertError) {
    return jsonResponse({ error: "Failed to create comment." }, 500);
  }

  await supabase.from("topic_audit").insert({
    post_id: post.id,
    post_comment_id: comment.id,
    action: "post_comment:create",
    ip,
    user_agent: trimText(req.headers.get("user-agent"), 240),
  });

  return jsonResponse({ comment });
});
