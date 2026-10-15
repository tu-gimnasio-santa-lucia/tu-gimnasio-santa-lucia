/** Portable backup: copied sources, generated public output, Git history and verified hashes. */
import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { ROOT, sha256 } from './build.mjs';

export async function createBackup() {
  const base = path.resolve(
    process.env.TU_GIMNASIO_BACKUP_DIR || path.join(ROOT, '..', 'tu-gimnasio-respaldos'),
  );
  const relative = path.relative(ROOT, base);
  if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative)))
    throw new Error('El respaldo debe quedar fuera del repositorio.');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const destination = path.join(base, `${stamp}-${randomUUID().slice(0, 8)}`);
  await mkdir(destination, { recursive: true });
  const entries = [];
  async function copyDirectory(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (['.git', 'node_modules', 'artifacts', '.taste-skill'].includes(entry.name)) continue;
      const source = path.join(directory, entry.name);
      if (entry.isSymbolicLink())
        throw new Error('Revisar enlace simbólico antes del respaldo: ' + source);
      if (entry.isDirectory()) {
        await copyDirectory(source);
        continue;
      }
      const name = path.relative(ROOT, source);
      const target = path.join(destination, 'files', name);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(source, target);
      const digest = sha256(await readFile(source));
      if (sha256(await readFile(target)) !== digest)
        throw new Error('Falló la verificación del respaldo.');
      entries.push({ name: name.split(path.sep).join('/'), sha256: digest });
    }
  }
  await copyDirectory(ROOT);
  const bundle = path.join(destination, 'repository.bundle');
  execFileSync('git', ['bundle', 'create', bundle, '--all'], { cwd: ROOT, stdio: 'pipe' });
  execFileSync('git', ['bundle', 'verify', bundle], { cwd: ROOT, stdio: 'pipe' });
  const result = {
    formatVersion: 1,
    createdAt: new Date().toISOString(),
    entries,
    gitBundleSha256: sha256(await readFile(bundle)),
    recovery:
      'Read docs/RECUPERACION.md. Restore files/ into a fresh directory; repository.bundle preserves Git refs. Keep all older backups.',
  };
  await writeFile(path.join(destination, 'manifest.json'), JSON.stringify(result, null, 2));
  return destination;
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url)
  console.log('Respaldo verificado:', await createBackup());
