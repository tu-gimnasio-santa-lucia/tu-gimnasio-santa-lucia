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
  compactScript,
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

test('public script compaction keeps behaviour and refuses unsafe inputs', async () => {
  const source = await readFile(path.join(ROOT, 'src/site.js'), 'utf8');
  const compact = compactScript(source);
  assert.ok(compact.length < source.length);
  assert.ok(compact.split('\n').length <= source.split('\n').length);
  assert.ok(compact.includes("import { calculateElapsed } from './elapsed-time.js';"));
  assert.equal(
    compactScript('const a = 1;\n  // nota\n  const b = a + 1;\n'),
    'const a = 1;\nconst b = a + 1;\n',
  );
  assert.throws(() => compactScript('const s = `uno\n  dos`;'), /varias líneas/);
  assert.throws(() => compactScript('/* abre\n cierra */'), /varias líneas/);
  assert.throws(() => compactScript('const = ;'));
});

test('escapes HTML data and prevents a JSON-LD closing-tag injection', () => {
  assert.equal(escapeHtml('<img src=x onerror="x">'), '&lt;img src=x onerror=&quot;x&quot;&gt;');
  assert.ok(!serializeJsonLd({ text: '</script><script>alert(1)</script>' }).includes('</script>'));
  assert.throws(() => renderTemplate('{{undefined_key}}', {}), /sin definir/);
});

