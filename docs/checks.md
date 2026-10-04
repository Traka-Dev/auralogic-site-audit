# Supported checks

## Sitemap

Discovery uses `Sitemap:` lines in robots.txt, then `/sitemap.xml` and `/sitemap-index.xml` if none are declared. You can override discovery with `--sitemap`. Both urlsets and nested indexes are supported. XML must be well formed; custom entities and DOCTYPE are rejected. Maximum 20 sitemap documents and 2 MiB per textual response.

Sitemap URLs are compared against canonical and noindex annotations on fetched HTML pages. A different canonical is a warning, not proof that Google has selected another URL. Duplicate loc values and unsupported cross-origin entries are reported. Empty sitemaps are accepted.

## Canonical

HTML canonical tags are read from the head; relative URLs are resolved using the document base. Missing canonical is a warning because canonicalization can use other signals, including HTTP headers which this version does not inspect. Multiple or invalid HTML canonical tags are errors. Different canonicals on pages outside the sitemap are allowed. Same-origin canonical targets are fetched and HTTP failures are reported.

## Hreflang

HTML head annotations are checked for absolute HTTP(S) URLs, common language/script/region syntax, duplicate language labels, self-reference and return links. `x-default` is optional and does not substitute for a language self-reference. Return links are checked only for parsed targets. Unsupported/unvisited targets produce explicit unverified findings.

This version does not validate code registry membership, actual content language, identical cluster membership, or header/XML annotations. Cross-origin translations can be valid; the crawler simply does not fetch them in this version.

Self-reference and return-link checks are performed on canonical source pages. When a fetched URL declares one valid different canonical (for example a campaign or estimator URL with query parameters), the tool emits `HREFLANG_NONCANONICAL_SKIPPED` and checks the canonical page separately. It does not require language alternates to link back to every duplicate parameterized URL. The declared canonical remains a hint, not evidence of Google's canonical selection.

## Internal links

Anchor links on the exact same origin (scheme, hostname and port) are crawled. Fragments are removed and query strings are preserved. HTTP 4xx/5xx targets are reported with their referring page. Network failures are incomplete checks, not proof of a broken link. Successful redirects are notes, or warnings when the source is a sitemap URL. Binary targets are checked for status but not downloaded for analysis.

Image/script/font references, external links, fragment existence and JavaScript-rendered links are outside the supported scope. External links are counted and explicitly noted as skipped.

## Coverage

`complete: true` means the run finished within the supported scope. It does not mean all possible SEO checks passed or every page on the domain was discovered. Robots restrictions, limits and network failures result in partial coverage. Reports intentionally do not claim to reveal Google's selected canonical, indexing state or rankings.
