import { audit, formatReport } from '../dist/index.js';

const url = process.argv[2];
if (!url) {
  console.error('Usage: node examples/audit.mjs <url>');
  process.exit(2);
}

const report = await audit({ url, maxPages: 50, maxRequests: 150 });
console.log(formatReport(report));
process.exitCode = report.complete ? (report.summary.errors ? 1 : 0) : 2;
