import { load } from 'cheerio';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { Alternate, Page } from './types.js';

export function normalizeUrl(value: string, base?: string): string | undefined {
  try {
    const url = new URL(value, base);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return undefined;
    }
    url.hash = '';
    return url.href;
  } catch {
    return undefined;
  }
}

export function parsePage(
  url: string,
  status: number,
  html: string,
  robotsHeader = '',
): Page {
  const $ = load(html);
  const base =
    normalizeUrl($('head base[href]').first().attr('href') ?? url, url) ?? url;
  const canonical: string[] = [];
  const alternates: Alternate[] = [];
  $('head link[href]').each((_, element) => {
    const rel = ($(element).attr('rel') ?? '').toLowerCase().split(/\s+/);
    const href = $(element).attr('href') ?? '';
    if (rel.includes('canonical'))
      canonical.push(normalizeUrl(href, base) ?? href);
    const language = $(element).attr('hreflang');
    if (rel.includes('alternate') && language !== undefined) {
      alternates.push({
        language: language.toLowerCase(),
        url: normalizeUrl(href, base) ?? href,
        absolute: /^https?:\/\//i.test(href),
      });
    }
  });
  const links = new Set<string>();
  $('a[href]').each((_, element) => {
    const href = normalizeUrl($(element).attr('href') ?? '', base);
    if (href) links.add(href);
  });
  const directives = [
    $('meta[name="robots" i]').attr('content') ?? '',
    robotsHeader,
  ];
  return {
    url,
    status,
    canonical,
    alternates,
    links: [...links],
    noindex: directives.some((value) => /\b(noindex|none)\b/i.test(value)),
  };
}

export interface Sitemap {
  type: 'index' | 'urls';
  locations: string[];
}

export function parseSitemap(xml: string): Sitemap {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new Error('XML declarations with entities are unsupported.');
  if (XMLValidator.validate(xml) !== true)
    throw new Error('Invalid sitemap XML.');
  const parser = new XMLParser({
    processEntities: true,
    removeNSPrefix: true,
    isArray: (name) => ['sitemap', 'url'].includes(name),
    parseTagValue: false,
  });
  const result = parser.parse(xml) as {
    sitemapindex?: { sitemap?: { loc?: string }[] };
    urlset?: { url?: { loc?: string }[] };
  };
  const isIndex = result.sitemapindex !== undefined;
  if (!isIndex && result.urlset === undefined)
    throw new Error('Expected sitemapindex or urlset.');
  const entries = isIndex ? result.sitemapindex?.sitemap : result.urlset?.url;
  const locations = (entries ?? []).map((entry) => {
    if (typeof entry.loc !== 'string' || !entry.loc.trim())
      throw new Error('Sitemap entry has no loc.');
    return entry.loc.trim();
  });
  if (locations.length > 10000)
    throw new Error('Sitemap exceeds the 10,000 entry limit.');
  return { type: isIndex ? 'index' : 'urls', locations };
}
