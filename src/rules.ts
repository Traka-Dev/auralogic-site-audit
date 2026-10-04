import { normalizeUrl } from './parse.js';
import type { Finding, Page } from './types.js';

export function inspectPage(page: Page, inSitemap: boolean): Finding[] {
  const findings: Finding[] = [];
  const add = (
    code: string,
    severity: Finding['severity'],
    message: string,
    target?: string,
  ) => {
    findings.push({
      code,
      severity,
      url: page.url,
      message,
      ...(target ? { target } : {}),
    });
  };
  if (page.canonical.length === 0)
    add(
      'CANONICAL_MISSING',
      'warning',
      'No HTML canonical was found; check whether an HTTP Link header supplies it.',
    );
  if (page.canonical.length > 1)
    add(
      'CANONICAL_MULTIPLE',
      'error',
      'Multiple HTML canonical declarations were found.',
    );
  const canonical = page.canonical[0];
  if (canonical && !normalizeUrl(canonical))
    add(
      'CANONICAL_INVALID',
      'error',
      'Canonical is not an HTTP(S) URL.',
      canonical,
    );
  if (inSitemap && canonical && canonical !== page.url)
    add(
      'SITEMAP_NONCANONICAL',
      'warning',
      'Sitemap URL points to a different canonical URL.',
      canonical,
    );
  if (inSitemap && page.noindex)
    add('SITEMAP_NOINDEX', 'error', 'A sitemap URL declares noindex.');

  const languages = new Set<string>();
  for (const alternate of page.alternates) {
    if (languages.has(alternate.language))
      add(
        'HREFLANG_DUPLICATE',
        'error',
        `Repeated hreflang: ${alternate.language}.`,
        alternate.url,
      );
    languages.add(alternate.language);
    if (!alternate.absolute || !normalizeUrl(alternate.url))
      add(
        'HREFLANG_URL_INVALID',
        'error',
        'Hreflang requires a fully qualified HTTP(S) URL.',
        alternate.url,
      );
    // This checks common language / region syntax, not membership in ISO registries.
    if (
      !/^(?:x-default|[a-z]{2,3}(?:-[a-z]{4})?(?:-[a-z]{2})?)$/.test(
        alternate.language,
      )
    )
      add(
        'HREFLANG_CODE_INVALID',
        'error',
        `Unsupported hreflang syntax: ${alternate.language}.`,
      );
  }
  if (
    page.alternates.length > 0 &&
    !page.alternates.some(
      (alternate) =>
        alternate.url === page.url && alternate.language !== 'x-default',
    )
  ) {
    add(
      'HREFLANG_SELF_MISSING',
      'error',
      'Language alternates do not include a self-reference.',
    );
  }
  return findings;
}

export function inspectAlternates(pages: Map<string, Page>): Finding[] {
  const findings: Finding[] = [];
  for (const page of pages.values()) {
    for (const alternate of page.alternates) {
      if (alternate.url === page.url) continue;
      const target = pages.get(alternate.url);
      if (!target) continue;
      if (!target.alternates.some((item) => item.url === page.url)) {
        findings.push({
          code: 'HREFLANG_RETURN_MISSING',
          severity: 'error',
          url: page.url,
          target: alternate.url,
          message: 'Alternate page does not link back to this page.',
        });
      }
      if (
        target.noindex ||
        (target.canonical[0] && target.canonical[0] !== target.url)
      ) {
        findings.push({
          code: 'HREFLANG_TARGET_NONINDEXABLE',
          severity: 'error',
          url: page.url,
          target: alternate.url,
          message:
            'Alternate target is noindex or declares a different canonical.',
        });
      }
    }
  }
  return findings;
}
