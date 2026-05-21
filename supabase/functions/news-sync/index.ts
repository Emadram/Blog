// @ts-nocheck
export const config = { verify_jwt: false };
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HN_ITEM_URL = "https://hacker-news.firebaseio.com/v0/item";
const HN_DISCUSSION_URL = "https://news.ycombinator.com/item?id=";
const MAX_TITLE_CHARS = 160;
const MAX_SUMMARY_CHARS = 240;
const MAX_XML_CHARS = 2_000_000;
const HN_FETCH_CONCURRENCY = 8;
const HN_API_KIND = "api";
const RSS_KIND = "rss";
const FETCH_TIMEOUT_MS = 14000;

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey =
  Deno.env.get("SERVICE_ROLE_KEY") ??
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  "";
const syncSecret = Deno.env.get("NEWS_SYNC_SECRET") ?? "";

const supabase =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
    : null;

const jsonResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const trimText = (value, maxLength) => {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }
  return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const stripHtml = (value) =>
  String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isAuthorized = (req) => {
  if (!syncSecret) {
    return false;
  }
  const headerSecret = req.headers.get("x-sync-secret");
  if (headerSecret && headerSecret === syncSecret) {
    return true;
  }
  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${syncSecret}`) {
    return true;
  }
  return false;
};

const mapConcurrent = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let index = 0;

  const worker = async () => {
    while (index < items.length) {
      const current = index++;
      try {
        results[current] = await mapper(items[current], current);
      } catch (error) {
        results[current] = { error: error?.message || "fetch failed" };
      }
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
};

const fetchJson = async (url, timeoutMs = FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "EmadNewsSync/1.0",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const fetchText = async (url, timeoutMs = FETCH_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        "User-Agent": "EmadNewsSync/1.0",
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    let text = await response.text();
    if (text.length > MAX_XML_CHARS) {
      text = text.slice(0, MAX_XML_CHARS);
    }
    return text;
  } finally {
    clearTimeout(timeout);
  }
};

const normalizeUrl = (raw) => {
  const value = String(raw || "").trim();
  if (!value) {
    return "";
  }
  try {
    const url = new URL(value);
    if (!/^https?:$/i.test(url.protocol)) {
      return "";
    }
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid"].forEach(
      (key) => url.searchParams.delete(key)
    );
    return url.toString();
  } catch (_error) {
    return "";
  }
};

const parsePublishedAt = (raw) => {
  const value = String(raw || "").trim();
  if (!value) {
    return new Date().toISOString();
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    const ms = numeric < 1e12 ? numeric * 1000 : numeric;
    const parsed = new Date(ms);
    if (!Number.isNaN(parsed.valueOf())) {
      return parsed.toISOString();
    }
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.valueOf())) {
    return parsed.toISOString();
  }
  return new Date().toISOString();
};

const readTag = (block, tagName) => {
  const pattern = new RegExp(
    `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "i"
  );
  const match = block.match(pattern);
  return match?.[1] ? stripHtml(match[1]) : "";
};

const readLink = (block) => {
  const hrefMatch = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  if (hrefMatch?.[1]) {
    return hrefMatch[1].trim();
  }
  return readTag(block, "link");
};

const parseRss2Items = (xml) => {
  const items = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    items.push({
      title: readTag(block, "title"),
      url: readLink(block),
      summary:
        readTag(block, "description") ||
        readTag(block, "content:encoded") ||
        readTag(block, "summary"),
      published_at:
        readTag(block, "pubDate") ||
        readTag(block, "published") ||
        readTag(block, "dc:date"),
    });
  }
  return items;
};

const parseAtomItems = (xml) => {
  const items = [];
  const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const block = match[1];
    let url = "";
    const linkMatches = block.matchAll(/<link[^>]*>/gi);
    for (const linkTag of linkMatches) {
      const tag = linkTag[0];
      if (/rel=["']alternate["']/i.test(tag) || !/rel=/i.test(tag)) {
        const href = tag.match(/href=["']([^"']+)["']/i);
        if (href?.[1]) {
          url = href[1].trim();
          break;
        }
      }
    }
    if (!url) {
      const href = block.match(/<link[^>]+href=["']([^"']+)["']/i);
      url = href?.[1]?.trim() || "";
    }

    items.push({
      title: readTag(block, "title"),
      url,
      summary:
        readTag(block, "summary") ||
        readTag(block, "content") ||
        readTag(block, "description"),
      published_at:
        readTag(block, "published") ||
        readTag(block, "updated") ||
        readTag(block, "created"),
    });
  }
  return items;
};

