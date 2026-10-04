import { describe, expect, it } from 'vitest';
import { HttpClient } from '../src/http.js';
import { fixture } from './helpers.js';

describe('bounded HTTP client', () => {
  it('reuses requests and enforces request budgets', async () => {
    const server = await fixture((_, res) => {
      res.setHeader('Content-Type', 'text/plain');
      res.end('ok');
    });
    try {
      const client = new HttpClient(server.origin, 1, 1000, 0);
      expect((await client.get(server.origin)).body).toBe('ok');
      expect((await client.get(server.origin)).body).toBe('ok');
      expect(client.requests).toBe(1);
      await expect(client.get(server.origin + '/next')).rejects.toThrow(
        'Request limit',
      );
    } finally {
      await server.close();
    }
  });
  it('bounds redirects and rejects cross-origin, invalid and robots-blocked targets', async () => {
    const server = await fixture((req, res) => {
      res.statusCode = 302;
      if (req.url === '/external')
        res.setHeader('Location', 'https://example.org/');
      else if (req.url === '/invalid')
        res.setHeader('Location', 'javascript:alert(1)');
      else if (req.url !== '/absent') res.setHeader('Location', '/loop');
      res.end();
    });
    try {
      const client = new HttpClient(server.origin, 50, 1000, 1);
      await expect(client.get(server.origin + '/external')).rejects.toThrow(
        'Cross-origin',
      );
      await expect(client.get(server.origin + '/invalid')).rejects.toThrow(
        'valid',
      );
      await expect(client.get(server.origin + '/absent')).rejects.toThrow(
        'valid',
      );
      await expect(client.get(server.origin + '/loop')).rejects.toThrow(
        'Redirect limit',
      );
      client.isAllowed = (url) => !url.endsWith('/loop');
      await expect(client.get(server.origin + '/blocked')).rejects.toThrow(
        'robots.txt',
      );
    } finally {
      await server.close();
    }
  });
  it('limits response bodies and times out stalled connections', async () => {
    const server = await fixture((req, res) => {
      if (req.url === '/large') {
        res.setHeader('Content-Type', 'text/html');
        res.end('x'.repeat(2 * 1024 * 1024 + 1));
      }
    });
    try {
      await expect(
        new HttpClient(server.origin, 5, 1000, 0).get(server.origin + '/large'),
      ).rejects.toThrow('2 MiB');
      await expect(
        new HttpClient(server.origin, 5, 30, 0).get(server.origin + '/stall'),
      ).rejects.toThrow();
    } finally {
      await server.close();
    }
  });
});
