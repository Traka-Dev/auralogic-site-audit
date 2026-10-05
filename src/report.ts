import type { AuditReport } from './types.js';

// Render untrusted text literally; never emit terminal commands or bidirectional controls.
export function escapeTerminal(value: string): string {
  return Array.from(value, (character) => {
    const code = character.codePointAt(0)!;
    return code < 32 ||
      (code >= 127 && code <= 159) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069)
      ? `\\u${code.toString(16).padStart(4, '0')}`
      : character;
  }).join('');
}

export function formatReport(report: AuditReport): string {
  const lines = [
    `Aura Logic Site Audit — ${escapeTerminal(report.site)}`,
    `${report.summary.pages} HTML pages · ${report.summary.sitemapUrls} sitemap URLs · ${report.summary.requests} requests`,
    `${report.summary.errors} errors · ${report.summary.warnings} warnings · ${report.summary.info} notes`,
    `Coverage: ${report.complete ? 'complete within supported scope' : 'partial (see findings)'}`,
    '',
    ...report.findings.map(
      (finding) =>
        `[${finding.severity.toUpperCase()}] ${escapeTerminal(finding.code)}\n  ${escapeTerminal(finding.url)}${finding.target ? ` → ${escapeTerminal(finding.target)}` : ''}\n  ${escapeTerminal(finding.message)}`,
    ),
  ];
  return `${lines.join('\n')}\n`;
}
