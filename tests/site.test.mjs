import test from 'node:test';
import { calculateElapsed } from '../src/elapsed-time.js';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { startPreview } from '../scripts/preview.mjs';
import { validateReleaseReports } from '../scripts/release-check.mjs';
import {
  ROOT,
  buildSite,
  escapeHtml,
  serializeJsonLd,
  renderTemplate,
  validateBusinessData,
  validateAssetManifest,
} from '../scripts/build.mjs';
import {
  buildWhatsAppUrl,
  buildScheduleMessage,
  buildDirectionsUrl,
  formatScheduleDays,
  getGeneralSchedule,
} from '../scripts/business-data.mjs';

test('refuses asset paths that escape the public allowlist', async () => {
  const assets = JSON.parse(await readFile(path.join(ROOT, 'assets/manifest.json')));
  assets.logo.png = '../private.png';
  assert.throws(() => validateAssetManifest(assets), /insegura/);
  const fontAssets = JSON.parse(await readFile(path.join(ROOT, 'assets/manifest.json')));
  fontAssets.fonts.display.file = '../private.ttf';
  assert.throws(() => validateAssetManifest(fontAssets), /insegura/);
});

test('escapes HTML data and prevents a JSON-LD closing-tag injection', () => {
  assert.equal(escapeHtml('<img src=x onerror="x">'), '&lt;img src=x onerror=&quot;x&quot;&gt;');
  assert.ok(!serializeJsonLd({ text: '</script><script>alert(1)</script>' }).includes('</script>'));
  assert.throws(() => renderTemplate('{{undefined_key}}', {}), /sin definir/);
});

test('release requires browser and complete performance evidence from the exact build', () => {
  const manifest = Buffer.from('release fixture');
  const digest = createHash('sha256').update(manifest).digest('hex');
  const browser = { status: 'passed', buildManifestSha256: digest };
  const performance = {
    status: 'passed',
    mode: 'verify',
    buildManifestSha256: digest,
    cases: [1, 2, 3, 4],
    errors: [],
  };
  assert.equal(validateReleaseReports(browser, performance, manifest), digest);
  assert.throws(() =>
    validateReleaseReports({ ...browser, buildManifestSha256: 'previous' }, performance, manifest),
  );
  for (const changed of [
    null,
    { ...performance, mode: 'baseline' },
    { ...performance, cases: [1] },
    { ...performance, status: 'failed' },
    { ...performance, buildManifestSha256: 'previous' },
  ])
    assert.throws(() => validateReleaseReports(browser, changed, manifest));
});

test('rejects unsafe responsive/font paths and inconsistent candidate dimensions', async () => {
  const assets = JSON.parse(await readFile(path.join(ROOT, 'assets/manifest.json')));
  for (const mutate of [
    (data) => {
      data.fonts.display.woff2.file = '../private.woff2';
    },
    (data) => {
      data.identity.responsive[0].file = '../private.webp';
    },
    (data) => {
      data.identity.responsive[0].sha256 = 'not-a-hash';
    },
    (data) => {
      data.identity.responsive[0].height += 1;
    },
    (data) => {
      data.identity.responsive[1].width = data.identity.responsive[0].width;
    },
  ]) {
    const changed = structuredClone(assets);
    mutate(changed);
    assert.throws(() => validateAssetManifest(changed));
  }
});

