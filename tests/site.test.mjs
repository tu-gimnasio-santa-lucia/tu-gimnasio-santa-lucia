import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  ROOT,
  buildSite,
  escapeHtml,
  serializeJsonLd,
  renderTemplate,
  validateBusinessData,
  validateAssetManifest,
} from '../scripts/build.mjs';

test('refuses asset paths that escape the public allowlist', async () => {
  const assets = JSON.parse(await readFile(path.join(ROOT, 'assets/manifest.json')));
  assets.logo.png = '../private.png';
  assert.throws(() => validateAssetManifest(assets), /insegura/);
});

test('escapes HTML data and prevents a JSON-LD closing-tag injection', () => {
  assert.equal(escapeHtml('<img src=x onerror="x">'), '&lt;img src=x onerror=&quot;x&quot;&gt;');
  assert.ok(!serializeJsonLd({ text: '</script><script>alert(1)</script>' }).includes('</script>'));
  assert.throws(() => renderTemplate('{{undefined_key}}', {}), /sin definir/);
});
test('rejects unsafe links, duplicate activities and invalid real-business inputs', async () => {
  const business = JSON.parse(await readFile(path.join(ROOT, 'data/business.json')));
  const project = JSON.parse(await readFile(path.join(ROOT, 'project.json')));
  for (const mutate of [
    (d) => {
      d.contacts.instagram = 'javascript:alert(1)';
    },
    (d) => {
      d.phoneInternational = '54<script>';
    },
    (d) => {
      d.hours.opens = '25:61';
    },
    (d) => {
      d.activities.push(d.activities[0]);
    },
    (d) => {
      d.foundedYear = 1998;
    },
  ]) {
    const data = structuredClone(business);
    mutate(data);
    assert.throws(() => validateBusinessData(data, project));
  }
});
test('reproducible build; official content, CSP hash, SRI and output boundaries', async () => {
  const one = await mkdtemp(path.join(tmpdir(), 'tu-gimnasio-build-a-'));
  const two = await mkdtemp(path.join(tmpdir(), 'tu-gimnasio-build-b-'));
  const a = await buildSite(one);
  const b = await buildSite(two);
  assert.deepEqual(a, b);
  assert.equal(
    await readFile(path.join(one, 'index.html'), 'utf8'),
    await readFile(path.join(two, 'index.html'), 'utf8'),
  );
  const html = await readFile(path.join(one, 'index.html'), 'utf8');
  assert.ok(!a.files.some((file) => /horarios-referencia|spinning\.png/.test(file.name)),
    'Los afiches con horarios antiguos se conservan en la fuente, fuera de la publicación.');
  for (const value of [
    'Desde 1996',
    'Musculación',
    'Spinning',
    'Gimnasia grupal',
    'Pilates',
    'Av. Italia 109',
    '03777 72-3911',
    'Volvamos a las bases',
    'TU LUGAR,',
  ])
    assert.ok(html.includes(value), value);
  assert.doesNotMatch(html, /1998|\bFuncional\b|bautistale98\.github\.io|chatgpt\.site|\{\{/i);
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const expected = createHash('sha256').update(jsonLd).digest('base64');
  assert.ok(html.includes('sha256-' + expected));
  const business = JSON.parse(await readFile(path.join(ROOT, 'data/business.json')));
  assert.equal(
    JSON.parse(jsonLd).aggregateRating.reviewCount,
    String(business.googleRating.reviewCount),
  );
  for (const file of a.files)
    assert.equal(
      createHash('sha256')
        .update(await readFile(path.join(one, file.name)))
        .digest('hex'),
      file.sha256,
    );
  const integrityReferences = [...html.matchAll(
    /(?:href|src)="((?:styles|site)\.[a-f0-9]+\.(?:css|js))"\s+integrity="([^"]+)"/g,
  )];
  assert.equal(integrityReferences.length, 2, 'CSS y JavaScript deben declarar integridad.');
  for (const match of integrityReferences) {
    const expectedSri =
      'sha384-' +
      createHash('sha384')
        .update(await readFile(path.join(one, match[1])))
        .digest('base64');
    assert.equal(match[2], expectedSri);
  }
  for (const name of await readdir(one))
    assert.ok(!/\.env|\.git|\.tsx|\.mjs|business\.json|node_modules/.test(name));
});
