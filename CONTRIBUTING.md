# Contributing

Thank you for helping improve Aura Logic Site Audit. Read the [code of conduct](CODE_OF_CONDUCT.md) and [security policy](SECURITY.md) first.

## Local setup

Use the version in `.nvmrc`, install with `npm ci`, then run `npm run check`. Work on a branch such as `fix/hreflang-return-links` or `feat/report-comparison`.

## Changes

- Keep changes focused; explain the user-visible behavior in the pull request.
- Add a meaningful regression test for parser, crawling or rule changes.
- Use local HTTP fixtures; tests must not depend on public websites or credentials.
- Preserve the documented report schema. Discuss breaking changes before implementation.
- Update documentation and `CHANGELOG.md` when behavior changes.
- Run `npm run check` before opening a pull request.

Husky runs lint-staged before commit, commitlint on the commit message, and the full check before push. Do not bypass hooks to hide a failing check.

## Commit messages

Use Conventional Commits, for example:

```text
feat(sitemap): support nested sitemap indexes
fix(hreflang): report missing reciprocal links
docs(cli): explain partial report exit codes
test(crawler): cover redirect loops
chore(deps): update development dependencies
```

## Issue reports

Include the tool and Node versions, the command, expected/actual behavior and a small sanitized reproduction. Remove credentials, private URLs and customer data from reports.

## Releases

Follow Semantic Versioning. During `0.x`, minor versions may introduce breaking changes; patches must remain compatible. Keep a Changelog documents changes. Releases and npm publication are maintainer actions; CI does not publish automatically. Before releasing, update the package version and CLI version, update the changelog, run `npm run check`, inspect `npm pack --dry-run`, and test the tarball in a clean environment.
