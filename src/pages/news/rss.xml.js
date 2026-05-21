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

const fetchNews = async () => {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return [];
  }

  const params = new URLSearchParams({
    select: 'title,source,url,summary,published_at',
    order: 'published_at.desc',
    limit: '50',
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/news?${params.toString()}`, {
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
  const news = await fetchNews();
  const lastBuildDate = news.length > 0 ? new Date(news[0].published_at) : new Date();

  const items = news
    .map((item) => {
      const link = item.url;
      const description = item.summary || '';
      const source = item.source ? ` · ${item.source}` : '';
      return `\n  <item>\n    <title>${escapeXml(item.title)}${escapeXml(source)}</title>\n    <link>${escapeXml(link)}</link>\n    <guid isPermaLink="true">${escapeXml(link)}</guid>\n    <pubDate>${new Date(item.published_at).toUTCString()}</pubDate>\n    <description>${escapeXml(description)}</description>\n  </item>`;
    })
    .join('');

  const rssUrl = new URL('news/rss.xml', baseUrl).toString();
  const channelLink = new URL('news/', baseUrl).toString();

  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n  <title>Emad Dev Blog — News</title>\n  <link>${channelLink}</link>\n  <description>Curated tech news links from Emad Dev Blog.</description>\n  <language>en</language>\n  <lastBuildDate>${lastBuildDate.toUTCString()}</lastBuildDate>\n  <atom:link href="${rssUrl}" rel="self" type="application/rss+xml" />${items}\n</channel>\n</rss>\n`;

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}
