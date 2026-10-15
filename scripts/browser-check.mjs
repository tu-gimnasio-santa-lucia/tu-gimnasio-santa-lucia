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
const business = JSON.parse(await readFile(path.join(ROOT, 'data/business.json')));
const viewports = [
  { width: 320, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 844, height: 390 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
];
const report = {
  status: 'failed',
  createdAt: new Date().toISOString(),
  buildManifestSha256: sha256(await readFile(path.join(ROOT, 'dist/build-manifest.json'))),
  browsers: [],
  errors: [],
  motionChecks: [],
  fontChecks: [],
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
      for (const viewport of viewports) {
        const { width, height } = viewport;
        const context = await browser.newContext({
          viewport,
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
            if (
              takingScreenshot &&
              definition.name === 'webkit' &&
              text ===
                "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy."
            )
              captureWarnings.push(text);
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
            await image.evaluate(async (element) => {
              if (element.decode) await element.decode();
            });
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
          assert.equal(
            await page.locator('.future-address h3').textContent(),
            business.relocation.futureAddress.street,
          );
          assert.equal(
            await page.locator('.future a[href*="maps"]').count(),
            0,
            'La dirección futura no debe enlazar al mapa de la sede actual.',
          );
          assert.ok(
            (await page.locator('.location-panel h2').textContent()).includes(
              business.address.street,
            ),
          );
          const logoFits = await page.locator('.hero-logo').evaluate((image) => {
            const box = image.getBoundingClientRect();
            const frame = image.closest('.hero-logo-wrap').getBoundingClientRect();
            const centerX = frame.x + frame.width / 2;
            const centerY = frame.y + frame.height / 2;
            return (
              getComputedStyle(image).borderRadius === '0px' &&
              [
                [box.left, box.top],
                [box.right, box.top],
                [box.left, box.bottom],
                [box.right, box.bottom],
              ].every(([x, y]) => Math.hypot(x - centerX, y - centerY) < frame.width / 2 - 1)
            );
          });
          assert.ok(
            logoFits,
            'El archivo completo del logo debe quedar dentro del círculo, sin cortar el nombre.',
          );
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
            height,
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
      await plain.locator('.questions summary').first().click();
      assert.equal(await plain.locator('.questions details').first().getAttribute('open'), '');
      assert.ok(
        (await plain.locator('.questions details').first().textContent()).includes(
          business.relocation.futureAddress.street,
        ),
      );
      await noScript.close();

      // Exercise real motion, not just the reduced-motion screenshots used above.
      const motionContext = await browser.newContext({
        viewport: { width: 390, height: 844 },
        reducedMotion: 'no-preference',
      });
      const motionPage = await motionContext.newPage();
      const motionErrors = [];
      motionPage.on('pageerror', (error) => motionErrors.push(error.message));
      await motionPage.goto(url, { waitUntil: 'networkidle' });
      await motionPage.locator('.anniversary-time').scrollIntoViewIfNeeded();
      await motionPage.waitForFunction(() =>
        document.getAnimations().some((animation) => animation.playState === 'running'),
      );
      await motionPage.emulateMedia({ reducedMotion: 'reduce' });
      await motionPage.waitForFunction(
        () =>
          [...document.querySelectorAll('[data-time-unit]')].every((element) =>
            /[0-9]/.test(element.textContent),
          ) && !document.getAnimations().some((animation) => animation.playState === 'running'),
      );
      assert.deepEqual(motionErrors, []);
      report.motionChecks.push({
        browser: definition.name,
        realAnimation: 'passed',
        preferenceChange: 'passed',
        fixedFinalValues: 'passed',
      });
      await motionContext.close();
      const clockContext = await browser.newContext({ reducedMotion: 'reduce' });
      const clockPage = await clockContext.newPage();
      await clockPage.clock.install({ time: new Date('2026-11-04T02:59:59Z') });
      await clockPage.goto(url);
      assert.equal(await clockPage.locator('[data-elapsed-years]').first().textContent(), '29');
      const readSeconds = async () =>
        Number(
          (await clockPage.locator('[data-time-unit="seconds"]').textContent()).replaceAll('.', ''),
        );
      const beforeTick = await readSeconds();
      await clockPage.clock.fastForward(2100);
      assert.equal(await clockPage.locator('[data-elapsed-years]').first().textContent(), '30');
      assert.ok((await readSeconds()) > beforeTick);
      await clockPage.locator('#toggle-clock').click();
      const pausedValue = await readSeconds();
      await clockPage.clock.fastForward(5000);
      assert.equal(await readSeconds(), pausedValue);
      await clockPage.locator('#toggle-clock').click();
      assert.ok((await readSeconds()) >= pausedValue + 5);
      await clockPage.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      const hiddenValue = await readSeconds();
      await clockPage.clock.fastForward(5000);
      assert.equal(await readSeconds(), hiddenValue);
      await clockPage.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, value: false });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      assert.ok((await readSeconds()) >= hiddenValue + 5);
      await clockContext.close();

      // Simulate phones without Impact: load the local font and render the real page with it.
      const fontContext = await browser.newContext({ reducedMotion: 'reduce' });
      const fontPage = await fontContext.newPage();
      await fontPage.goto(url);
      const loadedFonts = await fontPage.evaluate(async () => {
        const fonts = await document.fonts.load('400 40px "Tu Gimnasio Display"');
        document.documentElement.style.setProperty(
          '--display-font',
          '"Tu Gimnasio Display", sans-serif',
        );
        await document.fonts.ready;
        return fonts.length;
      });
      assert.equal(loadedFonts, 1, 'La tipografía local debe poder descargarse bajo la CSP real.');
      for (const width of [320, 390, 1280]) {
        await fontPage.setViewportSize({ width, height: 844 });
        assert.ok(
          await fontPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
          'Desborde con tipografía deportiva de respaldo.',
        );
      }
      await fontPage.emulateMedia({ media: 'print' });
      assert.equal(
        await fontPage
          .locator('.future .button')
          .evaluate((element) => getComputedStyle(element).color),
        'rgb(0, 0, 0)',
      );
      assert.ok(await fontPage.locator('.future-address').isVisible());
      if (definition.name === 'chromium') {
        await fontPage.setViewportSize({ width: 390, height: 844 });
        await fontPage.emulateMedia({ media: 'screen', forcedColors: 'active' });
        assert.equal(
          await fontPage
            .locator('.hero-logo')
            .evaluate((element) => getComputedStyle(element).mixBlendMode),
          'normal',
          'El logo debe conservar sus colores y visibilidad en alto contraste.',
        );
        assert.ok(
          await fontPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
        );
        await fontPage.screenshot({
          path: path.join(artifacts, 'high-contrast-390.png'),
          caret: 'initial',
        });
      }
      report.fontChecks.push({
        browser: definition.name,
        localFontLoaded: true,
        widths: [320, 390, 1280],
        status: 'passed',
        printLayout: 'passed',
      });
      await fontContext.close();
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
        const fallbackContext = await browser.newContext();
        await fallbackContext.addInitScript(() => {
          delete window.IntersectionObserver;
        });
        const fallbackPage = await fallbackContext.newPage();
        await fallbackPage.goto(url);
        assert.equal(await fallbackPage.evaluate(() => 'IntersectionObserver' in window), false);
        for (const metric of business.anniversary.metrics)
          assert.equal(
            Number(
              (
                await fallbackPage.locator(`[data-time-unit="${metric.id}"]`).textContent()
              ).replaceAll('.', ''),
            ) >= metric.value,
            true,
          );
        assert.ok(await fallbackPage.locator('#aniversario').isVisible());
        await fallbackContext.close();
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
  if (
    !report.errors.length &&
    report.browsers.length === definitions.length * viewports.length &&
    report.motionChecks.length === definitions.length &&
    report.fontChecks.length === definitions.length
  )
    report.status = 'passed';
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
