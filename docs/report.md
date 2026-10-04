# JSON report contract

`schemaVersion` is `1`. Each report has `site`, an ISO timestamp in `generatedAt`, `complete`, `summary`, and a `findings` array.

`summary` contains `pages` (unique parsed HTML URLs), `requests` (HTTP attempts, including redirects), `sitemapUrls` (unique same-origin loc values), `errors`, `warnings`, and `info` counts.

Each finding contains:

| Field      | Meaning                                                   |
| ---------- | --------------------------------------------------------- |
| `code`     | Stable machine-readable identifier, such as `BROKEN_LINK` |
| `severity` | `error`, `warning` or `info`                              |
| `url`      | Affected or referring URL                                 |
| `message`  | Explanation of the observed condition                     |
| `target`   | Optional destination URL or invalid declaration           |

Findings are sorted by URL, code and target to make comparisons predictable. Timestamp and request counts can differ between runs. Consumers should accept additional fields and unknown finding codes. Breaking schema changes require a version increment. Inspect `complete` before treating a report as a successful audit.
