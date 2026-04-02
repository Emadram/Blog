// @ts-nocheck
export const config = { verify_jwt: false };
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
const MAX_CONTEXT_ITEMS = 5;
const MAX_TITLE_CHARS = 120;
const MAX_DESCRIPTION_CHARS = 240;
const MAX_TAGS = 4;
const SITE_SCOPE_HINTS = /(this site|on this site|website|site|blog|posts?|news links?|projects?|here|on the site)/i;
const CURRENT_EVENTS_HINTS = /(today'?s news|latest news|breaking news|current events|top stories|headlines|world news|market news|stock market|sports news|weather)/i;
const WEB_BROWSING_HINTS = /(internet|online|google|search the web|browse the web|web search)/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const openRouterKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
const sanitizedOpenRouterKey = openRouterKey
  .trim()
  .replace(/^Bearer\s+/i, "")
  .replace(/^['"]|['"]$/g, "");

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

const trimText = (value: string | undefined, maxLength: number) => {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const normalizeItem = (item: SearchItem) => {
  const tags = Array.isArray(item.tags)
    ? item.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, MAX_TAGS)
    : [];
  return {
    title: trimText(item.title, MAX_TITLE_CHARS),
    description: trimText(item.description, MAX_DESCRIPTION_CHARS),
    tags,
    category: trimText(item.category, 48),
    type: trimText(item.type, 32),
    date: trimText(item.date, 40),
    href: trimText(item.href, 300),
    source: trimText(item.source, 60),
    language: trimText(item.language, 40),
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
      const lines = [
        `${index + 1}. ${item.title}${metaLine}`,
        item.description || null,
        item.tags.length ? `tags: ${item.tags.join(", ")}` : null,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");

const buildMessages = (question: string, items: ReturnType<typeof normalizeItem>[]) => [
  {
    role: "system",
    content:
      "You are a site content assistant. Answer using only the provided items and only when the question is about the website content. " +
      "Do not answer general knowledge or external questions. Cite sources with bracketed numbers like [1] that match the item list. " +
      "Do not include URLs, access paths, or a Sources section in the answer; the UI renders sources separately. " +
      "Never claim to browse or check the internet. If the answer is not in the items or the question is out of scope, " +
      "say you could not find it in the site content. Keep it concise and factual.",
  },
  {
    role: "user",
    content: `Question: ${question}\n\nContent items:\n${buildContext(items)}`,
  },
];

const isOutOfScopeQuestion = (question: string) => {
  const normalized = question.toLowerCase();
  const hasSiteScope = SITE_SCOPE_HINTS.test(normalized);

  if (WEB_BROWSING_HINTS.test(normalized)) {
    return true;
  }

  if (CURRENT_EVENTS_HINTS.test(normalized) && !hasSiteScope) {
    return true;
  }

  return false;
};

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

  if (!sanitizedOpenRouterKey) {
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

  if (isOutOfScopeQuestion(question)) {
    return jsonResponse({
      answer:
        "I can only answer questions about this site's content (posts, news links, and projects). " +
        "I don't browse the internet or provide live news.",
    });
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sanitizedOpenRouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": req.headers.get("origin") || "",
      "X-Title": "Ruflo Site Search",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.2,
      max_tokens: 240,
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
