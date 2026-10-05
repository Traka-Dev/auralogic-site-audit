import { createServer } from 'node:http';
import { URL } from 'node:url';

// Local documentation fixture. The broken link and missing return annotation are intentional.
const fixed = process.argv.includes('--fixed');
const port = 4329;
const origin = `http://127.0.0.1:${port}`;
const server = createServer((request, response) => {
  const route = new URL(request.url ?? '/', origin).pathname;
  if (route === '/robots.txt') {
    response.setHeader('Content-Type', 'text/plain');
    response.end(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  } else if (route === '/sitemap.xml') {
    response.setHeader('Content-Type', 'application/xml');
    response.end(
      `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url><url><loc>${origin}/es/</loc></url></urlset>`,
    );
  } else if (route === '/' || route === '/es/') {
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    const alternates =
      fixed || route === '/'
        ? `<link rel="alternate" hreflang="en" href="${origin}/"><link rel="alternate" hreflang="es" href="${origin}/es/">`
        : `<link rel="alternate" hreflang="es" href="${origin}/es/">`;
    response.end(
      `<!doctype html><html lang="${route === '/' ? 'en' : 'es'}"><head><meta charset="utf-8"><title>Aura audit documentation demo</title><link rel="canonical" href="${origin}${route}">${alternates}</head><body><h1>Documentation fixture</h1><p>${fixed ? 'Corrected documentation fixture.' : 'This local demo intentionally contains SEO defects.'}</p>${route === '/' ? (fixed ? '<a href="/es/">Español</a>' : '<a href="/missing-page">Broken link example</a><a href="/es/">Español</a>') : fixed ? '<p>Reciprocal hreflang annotations restored.</p>' : '<p>Missing hreflang return annotation example.</p>'}</body></html>`,
    );
  } else {
    response.statusCode = 404;
    response.end('Not found — intentional documentation fixture.');
  }
});

server.on('error', (error) => {
  console.error(`Could not start the documentation fixture: ${error.message}`);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Documentation fixture: ${origin}`);
  console.log(
    fixed
      ? 'Corrected fixture: reciprocal alternates and valid internal links.'
      : 'Includes an intentional broken link and missing hreflang return tag.',
  );
  console.log('Press Ctrl+C to stop.');
});
