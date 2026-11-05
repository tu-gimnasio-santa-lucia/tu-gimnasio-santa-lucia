/** Pure release gates: require complete, consistent evidence for the exact public build. */
import { createHash } from 'node:crypto';

// Coverage is a release contract: changing the suite requires reviewing these expectations too.
const ENGINES = ['chromium', 'firefox', 'webkit', 'edge'];
const VIEWPORTS = [
  [320, 800],
  [390, 844],
  [768, 1024],
  [844, 390],
  [1280, 800],
  [1920, 1080],
];
const PERFORMANCE_SCENARIOS = [
  [390, 844, 1],
  [390, 844, 2],
  [1280, 800, 1],
  [1920, 1080, 2],
];
const noErrors = (value) => Array.isArray(value) && value.length === 0;
const positive = (value) => Number.isFinite(value) && value > 0;
const passed = (row, fields) => fields.every((field) => row[field] === 'passed');
const trueFields = (row, fields) => fields.every((field) => row[field] === true);

function covers(rows, expected, key, valid) {
  if (!Array.isArray(rows) || rows.length !== expected.length) return false;
  const keys = new Set();
  return rows.every((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
    const id = key(row);
    if (!expected.includes(id) || keys.has(id) || !valid(row)) return false;
    keys.add(id);
    return true;
  });
}

const dimensions = (row) => `${row.width}x${row.height}`;
const validViewport = (row) => Number.isSafeInteger(row.width) && Number.isSafeInteger(row.height);
const browserCase = (row) => `${row.browser}:${dimensions(row)}`;
const hasWidths = (widths, expected) =>
  Array.isArray(widths) &&
  widths.length === expected.length &&
  new Set(widths).size === expected.length &&
  expected.every((width) => widths.includes(width));

function browserComplete(browser, publicUrl) {
  const matrix = ENGINES.flatMap((engine) => VIEWPORTS.map(([w, h]) => `${engine}:${w}x${h}`));
  const perEngine = (rows, valid) => covers(rows, ENGINES, (row) => row.browser, valid);
  return (
    noErrors(browser.errors) &&
    covers(
      browser.browsers,
      matrix,
      browserCase,
      (row) =>
        validViewport(row) &&
        row.status === 'passed' &&
        typeof row.version === 'string' &&
        row.version.length > 0 &&
        row.accessibilityViolations === 0 &&
        row.horizontalOverflow === false &&
        row.consoleErrors === 0 &&
        row.remoteRequests === 0 &&
        Array.isArray(row.captureWarnings),
    ) &&
    covers(
      browser.introChecks,
      matrix,
      browserCase,
      (row) =>
        validViewport(row) &&
        row.status === 'passed' &&
        positive(row.durationMs) &&
        row.headerLayoutShift === false &&
        row.interactionBlocking === false,
    ) &&
    perEngine(browser.motionChecks, (row) =>
      passed(row, ['realAnimation', 'preferenceChange', 'fixedFinalValues']),
    ) &&
    perEngine(
      browser.fontChecks,
      (row) =>
        row.status === 'passed' &&
        row.localFontLoaded === true &&
        row.printLayout === 'passed' &&
        hasWidths(row.widths, [320, 390, 1280]),
    ) &&
    perEngine(browser.introSafeguards, (row) =>
      passed(row, [
        'preferenceChange',
        'pointerCancellation',
        'resizeCancellation',
        'hiddenCancellation',
        'deepLink',
        'slowImage',
        'missingAnimationAPI',
      ]),
    ) &&
    perEngine(
      browser.durabilityChecks,
      (row) =>
        row.status === 'passed' &&
        hasWidths(row.enlargedText, [320, 844, 1024, 1280]) &&
        hasWidths(row.textSpacing, [320, 768, 1280]) &&
        trueFields(row, [
          'keyboardAt200Percent',
          'printAnswers',
          'forcedColorsStatic',
          'saveDataStatic',
        ]),
    ) &&
    covers(
      browser.notFoundChecks,
      ENGINES.flatMap((engine) => [320, 1280].map((w) => `${engine}:${w}`)),
      (row) => `${row.browser}:${row.width}`,
      (row) => Number.isSafeInteger(row.width) && row.status === 'passed' &&
        row.httpStatus === 404 && row.noJavaScript === true,
    ) &&
    browser.qrDestination === publicUrl &&
    browser.noJavaScript === 'passed in all four engines' &&
    browser.clipboardAndFallback === 'passed' &&
    browser.shareCancellation === 'passed'
  );
}

function performanceComplete(performance) {
  return covers(
    performance.cases,
    PERFORMANCE_SCENARIOS.map(([w, h, dpr]) => `${w}x${h}@${dpr}`),
    (row) => `${dimensions(row)}@${row.deviceScaleFactor}`,
    (row) => {
      if (
        !validViewport(row) ||
        !Number.isFinite(row.deviceScaleFactor) ||
        !trueFields(row, ['glyphs', 'counterAdvanced', 'yearsStable']) ||
        row.argentinaAnniversaryRollover !== 'passed' ||
        row.yearWritesDuringFiveTicks !== 0 ||
        row.selectorCallsDuringFiveTicks !== 0 ||
        !positive(row.imageBytes) ||
        !Array.isArray(row.pictures) ||
        row.pictures.length !== 2 ||
        new Set(row.pictures.map((picture) => picture?.file)).size !== 2 ||
        !row.pictures.every(
          (picture) =>
            picture &&
            typeof picture.file === 'string' &&
            picture.file.length > 0 &&
            positive(picture.bytes) &&
            positive(picture.cssWidth) &&
            positive(picture.naturalWidth) &&
            positive(picture.naturalHeight),
        ) ||
        row.imageBytes !== row.pictures.reduce((sum, picture) => sum + picture.bytes, 0) ||
        !Array.isArray(row.fontFiles) ||
        !row.fontFiles.length ||
        !row.fontFiles.every(
          (font) => font && typeof font.file === 'string' && positive(font.bytes),
        ) ||
        !row.fontFiles.some((font) => font.file.endsWith('.woff2'))
      )
        return false;
      return (
        row.width !== 390 || row.imageBytes < (row.deviceScaleFactor === 1 ? 350000 : 800000)
      );
    },
  );
}

export function validateReleaseReports(browser, performance, manifestBytes) {
  const digest = createHash('sha256').update(manifestBytes).digest('hex');
  let publicUrl;
  try {
    publicUrl = JSON.parse(manifestBytes).publicUrl;
  } catch {
    /* Reject below. */
  }
  if (
    typeof publicUrl !== 'string' ||
    !publicUrl.startsWith('https://') ||
    browser?.status !== 'passed' ||
    browser.buildManifestSha256 !== digest ||
    !browserComplete(browser, publicUrl)
  )
    throw new Error('Falta una revisión de navegador completa y aprobada del build exacto.');
  if (
    performance?.status !== 'passed' ||
    performance.mode !== 'verify' ||
    performance.buildManifestSha256 !== digest ||
    !noErrors(performance.errors) ||
    !performanceComplete(performance)
  )
    throw new Error(
      'Falta la comprobación de rendimiento completa y aprobada del build exacto.',
    );
  return digest;
}
