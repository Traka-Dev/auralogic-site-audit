import { robotsParser } from './robots.js';
import { HttpClient } from './http.js';
import { normalizeUrl, parsePage, parseSitemap } from './parse.js';
import { inspectAlternates, inspectPage } from './rules.js';
import type { AuditOptions, AuditReport, Finding, Page } from './types.js';

function positive(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 1)
    throw new Error(`${name} must be a positive integer.`);
  return value;
}

export async function audit(options: AuditOptions): Promise<AuditReport> {
  const site = normalizeUrl(options.url);
  if (!site) throw new Error('Provide an HTTP(S) URL without credentials.');
  const origin = new URL(site).origin;
  const maxPages = positive(options.maxPages ?? 200, 'maxPages');
  const client = new HttpClient(
    origin,
    positive(options.maxRequests ?? 500, 'maxRequests'),
    positive(options.timeoutMs ?? 10000, 'timeoutMs'),
    options.delayMs ?? 100,
  );
  if (!Number.isFinite(client.delayMs) || client.delayMs < 0)
    throw new Error('delayMs must be nonnegative.');
  const findings: Finding[] = [];
  let complete = true;
  const add = (
    code: string,
    severity: Finding['severity'],
    url: string,
    message: string,
    target?: string,
  ) => {
    findings.push({
      code,
      severity,
      url,
      message,
      ...(target ? { target } : {}),
    });
  };
  const request = async (url: string) => {
    try {
      return await client.get(url);
    } catch (error) {
      complete = false;
      add(
        'FETCH_FAILED',
        'warning',
        url,
        error instanceof Error ? error.message : String(error),
      );
      return undefined;
    }
  };
  const robotsUrl = `${origin}/robots.txt`;
  const robotsResponse = await request(robotsUrl);
  if (
    !robotsResponse ||
    (robotsResponse.status >= 400 && robotsResponse.status !== 404)
  ) {
    throw new Error(
      'robots.txt could not be checked. Resolve its HTTP/network error before auditing.',
    );
  }
  const robots = robotsParser(
    robotsUrl,
    robotsResponse.status === 404 ? '' : robotsResponse.body,
  );
  client.delayMs = Math.max(
    client.delayMs,
    (robots.getCrawlDelay('AuraLogicSiteAudit') ?? 0) * 1000,
  );
  const allowed = (url: string): boolean =>
    robots.isAllowed(url, 'AuraLogicSiteAudit') !== false;
  client.isAllowed = allowed;
  const sameOrigin = (url: string): boolean => new URL(url).origin === origin;
  const sitemapUrls = new Set<string>();
  const visitedSitemaps = new Set<string>();
  const readSitemap = async (
    url: string,
    optional = false,
  ): Promise<boolean> => {
    if (visitedSitemaps.has(url)) return true;
    if (visitedSitemaps.size >= 20) {
      complete = false;
      add(
        'SITEMAP_LIMIT',
        'warning',
        url,
        'Sitemap document limit (20) reached.',
      );
      return false;
    }
    visitedSitemaps.add(url);
    if (!allowed(url)) {
      complete = false;
      add(
        'ROBOTS_BLOCKED',
        'warning',
        url,
        'Sitemap is disallowed by robots.txt.',
      );
      return false;
    }
    const response = await request(url);
    if (!response) return false;
    if (optional && response.status === 404) return false;
    if (response.status !== 200) {
      complete = false;
      add(
        'SITEMAP_HTTP_ERROR',
        'error',
        url,
        `Sitemap returned HTTP ${response.status}.`,
      );
      return false;
    }
    try {
      const sitemap = parseSitemap(response.body);
      for (const location of sitemap.locations) {
        const target = normalizeUrl(location);
        if (!target) {
          add(
            'SITEMAP_URL_INVALID',
            'error',
            url,
            'Sitemap loc must be an absolute HTTP(S) URL.',
            location,
          );
          continue;
        }
        if (!sameOrigin(target)) {
          complete = false;
          add(
            'SITEMAP_ORIGIN_SKIPPED',
            'warning',
            url,
            'Cross-origin sitemap entry was not checked.',
            target,
          );
          continue;
        }
        if (sitemap.type === 'index') await readSitemap(target);
        else {
          if (sitemapUrls.has(target))
            add(
              'SITEMAP_DUPLICATE',
              'warning',
              url,
              'Repeated sitemap URL.',
              target,
            );
          sitemapUrls.add(target);
        }
      }
      return true;
    } catch (error) {
      complete = false;
      add(
        'SITEMAP_INVALID',
        'error',
        url,
        error instanceof Error ? error.message : String(error),
      );
      return false;
    }
  };
  const roots = options.sitemap ? [options.sitemap] : robots.getSitemaps();
  if (roots.length) {
    for (const root of roots) {
      const normalized = normalizeUrl(root, origin);
      if (!normalized || !sameOrigin(normalized))
        throw new Error('Sitemap must be an HTTP(S) URL on the site origin.');
      await readSitemap(normalized);
    }
  } else if (!(await readSitemap(`${origin}/sitemap.xml`, true))) {
    if (!(await readSitemap(`${origin}/sitemap-index.xml`, true)))
      add(
        'SITEMAP_NOT_FOUND',
        'warning',
        site,
        'No sitemap was discovered. Supply --sitemap if it uses another location.',
      );
  }

  const queue = new Set([site, ...sitemapUrls]);
  const pages = new Map<string, Page>();
  const failed = new Set<string>();
  for (const url of queue) {
    if (
      pages.size >= maxPages ||
      client.requests >= (options.maxRequests ?? 500)
    ) {
      complete = false;
      add(
        'CRAWL_LIMIT',
        'warning',
        site,
        'Crawl limit reached; some URLs remain unchecked.',
      );
      break;
    }
    if (!allowed(url)) {
      complete = false;
      add('ROBOTS_BLOCKED', 'warning', url, 'URL is disallowed by robots.txt.');
      continue;
    }
    const response = await request(url);
    if (!response) continue;
    if (response.status >= 400) {
      failed.add(url);
      add('HTTP_ERROR', 'error', url, `URL returned HTTP ${response.status}.`);
      continue;
    }
    if (url !== response.finalUrl)
      add(
        'URL_REDIRECT',
        sitemapUrls.has(url) ? 'warning' : 'info',
        url,
        'URL redirects; prefer the final URL.',
        response.finalUrl,
      );
    if (!/html/i.test(response.contentType)) continue;
    const page = parsePage(
      response.finalUrl,
      response.status,
      response.body,
      response.robots,
    );
    if (pages.has(page.url)) continue;
    pages.set(page.url, page);
    findings.push(
      ...inspectPage(page, sitemapUrls.has(url) || sitemapUrls.has(page.url)),
    );
    for (const target of [
      ...page.links,
      ...page.canonical,
      ...page.alternates.map((alternate) => alternate.url),
    ]) {
      if (!normalizeUrl(target)) continue;
      if (sameOrigin(target)) queue.add(target);
    }
  }
  findings.push(...inspectAlternates(pages));
  for (const page of pages.values()) {
    for (const target of page.links) {
      if (failed.has(target))
        add(
          'BROKEN_LINK',
          'error',
          page.url,
          'Internal link points to an HTTP error.',
          target,
        );
    }
    for (const target of page.canonical) {
      if (failed.has(target))
        add(
          'CANONICAL_TARGET_BROKEN',
          'error',
          page.url,
          'Canonical target returned an HTTP error.',
          target,
        );
    }
    for (const alternate of page.alternates) {
      if (failed.has(alternate.url))
        add(
          'HREFLANG_TARGET_BROKEN',
          'error',
          page.url,
          'Alternate target returned an HTTP error.',
          alternate.url,
        );
      else if (!pages.has(alternate.url)) {
        add(
          'HREFLANG_UNCHECKED',
          'warning',
          page.url,
          'Alternate target was not parsed; reciprocity is unverified.',
          alternate.url,
        );
      }
    }
  }
  const externalLinks = new Set(
    [...pages.values()]
      .flatMap((page) => page.links)
      .filter((url) => !sameOrigin(url)),
  );
  if (externalLinks.size)
    add(
      'EXTERNAL_LINKS_SKIPPED',
      'info',
      site,
      `${externalLinks.size} external links were not checked; this audit checks internal links only.`,
    );
  // Deterministic ordering makes reports useful in CI diffs.
  findings.sort(
    (a, b) =>
      a.url.localeCompare(b.url) ||
      a.code.localeCompare(b.code) ||
      (a.target ?? '').localeCompare(b.target ?? ''),
  );
  return {
    schemaVersion: 1,
    site,
    generatedAt: new Date().toISOString(),
    complete,
    summary: {
      pages: pages.size,
      requests: client.requests,
      sitemapUrls: sitemapUrls.size,
      errors: findings.filter((finding) => finding.severity === 'error').length,
      warnings: findings.filter((finding) => finding.severity === 'warning')
        .length,
      info: findings.filter((finding) => finding.severity === 'info').length,
    },
    findings,
  };
}
