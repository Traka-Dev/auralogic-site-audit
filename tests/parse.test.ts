import { describe, expect, it } from 'vitest';
import { normalizeUrl, parsePage, parseSitemap } from '../src/parse.js';

describe('URL and HTML parsing', () => {
  it('resolves relative URLs while preserving query strings and stripping fragments', () => {
    expect(normalizeUrl('../a?q=1#section', 'https://example.com/es/')).toBe(
      'https://example.com/a?q=1',
    );
    for (const value of [
      'mailto:a@b.com',
      'javascript:alert(1)',
      'not a URL',
      'https://user:pass@example.com',
    ]) {
      expect(normalizeUrl(value)).toBeUndefined();
    }
  });
  it('parses real HTML rather than matching tag strings', () => {
    const page = parsePage(
      'https://example.com/',
      200,
      `<head><base href="/es/">
      <link href="./" rel="CANONICAL"><link rel="alternate" hreflang="ES" href="https://example.com/es/">
      <meta name="ROBOTS" content="noindex"></head><a href="next#one">Next</a><a href="next#two">Next</a>
      <a href="mailto:test@example.com">Email</a>`,
    );
    expect(page.canonical).toEqual(['https://example.com/es/']);
    expect(page.alternates[0]).toEqual({
      language: 'es',
      url: 'https://example.com/es/',
      absolute: true,
    });
    expect(page.links).toEqual(['https://example.com/es/next']);
    expect(page.noindex).toBe(true);
  });
  it('handles invalid declarations, relative alternates and HTTP noindex', () => {
    const page = parsePage(
      'https://example.com/',
      200,
      '<link rel="canonical" href="javascript:x"><link rel="alternate" hreflang="en" href="/">',
      'noindex',
    );
    expect(page.canonical).toEqual(['javascript:x']);
    expect(page.alternates[0]?.absolute).toBe(false);
    expect(page.noindex).toBe(true);
    expect(parsePage('https://example.com/', 200, '<p>hello</p>').noindex).toBe(
      false,
    );
  });
});

describe('XML sitemaps', () => {
  it('rejects sitemap documents with excessive entry counts', () => {
    const entries = '<url><loc>https://example.com/</loc></url>'.repeat(10001);
    expect(() => parseSitemap(`<urlset>${entries}</urlset>`)).toThrow(
      '10,000 entry',
    );
  });
  it('supports namespaced indexes and decodes standard XML entities', () => {
    expect(
      parseSitemap(
        '<s:sitemapindex xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9"><s:sitemap><s:loc>https://example.com/map.xml</s:loc></s:sitemap></s:sitemapindex>',
      ),
    ).toEqual({ type: 'index', locations: ['https://example.com/map.xml'] });
    expect(
      parseSitemap(
        '<urlset><url><loc>https://example.com/?a=1&amp;b=2</loc></url></urlset>',
      ).locations,
    ).toEqual(['https://example.com/?a=1&b=2']);
    expect(parseSitemap('<urlset/>').locations).toEqual([]);
  });
  it.each([
    '<urlset>',
    '<other/>',
    '<urlset><url/></urlset>',
    '<!DOCTYPE urlset><urlset/>',
    '<!ENTITY x "test"><urlset/>',
  ])('rejects malformed or unsupported XML: %s', (xml) => {
    expect(() => parseSitemap(xml)).toThrow();
  });
});
