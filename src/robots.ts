import { createRequire } from 'node:module';

interface RobotsRules {
  isAllowed(url: string, agent: string): boolean | undefined;
  getCrawlDelay(agent: string): number | undefined;
  getSitemaps(): string[];
}

// The dependency's legacy declarations do not model its CommonJS export under NodeNext.
export const robotsParser = createRequire(import.meta.url)('robots-parser') as (
  url: string,
  contents: string,
) => RobotsRules;
