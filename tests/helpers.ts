import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { once } from 'node:events';

export async function fixture(
  handler: (req: IncomingMessage, res: ServerResponse, origin: string) => void,
) {
  let origin = '';
  const server = createServer((req, res) => handler(req, res, origin));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('No fixture port.');
  origin = `http://127.0.0.1:${address.port}`;
  return {
    origin,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}

export function html(url: string, head = '', body = ''): string {
  return `<!doctype html><html><head><link rel="canonical" href="${url}">${head}</head><body>${body}</body></html>`;
}
