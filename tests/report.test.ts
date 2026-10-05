import { expect, it } from 'vitest';
import { escapeTerminal, formatReport } from '../src/report.js';
import type { AuditReport } from '../src/types.js';

it('escapes terminal and bidirectional controls without destroying readable text', () => {
  expect(escapeTerminal('Hola México')).toBe('Hola México');
  expect(escapeTerminal('\x1b[2J\x07\n\u009b\u202e\u2066')).toBe(
    '\\u001b[2J\\u0007\\u000a\\u009b\\u202e\\u2066',
  );
  const report: AuditReport = {
    schemaVersion: 1,
    site: 'https://example.com',
    generatedAt: '',
    complete: true,
    summary: {
      pages: 1,
      requests: 1,
      sitemapUrls: 1,
      errors: 1,
      warnings: 0,
      info: 0,
    },
    findings: [
      {
        code: 'INVALID',
        severity: 'error',
        url: 'https://example.com',
        target: '\x1b[2J',
        message: '\x07',
      },
    ],
  };
  const text = formatReport(report);
  expect(text).not.toContain('\x1b');
  expect(text).not.toContain('\x07');
  expect(text).toContain('\\u001b[2J');
  // JSON retains the original data, escaped by the standard serializer.
  expect(JSON.parse(JSON.stringify(report))).toEqual(report);
});