test('local preview rejects foreign authorities/origins, writes and private paths', async () => {
  const { server, url } = await startPreview(0);
  const request = (route, method = 'GET', headers = {}) =>
    new Promise((resolve, reject) => {
      const req = httpRequest(new URL(route, url), { method, headers }, (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () =>
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: Buffer.concat(chunks),
          }),
        );
      });
      req.on('error', reject);
      req.end();
    });
  try {
    assert.equal((await request('/', 'GET', { Host: 'attacker.invalid' })).status, 403);
    assert.equal((await request('/', 'GET', { Origin: 'https://attacker.invalid' })).status, 403);
    const post = await request('/', 'POST');
    assert.equal(post.status, 405);
    assert.equal(post.headers.allow, 'GET, HEAD');
    for (const route of ['/.git/config', '/data/business.json', '/src/site.js'])
      assert.equal((await request(route)).status, 404);
    assert.equal((await request('/%zz')).status, 400);
    const head = await request('/', 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
    assert.equal(head.headers['cross-origin-resource-policy'], 'same-origin');
    const font = await request('/anton-regular.woff2');
    assert.equal(font.status, 200);
    assert.equal(font.headers['content-type'], 'font/woff2');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
test('rejects unsafe links, duplicate activities and invalid real-business inputs', async () => {
  const business = JSON.parse(await readFile(path.join(ROOT, 'data/business.json')));
  const project = JSON.parse(await readFile(path.join(ROOT, 'project.json')));
  for (const mutate of [
    (d) => {
      d.contacts.instagram = 'javascript:alert(1)';
    },
    (d) => {
      d.teachers.titi.phoneInternational = '54<script>';
    },
    (d) => {
      d.activities[0].schedules[0].periods[0].start = '25:61';
    },
    (d) => {
      d.activities.push(d.activities[0]);
    },
    (d) => {
      d.foundedYear = 1998;
    },
    (d) => {
      d.activities[0].schedules[0].teacherId = 'desconocido';
    },
    (d) => {
      d.activities[0].schedules[0].days = ['Tuesday', 'Monday'];
    },
    (d) => {
      d.relocation.maps.placeId = 'javascript:alert(1)';
    },
    (d) => {
      d.relocation.maps.latitude = Infinity;
    },
    (d) => {
      d.contacts.defaultTeacherId = '__proto__';
    },
    (d) => {
      d.activities[0].schedules[0].periods[1].start = '10:00';
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
  assert.ok(
    !a.files.some((file) => /horarios-referencia|spinning\.png/.test(file.name)),
    'Los afiches con horarios antiguos se conservan en la fuente, fuera de la publicación.',
  );
  for (const value of [
    'Desde 1996',
    'Musculación',
    'Spinning',
    'Gimnasia grupal',
    'Pilates',
    'Héroes de Malvinas 150',
    '03777 72-3911',
    '03777 47-2060',
    'Pilates en colchoneta',
    'Volvamos a las bases',
    'Tu lugar,',
  ])
    assert.ok(html.includes(value), value);
  assert.doesNotMatch(
    html,
    /1998|\bFuncional\b|bautistale98\.github\.io|chatgpt\.site|\{\{|Av\. Italia|En construcción|\$\s*\d/i,
  );
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const expected = createHash('sha256').update(jsonLd).digest('base64');
  assert.ok(html.includes('sha256-' + expected));
  const business = JSON.parse(await readFile(path.join(ROOT, 'data/business.json')));
  assert.ok(
    !('aggregateRating' in JSON.parse(jsonLd)),
    'Do not mark up self-serving business ratings.',
  );
  assert.ok(
    html.includes(`${business.googleRating.reviewCount} opiniones en Google`),
    'Keep the visible, sourced rating.',
  );
  assert.equal(
    JSON.parse(jsonLd).address.streetAddress,
    business.address.street,
    'Los datos estructurados conservan la dirección confirmada.',
  );
  const structured = JSON.parse(jsonLd);
  assert.equal(
    structured['@id'],
    'https://tu-gimnasio-santa-lucia.github.io/tu-gimnasio-santa-lucia/#gimnasio',
  );
  assert.ok(
    html.includes('Cifras al ' + business.anniversary.snapshotDate.split('-').reverse().join('/')),
  );
  assert.match(html, /srcset="[^\"]+480w[^\"]+768w[^\"]+1254w" sizes=/);
  assert.doesNotMatch(html, /reapertura|próxima apertura|apertura anunciada|3 de noviembre/i);
  assert.doesNotMatch(structured.description, /apertura|inauguraci[oó]n/i);
  assert.deepEqual(
    structured.openingHoursSpecification.map(({ opens, closes, validFrom }) => [
      opens,
      closes,
      validFrom,
    ]),
    [
      ['07:00', '11:00', '2026-11-03'],
      ['13:30', '22:00', '2026-11-03'],
    ],
    'La pausa y el inicio futuro deben conservarse en buscadores.',
  );
  assert.equal(structured.hasMap, buildDirectionsUrl(business));
  assert.equal(structured.telephone, '+5493777723911');
  assert.ok(
    html.indexOf('id="actividades"') < html.indexOf('id="aniversario"'),
    'Las actividades deben estar antes que el contador detallado.',
  );
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  const sectionIds = [...main.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(sectionIds.slice(-2), ['aniversario', 'bases']);
  assert.ok(
    main.indexOf('class="manifesto-art"') > main.indexOf('id="bases"'),
    'La gráfica original de Volvamos a las bases debe cerrar el contenido.',
  );
  assert.equal((main.match(/class="manifesto-art"/g) || []).length, 1);
  assert.doesNotMatch(main, /id="nueva-sede"|class="future"|opening_date/);
  assert.equal((html.match(/class="activity-session"/g) || []).length, 10);
  assert.equal((html.match(/class="activity-instagram"/g) || []).length, 4);
  assert.deepEqual(
    await readFile(path.join(ROOT, 'assets/tu-gimnasio-logo.jpg')),
    await readFile(path.join(ROOT, 'assets/tu-gimnasio-logo.png')),
    'La extensión JPEG correcta conserva exactamente el original sin editarlo.',
  );
  for (const metric of business.anniversary.metrics)
    assert.ok(html.includes(new Intl.NumberFormat('es-AR').format(metric.value)));
  for (const file of a.files)
    assert.equal(
      createHash('sha256')
        .update(await readFile(path.join(one, file.name)))
        .digest('hex'),
      file.sha256,
    );
  const integrityReferences = [
    ...html.matchAll(
      /(?:href|src)="((?:styles|site)\.[a-f0-9]+\.(?:css|js))"\s+integrity="([^"]+)"/g,
    ),
  ];
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

test('anniversary figures remain coherent and a scheduled opening cannot imply an open venue', async () => {
  const business = JSON.parse(await readFile(path.join(ROOT, 'data/business.json')));
  const project = JSON.parse(await readFile(path.join(ROOT, 'project.json')));
  for (const mutate of [
    (data) => {
      data.anniversary.metrics[3].value += 1;
    },
    (data) => {
      data.anniversary.years = 31;
    },
    (data) => {
      data.anniversary.metrics[0].id = 'hours';
    },
    (data) => {
      data.relocation.maps.streetNameUpdated = true;
    },
    (data) => {
      data.relocation.openingDate = '2026-02-31';
    },
    (data) => {
      data.relocation.status = 'open';
    },
    (data) => {
      data.relocation.maps.coordinateSource = 'street-view-camera';
    },
  ]) {
    const data = structuredClone(business);
    mutate(data);
    assert.throws(() => validateBusinessData(data, project));
  }
});

test('confirmed schedules preserve teacher, days, lunch break and unknown spinning duration', async () => {
  const business = JSON.parse(await readFile(path.join(ROOT, 'data/business.json')));
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  assert.equal(business.relocation.openingDate, '2026-11-03');
  assert.deepEqual(getGeneralSchedule(business).periods, [
    { start: '07:00', end: '11:00' },
    { start: '13:30', end: '22:00' },
  ]);
  const special = business.activities[0].schedules.find(
    (schedule) => schedule.id === 'especial-martita',
  );
  assert.equal(special.teacherId, 'martita');
  assert.deepEqual(special.days, weekdays);
  assert.deepEqual(special.periods, [
    { start: '08:00', end: '09:00' },
    { start: '20:00', end: '21:00' },
  ]);
  const spinning = business.activities.find((activity) => activity.id === 'spinning');
  assert.deepEqual(
    spinning.schedules.map((s) => [s.days, s.periods[0].start, s.periods[0].end, s.teacherId]),
    [
      [['Tuesday', 'Thursday'], '08:00', null, 'martita'],
      [weekdays, '09:00', null, 'titi'],
      [weekdays, '14:00', null, 'titi'],
      [weekdays, '15:00', null, 'martita'],
      [['Monday', 'Wednesday', 'Friday'], '19:00', null, 'martita'],
      [['Monday', 'Tuesday', 'Wednesday', 'Thursday'], '20:00', null, 'titi'],
    ],
  );
  assert.equal(formatScheduleDays(['Monday', 'Wednesday', 'Friday']), 'Lunes, miércoles y viernes');
});

test('WhatsApp contacts use the intended teacher and an encoded, specific activity message', async () => {
  const business = JSON.parse(await readFile(path.join(ROOT, 'data/business.json')));
  const pilates = business.activities.find((activity) => activity.id === 'pilates');
  const schedule = pilates.schedules[0];
  const teacher = business.teachers[schedule.teacherId];
  const url = new URL(buildWhatsAppUrl(teacher, buildScheduleMessage(pilates, schedule, teacher)));
  assert.equal(url.hostname, 'wa.me');
  assert.equal(url.pathname, '/5493777472060');
  assert.match(
    url.searchParams.get('text'),
    /Hola Martita.*Pilates en colchoneta.*martes y jueves.*19:00 a 20:00/,
  );
  assert.equal(
    new URL(buildWhatsAppUrl(business.teachers.titi, 'Hola Titi & horarios?')).pathname,
    '/5493777723911',
  );
  assert.equal(
    new URL(buildWhatsAppUrl(teacher, 'Hola & consulta?')).searchParams.get('text'),
    'Hola & consulta?',
  );
});

test('directions retain the verified business identity instead of resolving a neighboring shop', async () => {
  const business = JSON.parse(await readFile(path.join(ROOT, 'data/business.json')));
  const url = new URL(buildDirectionsUrl(business));
  assert.equal(url.origin + url.pathname, 'https://www.google.com/maps/dir/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(
    url.searchParams.get('destination'),
    'Tu Gimnasio, Santa Lucía, Corrientes, Argentina',
    'El fallback debe nombrar el negocio: las coordenadas pueden resolver un comercio vecino.',
  );
  assert.equal(url.searchParams.get('destination_place_id'), 'ChIJ97NG_pRjTpQRJB6lqKeqmWU');
  assert.notEqual(url.searchParams.get('destination'), '-28.9769495,-59.0984732');
  assert.equal(
    url.searchParams.has('origin'),
    false,
    'No guardar el origen ni la ubicación del propietario.',
  );
});

test('calendar anniversary uses Argentina midnight and elapsed totals handle leap years', () => {
  assert.equal(calculateElapsed('1996-11-04', new Date('2026-11-04T02:59:59Z')).years, 29);
  assert.equal(calculateElapsed('1996-11-04', new Date('2026-11-04T03:00:00Z')).years, 30);
  const start = calculateElapsed('1996-11-04', new Date('1996-11-04T03:01:01Z'));
  assert.equal(start.seconds, 61);
  assert.equal(start.minutes, 1);
  assert.equal(start.days, 0);
  assert.equal(calculateElapsed('1996-11-04', new Date('2026-10-15T03:00:00Z')).days, 10937);
  assert.throws(() => calculateElapsed('1996-02-31'));
});
