const ensureTrailingSlash = (value) => (value.endsWith('/') ? value : `${value}/`);

const getBaseInfo = (site) => {
  const siteUrl = site ? new URL(site) : new URL('https://emadram.github.io/Blog/');
  const origin = siteUrl.origin;
  const basePath = ensureTrailingSlash(import.meta.env.BASE_URL || '/');
  return { origin, basePath };
};

export async function GET({ site }) {
  const { origin, basePath } = getBaseInfo(site);
  const routes = ['', 'search/', 'blog/', 'news/', 'news/rss.xml', 'projects/', 'about/', 'rss.xml'];
  const now = new Date().toISOString();

  const urls = routes
    .map((route) => new URL(`${basePath}${route}`, origin).toString())
    .map((loc) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${now}</lastmod>\n  </url>`)
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
