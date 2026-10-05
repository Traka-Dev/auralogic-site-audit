#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Command, InvalidArgumentError } from 'commander';
import { audit } from './audit.js';
import { escapeTerminal, formatReport } from './report.js';

const integer = (value: string): number => {
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1
  ) {
    throw new InvalidArgumentError('Expected a positive integer.');
  }
  return Number(value);
};

const program = new Command()
  .name('aura-audit')
  .description(
    'Audit sitemaps, HTML canonical, HTML hreflang and internal links.',
  )
  .version('0.1.0')
  .argument('<url>', 'Site URL (HTTP or HTTPS)')
  .option('--sitemap <url>', 'Sitemap URL or path on the site origin')
  .option('--max-pages <number>', 'Maximum HTML pages', integer, 200)
  .option(
    '--max-requests <number>',
    'Maximum HTTP requests including redirects',
    integer,
    500,
  )
  .option('--timeout <milliseconds>', 'Timeout per resource', integer, 10000)
  .option(
    '--delay <milliseconds>',
    'Minimum delay between requests',
    integer,
    100,
  )
  .option('--json', 'Print a structured JSON report')
  .option('--output <file>', 'Write the report to a file instead of stdout');

try {
  program.parse();
  const options = program.opts<{
    sitemap?: string;
    maxPages: number;
    maxRequests: number;
    timeout: number;
    delay: number;
    json?: boolean;
    output?: string;
  }>();
  const report = await audit({
    url: program.args[0]!,
    maxPages: options.maxPages,
    maxRequests: options.maxRequests,
    timeoutMs: options.timeout,
    delayMs: options.delay,
    ...(options.sitemap ? { sitemap: options.sitemap } : {}),
  });
  const output = options.json
    ? `${JSON.stringify(report, null, 2)}\n`
    : formatReport(report);
  if (options.output) {
    await mkdir(dirname(options.output), { recursive: true });
    await writeFile(options.output, output);
  } else process.stdout.write(output);
  process.exitCode = report.complete ? (report.summary.errors ? 1 : 0) : 2;
} catch (error) {
  console.error(
    `Aura audit failed: ${escapeTerminal(error instanceof Error ? error.message : String(error))}`,
  );
  process.exitCode = 2;
}
