import { setTimeout as sleep } from 'node:timers/promises';
import { normalizeUrl } from './parse.js';

export interface Resource {
  url: string;
  finalUrl: string;
  status: number;
  contentType: string;
  robots: string;
  body: string;
}

export class HttpClient {
  requests = 0;
  delayMs: number;
  isAllowed: (url: string) => boolean = () => true;
  private readonly cache = new Map<string, Resource>();
  private cacheBytes = 0;

  constructor(
    private readonly origin: string,
    private readonly maxRequests: number,
    private readonly timeoutMs: number,
    delayMs: number,
    private readonly maxCacheBytes = 32 * 1024 * 1024,
  ) {
    this.delayMs = delayMs;
  }

  async get(url: string): Promise<Resource> {
    const cached = this.cache.get(url);
    if (cached) return cached;
    const signal = AbortSignal.timeout(this.timeoutMs);
    let current = url;
    for (let redirects = 0; redirects <= 8; redirects += 1) {
      if (new URL(current).origin !== this.origin)
        throw new Error('Cross-origin requests are outside this audit.');
      if (!this.isAllowed(current))
        throw new Error('Redirect target is disallowed by robots.txt.');
      if (this.requests >= this.maxRequests)
        throw new Error('Request limit reached.');
      if (this.requests && this.delayMs)
        await sleep(this.delayMs, undefined, { signal });
      this.requests += 1;
      const response = await fetch(current, {
        redirect: 'manual',
        signal,
        headers: {
          'User-Agent': 'AuraLogicSiteAudit/0.1',
          Accept: 'text/html, application/xml, text/plain;q=0.8, */*;q=0.1',
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = normalizeUrl(
          response.headers.get('location') ?? '',
          current,
        );
        await response.body?.cancel();
        if (!location || !response.headers.has('location'))
          throw new Error('Redirect has no valid HTTP(S) location.');
        current = location;
        continue;
      }
      const contentType = response.headers.get('content-type') ?? '';
      let body = '';
      if (/html|xml|text\/plain/i.test(contentType) && response.body) {
        const chunks: Uint8Array[] = [];
        let size = 0;
        const reader = response.body.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 2 * 1024 * 1024)
              throw new Error('Response exceeds the 2 MiB body limit.');
            chunks.push(value);
          }
          body = Buffer.concat(chunks).toString('utf8');
        } finally {
          await reader.cancel();
        }
      } else {
        await response.body?.cancel();
      }
      const resource = {
        url,
        finalUrl: current,
        status: response.status,
        contentType,
        robots: response.headers.get('x-robots-tag') ?? '',
        body,
      };
      const bytes = Buffer.byteLength(body, 'utf8');
      if (this.cacheBytes + bytes <= this.maxCacheBytes) {
        this.cache.set(url, resource);
        this.cacheBytes += bytes;
      }
      return resource;
    }
    throw new Error('Redirect limit reached.');
  }
}
