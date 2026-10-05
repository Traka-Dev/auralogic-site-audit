# Changelog

All notable changes to this project will be documented here. The format follows Keep a Changelog and versions follow Semantic Versioning.

## [Unreleased]

### Added

- CLI and typed library for sitemap, HTML canonical, HTML hreflang and internal link audits.
- JSON and text reports with explicit findings, request counts and coverage status.
- Robots-aware crawling with request, page, timeout, redirect and response-size limits.
- Local fixture tests and coverage thresholds.
- Husky, lint-staged, Conventional Commits, ESLint, Prettier and strict TypeScript.
- CI, Dependabot, issue templates, contribution guidelines and MIT license.

### Security

- Bound retained response bodies to a 32 MiB UTF-8 byte budget and limit sitemap entries and discovered URLs.
- Escape terminal and bidirectional control characters in text reports and runtime error messages.

### Fixed

- Avoid false hreflang self-reference and return-link failures on duplicate parameterized URLs that declare a different canonical.
- Deduplicate reciprocal-link findings when x-default shares another language's destination.
