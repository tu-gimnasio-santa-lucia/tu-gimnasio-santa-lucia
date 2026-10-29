import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ROOT, buildSite } from '../scripts/build.mjs';
import { inspectPublicSite, JAVASCRIPT_BUDGET_BYTES } from '../scripts/quality-gates.mjs';

const project = JSON.parse(await readFile(path.join(ROOT, 'project.json'), 'utf8'));
let fixture;
async function output() {
  fixture ??= (async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'tu-gimnasio-seo-'));
    const manifest = await buildSite(directory);
    return new Map(
      await Promise.all(
        manifest.files.map(async ({ name }) => [name, await readFile(path.join(directory, name))]),
      ),
    );
  })();
  return new Map(await fixture);
}
function change(files, file, from, to) {
  files.set(file, Buffer.from(files.get(file).toString().replace(from, to)));
}
function fails(files, file) {
  const report = inspectPublicSite(files, project);
  assert.equal(report.status, 'failed');
  assert.ok(
    report.errors.some((issue) => issue.file === file),
    JSON.stringify(report),
  );
}
test('static release includes a distinct noindex error page, discoverable llms and a small script budget', async () => {
  const files = await output();
  const report = inspectPublicSite(files, project);
  assert.equal(report.status, 'passed', JSON.stringify(report.errors));
  assert.deepEqual(report.pages.map(({ file }) => file).sort(), ['404.html', 'index.html']);
  assert.ok(report.javascriptBytes < JAVASCRIPT_BUDGET_BYTES);
  assert.equal(report.robotsProjectPathIsEffective, false);
  assert.equal(report.robotsEffectiveUrl, new URL('/robots.txt', project.publicUrl).href);
  const business = JSON.parse(await readFile(path.join(ROOT, 'data/business.json'), 'utf8'));
  const llms = files.get('llms.txt').toString();
  for (const activity of business.activities) assert.ok(llms.includes(activity.name));
  assert.ok(llms.includes(business.contacts.instagram));
});
test('metadata regressions fail before publishing instead of relying on a written checklist', async () => {
  for (const [from, to] of [
    [/<meta name="description"[^>]*>/, ''],
    [/<link rel="canonical"[^>]*>/, ''],
    [/lang="es-AR"/, 'lang=""'],
    [/<h1\b/, '<h1-hidden'],
    [/<\/h1>/, '</h1><h1>Otro título</h1>'],
    [
      /<meta property="og:image"[^>]*>/,
      '<meta property="og:image" content="https://invalid.example/image.png">',
    ],
    [/<img\b([^>]*?)alt="[^"]*"/, '<img$1'],
    [/<link rel="icon"[^>]*>/, '<link rel="icon" href="no-existe.png">'],
    [/<link rel="icon"[^>]*>/, '<link rel="icon" href="https://[">'],
    [/<link rel="describedby"[^>]*>/, ''],
    [/application\/ld\+json/, 'text/plain'],
  ]) {
    const files = await output();
    change(files, 'index.html', from, to);
    fails(files, 'index.html');
  }
  const repeated = await output();
  const title = repeated
    .get('index.html')
    .toString()
    .match(/<title>([^<]+)<\/title>/)[1];
  change(repeated, '404.html', /<title>[^<]+<\/title>/, `<title>${title}</title>`);
  assert.ok(
    inspectPublicSite(repeated, project).errors.some(({ message }) =>
      message.includes('Título vacío o repetido'),
    ),
  );
  const decorative = await output();
  assert.equal(
    inspectPublicSite(decorative, project).status,
    'passed',
    'Intentional empty alt attributes remain valid.',
  );
});
test('crawler files cannot disappear, block the public site or list an error page in the sitemap', async () => {
  for (const file of ['404.html', 'llms.txt', 'sitemap.xml', 'robots.txt']) {
    const files = await output();
    files.delete(file);
    fails(files, file);
  }
  const blocked = await output();
  blocked.set('robots.txt', Buffer.from('User-agent: *\nAllow: /\nDisallow: /\n'));
  fails(blocked, 'robots.txt');
  const blockedPath = await output();
  blockedPath.set(
    'robots.txt',
    Buffer.from(`User-agent: *\nAllow: /\nDisallow: ${new URL(project.publicUrl).pathname}\n`),
  );
  fails(blockedPath, 'robots.txt');
  const wrongSitemap = await output();
  change(
    wrongSitemap,
    'sitemap.xml',
    project.publicUrl,
    new URL('404.html', project.publicUrl).href,
  );
  fails(wrongSitemap, 'sitemap.xml');
  const indexableError = await output();
  change(indexableError, '404.html', 'noindex,follow', 'index,follow');
  fails(indexableError, '404.html');
});
test('source maps, development runtime and oversized JavaScript are rejected in the public package', async () => {
  for (const [file, body] of [
    ['leak.js.map', '{}'],
    ['leak.js', '//# sourceMappingURL=private.map'],
    ['dev.js', 'import "/@vite/client"'],
    ['large.js', 'x'.repeat(JAVASCRIPT_BUDGET_BYTES)],
  ]) {
    const files = await output();
    files.set(file, Buffer.from(body));
    fails(files, file === 'large.js' ? 'JavaScript público' : file);
  }
});
