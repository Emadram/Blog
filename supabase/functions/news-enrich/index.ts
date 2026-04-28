// @ts-nocheck
export const config = { verify_jwt: false };
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HOST_SOURCE_MAP = {
  "news.ycombinator.com": "Hacker News",
  "ycombinator.com": "Y Combinator",
  "github.com": "GitHub",
  "medium.com": "Medium",
};

const MAX_HTML_CHARS = 1_000_000;
const MAX_TITLE_CHARS = 160;
const MAX_SOURCE_CHARS = 80;
const MAX_SUMMARY_CHARS = 240;

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

const decodeHtml = (value) =>
  String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getMetaContent = (html, key) => {
  const safeKey = escapeRegExp(key);
  const patternA = new RegExp(
    `<meta[^>]+(?:property|name)=["']${safeKey}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const matchA = html.match(patternA);
  if (matchA?.[1]) {
    return decodeHtml(matchA[1]);
  }
  const patternB = new RegExp(
    `<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${safeKey}["'][^>]*>`,
    "i"
  );
  const matchB = html.match(patternB);
  return matchB?.[1] ? decodeHtml(matchB[1]) : "";
};

const getTitleFromHtml = (html) => {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ? decodeHtml(match[1]) : "";
};

const parsePublishedAt = (value) => {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }
  return parsed.toISOString();
};

const formatSourceFromHost = (host) => {
  if (!host) {
    return "";
  }
  const normalized = host.replace(/^www\./i, "").toLowerCase();
  if (HOST_SOURCE_MAP[normalized]) {
    return HOST_SOURCE_MAP[normalized];
  }
  return normalized;
};

const stripTitleSuffix = (title, source) => {
  if (!title || !source) {
    return title;
  }
  const lowerTitle = title.toLowerCase();
  const lowerSource = source.toLowerCase();
  const separators = [" | ", " - "];
  for (const separator of separators) {
    if (lowerTitle.endsWith(`${separator}${lowerSource}`)) {
      return title.slice(0, title.length - (separator.length + source.length)).trim();
    }
  }
  return title;
};

const fetchHtml = async (url) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "EmadNewsEnrich/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return { error: `Fetch failed (${response.status}).` };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("text/html")) {
      return { error: "URL did not return HTML." };
    }

    let html = await response.text();
    if (html.length > MAX_HTML_CHARS) {
      html = html.slice(0, MAX_HTML_CHARS);
    }

    return { html };
  } catch (error) {
    if (error?.name === "AbortError") {
      return { error: "Request timed out." };
    }
    return { error: "Request failed." };
  } finally {
    clearTimeout(timeout);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  let payload = {};
  try {
    payload = await req.json();
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const url = String(payload?.url || "").trim();
  if (!url) {
    return jsonResponse({ error: "URL is required." }, 400);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (_error) {
    return jsonResponse({ error: "Invalid URL." }, 400);
  }

  if (!/^https?:$/i.test(parsedUrl.protocol)) {
    return jsonResponse({ error: "URL must be http or https." }, 400);
  }

  const { html, error } = await fetchHtml(parsedUrl.toString());
  if (error) {
    return jsonResponse({ error }, 502);
  }

  const ogTitle = getMetaContent(html, "og:title");
  const twitterTitle = getMetaContent(html, "twitter:title");
  const pageTitle = getTitleFromHtml(html);
  const ogSiteName = getMetaContent(html, "og:site_name");
  const twitterSite = getMetaContent(html, "twitter:site").replace(/^@/, "");

  const rawTitle = ogTitle || twitterTitle || pageTitle;
  const hostSource = formatSourceFromHost(parsedUrl.hostname);
  const rawSource = ogSiteName || twitterSite || hostSource;

  const title = trimText(stripTitleSuffix(rawTitle, rawSource), MAX_TITLE_CHARS);
  const source = trimText(rawSource, MAX_SOURCE_CHARS);

  const ogDescription = getMetaContent(html, "og:description");
  const twitterDescription = getMetaContent(html, "twitter:description");
  const metaDescription = getMetaContent(html, "description");
  const summary = trimText(
    ogDescription || twitterDescription || metaDescription,
    MAX_SUMMARY_CHARS
  );

  const publishedRaw =
    getMetaContent(html, "article:published_time") ||
    getMetaContent(html, "og:published_time") ||
    getMetaContent(html, "pubdate") ||
    getMetaContent(html, "date");
  const publishedAt = parsePublishedAt(publishedRaw);

  return jsonResponse({
    url: parsedUrl.toString(),
    title: title || null,
    source: source || null,
    summary: summary || null,
    published_at: publishedAt,
  });
});
