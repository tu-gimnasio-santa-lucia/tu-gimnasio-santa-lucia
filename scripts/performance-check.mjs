/** Reproducible local payload/DOM measurements; not field Core Web Vitals. */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { ROOT, sha256 } from './build.mjs';
import { startPreview } from './preview.mjs';

const baseline = process.argv.includes('--baseline');
const { server, url } = await startPreview(0);
const browser = await chromium.launch({ headless: true });
const report = { mode: baseline ? 'baseline' : 'verify', cases: [], errors: [] };
try {
  report.buildManifestSha256 = sha256(await readFile(path.join(ROOT, 'dist/build-manifest.json')));
  for (const [width, height, deviceScaleFactor] of [
    [390, 844, 1],
    [390, 844, 2],
    [1280, 800, 1],
    [1920, 1080, 2],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor,
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const fontRequests = new Set();
    page.on('response', (response) => {
      if (/\.(ttf|woff2)$/.test(response.url()) && response.status() === 200)
        fontRequests.add(new URL(response.url()).pathname.slice(1));
    });
    await page.clock.install({ time: new Date('2026-10-27T12:00:00-03:00') });
    await page.goto(url);
    const glyphs = await page.evaluate(async () => {
      await document.fonts.load('400 40px "Tu Gimnasio Display"');
      return document.fonts.check('400 40px "Tu Gimnasio Display"', 'ÁÉÍÓÚÑáéíóúñ 0123456789');
    });
    const pictures = [];
    for (const selector of ['.identity-image', '.manifesto-image']) {
      const image = page.locator(selector);
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((img) => img.decode());
      const info = await image.evaluate((img) => ({
        file: new URL(img.currentSrc).pathname.slice(1),
        cssWidth: img.getBoundingClientRect().width,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
      }));
      info.bytes = (await readFile(path.join(ROOT, 'dist', info.file))).length;
      pictures.push(info);
    }
    const measurements = await page.evaluate(() => {
      window.yearWrites = 0;
      window.clockQueries = 0;
      const observer = new MutationObserver((records) => {
        window.yearWrites += records.length;
      });
      document
        .querySelectorAll('[data-elapsed-years]')
        .forEach((el) =>
          observer.observe(el, { childList: true, characterData: true, subtree: true }),
        );
      for (const type of [Document, Element]) {
        const query = type.prototype.querySelectorAll;
        type.prototype.querySelectorAll = function (...args) {
          window.clockQueries++;
          return query.apply(this, args);
        };
      }
      return {
        seconds: document.querySelector('[data-time-unit="seconds"]').textContent,
        year: document.querySelector('[data-elapsed-years]').textContent,
      };
    });
    for (let tick = 0; tick < 5; tick++) await page.clock.fastForward(1000);
    const ticks = await page.evaluate(() => ({
      yearWrites: window.yearWrites,
      clockQueries: window.clockQueries,
      seconds: document.querySelector('[data-time-unit="seconds"]').textContent,
      year: document.querySelector('[data-elapsed-years]').textContent,
    }));
    const fontFiles = [...fontRequests];
    const fontBytes = await Promise.all(
      fontFiles.map(async (file) => ({
        file,
        bytes: (await readFile(path.join(ROOT, 'dist', file))).length,
      })),
    );
    const result = {
      width,
      height,
      deviceScaleFactor,
      glyphs,
      pictures,
      imageBytes: pictures.reduce((sum, image) => sum + image.bytes, 0),
      fontFiles: fontBytes,
      yearWritesDuringFiveTicks: ticks.yearWrites,
      selectorCallsDuringFiveTicks: ticks.clockQueries,
      counterAdvanced: ticks.seconds !== measurements.seconds,
      yearsStable: ticks.year === measurements.year,
    };
    await page.clock.setSystemTime(new Date('2026-11-04T02:59:59Z'));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    assert.deepEqual(await page.locator('[data-elapsed-years]').allTextContents(), [
      '29',
      '29',
      '29',
    ]);
    await page.clock.fastForward(2000);
    assert.deepEqual(await page.locator('[data-elapsed-years]').allTextContents(), [
      '30',
      '30',
      '30',
    ]);
    result.argentinaAnniversaryRollover = 'passed';
    assert.ok(result.glyphs && result.counterAdvanced && result.yearsStable);
    if (!baseline) {
      assert.equal(
        result.yearWritesDuringFiveTicks,
        0,
        'Stable years must not be rewritten each second.',
      );
      assert.equal(result.selectorCallsDuringFiveTicks, 0, 'Clock nodes must be cached.');
      assert.ok(
        result.fontFiles.some((font) => font.file.endsWith('.woff2')),
        'Modern browsers must select WOFF2.',
      );
      if (width === 390)
        assert.ok(
          result.imageBytes < (deviceScaleFactor === 1 ? 350000 : 800000),
          'Responsive image payload exceeded its mobile budget.',
        );
    }
    report.cases.push(result);
    await context.close();
  }
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.errors.push(error.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await mkdir(path.join(ROOT, 'artifacts'), { recursive: true });
  await writeFile(
    path.join(ROOT, 'artifacts', baseline ? 'performance-before.json' : 'performance-after.json'),
    JSON.stringify(report, null, 2) + '\n',
  );
}
console.log(JSON.stringify(report));
