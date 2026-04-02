// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type SearchItem = {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  type?: string;
  date?: string;
  href?: string;
  source?: string;
  language?: string;
};

type SearchRequest = {
  question?: string;
  items?: SearchItem[];
};

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "openrouter/auto";
const MAX_CONTEXT_ITEMS = 8;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const openRouterKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";

const supabase = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
  : null;

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const formatDate = (value?: string) => {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return value;
  }
  return parsed.toISOString().slice(0, 10);
};

const normalizeItem = (item: SearchItem) => {
  const tags = Array.isArray(item.tags)
    ? item.tags.map((tag) => String(tag).trim()).filter(Boolean)
    : [];
  return {
    title: String(item.title || "").trim(),
    description: String(item.description || "").trim(),
    tags,
    category: String(item.category || "").trim(),
    type: String(item.type || "").trim(),
    date: String(item.date || "").trim(),
    href: String(item.href || "").trim(),
    source: String(item.source || "").trim(),
    language: String(item.language || "").trim(),
  };
};

const buildContext = (items: ReturnType<typeof normalizeItem>[]) =>
  items
    .map((item, index) => {
      const metaParts = [
        item.type ? item.type.toUpperCase() : null,
        item.source || item.language || null,
        item.date ? formatDate(item.date) : null,
      ].filter(Boolean);
      const metaLine = metaParts.length ? ` (${metaParts.join(" · ")})` : "";
      const tagsLine = item.tags.length ? `tags: ${item.tags.join(", ")}` : "tags: none";
      const description = item.description || "No description.";
      return `${index + 1}. ${item.title}${metaLine}\n${description}\n${tagsLine}\nurl: ${item.href}`;
    })
    .join("\n\n");

const buildMessages = (question: string, items: ReturnType<typeof normalizeItem>[]) => [
  {
    role: "system",
    content:
      "You are the Ruflo site search assistant. Answer using only the provided content items. " +
      "If the answer is not in the items, say you do not know and suggest trying a different search. " +
      "Be concise and factual.",
  },
  {
    role: "user",
    content: `Question: ${question}\n\nContent items:\n${buildContext(items)}`,
  },
];

const getClientIp = (req: Request) =>
  req.headers.get("x-forwarded-for") ||
  req.headers.get("x-real-ip") ||
  req.headers.get("cf-connecting-ip") ||
  null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  if (!openRouterKey) {
    return jsonResponse({ error: "Missing OpenRouter API key." }, 500);
  }

  if (!supabase) {
    return jsonResponse({ error: "Missing Supabase service role configuration." }, 500);
  }

  let payload: SearchRequest = {};
  try {
    payload = await req.json();
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const question = String(payload.question || "").trim().slice(0, 1000);
  if (!question) {
    return jsonResponse({ error: "Question is required." }, 400);
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const items = rawItems
    .map((item) => normalizeItem(item))
    .filter((item) => item.title && item.href)
    .slice(0, MAX_CONTEXT_ITEMS);

  if (!items.length) {
    return jsonResponse({ error: "No content items provided." }, 400);
  }

  const ip = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || null;

  const { error: logError } = await supabase.from("search_ai_queries").insert({
    question,
    ip,
    user_agent: userAgent,
  });

  if (logError) {
    return jsonResponse({ error: "Failed to log the query." }, 500);
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openRouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": req.headers.get("origin") || "",
      "X-Title": "Ruflo Site Search",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.2,
      max_tokens: 450,
      messages: buildMessages(question, items),
    }),
  });

  if (!response.ok) {
    return jsonResponse({ error: `OpenRouter error: ${response.status}` }, 502);
  }

  const data = await response.json();
  const answer = data?.choices?.[0]?.message?.content;

  return jsonResponse({ answer: answer ? String(answer).trim() : "" });
});
