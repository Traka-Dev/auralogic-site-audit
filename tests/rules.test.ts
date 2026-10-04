import { describe, expect, it } from 'vitest';
import { inspectAlternates, inspectPage } from '../src/rules.js';
import type { Page } from '../src/types.js';

const page = (changes: Partial<Page> = {}): Page => ({
  url: 'https://example.com/',
  status: 200,
  canonical: ['https://example.com/'],
  alternates: [],
  links: [],
  noindex: false,
  ...changes,
});
const alternate = (language: string, url: string) => ({
  language,
  url,
  absolute: true,
});

describe('page rules', () => {
  it('accepts a canonical page and does not require hreflang on monolingual sites', () => {
    expect(inspectPage(page(), true)).toEqual([]);
  });
  it('distinguishes canonical and sitemap problems', () => {
    expect(inspectPage(page({ canonical: [] }), false)[0]?.severity).toBe(
      'warning',
    );
    const codes = inspectPage(
      page({
        canonical: ['javascript:alert(1)', 'https://example.com/other'],
        noindex: true,
      }),
      true,
    ).map((finding) => finding.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'CANONICAL_INVALID',
        'CANONICAL_MULTIPLE',
        'SITEMAP_NONCANONICAL',
        'SITEMAP_NOINDEX',
      ]),
    );
    expect(
      inspectPage(
        page({ canonical: ['https://example.com/other'], noindex: true }),
        false,
      ),
    ).toEqual([]);
  });
  it('validates hreflang syntax, duplicate codes, absolute URLs and self-reference', () => {
    const alternates = [
      alternate('en', 'https://example.com/es/'),
      alternate('en', 'https://example.com/es/'),
      { language: 'en_US', url: 'mailto:someone', absolute: false },
    ];
    const codes = inspectPage(page({ alternates }), true).map(
      (finding) => finding.code,
    );
    expect(codes).toEqual(
      expect.arrayContaining([
        'HREFLANG_DUPLICATE',
        'HREFLANG_CODE_INVALID',
        'HREFLANG_URL_INVALID',
        'HREFLANG_SELF_MISSING',
      ]),
    );
    expect(
      inspectPage(
        page({
          alternates: [
            alternate('en', 'https://example.com/'),
            alternate('x-default', 'https://example.com/'),
          ],
        }),
        true,
      ),
    ).toEqual([]);
  });
});

describe('reciprocity', () => {
  it('accepts reciprocal language variants', () => {
    const alternates = [
      alternate('en', 'https://example.com/'),
      alternate('es', 'https://example.com/es/'),
    ];
    const en = page({ alternates });
    const es = page({
      url: 'https://example.com/es/',
      canonical: ['https://example.com/es/'],
      alternates,
    });
    expect(
      inspectAlternates(
        new Map([
          [en.url, en],
          [es.url, es],
        ]),
      ),
    ).toEqual([]);
  });
  it('flags missing return links and nonindexable targets without inventing results for unvisited pages', () => {
    const en = page({
      alternates: [
        alternate('es', 'https://example.com/es/'),
        alternate('fr', 'https://other.com/'),
      ],
    });
    const es = page({ url: 'https://example.com/es/', noindex: true });
    expect(
      inspectAlternates(
        new Map([
          [en.url, en],
          [es.url, es],
        ]),
      ).map((finding) => finding.code),
    ).toEqual(['HREFLANG_RETURN_MISSING', 'HREFLANG_TARGET_NONINDEXABLE']);
  });
});
