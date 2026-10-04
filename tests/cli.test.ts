import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { fixture, html } from './helpers.js';

const exec = promisify(execFile);
const cli = resolve('dist/cli.js');

describe('CLI contract', () => {
  it('prints help/version and rejects invalid arguments', async () => {
    expect(
      (await exec(process.execPath, [cli, '--version'])).stdout.trim(),
    ).toBe('0.1.0');
    expect((await exec(process.execPath, [cli, '--help'])).stdout).toContain(
      '--max-pages',
    );
    await expect(
      exec(process.execPath, [cli, 'https://example.com', '--max-pages', '-1']),
    ).rejects.toMatchObject({ code: 1 });
    await expect(
      exec(process.execPath, [cli, 'file:///tmp/site']),
    ).rejects.toMatchObject({ code: 2 });
  });

  it('writes valid JSON, preserves stdout and exposes exit codes for findings and partial coverage', async () => {
    let mode = 'clean';
    const server = await fixture((req, res, origin) => {
      if (req.url === '/robots.txt') {
        res.setHeader('Content-Type', 'text/plain');
        res.end('');
      } else if (req.url?.endsWith('.xml')) {
        res.statusCode = 404;
        res.end();
      } else if (req.url === '/missing') {
        res.statusCode = 404;
        res.end();
      } else {
        res.setHeader('Content-Type', 'text/html');
        res.end(
          html(
            origin + '/',
            '',
            mode === 'clean' ? '' : '<a href="/missing">Broken</a>',
          ),
        );
      }
    });
    const folder = await mkdtemp(join(tmpdir(), 'aura-cli-'));
    try {
      const file = join(folder, 'nested/report.json');
      const result = await exec(process.execPath, [
        cli,
        server.origin,
        '--json',
        '--output',
        file,
        '--delay',
        '1',
      ]);
      expect(result.stdout).toBe('');
      expect(JSON.parse(await readFile(file, 'utf8'))).toMatchObject({
        schemaVersion: 1,
        complete: true,
        summary: { errors: 0 },
      });
      mode = 'broken';
      await expect(
        exec(process.execPath, [cli, server.origin, '--delay', '1']),
      ).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining('BROKEN_LINK'),
      });
      await expect(
        exec(process.execPath, [
          cli,
          server.origin,
          '--max-pages',
          '1',
          '--delay',
          '1',
        ]),
      ).rejects.toMatchObject({
        code: 2,
        stdout: expect.stringContaining('partial'),
      });
    } finally {
      await server.close();
      await rm(folder, { recursive: true, force: true });
    }
  });
});