const parseRssFeed = (xml) => {
  const normalized = String(xml || "").trim();
  if (!normalized) {
    return [];
  }
  if (/<feed[\s>]/i.test(normalized)) {
    return parseAtomItems(normalized);
  }
  return parseRss2Items(normalized);
};

const mapToCandidate = (entry, source) => {
  const url = normalizeUrl(entry.url);
  const title = trimText(entry.title, MAX_TITLE_CHARS);
  if (!url || !title) {
    return null;
  }

  const summaryRaw = stripHtml(entry.summary);
  const summary = summaryRaw ? trimText(summaryRaw, MAX_SUMMARY_CHARS) : null;

  return {
    title,
    url,
    source: source.default_source,
    summary,
    published_at: parsePublishedAt(entry.published_at),
    tags: Array.isArray(source.default_tags) ? source.default_tags : [],
    category: source.default_category || "tech",
    pinned: false,
    featured: false,
    ingest_source: source.slug,
  };
};

const resolveHnItemUrl = (item) => {
  const raw = String(item?.url || "").trim();
  if (raw && /^https?:\/\//i.test(raw)) {
    return raw;
  }
  const id = item?.id;
  if (id) {
    return `${HN_DISCUSSION_URL}${id}`;
  }
  return "";
};

const mapHnItemToCandidate = (item, source) => {
  if (!item || item.deleted || item.dead) {
    return null;
  }

  if (item.type && item.type !== "story") {
    return null;
  }

  const url = normalizeUrl(resolveHnItemUrl(item));
  if (!url) {
    return null;
  }

  const title = trimText(item.title, MAX_TITLE_CHARS);
  if (!title) {
    return null;
  }

  const publishedAt =
    typeof item.time === "number" && item.time > 0
      ? new Date(item.time * 1000).toISOString()
      : new Date().toISOString();

  return {
    title,
    url,
    source: source.default_source,
    summary: trimText(item.title, MAX_SUMMARY_CHARS) || null,
    published_at: publishedAt,
    tags: Array.isArray(source.default_tags) ? source.default_tags : [],
    category: source.default_category || "tech",
    pinned: false,
    featured: false,
    ingest_source: source.slug,
  };
};

const fetchHnCandidates = async (source) => {
  const idList = await fetchJson(source.endpoint);
  if (!Array.isArray(idList)) {
    throw new Error("HN id list was not an array.");
  }

  const ids = idList
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id))
    .slice(0, source.fetch_limit);

  const items = await mapConcurrent(ids, HN_FETCH_CONCURRENCY, async (id) => {
    return fetchJson(`${HN_ITEM_URL}/${id}.json`);
  });

  const errors = [];
  const candidates = [];

  items.forEach((item, idx) => {
    if (item?.error) {
      errors.push({ id: ids[idx], message: item.error });
      return;
    }
    const mapped = mapHnItemToCandidate(item, source);
    if (mapped) {
      candidates.push(mapped);
    }
  });

  return { candidates, fetched: ids.length, errors };
};

const fetchRssCandidates = async (source) => {
  const xml = await fetchText(source.endpoint);
  const entries = parseRssFeed(xml).slice(0, source.fetch_limit);
  const errors = [];
  const candidates = [];
  const seenUrls = new Set();

  entries.forEach((entry, index) => {
    try {
      const mapped = mapToCandidate(entry, source);
      if (!mapped) {
        return;
      }
      if (seenUrls.has(mapped.url)) {
        return;
      }
      seenUrls.add(mapped.url);
      candidates.push(mapped);
    } catch (error) {
      errors.push({ index, message: error?.message || "map failed" });
    }
  });

  return { candidates, fetched: entries.length, errors };
};

