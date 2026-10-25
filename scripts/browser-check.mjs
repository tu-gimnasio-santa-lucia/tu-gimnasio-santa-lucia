/** Optional development QA. Install pinned dev dependencies; never ships to GitHub Pages. */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { ROOT, sha256 } from './build.mjs';
import { buildDirectionsUrl, formatScheduleDays } from './business-data.mjs';
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
  introChecks: [],
  introSafeguards: [],
};
const definitions = [
  { name: 'chromium', type: chromium },
  { name: 'firefox', type: firefox },
  { name: 'webkit', type: webkit },
  { name: 'edge', type: chromium, channel: 'msedge' },
];

/** Exercise the real flight, then cancellation and progressive fallbacks in each engine. */
async function checkBrandIntro(browser, definition) {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(
        () => document.documentElement.dataset.brandIntro === 'running',
        null,
        {
          timeout: 2500,
        },
      );
      const first = await page.evaluate(() => {
        const intro = document.querySelector('.brand-intro');
        const flying = intro.querySelector('.brand-intro-logo');
        const logo = document.querySelector('#header-brand .brand-logo');
        const box = logo.getBoundingClientRect();
        const keyframes = flying.getAnimations()[0].effect.getKeyframes();
        const timing = flying.getAnimations()[0].effect.getTiming();
        return {
          accessible: intro.getAttribute('aria-hidden'),
          pointerEvents: getComputedStyle(intro).pointerEvents,
          header: { x: box.x, y: box.y, width: box.width, height: box.height },
          years: document.querySelector('#header-brand .brand-years').textContent,
          keyframes,
          duration: timing.duration,
          iterations: timing.iterations,
          overflow: getComputedStyle(document.body).overflow,
          scrollWidth: document.documentElement.scrollWidth,
        };
      });
      assert.equal(first.accessible, 'true');
      assert.equal(first.pointerEvents, 'none');
      assert.notEqual(first.overflow, 'hidden');
      assert.ok(first.scrollWidth <= viewport.width + 1);
      assert.match(first.years, /\d+\s*años/);
      assert.ok(first.duration > 0 && first.duration <= 1200);
      assert.equal(first.iterations, 1);
      assert.notEqual(first.keyframes[0].transform, 'none');
      for (const frame of first.keyframes)
        for (const forbidden of ['left', 'top', 'width', 'height', 'margin'])
          assert.equal(Object.hasOwn(frame, forbidden), false, forbidden);
      if (definition.name === 'chromium' && [390, 1280].includes(viewport.width))
        await page.screenshot({
          path: path.join(artifacts, 'intro-inicio-' + viewport.width + '.png'),
          caret: 'initial',
        });
      await page.waitForFunction(
        () => document.documentElement.dataset.brandIntro === 'complete',
        null,
        {
          timeout: 2200,
        },
      );
      assert.equal(await page.locator('.brand-intro').count(), 0);
      const final = await page.locator('#header-brand .brand-logo').evaluate((logo) => {
        const box = logo.getBoundingClientRect();
        return {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          opacity: getComputedStyle(logo).opacity,
        };
      });
      for (const dimension of ['x', 'y', 'width', 'height'])
        assert.ok(Math.abs(first.header[dimension] - final[dimension]) < 1);
      assert.equal(final.opacity, '1');
      assert.equal(await page.locator('#header-brand .brand-years').textContent(), first.years);
      if (definition.name === 'chromium' && [390, 1280].includes(viewport.width))
        await page.screenshot({
          path: path.join(artifacts, 'intro-final-' + viewport.width + '.png'),
          caret: 'initial',
        });
      assert.deepEqual(errors, []);
      report.introChecks.push({
        browser: definition.name,
        width: viewport.width,
        height: viewport.height,
        durationMs: first.duration,
        headerLayoutShift: false,
        interactionBlocking: false,
        status: 'passed',
      });
    } finally {
      await context.close();
    }
  }

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const running = async () => {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () => document.documentElement.dataset.brandIntro === 'running',
      null,
      {
        timeout: 2500,
      },
    );
  };
  const completed = async () => {
    await page.waitForFunction(
      () => document.documentElement.dataset.brandIntro === 'complete',
      null,
      {
        timeout: 1500,
      },
    );
    assert.equal(await page.locator('.brand-intro').count(), 0);
    assert.equal(
      await page
        .locator('#header-brand .brand-logo')
        .evaluate((logo) => getComputedStyle(logo).opacity),
      '1',
    );
  };
  try {
    await running();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await completed();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await running();
    await page.locator('a[href="#actividades"]').first().click();
    await completed();
    assert.equal(new URL(page.url()).hash, '#actividades');
    await running();
    await page.setViewportSize({ width: 320, height: 800 });
    await completed();
    await running();
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await completed();
    // A direct-link visit needs a fresh document, not a same-document hash navigation.
    const deepPage = await context.newPage();
    await deepPage.goto(url + '#actividades', { waitUntil: 'networkidle' });
    assert.equal(await deepPage.locator('.brand-intro').count(), 0);
    assert.equal(
      await deepPage.evaluate(() => document.documentElement.dataset.brandIntro),
      'skipped',
    );
  } finally {
    await context.close();
  }

  const slow = await browser.newContext({ reducedMotion: 'no-preference' });
  try {
    // Delay image decoding in the page: also works with the pinned Firefox build whose
    // network-interception protocol predates the current Playwright route API.
    await slow.addInitScript(() => {
      const complete = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'complete');
      const decode = HTMLImageElement.prototype.decode;
      Object.defineProperty(HTMLImageElement.prototype, 'complete', {
        configurable: true,
        get() {
          return this.getAttribute('src') === 'tu-gimnasio-logo.jpg'
            ? false
            : complete.get.call(this);
        },
      });
      HTMLImageElement.prototype.decode = async function () {
        if (this.getAttribute('src') === 'tu-gimnasio-logo.jpg')
          await new Promise((resolve) => setTimeout(resolve, 700));
        return decode.call(this);
      };
    });
    const slowPage = await slow.newPage();
    await slowPage.goto(url, { waitUntil: 'domcontentloaded' });
    await slowPage.waitForFunction(
      () => ['skipped', 'complete'].includes(document.documentElement.dataset.brandIntro),
      null,
      { timeout: 1500 },
    );
    assert.equal(await slowPage.locator('.brand-intro').count(), 0);
    assert.ok(await slowPage.locator('.hero-actions a').first().isVisible());
  } finally {
    await slow.close();
  }
  const unsupported = await browser.newContext({ reducedMotion: 'no-preference' });
  try {
    await unsupported.addInitScript(() => {
      Element.prototype.animate = undefined;
    });
    const plain = await unsupported.newPage();
    await plain.goto(url);
    assert.equal(await plain.locator('.brand-intro').count(), 0);
    assert.ok(await plain.locator('#header-brand .brand-years').isVisible());
    assert.ok(await plain.locator('#toggle-clock').isVisible());
  } finally {
    await unsupported.close();
  }
  report.introSafeguards.push({
    browser: definition.name,
    preferenceChange: 'passed',
    pointerCancellation: 'passed',
    resizeCancellation: 'passed',
    hiddenCancellation: 'passed',
    deepLink: 'passed',
    slowImage: 'passed',
    missingAnimationAPI: 'passed',
  });
}
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
          assert.equal(await page.locator('.brand-intro').count(), 0);
          assert.ok(await page.locator('#header-brand .brand-years').isVisible());
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
            await page.locator('.location-panel a[href*="maps/dir/"]').getAttribute('href'),
            buildDirectionsUrl(business),
            'La llegada debe conservar el identificador y el pin del gimnasio comprobado.',
          );
          assert.ok(
            (await page.locator('.location-panel h2').textContent()).includes(
              business.address.street,
            ),
          );
          assert.equal(await page.locator('.activity-session').count(), 10);
          assert.deepEqual(
            await page
              .locator('main > section')
              .evaluateAll((sections) => sections.slice(-2).map((section) => section.id)),
            ['aniversario', 'bases'],
            'El contador es penúltimo y Volvamos a las bases cierra el contenido.',
          );
          assert.equal(await page.locator('#bases .manifesto-art').count(), 1);
          assert.equal(await page.locator('.future, #nueva-sede').count(), 0);
          assert.ok(!/reapertura|apertura|3 de noviembre/i.test(metrics.text));
          const consultationButtons = await page
            .locator('.teacher-contact, .activity-instagram')
            .evaluateAll((buttons) =>
              buttons.map((button) => {
                const { width, height } = button.getBoundingClientRect();
                return { width, height };
              }),
            );
          assert.equal(consultationButtons.length, 14);
          for (const dimension of ['width', 'height']) {
            const sizes = consultationButtons.map((button) => button[dimension]);
            assert.ok(
              Math.max(...sizes) - Math.min(...sizes) < 1,
              `Las consultas deben tener ${dimension} uniforme: ${sizes.join(', ')}`,
            );
          }
          assert.ok(consultationButtons.every((button) => button.height >= 44));
          const actionHeights = await page
            .locator('main .button')
            .evaluateAll((buttons) =>
              buttons.map((button) => button.getBoundingClientRect().height),
            );
          assert.ok(
            Math.max(...actionHeights) - Math.min(...actionHeights) < 1,
            `Las acciones principales deben mantener la altura estándar: ${actionHeights.join(', ')}`,
          );
          for (const activity of business.activities) {
            const card = page.locator(`#actividad-${activity.id}`);
            assert.equal(
              await card.locator('.activity-instagram').getAttribute('href'),
              business.contacts.instagram,
            );
            for (const schedule of activity.schedules) {
              const row = card.locator(`[data-schedule-id="${schedule.id}"]`);
              const teacher = business.teachers[schedule.teacherId];
              assert.equal(await row.getAttribute('data-teacher-id'), schedule.teacherId);
              assert.equal(
                (await row.locator('.schedule-days').textContent()).trim(),
                formatScheduleDays(schedule.days),
              );
              const contact = row.locator('.teacher-contact');
              assert.ok(await contact.isVisible());
              const target = new URL(await contact.getAttribute('href'));
              assert.equal(target.origin, 'https://wa.me');
              assert.equal(target.pathname, '/' + teacher.phoneInternational);
              const message = target.searchParams.get('text');
              assert.ok(message.includes(teacher.name) && message.includes(activity.name));
              assert.ok(message.includes(formatScheduleDays(schedule.days).toLowerCase()));
              for (const period of schedule.periods) {
                assert.ok(message.includes(period.start.replace(/^0/, '')));
                if (period.end) assert.ok(message.includes(period.end.replace(/^0/, '')));
              }
            }
          }
          assert.ok(!/Av\. Italia|En construcción|\$\s*\d/i.test(metrics.text));
          const mapsText = await page.locator('.location-panel').textContent();
          assert.equal(
            mapsText.includes('San Martin'),
            !business.relocation.maps.streetNameUpdated,
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
          if (definition.name === 'chromium' && [390, 1280].includes(width)) {
            await page.locator('#actividad-musculacion').screenshot({
              path: path.join(artifacts, `musculacion-${width}.png`),
              caret: 'initial',
            });
            await page.locator('#actividad-spinning').screenshot({
              path: path.join(artifacts, `spinning-${width}.png`),
              caret: 'initial',
            });
            for (const id of ['inicio', 'aniversario', 'bases'])
              await page.locator(`#${id}`).screenshot({
                path: path.join(artifacts, `${id}-${width}.png`),
                caret: 'initial',
              });
          }
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
      await checkBrandIntro(browser, definition);
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
          business.address.street,
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
          .locator('.location-panel .button')
          .evaluate((element) => getComputedStyle(element).color),
        'rgb(0, 0, 0)',
      );
      assert.ok(await fontPage.locator('.location-panel').isVisible());
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
    report.fontChecks.length === definitions.length &&
    report.introChecks.length === definitions.length * viewports.length &&
    report.introSafeguards.length === definitions.length
  )
    report.status = 'passed';
} catch (error) {
  report.errors.push({ message: error.stack || String(error) });
} finally {
  await new Promise((resolve) => server.close(resolve));
  await writeFile(path.join(artifacts, 'qa-report.json'), JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      {
        status: report.status,
        cases: report.browsers.length,
        introCases: report.introChecks.length,
        errors: report.errors,
      },
      null,
      2,
    ),
  );
  if (report.status !== 'passed') process.exitCode = 1;
}
