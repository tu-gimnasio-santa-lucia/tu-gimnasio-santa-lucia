/** Explicit publication command. No force push; source commit, backup and fresh QA are mandatory. */
import { execFileSync } from 'node:child_process';
import { readFile, readdir, copyFile, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ROOT, sha256 } from './build.mjs';
import { createBackup } from './backup.mjs';

const git = (...args) =>
  execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
const project = JSON.parse(await readFile(path.join(ROOT, 'project.json')));
if (git('branch', '--show-current') !== project.sourceBranch)
  throw new Error('Publicar desde la rama fuente main.');
if (git('status', '--porcelain'))
  throw new Error('Guardar y revisar los cambios en un commit antes de publicar.');
if (git('remote', 'get-url', 'origin') !== project.repositoryUrl)
  throw new Error('Revisar el repositorio de destino.');
git('fetch', 'origin', project.sourceBranch, project.publicationBranch);
const sourceCommit = git('rev-parse', 'HEAD');
if (sourceCommit !== git('rev-parse', `origin/${project.sourceBranch}`))
  throw new Error('La fuente main debe estar respaldada en origin antes de publicar.');
const previousSiteCommit = git('rev-parse', `origin/${project.publicationBranch}`);
const backup = await createBackup();
execFileSync(process.execPath, ['scripts/check.mjs'], { cwd: ROOT, stdio: 'inherit' });
const manifestBytes = await readFile(path.join(ROOT, 'dist/build-manifest.json'));
const qa = JSON.parse(await readFile(path.join(ROOT, 'artifacts/qa-report.json')));
if (qa.status !== 'passed' || qa.buildManifestSha256 !== sha256(manifestBytes))
  throw new Error('Falta una revisión de navegador aprobada del build exacto.');
const staging = await mkdtemp(path.join(tmpdir(), 'tu-gimnasio-publicacion-'));
const checkout = path.join(staging, 'site');
git('worktree', 'add', '--detach', checkout, `origin/${project.publicationBranch}`);
const stageGit = (...args) =>
  execFileSync('git', ['-C', checkout, ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
try {
  const tracked = stageGit('ls-files', '-z').split('\0').filter(Boolean);
  if (tracked.some((name) => name.includes('/') || name.startsWith('.git')))
    throw new Error('La rama publicada tiene contenido inesperado. Revisar manualmente.');
  if (tracked.length) stageGit('rm', '--', ...tracked);
  for (const name of await readdir(path.join(ROOT, 'dist')))
    await copyFile(path.join(ROOT, 'dist', name), path.join(checkout, name));
  stageGit('add', '--all');
  if (stageGit('diff', '--cached', '--name-only')) {
    stageGit('commit', '-m', `Publica sitio verificado desde ${sourceCommit.slice(0, 12)}`);
    stageGit('push', 'origin', `HEAD:${project.publicationBranch}`);
  }
  const siteCommit = stageGit('rev-parse', 'HEAD');
  await writeFile(
    path.join(ROOT, 'artifacts/publication.json'),
    JSON.stringify(
      {
        sourceCommit,
        previousSiteCommit,
        siteCommit,
        backup,
        publicUrl: project.publicUrl,
        publishedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ sourceCommit, siteCommit, backup, publicUrl: project.publicUrl }));
} finally {
  // The target was created above under a unique OS temporary directory; never remove another checkout.
  if (path.dirname(checkout) !== staging || !staging.startsWith(tmpdir()))
    throw new Error('Destino temporal inesperado.');
  git('worktree', 'remove', checkout);
}
