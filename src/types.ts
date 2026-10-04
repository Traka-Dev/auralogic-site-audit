export type Severity = 'error' | 'warning' | 'info';

export interface Finding {
  code: string;
  severity: Severity;
  url: string;
  message: string;
  target?: string;
}

export interface Alternate {
  language: string;
  url: string;
  absolute: boolean;
}

export interface Page {
  url: string;
  status: number;
  canonical: string[];
  alternates: Alternate[];
  links: string[];
  noindex: boolean;
}

export interface AuditOptions {
  url: string;
  sitemap?: string;
  maxPages?: number;
  maxRequests?: number;
  timeoutMs?: number;
  delayMs?: number;
}

export interface AuditReport {
  schemaVersion: 1;
  site: string;
  generatedAt: string;
  complete: boolean;
  summary: {
    pages: number;
    requests: number;
    sitemapUrls: number;
    errors: number;
    warnings: number;
    info: number;
  };
  findings: Finding[];
}
