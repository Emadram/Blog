import { marked } from 'marked';

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

const ensureTrailingSlash = (url) => {
  const normalized = new URL(url);
  if (!normalized.pathname.endsWith('/')) {
    normalized.pathname += '/';
  }
  return normalized;
};

const escapeXml = (value) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const fetchPosts = async () => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return [];
  }

  const now = new Date().toISOString();
  const params = new URLSearchParams({
    select: 'title,slug,description,published_at,content_md',
    draft: 'eq.false',
    published_at: `lte.${now}`,
    order: 'published_at.desc',
    limit: '50',
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/posts?${params.toString()}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
};

export async function GET({ site }) {
  const baseUrl = ensureTrailingSlash(site ?? 'https://emadram.github.io/Blog/');
  const posts = await fetchPosts();
  const lastBuildDate = posts.length > 0 ? new Date(posts[0].published_at) : new Date();

  const items = posts
    .map((post) => {
      const link = new URL(`blog/?slug=${encodeURIComponent(post.slug)}`, baseUrl).toString();
      const description = post.description || '';
      const contentHtml = marked.parse(post.content_md || '');
      return `\n  <item>\n    <title>${escapeXml(post.title)}</title>\n    <link>${link}</link>\n    <guid>${link}</guid>\n    <pubDate>${new Date(post.published_at).toUTCString()}</pubDate>\n    <description>${escapeXml(description)}</description>\n    <content:encoded><![CDATA[${contentHtml}]]></content:encoded>\n  </item>`;
    })
    .join('');

  const rssUrl = new URL('rss.xml', baseUrl).toString();
  const channelLink = baseUrl.toString();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n  <title>Emad Dev Blog</title>\n  <link>${channelLink}</link>\n  <description>Personal blog posts and curated links from the build desk.</description>\n  <language>en</language>\n  <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>\n  <atom:link href="${rssUrl}" rel="self" type="application/rss+xml" />${items}\n</channel>\n</rss>\n`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