const insertCandidates = async (candidates) => {
  if (!candidates.length) {
    return { inserted: 0, skipped: 0 };
  }

  const urls = [...new Set(candidates.map((row) => row.url))];
  const { data: existing, error: existingError } = await supabase
    .from("news")
    .select("url")
    .in("url", urls);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingUrls = new Set((existing || []).map((row) => row.url));
  const toInsert = candidates.filter((row) => !existingUrls.has(row.url));
  const skipped = candidates.length - toInsert.length;

  if (!toInsert.length) {
    return { inserted: 0, skipped };
  }

  const { data: insertedRows, error: insertError } = await supabase
    .from("news")
    .insert(toInsert)
    .select("id");

  if (insertError) {
    throw new Error(insertError.message);
  }

  return { inserted: insertedRows?.length ?? 0, skipped };
};

const recordIngestLog = async ({
  sourceSlug,
  fetched,
  inserted,
  skipped,
  errors,
}) => {
  await supabase.from("news_ingest_log").insert({
    source_slug: sourceSlug,
    fetched,
    inserted,
    skipped,
    errors: errors?.length ? errors : [],
  });
};

const updateFeedSourceRun = async (slug, { status, error, inserted }) => {
  await supabase
    .from("news_feed_sources")
    .update({
      last_run_at: new Date().toISOString(),
      last_status: status,
      last_error: error ? trimText(error, 500) : null,
      last_inserted: inserted ?? 0,
    })
    .eq("slug", slug);
};

const ingestSource = async (source, fetcher) => {
  try {
    const { candidates, fetched, errors: fetchErrors } = await fetcher(source);
    const { inserted, skipped } = await insertCandidates(candidates);

    await recordIngestLog({
      sourceSlug: source.slug,
      fetched,
      inserted,
      skipped,
      errors: fetchErrors,
    });

    await updateFeedSourceRun(source.slug, {
      status: "ok",
      error: null,
      inserted,
    });

    return {
      slug: source.slug,
      kind: source.kind,
      status: "ok",
      fetched,
      inserted,
      skipped,
      errors: fetchErrors,
    };
  } catch (error) {
    const message = error?.message || "sync failed";

    await recordIngestLog({
      sourceSlug: source.slug,
      fetched: 0,
      inserted: 0,
      skipped: 0,
      errors: [{ message }],
    });

    await updateFeedSourceRun(source.slug, {
      status: "error",
      error: message,
      inserted: 0,
    });

    return {
      slug: source.slug,
      kind: source.kind,
      status: "error",
      error: message,
      fetched: 0,
      inserted: 0,
      skipped: 0,
    };
  }
};

const runSource = async (source) => {
  if (source.kind === HN_API_KIND) {
    if (!source.endpoint.includes("hacker-news.firebaseio.com")) {
      return {
        slug: source.slug,
        status: "skipped",
        message: "Unsupported API endpoint for HN adapter.",
        fetched: 0,
        inserted: 0,
        skipped: 0,
      };
    }
    return ingestSource(source, fetchHnCandidates);
  }

  if (source.kind === RSS_KIND) {
    return ingestSource(source, fetchRssCandidates);
  }

  return {
    slug: source.slug,
    status: "skipped",
    message: `Unknown feed kind: ${source.kind}`,
    fetched: 0,
    inserted: 0,
    skipped: 0,
  };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  if (!isAuthorized(req)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  if (!supabase) {
    return jsonResponse({ error: "Missing Supabase service role configuration." }, 500);
  }

  let payload = {};
  try {
    payload = await req.json().catch(() => ({}));
  } catch (_error) {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const requestedSlugs = Array.isArray(payload?.sources)
    ? payload.sources.map((s) => String(s).trim()).filter(Boolean)
    : null;

  let query = supabase
    .from("news_feed_sources")
    .select(
      "slug,name,kind,endpoint,enabled,fetch_limit,default_source,default_category,default_tags"
    )
    .eq("enabled", true);

  if (requestedSlugs?.length) {
    query = query.in("slug", requestedSlugs);
  }

  const { data: sources, error: sourcesError } = await query;

  if (sourcesError) {
    return jsonResponse({ error: sourcesError.message }, 500);
  }

  if (!sources?.length) {
    return jsonResponse({ ok: true, results: [], message: "No enabled feed sources matched." });
  }

  const results = [];
  for (const source of sources) {
    results.push(await runSource(source));
  }

  return jsonResponse({ ok: true, results });
});
