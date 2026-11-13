function send(res, status, obj, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers
  });
  res.end(JSON.stringify(obj));
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  }[c]));
}

function siteBase(req) {
  const host = req.headers.host || 'viral-india-24.onrender.com';
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  return `${proto}://${host}`;
}

function articleHtml(req, post) {
  const canonical = `${siteBase(req)}/news/${encodeURIComponent(post.id)}`;
  const title = `${post.title} | VIRAL INDIA 24`;
  const description = String(post.summary || post.title).slice(0, 300);
  const published = post.time || new Date().toISOString();
  const image = post.imageUrl || '';

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description,
    datePublished: published,
    dateModified: published,
    author: { '@type': 'Organization', name: 'VIRAL INDIA 24' },
    publisher: { '@type': 'Organization', name: 'VIRAL INDIA 24' },
    mainEntityOfPage: canonical,
    ...(image ? { image: [image] } : {})
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="hi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${escapeHtml(canonical)}">
${image ? `<meta property="og:image" content="${escapeHtml(image)}">` : ''}
<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">
<script type="application/ld+json">${jsonLd}</script>
<style>
*{box-sizing:border-box}
body{margin:0;background:#0b0b0d;color:#f7f7f8;font:16px/1.7 Arial,sans-serif}
main{max-width:850px;margin:35px auto;padding:0 18px}
.brand{color:#ff6972;font-weight:bold}
a{color:#ff6972}
.photo{width:100%;max-height:520px;object-fit:contain;background:#151518;border-radius:8px}
h1{line-height:1.25;font-size:clamp(27px,5vw,42px)}
.meta{color:#aaaab3;font-size:13px}
.story{white-space:pre-wrap;overflow-wrap:anywhere;background:#151518;padding:20px;border-radius:8px}
footer{margin-top:35px;color:#aaaab3;border-top:1px solid #333;padding-top:18px}
</style>
</head>
<body>
<main>
<a class="brand" href="/">← VIRAL INDIA 24</a>
<p class="meta">${escapeHtml(post.category || 'News')} · ${escapeHtml(new Date(published).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }))} · VIRAL INDIA 24</p>
<h1>${escapeHtml(post.title)}</h1>
${image ? `<img class="photo" src="${escapeHtml(image)}" alt="${escapeHtml(post.title)}">` : ''}
<div class="story">${escapeHtml(post.summary || '')}</div>
<footer>© ${new Date().getFullYear()} VIRAL INDIA 24 · <a href="/">Home</a></footer>
</main>
</body>
</html>`;
}
if (req.method === 'GET') {
    const requested = url.pathname === '/' ? '/index.html' : url.pathname;
if (req.method === 'GET' && url.pathname === '/sitemap.xml') {
  const base = siteBase(req);
  const urls = [
    `<url><loc>${escapeHtml(base)}/</loc></url>`,
    ...readPosts().map(p =>
      `<url><loc>${escapeHtml(base)}/news/${encodeURIComponent(p.id)}</loc><lastmod>${escapeHtml((p.time || '').slice(0, 10) || new Date().toISOString().slice(0, 10))}</lastmod></url>`
    )
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('')}
  </urlset>`;

  res.writeHead(200, {
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=300'
  });
  return res.end(xml);
}

const articleMatch = url.pathname.match(/^\/news\/([a-f0-9-]{36})$/i);

if (req.method === 'GET' && articleMatch) {
  const post = readPosts().find(p => p.id === articleMatch[1]);

  if (!post) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('News article not found');
  }

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'X-Content-Type-Options': 'nosniff'
  });

  return res.end(articleHtml(req, post));
}
