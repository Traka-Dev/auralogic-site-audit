# Contributing

Thank you for helping improve Aura Logic Site Audit. Read the [code of conduct](CODE_OF_CONDUCT.md) and [security policy](SECURITY.md) first.

## Contribution workflow

1. Open an issue for significant features or changes to audit rules. Small fixes can go straight to a pull request.
2. Fork [the repository](https://github.com/Traka-Dev/auralogic-site-audit) and clone your fork.
3. Create a focused branch from the current main branch.
4. Implement the change with local regression fixtures and documentation.
5. Run `npm run check` and `npm run smoke:package`.
6. Push your branch and open a pull request against `main`, describing the problem, resulting behavior and validation.

Maintainers review changes before merging. New contributors are welcome; ask questions in an issue if the expected behavior is unclear.

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

Follow Semantic Versioning. During `0.x`, minor versions may introduce breaking changes; patches must remain compatible. Changes are documented using the Keep a Changelog format. Releases and npm publication are maintainer actions; CI does not publish automatically. Before releasing, update the package version and CLI version, update the changelog, run `npm run check`, inspect `npm pack --dry-run`, and test the tarball in a clean environment.
