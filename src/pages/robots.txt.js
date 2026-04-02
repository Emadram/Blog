const ensureTrailingSlash = (value) => (value.endsWith('/') ? value : `${value}/`);

const getBaseInfo = (site) => {
  const siteUrl = site ? new URL(site) : new URL('https://emadram.github.io/Blog/');
  const origin = siteUrl.origin;
  const basePath = ensureTrailingSlash(import.meta.env.BASE_URL || '/');
  return { origin, basePath };
};

export async function GET({ site }) {
  const { origin, basePath } = getBaseInfo(site);
  const sitemapUrl = new URL(`${basePath}sitemap.xml`, origin).toString();
  const body = `User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
