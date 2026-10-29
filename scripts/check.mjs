/** Required offline checks. A browser report is an additional release gate. */
import { execFileSync } from 'node:child_process';
import { ROOT } from './build.mjs';
for (const file of [
  'src/site.js',
  'src/elapsed-time.js',
  'scripts/build.mjs',
  'scripts/business-data.mjs',
  'scripts/preview.mjs',
  'scripts/backup.mjs',
  'scripts/publish.mjs',
  'scripts/browser-check.mjs',
  'scripts/performance-check.mjs',
  'scripts/release-check.mjs',
  'scripts/quality-gates.mjs',
  'scripts/seo-check.mjs',
]) {
  execFileSync(process.execPath, ['--check', file], {
    cwd: ROOT,
    stdio: 'inherit',
  });
}
execFileSync(process.execPath, ['--test', 'tests/site.test.mjs', 'tests/seo.test.mjs'], {
  cwd: ROOT,
  stdio: 'inherit',
});
execFileSync(process.execPath, ['scripts/seo-check.mjs'], {
  cwd: ROOT,
  stdio: 'inherit',
});
console.log('Comprobaciones de código y generación aprobadas.');
