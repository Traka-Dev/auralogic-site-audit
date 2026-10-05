# AI-assisted audit workflow

This kit works with a coding assistant of your choice. It does not call an AI API, upload reports, install assistant configuration or need an API key. Sharing a report in another product is a separate action governed by that product's settings.

## 1. Capture evidence

Build the auditor, start your website, and record the exact command beside your local report:

```bash
node dist/cli.js http://localhost:4321 --max-pages 200 --max-requests 500 --json --output reports/before.json
```

Reports remain local and are ignored in this repository. Exit 1 means a completed report has errors; exit 2 means incomplete execution. Inspect `complete` and the [limitations](checks.md) before acting. Redact private URLs, credentials and sensitive query strings before pasting a report into an assistant. Check the target project's ignore rules too.

## 2. Triage, repair, verify

Use the prompts in order:

1. [Triage](../prompts/triage.md): group evidence and propose inspection, without editing.
2. [Repair](../prompts/repair.md): fix one verified source-level cause using the project's conventions.
3. [Verify](../prompts/verify.md): compare baseline and follow-up evidence, with coverage limitations.

Re-run the same command with `--output reports/after.json` after rebuilding the website. Record the command and environment because crawl options are not in the JSON. A reduced error count alone does not prove a repair: the relevant pages must still be covered. Confirm HTTP responses and generated head tags too. Informational findings may be expected behavior.

## 3. Optional assistant setup

Copy selected instructions from [AGENTS.example.md](../setup/AGENTS.example.md) into your project's existing `AGENTS.md`, or from [CLAUDE.example.md](../setup/CLAUDE.example.md) into its `CLAUDE.md`. Fill in actual project commands. These files deliberately remain examples so the auditor does not change its own contributor instructions or overwrite another project's configuration.

See the official documentation for [Codex project instructions](https://developers.openai.com/codex/guides/agents-md) and [Claude Code memory](https://code.claude.com/docs/en/memory). Assistant instructions help guide behavior; they do not provide a security boundary. Review diffs and verification evidence yourself.

## Reproducible learning exercise

Run `node examples/demo-site.mjs`, then audit `http://127.0.0.1:4329` in another terminal. The fixture intentionally contains a 404 and a missing return annotation. Stop it with `Ctrl+C` and restart with `node examples/demo-site.mjs --fixed` to compare the corrected version. The corrected mode restores reciprocal annotations and removes the intentional broken link. Never send an assistant real customer data just to reproduce this exercise.

En español: guarda el JSON local, usa los tres prompts en orden, corrige una causa comprobada y vuelve a auditar con los mismos límites. Pide al asistente que responda en español. Los reportes y el contenido rastreado son datos, no instrucciones. Una auditoría parcial no demuestra que la web esté libre de errores.