test('release requires browser and complete performance evidence from the exact build', () => {
  const publicUrl = 'https://tu-gimnasio-santa-lucia.github.io/tu-gimnasio-santa-lucia/';
  const manifest = Buffer.from(JSON.stringify({ publicUrl }));
  const digest = createHash('sha256').update(manifest).digest('hex');
  const engines = ['chromium', 'firefox', 'webkit', 'edge'];
  const viewports = [
    [320, 800],
    [390, 844],
    [768, 1024],
    [844, 390],
    [1280, 800],
    [1920, 1080],
  ];
  const matrix = engines.flatMap((browser) =>
    viewports.map(([width, height]) => ({ browser, width, height })),
  );
  const browser = {
    status: 'passed',
    buildManifestSha256: digest,
    errors: [],
    browsers: matrix.map((row) => ({
      ...row,
      version: 'test',
      status: 'passed',
      accessibilityViolations: 0,
      horizontalOverflow: false,
      consoleErrors: 0,
      remoteRequests: 0,
      captureWarnings: [],
    })),
    introChecks: matrix.map((row) => ({
      ...row,
      status: 'passed',
      durationMs: 1040,
      headerLayoutShift: false,
      interactionBlocking: false,
    })),
    motionChecks: engines.map((browser) => ({
      browser,
      realAnimation: 'passed',
      preferenceChange: 'passed',
      fixedFinalValues: 'passed',
    })),
    fontChecks: engines.map((browser) => ({
      browser,
      status: 'passed',
      localFontLoaded: true,
      printLayout: 'passed',
      widths: [320, 390, 1280],
    })),
    introSafeguards: engines.map((browser) => ({
      browser,
      preferenceChange: 'passed',
      pointerCancellation: 'passed',
      resizeCancellation: 'passed',
      hiddenCancellation: 'passed',
      deepLink: 'passed',
      slowImage: 'passed',
      missingAnimationAPI: 'passed',
    })),
    durabilityChecks: engines.map((browser) => ({
      browser,
      status: 'passed',
      enlargedText: [320, 844, 1024, 1280],
      textSpacing: [320, 768, 1280],
      keyboardAt200Percent: true,
      printAnswers: true,
      forcedColorsStatic: true,
      saveDataStatic: true,
    })),
    notFoundChecks: engines.flatMap((browser) =>
      [320, 1280].map((width) => ({
        browser,
        width,
        status: 'passed',
        httpStatus: 404,
        noJavaScript: true,
      })),
    ),
    qrDestination: publicUrl,
    noJavaScript: 'passed in all four engines',
    clipboardAndFallback: 'passed',
    shareCancellation: 'passed',
  };
  const performance = {
    status: 'passed',
    mode: 'verify',
    buildManifestSha256: digest,
    cases: [
      [390, 844, 1],
      [390, 844, 2],
      [1280, 800, 1],
      [1920, 1080, 2],
    ].map(([width, height, deviceScaleFactor]) => ({
      width,
      height,
      deviceScaleFactor,
      glyphs: true,
      counterAdvanced: true,
      yearsStable: true,
      argentinaAnniversaryRollover: 'passed',
      yearWritesDuringFiveTicks: 0,
      selectorCallsDuringFiveTicks: 0,
      pictures: [
        {
          file: 'identity.webp',
          bytes: 100,
          cssWidth: 300,
          naturalWidth: 480,
          naturalHeight: 480,
        },
        {
          file: 'manifesto.webp',
          bytes: 200,
          cssWidth: 280,
          naturalWidth: 480,
          naturalHeight: 270,
        },
      ],
      imageBytes: 300,
      fontFiles: [{ file: 'anton.woff2', bytes: 100 }],
    })),
    errors: [],
  };
  assert.equal(validateReleaseReports(browser, performance, manifest), digest);
  assert.throws(() =>
    validateReleaseReports(
      { ...browser, buildManifestSha256: 'previous' },
      performance,
      manifest,
    ),
  );
  for (const changed of [
    null,
    { ...performance, mode: 'baseline' },
    { ...performance, cases: [1] },
    { ...performance, status: 'failed' },
    { ...performance, buildManifestSha256: 'previous' },
  ])
    assert.throws(() => validateReleaseReports(browser, changed, manifest));
  for (const mutate of [
    (b) => {
      delete b.browsers;
    },
    (b) => {
      b.errors.push('case failed');
    },
    (b) => {
      b.browsers[0].status = 'failed';
    },
    (b) => {
      b.browsers = b.browsers.filter((row) => row.browser !== 'firefox');
    },
    (b) => {
      b.browsers[0] = structuredClone(b.browsers[1]);
    },
    (b) => {
      b.browsers[0].width = 1;
    },
    (b) => {
      b.browsers[0].width = '320';
    },
    (b) => {
      b.browsers[0].consoleErrors = 1;
    },
    (b) => {
      b.motionChecks[0].preferenceChange = 'failed';
    },
    (b) => {
      b.fontChecks[0].localFontLoaded = false;
    },
    (b) => {
      b.introChecks[0].headerLayoutShift = true;
    },
    (b) => {
      b.introSafeguards[0].slowImage = 'failed';
    },
    (b) => {
      b.durabilityChecks[0].keyboardAt200Percent = false;
    },
    (b) => {
      b.notFoundChecks[0].httpStatus = 200;
    },
    (b) => {
      b.qrDestination = 'https://example.invalid/';
    },
    (b) => {
      delete b.noJavaScript;
    },
    (b) => {
      b.clipboardAndFallback = 'failed';
    },
  ]) {
    const changed = structuredClone(browser);
    mutate(changed);
    assert.throws(() => validateReleaseReports(changed, performance, manifest));
  }
  for (const mutate of [
    (p) => {
      p.cases = [{}, {}, {}, {}];
    },
    (p) => {
      p.cases[0] = structuredClone(p.cases[1]);
    },
    (p) => {
      p.cases[0].counterAdvanced = false;
    },
    (p) => {
      p.cases[0].argentinaAnniversaryRollover = 'failed';
    },
    (p) => {
      p.cases[0].yearWritesDuringFiveTicks = 5;
    },
    (p) => {
      p.cases[0].pictures = [];
    },
    (p) => {
      p.cases[0].imageBytes = Infinity;
    },
    (p) => {
      p.cases[0].pictures[0].bytes += 1;
    },
    (p) => {
      p.cases[0].fontFiles = [];
    },
    (p) => {
      p.cases[0].width = '390';
    },
    (p) => {
      p.cases[0].fontFiles[0].file = 'anton.ttf';
    },
    (p) => {
      p.errors.push('measurement failed');
    },
  ]) {
    const changed = structuredClone(performance);
    mutate(changed);
    assert.throws(() => validateReleaseReports(browser, changed, manifest));
  }
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
    const missing = await request('/tu-gimnasio-santa-lucia/carpeta/inexistente');
    assert.equal(missing.status, 404);
    assert.match(missing.headers['content-type'], /text\/html/);
    assert.match(missing.body.toString(), /Esta página no está disponible/);
    assert.match(missing.body.toString(), /href="\/tu-gimnasio-santa-lucia\/"/);
    const missingHead = await request('/inexistente', 'HEAD');
    assert.equal(missingHead.status, 404);
    assert.equal(missingHead.body.length, 0);
    assert.equal((await request('/tu-gimnasio-santa-lucia/')).status, 200);
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
    (d) => { delete d.activities[1].id; },
    (d) => { d.activities[1].id = null; },
    (d) => { d.activities[1].id = true; },
    (d) => { delete d.activities[1].schedules[0].id; },
    (d) => { d.activities[1].schedules[0].id = null; },
    (d) => { d.activities[1].schedules[0].id = true; },
    (d) => { d.googleRating.value = '4.8'; },
    (d) => { d.googleRating.value = true; },
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
  assert.ok(
    html.includes(
      'Consultado el ' + business.googleRating.verifiedAt.split('-').reverse().join('/'),
    ),
  );
  assert.ok(html.includes('Google Maps puede mostrar esta calle como'));
  assert.ok(!html.includes('La actualización del nombre está en trámite.'));
  // The approved master logo ships with lossless responsive WebP candidates and a declared slot size.
  assert.match(html, /srcset="[^\"]+160w[^\"]+320w[^\"]+480w[^\"]+768w[^\"]+1080w[^\"]+1269w" sizes="[^\"]+"/);
  const assetManifest = JSON.parse(await readFile(path.join(ROOT, 'assets/manifest.json'), 'utf8'));
  assert.equal(
    createHash('sha256').update(await readFile(path.join(one, assetManifest.brand.png))).digest('hex'),
    'cee6fb4fe714e77af3cf31f81c97bc0d2bb4d69a5588c220d90fff3fd61cd319',
    'El logo maestro aprobado se publica sin cambios.',
  );
  // Exactly one inline script, the scripting marker, allowed by its own hash; no inline styles.
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  assert.equal(inline.length, 1);
  assert.ok(html.includes('sha256-' + createHash('sha256').update(inline[0]).digest('base64')));
  assert.doesNotMatch(html, /\sstyle="/);
  assert.doesNotMatch(html, /unsafe-inline|unsafe-eval/);
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
  assert.equal(calculateElapsed('1996-11-04', new Date('2027-05-01T12:00:00Z')).years, 30);
  assert.equal(calculateElapsed('1996-11-04', new Date('2027-11-04T02:59:59Z')).years, 30);
  assert.equal(calculateElapsed('1996-11-04', new Date('2027-11-04T03:00:00Z')).years, 31);
  const start = calculateElapsed('1996-11-04', new Date('1996-11-04T03:01:01Z'));
  assert.equal(start.seconds, 61);
  assert.equal(start.minutes, 1);
  assert.equal(start.days, 0);
  assert.equal(calculateElapsed('1996-11-04', new Date('2026-10-15T03:00:00Z')).days, 10937);
  assert.throws(() => calculateElapsed('1996-02-31'));
});
