/** Required offline checks. A browser report is an additional release gate. */
import { execFileSync } from 'node:child_process';
import { ROOT, buildSite } from './build.mjs';
for (const file of [
  'src/site.js',
  'src/elapsed-time.js',
  'scripts/build.mjs',
  'scripts/business-data.mjs',
  'scripts/preview.mjs',
  'scripts/backup.mjs',
  'scripts/publish.mjs',
  'scripts/browser-check.mjs',
]) {
  execFileSync(process.execPath, ['--check', file], { cwd: ROOT, stdio: 'inherit' });
}
execFileSync(process.execPath, ['--test', 'tests/site.test.mjs'], { cwd: ROOT, stdio: 'inherit' });
await buildSite();
console.log('Comprobaciones de código y generación aprobadas.');
