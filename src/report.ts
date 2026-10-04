import type { AuditReport } from './types.js';

export function formatReport(report: AuditReport): string {
  const lines = [
    `Aura Logic Site Audit — ${report.site}`,
    `${report.summary.pages} HTML pages · ${report.summary.sitemapUrls} sitemap URLs · ${report.summary.requests} requests`,
    `${report.summary.errors} errors · ${report.summary.warnings} warnings · ${report.summary.info} notes`,
    `Coverage: ${report.complete ? 'complete within supported scope' : 'partial (see findings)'}`,
    '',
    ...report.findings.map(
      (finding) =>
        `[${finding.severity.toUpperCase()}] ${finding.code}\n  ${finding.url}${finding.target ? ` → ${finding.target}` : ''}\n  ${finding.message}`,
    ),
  ];
  return `${lines.join('\n')}\n`;
}
