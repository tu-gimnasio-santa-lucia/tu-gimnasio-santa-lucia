/** Saved offline evidence for the exact generated public package. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, buildSite, sha256 } from './build.mjs';
import { assertPublicSite } from './quality-gates.mjs';

const manifest = await buildSite();
const outputs = new Map(
  await Promise.all(
    manifest.files.map(async ({ name }) => [name, await readFile(path.join(ROOT, 'dist', name))]),
  ),
);
const project = JSON.parse(await readFile(path.join(ROOT, 'project.json'), 'utf8'));
const report = assertPublicSite(outputs, project);
report.buildManifestSha256 = sha256(await readFile(path.join(ROOT, 'dist/build-manifest.json')));
await mkdir(path.join(ROOT, 'artifacts'), { recursive: true });
await writeFile(
  path.join(ROOT, 'artifacts/seo-report.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report, null, 2));
