import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const folder = await mkdtemp(join(tmpdir(), 'aura-audit-package-'));
// Use npm's JS entry point to avoid shell quoting and Windows .cmd differences.
const npmPath = process.env.npm_execpath;
if (!npmPath)
  throw new Error('Run this smoke check through npm run smoke:package.');
try {
  const { stdout } = await exec(process.execPath, [
    npmPath,
    'pack',
    '--ignore-scripts',
    '--json',
    '--pack-destination',
    folder,
  ]);
  const [archive] = JSON.parse(stdout);
  const paths = archive.files.map((file) => file.path);
  for (const required of [
    'dist/cli.js',
    'dist/index.js',
    'dist/index.d.ts',
    'README.md',
    'LICENSE',
  ]) {
    if (!paths.includes(required))
      throw new Error(`Missing package file: ${required}`);
  }
  if (
    paths.some((path) =>
      /^(src|tests|reports|\.husky|node_modules)\//.test(path),
    )
  ) {
    throw new Error('Development files leaked into the package.');
  }
  await exec(
    process.execPath,
    [
      npmPath,
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      join(folder, archive.filename),
    ],
    { cwd: folder },
  );
  const manifest = JSON.parse(
    await readFile(
      join(folder, 'node_modules/auralogic-site-audit/package.json'),
      'utf8',
    ),
  );
  const { stdout: version } = await exec(process.execPath, [
    join(folder, 'node_modules/auralogic-site-audit/dist/cli.js'),
    '--version',
  ]);
  if (version.trim() !== manifest.version)
    throw new Error('CLI/package version mismatch.');
  await exec(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import { audit, formatReport } from 'auralogic-site-audit'; if (typeof audit !== 'function' || typeof formatReport !== 'function') process.exit(1);",
    ],
    { cwd: folder },
  );
  console.log(
    `Package ${manifest.version}: CLI, ESM exports and packaged files verified in a clean install.`,
  );
} finally {
  await rm(folder, { recursive: true, force: true });
}
