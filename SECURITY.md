# Security Policy

The latest development version is supported. No hosted service or npm release is available yet.

## Reporting a vulnerability

Use [GitHub private vulnerability reporting](https://github.com/Traka-Dev/auralogic-site-audit/security/advisories/new). If that channel is unavailable, contact [Aura Logic](https://auralogic.dev/) privately. Include affected versions, a sanitized reproduction and impact. Do not post secrets or an unpatched exploit in a public issue. There is currently no guaranteed response-time SLA.

## Network boundary

The CLI intentionally accepts local/private origins for development. It performs HTTP GET requests and follows redirects only within the selected origin, rejects URL credentials and non-HTTP protocols, and limits requests, body size and redirect depth.

These limits do **not** provide a complete SSRF defense. Do not expose this library directly as a public URL-auditing endpoint. A hosted service needs DNS/IP validation and rebinding protection, redirect validation, outbound network isolation, per-user limits and a reviewed deployment boundary. Audit only sites you own or are authorized to crawl. Reports may contain private URLs; store and share them accordingly.

## Resource and output limits

Textual responses are limited to 2 MiB and retained response bodies have a 32 MiB UTF-8 byte budget (this is not a total process-memory guarantee). Each sitemap is limited to 10,000 entries, with at most 20 sitemap documents and 10,000 discovered URLs plus the starting URL. Crawl budgets and timeouts remain configurable. These bounds reduce resource exhaustion but do not sandbox parsing or provide a hosted-service security boundary.

Text reports escape terminal and bidirectional control characters in untrusted fields. JSON reports retain the underlying values through standard JSON escaping; downstream renderers must escape data for their own output context. Reports, dependencies, build output and local environment files are excluded from Git.

## Dependencies

The lockfile is committed. CI installs with `npm ci`, checks production dependencies with `npm audit --omit=dev`, and Dependabot proposes npm and GitHub Actions updates. Review advisories and dependency changes before merging.
