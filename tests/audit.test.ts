import { describe, expect, it } from 'vitest';
import { audit } from '../src/audit.js';
import { formatReport } from '../src/report.js';
import { fixture, html } from './helpers.js';

describe('site audit integration', () => {
  it('discovers sitemap indexes, checks internal links and reciprocal alternates', async () => {
    const requested: string[] = [];
    const server = await fixture((req, res, origin) => {
      requested.push(req.url ?? '');
      if (req.url === '/robots.txt') {
        res.setHeader('Content-Type', 'text/plain');
        res.end(
          `User-agent: *\nDisallow: /private\nSitemap: ${origin}/sitemap-index.xml`,
        );
      } else if (req.url === '/sitemap-index.xml') {
        res.setHeader('Content-Type', 'application/xml');
        res.end(
          `<sitemapindex><sitemap><loc>${origin}/map.xml</loc></sitemap></sitemapindex>`,
        );
      } else if (req.url === '/map.xml') {
        res.setHeader('Content-Type', 'application/xml');
        res.end(
          `<urlset><url><loc>${origin}/</loc></url><url><loc>${origin}/es/</loc></url></urlset>`,
        );
      } else if (req.url === '/' || req.url === '/es/') {
        res.setHeader('Content-Type', 'text/html');
        res.end(
          html(
            origin + req.url,
            `<link rel="alternate" hreflang="en" href="${origin}/"><link rel="alternate" hreflang="es" href="${origin}/es/">`,
            '<a href="/missing">Broken</a><a href="https://example.org/">External</a><a href="/private">Private</a>',
          ),
        );
      } else {
        res.statusCode = 404;
        res.end();
      }
    });
    try {
      const result = await audit({ url: server.origin, delayMs: 0 });
      expect(result.summary.pages).toBe(2);
      expect(result.summary.sitemapUrls).toBe(2);
      expect(
        result.findings.filter((finding) => finding.code === 'BROKEN_LINK'),
      ).toHaveLength(2);
      expect(
        result.findings.some(
          (finding) => finding.code === 'HREFLANG_RETURN_MISSING',
        ),
      ).toBe(false);
      expect(
        result.findings.some(
          (finding) => finding.code === 'EXTERNAL_LINKS_SKIPPED',
        ),
      ).toBe(true);
      expect(requested).not.toContain('/private');
      expect(result.complete).toBe(false);
      expect(formatReport(result)).toContain('partial');
    } finally {
      await server.close();
    }
  });

  it('follows redirects, handles binary targets and reports canonical/alternate HTTP failures', async () => {
    const server = await fixture((req, res, origin) => {
      if (req.url === '/robots.txt') {
        res.setHeader('Content-Type', 'text/plain');
        res.end('User-agent: *\nDisallow:');
      } else if (req.url === '/sitemap.xml') {
        res.statusCode = 404;
        res.end();
      } else if (req.url === '/sitemap-index.xml') {
        res.setHeader('Content-Type', 'application/xml');
        res.end(
          `<urlset><url><loc>${origin}/old</loc></url><url><loc>${origin}/</loc></url></urlset>`,
        );
      } else if (req.url === '/old') {
        res.statusCode = 301;
        res.setHeader('Location', '/');
        res.end();
      } else if (req.url === '/') {
        res.setHeader('Content-Type', 'text/html');
        res.end(
          html(
            origin + '/missing',
            `<link rel="alternate" hreflang="en" href="${origin}/"><link rel="alternate" hreflang="es" href="${origin}/missing"><link rel="alternate" hreflang="fr" href="https://example.org/">`,
            '<a href="/asset.pdf">PDF</a>',
          ),
        );
      } else if (req.url === '/asset.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.end('pdf');
      } else {
        res.statusCode = 404;
        res.end();
      }
    });
    try {
      const result = await audit({ url: server.origin, delayMs: 0 });
      expect(result.findings.map((finding) => finding.code)).toEqual(
        expect.arrayContaining([
          'URL_REDIRECT',
          'SITEMAP_NONCANONICAL',
          'CANONICAL_TARGET_BROKEN',
          'HREFLANG_TARGET_BROKEN',
          'HREFLANG_UNCHECKED',
        ]),
      );
      expect(result.complete).toBe(true);
    } finally {
      await server.close();
    }
  });

  it('bounds the crawl and validates options before making requests', async () => {
    for (const options of [
      { url: 'file:///tmp/site' },
      { url: 'https://example.com', maxPages: 0 },
      { url: 'https://example.com', delayMs: -1 },
    ]) {
      await expect(audit(options)).rejects.toThrow();
    }
    const server = await fixture((req, res, origin) => {
      if (req.url === '/robots.txt') {
        res.setHeader('Content-Type', 'text/plain');
        res.end('');
      } else if (req.url?.endsWith('.xml')) {
        res.statusCode = 404;
        res.end();
      } else {
        res.setHeader('Content-Type', 'text/html');
        res.end(
          html(origin + (req.url ?? '/'), '', '<a href="/next">Next</a>'),
        );
      }
    });
    try {
      const report = await audit({
        url: server.origin,
        maxPages: 1,
        delayMs: 0,
      });
      expect(report.complete).toBe(false);
      expect(report.findings.map((finding) => finding.code)).toContain(
        'CRAWL_LIMIT',
      );
      expect(formatReport({ ...report, complete: true })).toContain(
        'complete within supported scope',
      );
    } finally {
      await server.close();
    }
  });

  it('reports invalid, duplicate, cross-origin and failed sitemap entries', async () => {
    const server = await fixture((req, res, origin) => {
      res.setHeader('Content-Type', 'application/xml');
      if (req.url === '/robots.txt') {
        res.statusCode = 404;
        res.end();
      } else if (req.url === '/index.xml')
        res.end(
          `<sitemapindex><sitemap><loc>${origin}/invalid.xml</loc></sitemap><sitemap><loc>${origin}/urls.xml</loc></sitemap><sitemap><loc>${origin}/error.xml</loc></sitemap></sitemapindex>`,
        );
      else if (req.url === '/invalid.xml') res.end('<urlset>');
      else if (req.url === '/urls.xml')
        res.end(
          `<urlset><url><loc>/relative</loc></url><url><loc>https://example.org/</loc></url><url><loc>${origin}/</loc></url><url><loc>${origin}/</loc></url></urlset>`,
        );
      else if (req.url === '/error.xml') {
        res.statusCode = 500;
        res.end();
      } else {
        res.setHeader('Content-Type', 'text/html');
        res.end(html(origin + '/'));
      }
    });
    try {
      const report = await audit({
        url: server.origin,
        sitemap: '/index.xml',
        delayMs: 0,
      });
      expect(report.complete).toBe(false);
      expect(report.findings.map((finding) => finding.code)).toEqual(
        expect.arrayContaining([
          'SITEMAP_INVALID',
          'SITEMAP_URL_INVALID',
          'SITEMAP_ORIGIN_SKIPPED',
          'SITEMAP_DUPLICATE',
          'SITEMAP_HTTP_ERROR',
        ]),
      );
      await expect(
        audit({ url: server.origin, sitemap: 'https://example.org/' }),
      ).rejects.toThrow('Sitemap must');
    } finally {
      await server.close();
    }
  });

  it('does not proceed when robots.txt is unavailable', async () => {
    const server = await fixture((_, res) => {
      res.statusCode = 503;
      res.end();
    });
    try {
      await expect(audit({ url: server.origin, delayMs: 0 })).rejects.toThrow(
        'robots.txt',
      );
    } finally {
      await server.close();
    }
  });
});
