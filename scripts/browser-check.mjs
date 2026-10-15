/** Optional development QA. Install pinned dev dependencies; never ships to GitHub Pages. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { ROOT, sha256 } from './build.mjs';
import { startPreview } from './preview.mjs';

const artifacts = path.join(ROOT, 'artifacts');
await mkdir(artifacts, { recursive: true });
const { server, url } = await startPreview(0);
const project = JSON.parse(await readFile(path.join(ROOT, 'project.json')));
const report = {
  status: 'failed',
  createdAt: new Date().toISOString(),
  buildManifestSha256: sha256(await readFile(path.join(ROOT, 'dist/build-manifest.json'))),
  browsers: [],
  errors: [],
};
const definitions = [
  { name: 'chromium', type: chromium },
  { name: 'firefox', type: firefox },
  { name: 'webkit', type: webkit },
  { name: 'edge', type: chromium, channel: 'msedge' },
];
try {
  for (const definition of definitions) {
    const browser = await definition.type.launch({
      headless: true,
      ...(definition.name === 'firefox' && process.env.TU_GIMNASIO_FIREFOX_PATH
        ? { executablePath: process.env.TU_GIMNASIO_FIREFOX_PATH }
        : {}),
      ...(definition.channel ? { channel: definition.channel } : {}),
    });
    try {
      for (const width of [320, 390, 768, 1280]) {
        const context = await browser.newContext({
          viewport: { width, height: width < 768 ? 844 : 800 },
          reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        const errors = [];
        const remoteRequests = [];
        const captureWarnings = [];
        let takingScreenshot = false;
        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') {
            const text = message.text();
            if (takingScreenshot && definition.name === 'webkit' && text === "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.") captureWarnings.push(text);
            else errors.push(text);
          }
        });
        page.on('request', (request) => {
          if (!request.url().startsWith(url)) remoteRequests.push(request.url());
        });
        try {
          await page.goto(url, { waitUntil: 'networkidle' });
          await page.locator('img').evaluateAll((images) =>
            images.forEach((image) => {
              image.loading = 'eager';
            }),
          );
          await page.waitForFunction(() =>
            [...document.images].every((image) => image.complete && image.naturalWidth > 0),
          );
          // Decode and visit each original image before full-page capture; fetching alone does not
          // guarantee that below-fold lazy images have been painted by every browser engine.
          for (const image of await page.locator('img').all()) {
            await image.scrollIntoViewIfNeeded();
            await image.evaluate(async element => { if (element.decode) await element.decode(); });
          }
          await page.evaluate(() => window.scrollTo(0, 0));
          assert.ok(await page.locator('#share-controls').isVisible());
          assert.equal(await page.locator('h1').count(), 1);
          // WebKit's platform setting may tab only between controls. Test the link's keyboard action
          // explicitly there; on the other engines, also verify its position in the native Tab order.
          if (definition.name === 'webkit') await page.locator('.skip-link').focus();
          else await page.keyboard.press('Tab');
          assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
          await page.keyboard.press('Enter');
          assert.equal(await page.evaluate(() => document.activeElement.id), 'contenido');
          const metrics = await page.evaluate(() => ({
            width: innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            text: document.body.innerText.toLowerCase(),
            images: [...document.images].length,
            linksSafe: [...document.querySelectorAll('a[target="_blank"]')].every(
              (a) => a.rel.includes('noopener') && a.rel.includes('noreferrer'),
            ),
          }));
          assert.ok(metrics.scrollWidth <= width + 1, `Desborde ${metrics.scrollWidth}/${width}`);
          assert.ok(metrics.linksSafe);
          for (const text of [
            'desde 1996',
            'musculación',
            'spinning',
            'gimnasia grupal',
            'pilates',
            '03777 72-3911',
          ])
            assert.ok(metrics.text.includes(text), text);
          assert.deepEqual(
            remoteRequests,
            [],
            'The page must not call third-party services while loading.',
          );
          const axe = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
          const violations = axe.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            targets: v.nodes.map((n) => n.target),
          }));
          assert.deepEqual(violations, [], JSON.stringify(violations));
          await page.evaluate(() => document.activeElement?.blur());
          assert.deepEqual(errors, []);
          takingScreenshot = true;
          await page.screenshot({
            path: path.join(artifacts, `${definition.name}-${width}.png`),
            fullPage: true,
            caret: 'initial',
          });
          takingScreenshot = false;
          if (width === 320) {
            await page.evaluate(() => {
              document.documentElement.style.fontSize = '200%';
            });
            assert.ok(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
              'Desborde con texto al 200%',
            );
          }
          assert.deepEqual(errors, []);
          report.browsers.push({
            browser: definition.name,
            version: browser.version(),
            width,
            accessibilityViolations: 0,
            horizontalOverflow: false,
            consoleErrors: 0,
            captureWarnings,
            remoteRequests: 0,
            status: 'passed',
          });
        } catch (error) {
          report.errors.push({
            browser: definition.name,
            width,
            message: error.stack || String(error),
          });
        } finally {
          await context.close();
        }
      }
      const noScript = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width: 390, height: 844 },
      });
      const plain = await noScript.newPage();
      await plain.goto(url);
      assert.ok(await plain.locator('.hero-actions a').first().isVisible());
      assert.ok(await plain.locator('.qr-card a').isVisible());
      assert.ok(await plain.locator('#share-controls').isHidden());
      await noScript.close();
      if (definition.name === 'chromium') {
        const context = await browser.newContext({
          permissions: ['clipboard-read', 'clipboard-write'],
        });
        const page = await context.newPage();
        await page.goto(url);
        await page.locator('#copy-link').click();
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), project.publicUrl);
        await page.evaluate(() => {
          Object.defineProperty(navigator, 'clipboard', {
            configurable: true,
            value: {
              writeText: async () => {
                throw new Error('denied');
              },
            },
          });
        });
        await page.locator('#copy-link').click();
        assert.ok(await page.locator('#manual-copy').isVisible());
        assert.equal(await page.locator('#official-url').inputValue(), project.publicUrl);
        await page.reload();
        await page.evaluate(() => {
          Object.defineProperty(navigator, 'share', {
            configurable: true,
            value: async () => {
              throw new DOMException('cancelled', 'AbortError');
            },
          });
        });
        await page.locator('#share-site').click();
        assert.ok(await page.locator('#manual-copy').isHidden());
        await context.close();
      }
    } finally {
      await browser.close();
    }
  }
  const png = PNG.sync.read(await readFile(path.join(ROOT, 'dist/qr-tu-gimnasio.png')));
  assert.equal(
    jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
    project.publicUrl,
  );
  report.qrDestination = project.publicUrl;
  report.noJavaScript = 'passed in all four engines';
  report.clipboardAndFallback = 'passed';
  report.shareCancellation = 'passed';
  if (!report.errors.length && report.browsers.length === 16) report.status = 'passed';
} catch (error) {
  report.errors.push({ message: error.stack || String(error) });
} finally {
  await new Promise((resolve) => server.close(resolve));
  await writeFile(path.join(artifacts, 'qa-report.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      { status: report.status, cases: report.browsers.length, errors: report.errors },
      null,
      2,
    ),
  );
  if (report.status !== 'passed') process.exitCode = 1;
}
