# Security Policy

The latest development version is supported. No hosted service or npm release is available yet.

## Reporting a vulnerability

When this repository is published, use GitHub private vulnerability reporting if enabled. Otherwise contact [Aura Logic](https://auralogic.dev/) privately. Include affected versions, a sanitized reproduction and impact. Do not post secrets or an unpatched exploit in a public issue. There is currently no guaranteed response-time SLA.

## Network boundary

The CLI intentionally accepts local/private origins for development. It performs HTTP GET requests and follows redirects only within the selected origin, rejects URL credentials and non-HTTP protocols, and limits requests, body size and redirect depth.

These limits do **not** provide a complete SSRF defense. Do not expose this library directly as a public URL-auditing endpoint. A hosted service needs DNS/IP validation and rebinding protection, redirect validation, outbound network isolation, per-user limits and a reviewed deployment boundary. Audit only sites you own or are authorized to crawl. Reports may contain private URLs; store and share them accordingly.

## Dependencies

The lockfile is committed. CI installs with `npm ci`, checks production dependencies with `npm audit --omit=dev`, and Dependabot proposes npm and GitHub Actions updates. Review advisories and dependency changes before merging.
