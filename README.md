# Aura Logic Site Audit

An open-source CLI and TypeScript library for checking XML sitemaps, HTML canonical tags, HTML hreflang annotations, and broken internal links.

Built by [Aura Logic](https://auralogic.dev). MIT licensed. **Early development, v0.1.0.** Source code is available on GitHub. An npm package and hosted demo have not been published.

[Español](docs/README.es.md) · [Contributing](CONTRIBUTING.md) · [Checks and limitations](docs/checks.md) · [Security](SECURITY.md)

## Get started

Use Node.js 24 LTS (recommended) or Node.js 22.22.1+ and npm.

```bash
git clone https://github.com/Traka-Dev/auralogic-site-audit.git
cd auralogic-site-audit
npm ci
npm run build
node dist/cli.js https://example.com
```

Run against a local development site:

```bash
node dist/cli.js http://localhost:4321 --max-pages 50
```

Export a machine-readable report:

```bash
node dist/cli.js https://example.com \
  --sitemap /sitemap-index.xml \
  --json --output reports/audit.json
```

The executable name is `aura-audit`. To use it locally after building, run `npm link`.

## What it checks

- Discovers sitemaps from `robots.txt`, with `/sitemap.xml` and `/sitemap-index.xml` fallback.
- Reads nested XML sitemap indexes and checks absolute URLs, duplicates, HTTP failures, noindex and canonical mismatches.
- Checks HTML canonical declarations, multiple/invalid tags and broken same-origin targets.
- Checks HTML hreflang syntax, duplicate codes, self-reference, reciprocal links and broken/noncanonical/noindex targets.
- Crawls same-origin anchor links and reports broken links with their referring pages.
- Reports partial audits explicitly when robots rules, request failures or crawl limits prevent checks.

It respects `robots.txt` and crawl delay, sends an identifiable user agent, follows up to eight same-origin redirects, and caches responses within each run. No API key or account is required. The tool does not upload reports or send telemetry.

## CLI options

| Option                     | Default   | Purpose                                                               |
| -------------------------- | --------- | --------------------------------------------------------------------- |
| `--sitemap <url>`          | Discovery | Sitemap URL or path on the site origin                                |
| `--max-pages <number>`     | `200`     | Maximum HTML pages parsed                                             |
| `--max-requests <number>`  | `500`     | HTTP budget, including robots, sitemaps and redirects                 |
| `--timeout <milliseconds>` | `10000`   | Resource timeout                                                      |
| `--delay <milliseconds>`   | `100`     | Minimum interval between requests; robots crawl delay may increase it |
| `--json`                   | Off       | JSON output with schema version, summary and findings                 |
| `--output <file>`          | stdout    | Write the report to a file                                            |

Exit codes: **0** = completed with no errors (warnings may exist); **1** = completed with findings classified as errors; **2** = incomplete audit or execution/argument failure. Use these codes in CI; partial reports must not be treated as a clean bill of health.

## Library

```typescript
import { audit, formatReport } from 'auralogic-site-audit';

const report = await audit({
  url: 'https://example.com',
  maxPages: 100,
  maxRequests: 300,
});
console.log(formatReport(report));
```

The package import above is intended for a locally linked or installed tarball until a release is published. See [the example](examples/audit.mjs) and [report schema](docs/report.md).

## Contributing

Bug reports, documentation improvements and focused pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), follow the [code of conduct](CODE_OF_CONDUCT.md), and use [private vulnerability reporting](https://github.com/Traka-Dev/auralogic-site-audit/security/advisories/new) for security issues.

## Development

```bash
npm ci
npm run check
npm run test:watch
```

Husky installs local Git hooks during `npm ci`: staged files are linted/formatted before commit, commit messages use Conventional Commits, and the full check runs before push. CI runs the same checks on Node 22 and 24. Dependency updates use Dependabot.

## Scope

This first version audits fetched HTML, not browser-rendered JavaScript. It does not check external links, HTTP `Link` canonical/hreflang headers, XML hreflang extensions, gzip sitemap files, Google-selected canonicals, actual Google indexation or backlink authority. Hreflang validation checks syntax, not ISO code registry membership or the language of the content. See [detailed limitations](docs/checks.md).

The CLI supports localhost/private networks intentionally. It is not a server component hardened to accept arbitrary public URLs; see [SECURITY.md](SECURITY.md) before building a hosted service.

## Roadmap

- XML and HTTP-header hreflang support.
- More detailed canonical and alternate-cluster diagnostics.
- Report comparison for CI regressions.
- A web demo, after adding protection for untrusted URLs.
- AI prompts and assistant setup that consume evidence from these reports.

## References

Rules are informed by Google's guides for [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) and [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions). Findings are recommendations within the supported scope, not statements about Google's indexing decisions or ranking guarantees.
