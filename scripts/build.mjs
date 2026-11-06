/** Deterministic static-site build. No network, external packages or platform APIs. */
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertPublicSite } from './quality-gates.mjs';
import {
  validateBusinessData,
  buildWhatsAppUrl,
  buildScheduleMessage,
  buildDirectionsUrl,
  formatScheduleDays,
  formatSchedulePeriods,
  formatScheduleTime,
  getGeneralSchedule,
} from './business-data.mjs';
export { validateBusinessData } from './business-data.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
export const serializeJsonLd = (value) =>
  JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

/** Restrict asset paths and types: an accidental file in assets must never be published. */
/** Real photos of the venue (06/11/2026): the façade in «Visitanos» and one per activity. */
export const PHOTO_ROLES = [
  'facadeDay',
  'facadeNight',
  'photoMusculacion',
  'photoSpinning',
  'photoGimnasiaGrupal',
  'photoPilates',
];
const ACTIVITY_PHOTOS = {
  musculacion: 'photoMusculacion',
  spinning: 'photoSpinning',
  'gimnasia-grupal': 'photoGimnasiaGrupal',
  pilates: 'photoPilates',
};

export function validateAssetManifest(assets) {
  const names = new Set(['qr-tu-gimnasio.png']);
  const font = assets.fonts?.display;
  if (
    !font ||
    !/^[a-z][a-z0-9-]*\.ttf$/.test(font.file) ||
    !/^[a-z][a-z0-9-]*\.txt$/.test(font.license) ||
    !/^[a-f0-9]{64}$/.test(font.licenseSha256) ||
    !/^[a-f0-9]{64}$/.test(font.sha256)
  )
    throw new Error('Fuente local o licencia insegura.');
  names.add(font.file);
  names.add(font.license);
  if (font.woff2) {
    if (
      !/^[a-z][a-z0-9-]*\.woff2$/.test(font.woff2.file) ||
      !/^[a-f0-9]{64}$/.test(font.woff2.sha256)
    )
      throw new Error('Fuente WOFF2 insegura.');
    names.add(font.woff2.file);
  }
  if (
    !assets.brand ||
    !/^[a-f0-9]{64}$/.test(assets.brand.sha256) ||
    !/^[a-f0-9]{64}$/.test(assets.brand.webpSha256) ||
    !assets.brand.responsive?.length
  )
    throw new Error('Falta el logo maestro verificado y sus derivados.');
  for (const key of [
    'logo',
    'brand',
    'identity',
    'manifesto',
    'schedule',
    'spinning',
    ...PHOTO_ROLES,
    ...(assets.originalLogo ? ['originalLogo'] : []),
  ]) {
    const image = assets[key];
    // Real venue photos: hashed derivatives with a description of what is visible.
    if (
      PHOTO_ROLES.includes(key) &&
      (!image?.jpeg ||
        !image.webp ||
        !/^[a-f0-9]{64}$/.test(image.sha256 || '') ||
        !/^[a-f0-9]{64}$/.test(image.webpSha256 || '') ||
        typeof image.alt !== 'string' ||
        image.alt.trim().length < 10 ||
        typeof image.caption !== 'string' ||
        !image.caption.trim())
    )
      throw new Error('Foto de la sede incompleta: ' + key);
    if (image?.archived !== undefined && typeof image.archived !== 'boolean')
      throw new Error('Estado de archivo de imagen inválido.');
    if (
      !image ||
      !Number.isInteger(image.width) ||
      image.width < 1 ||
      !Number.isInteger(image.height) ||
      image.height < 1
    )
      throw new Error('Dimensiones de imagen inválidas.');
    if (!image.png && !image.jpeg) throw new Error('Falta imagen de respaldo.');
    for (const name of [image.png, image.jpeg, image.webp].filter(Boolean)) {
      if (!/^[a-z][a-z0-9-]*\.(png|jpg|webp)$/.test(name))
        throw new Error('Ruta de recurso insegura.');
      names.add(name);
    }
    if (image.responsive !== undefined) {
      if (!Array.isArray(image.responsive) || !image.webp || image.archived)
        throw new Error('Variantes de imagen inválidas.');
      let previousWidth = 0;
      for (const variant of image.responsive) {
        if (
          !/^[a-z][a-z0-9-]*\.webp$/.test(variant.file) ||
          names.has(variant.file) ||
          !Number.isInteger(variant.width) ||
          variant.width <= previousWidth ||
          variant.width >= image.width ||
          variant.height !== Math.round((image.height * variant.width) / image.width) ||
          !/^[a-f0-9]{64}$/.test(variant.sha256)
        )
          throw new Error('Variante responsive insegura o incoherente.');
        names.add(variant.file);
        previousWidth = variant.width;
      }
    }
  }
  return names;
}

/**
 * Conservative, dependency-free compaction for the public script: removes indentation and
 * comment-only lines, keeping every statement and line break. Refuses multi-line literals and
 * verifies the result still parses, so it can never silently change behaviour.
 */
export function compactScript(source) {
  const lines = source.split('\n');
  if (lines.some((line) => (line.match(/`/g) || []).length % 2 || /\/\*(?!.*\*\/)/.test(line)))
    throw new Error('El script contiene literales o comentarios de varias líneas; no se compacta.');
  const output = lines
    .map((line) => line.trim())
    .filter((line) => line && !/^\/\/(?![#@])/.test(line) && !/^\/\*.*\*\/$/.test(line))
    .join('\n') + '\n';
  // Syntax check without executing: the module import is the only non-script construct.
  new Function(output.replace(/^import\s[^;]+;$/gm, ''));
  return output;
}

/** Pure template renderer. All regular substitutions are HTML-escaped. */
export function renderTemplate(template, replacements, rawKeys = new Set()) {
  return template.replace(/\{\{([a-z_]+)\}\}/g, (_, key) => {
    if (!(key in replacements)) throw new Error(`Marcador sin definir: ${key}`);
    return rawKeys.has(key) ? replacements[key] : escapeHtml(replacements[key]);
  });
}

export async function buildSite(outputDirectory = path.join(ROOT, 'dist')) {
  const project = JSON.parse(await readFile(path.join(ROOT, 'project.json'), 'utf8'));
  const business = validateBusinessData(
    JSON.parse(await readFile(path.join(ROOT, 'data/business.json'), 'utf8')),
    project,
  );
  const assets = JSON.parse(await readFile(path.join(ROOT, 'assets/manifest.json'), 'utf8'));
  const assetFiles = validateAssetManifest(assets);
  if (
    sha256(await readFile(path.join(ROOT, 'assets', assets.fonts.display.license))) !==
    assets.fonts.display.licenseSha256
  )
    throw new Error('La licencia debe conservar sus bytes originales.');
  if (
    sha256(await readFile(path.join(ROOT, 'assets', assets.fonts.display.file))) !==
    assets.fonts.display.sha256
  )
    throw new Error('La fuente no coincide con su versión verificada.');
  // The approved master logo is published byte-identical; its WebP derivatives are lossless.
  if (sha256(await readFile(path.join(ROOT, 'assets', assets.brand.png))) !== assets.brand.sha256)
    throw new Error('El logo maestro no coincide con la versión aprobada.');
  if (sha256(await readFile(path.join(ROOT, 'assets', assets.brand.webp))) !== assets.brand.webpSha256)
    throw new Error('Recurso derivado alterado: ' + assets.brand.webp);
  for (const role of PHOTO_ROLES) {
    const photo = assets[role];
    if (
      sha256(await readFile(path.join(ROOT, 'assets', photo.jpeg))) !== photo.sha256 ||
      sha256(await readFile(path.join(ROOT, 'assets', photo.webp))) !== photo.webpSha256
    )
      throw new Error('Foto de la sede alterada: ' + role);
  }
  // Every activity shows its space, or none does: the cards stay even.
  const activityIds = business.activities.map((activity) => activity.id);
  if (activityIds.some((id) => !ACTIVITY_PHOTOS[id]) && activityIds.some((id) => ACTIVITY_PHOTOS[id]))
    throw new Error('Cada actividad necesita su foto o ninguna la lleva.');
  const derivatives = [
    assets.fonts.display.woff2,
    ...Object.values(assets).flatMap((image) => image.responsive || []),
  ].filter(Boolean);
  for (const resource of derivatives)
    if (sha256(await readFile(path.join(ROOT, 'assets', resource.file))) !== resource.sha256)
      throw new Error('Recurso derivado alterado: ' + resource.file);
  if (
    (await readdir(path.join(ROOT, 'assets'))).some(
      (name) => name !== 'manifest.json' && !assetFiles.has(name),
    )
  )
    throw new Error('Recurso no declarado en assets; no se publicará.');
  const [template, css, script] = await Promise.all(
    ['src/index.template.html', 'src/styles.css', 'src/site.js'].map((file) =>
      readFile(path.join(ROOT, file), 'utf8'),
    ),
  );
  const timeSource = await readFile(path.join(ROOT, 'src/elapsed-time.js'), 'utf8');
  const timeFile = `elapsed-time.${sha256(timeSource).slice(0, 12)}.js`;
  const browserScript = compactScript(script).replace("'./elapsed-time.js'", `'./${timeFile}'`);
  const styleFile = `styles.${sha256(css).slice(0, 12)}.css`;
  const scriptFile = `site.${sha256(browserScript).slice(0, 12)}.js`;
  const sri = (text) => 'sha384-' + createHash('sha384').update(text).digest('base64');
  const defaultTeacher = business.teachers[business.contacts.defaultTeacherId];
  const whatsappUrl = buildWhatsAppUrl(defaultTeacher, business.contacts.whatsappMessage);
  const directionsUrl = buildDirectionsUrl(business);
  const generalSchedule = getGeneralSchedule(business);
  const mapNotice = business.relocation.maps.streetNameUpdated
    ? ''
    : `Google Maps puede mostrar esta calle como ${business.relocation.maps.displayedStreet}. La dirección es ${business.address.street} y el punto indicado corresponde al gimnasio.`;
  const ratingDisplay = String(business.googleRating.value).replace('.', ',');
  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'ExerciseGym',
    '@id': new URL('#gimnasio', project.publicUrl).href,
    name: business.name,
    foundingDate: business.foundedDate,
    url: project.publicUrl,
    image: new URL(assets.identity.png, project.publicUrl).href,
    description: `${business.name} en ${business.address.locality}. Actividades, horarios y consultas con tu profe.`,
    telephone: '+' + defaultTeacher.phoneInternational,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: business.address.locality,
      addressRegion: business.address.region,
      postalCode: business.address.postalCode,
      addressCountry: business.address.country,
    },
    sameAs: [business.contacts.instagram, business.contacts.maps],
    hasMap: directionsUrl,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: business.relocation.maps.latitude,
      longitude: business.relocation.maps.longitude,
    },
    openingHoursSpecification: generalSchedule.periods.map((period) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: generalSchedule.days,
      opens: period.start,
      closes: period.end,
      validFrom: business.relocation.openingDate,
    })),
  });
  const jsonLdHash = createHash('sha256').update(jsonLd).digest('base64');
  // Marks scripting before first paint so the hero presentation never flashes. Hashed in the CSP.
  const bootScript = "document.documentElement.classList.add('js')";
  const bootHash = createHash('sha256').update(bootScript).digest('base64');
  const csp = `default-src 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; img-src 'self'; style-src 'self'; script-src 'self' 'sha256-${bootHash}' 'sha256-${jsonLdHash}'; font-src 'self'; connect-src 'none'`;
  /** sizes: the CSS-rendered width of each slot, so browsers fetch the smallest sufficient file. */
  function picture(key, className, alt, { eager = false, sizes = '100vw' } = {}) {
    const image = assets[key];
    const srcset = image.responsive?.length
      ? [
          ...image.responsive.map((variant) => `${variant.file} ${variant.width}w`),
          `${image.webp} ${image.width}w`,
        ].join(', ')
      : image.webp;
    const sizesAttribute = image.responsive?.length ? ` sizes="${escapeHtml(sizes)}"` : '';
    return `<picture>${image.webp ? `<source srcset="${escapeHtml(srcset)}"${sizesAttribute} type="image/webp">` : ''}<img class="${escapeHtml(className)}" src="${escapeHtml(image.png || image.jpeg)}" width="${image.width}" height="${image.height}" alt="${escapeHtml(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}></picture>`;
  }
  /** A venue photo with its visible caption; revealed like the closing artwork (data-clip). */
  function photoFigure(role, className, sizes) {
    const photo = assets[role];
    return `<figure class="${className}"><div class="photo-frame" data-clip>${picture(role, 'photo-image', photo.alt, { sizes })}</div><figcaption>${escapeHtml(photo.caption)}</figcaption></figure>`;
  }
  const external = 'target="_blank" rel="noopener noreferrer"';
  const icon = {
    wa: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.3 21.8l4.9-1.3A9.8 9.8 0 1 0 12 2.2Zm0 17.8a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 20Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.9 2c0 1.2.9 2.3 1 2.5.1.2 1.7 2.6 4.2 3.7 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.5Z"/></svg>',
    arrow: '<svg class="i i-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    down: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 4v13m0 0-5.5-5.5M12 17l5.5-5.5M5 20h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pin: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="2.4" fill="currentColor"/></svg>',
    up: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19V6m0 0-5.5 5.5M12 6l5.5 5.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  // Accent tokens: spinning uses a lighter derivative of the approved blue for contrast on navy.
  const accentColors = { yellow: '#ffc31b', blue: '#3d8bf0', red: '#f13c2c', white: '#ffffff' };
  const weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weekStrip = (days) =>
    `<span class="week" aria-hidden="true">${['L', 'M', 'M', 'J', 'V']
      .map((initial, index) => `<i${days.includes(weekdayOrder[index]) ? ' class="on"' : ''}>${initial}</i>`)
      .join('')}</span>`;
  const teacherOrder = ['martita', 'titi'].filter((id) => business.teachers[id]);
  const teacherActivities = (teacherId) =>
    business.activities
      .filter((activity) => activity.schedules.some((schedule) => schedule.teacherId === teacherId))
      .map((activity) => {
        const label = activity.schedules.find((s) => s.teacherId === teacherId && s.label)?.label;
        return activity.name + (label ? ` (${label.toLowerCase()})` : '');
      });
  const activityCards = business.activities
    .map((activity) => {
      const schedules = activity.schedules
        .map((schedule) => {
          const teacher = business.teachers[schedule.teacherId];
          const days = formatScheduleDays(schedule.days);
          const periods = schedule.periods
            .map(({ start, end }) =>
              end === null
                ? `<span class="schedule-period open"><time datetime="${start}">${formatScheduleTime(start)}</time><small>inicio</small></span>`
                : `<span class="schedule-period"><time datetime="${start}">${formatScheduleTime(start)}</time><i aria-hidden="true">–</i><span class="sr-only"> a </span><time datetime="${end}">${formatScheduleTime(end)}</time></span>`,
            )
            .join('<span class="period-separator"> y </span>');
          const contact = buildWhatsAppUrl(teacher, buildScheduleMessage(activity, schedule, teacher));
          return `<li class="activity-session" data-reveal id="horario-${activity.id}-${schedule.id}" data-schedule-id="${schedule.id}" data-teacher-id="${schedule.teacherId}"><div class="session-information">${weekStrip(schedule.days)}<p class="schedule-days">${escapeHtml(days)}</p>${schedule.label ? `<h4>${escapeHtml(schedule.label)}</h4>` : ''}<p class="schedule-times">${periods}</p></div><div class="session-contact"><p>Profe <strong>${escapeHtml(teacher.name)}</strong> <a class="teacher-phone" href="tel:+${teacher.phoneInternational}">${escapeHtml(teacher.phoneDisplay)}</a></p><a class="teacher-contact" href="${escapeHtml(contact)}" ${external} aria-label="Consultar con ${escapeHtml(teacher.name)} por ${escapeHtml(activity.name)}, ${escapeHtml(days.toLowerCase())}, ${escapeHtml(formatSchedulePeriods(schedule.periods))}">${icon.wa}<span>Consultar con ${escapeHtml(teacher.name)}</span></a></div></li>`;
        })
        .join('\n');
      return `<article class="activity-card accent-${activity.accent}" id="actividad-${activity.id}" data-activity-id="${activity.id}" data-act aria-labelledby="titulo-${activity.id}"><header class="activity-card-header" data-reveal><span class="activity-ribbon" aria-hidden="true"></span><h3 id="titulo-${activity.id}">${escapeHtml(activity.name)}</h3><p class="activity-description">${escapeHtml(activity.description)}</p><a class="activity-instagram" href="${escapeHtml(business.contacts.instagram)}" ${external} aria-label="Consultar en Instagram por ${escapeHtml(activity.name)} de Tu Gimnasio"><span>Consultar en Instagram</span>${icon.arrow}</a></header>${photoFigure(ACTIVITY_PHOTOS[activity.id], 'activity-photo', '(max-width: 960px) min(calc(100vw - 2.5rem), 34rem), 23vw')}<ul class="activity-schedules" aria-label="Horarios y profesores de ${escapeHtml(activity.name)}">${schedules}</ul></article>`;
    })
    .join('\n');
  const activityIndex = business.activities
    .map((activity) => `<a href="#actividad-${activity.id}" data-index="actividad-${activity.id}" class="accent-${activity.accent}">${escapeHtml(activity.name)}</a>`)
    .join('');
  const teacherCards = teacherOrder
    .map((id) => {
      const teacher = business.teachers[id];
      return `<article class="teacher-card" data-reveal aria-labelledby="profe-${id}"><h3 id="profe-${id}"><span>Profe</span> ${escapeHtml(teacher.name)}</h3><ul aria-label="Actividades de Profe ${escapeHtml(teacher.name)}">${teacherActivities(id).map((name) => `<li>${escapeHtml(name)}</li>`).join('')}</ul><div class="teacher-actions"><a class="teacher-call" href="tel:+${teacher.phoneInternational}" aria-label="Llamar a Profe ${escapeHtml(teacher.name)}, ${escapeHtml(teacher.phoneDisplay)}">${escapeHtml(teacher.phoneDisplay)}</a><a class="button button-dark" href="${escapeHtml(buildWhatsAppUrl(teacher, business.contacts.whatsappMessage))}" ${external} data-magnetic>${icon.wa}<span>Escribirle a ${escapeHtml(teacher.name)}</span></a></div></article>`;
    })
    .join('');
  const contactOptions = teacherOrder
    .map((id) => {
      const teacher = business.teachers[id];
      return `<a class="contact-option" href="${escapeHtml(buildWhatsAppUrl(teacher, business.contacts.whatsappMessage))}" ${external}><span class="option-name">Profe ${escapeHtml(teacher.name)}</span><span class="option-phone">${escapeHtml(teacher.phoneDisplay)}</span><span class="option-activities">${escapeHtml(teacherActivities(id).join(', '))}</span><span class="option-go" aria-hidden="true">${icon.wa}</span></a>`;
    })
    .join('');
  // Minimal data for the optional «¿Qué hay hoy?» agenda, derived from the same validated source.
  const dayNumbers = (days) => days.map((day) => weekdayOrder.indexOf(day) + 1);
  const generalActivity = business.activities.find((activity) => activity.id === business.hours.generalActivityId);
  const generalTeacher = business.teachers[generalSchedule.teacherId];
  const agendaData = JSON.stringify({
    general: {
      days: dayNumbers(generalSchedule.days),
      periods: generalSchedule.periods,
      teacher: generalTeacher.name,
      href: buildWhatsAppUrl(generalTeacher, buildScheduleMessage(generalActivity, generalSchedule, generalTeacher)),
    },
    weekend: `${business.hours.weekendLabel}: ${business.hours.weekendNotice.charAt(0).toLowerCase()}${business.hours.weekendNotice.slice(1)}`,
    items: business.activities.flatMap((activity) =>
      activity.schedules
        .filter((schedule) => !(activity.id === business.hours.generalActivityId && schedule.id === business.hours.generalScheduleId))
        .flatMap((schedule) =>
          schedule.periods.map((period) => ({
            activity: activity.name + (schedule.label ? `, ${schedule.label.toLowerCase()}` : ''),
            color: activity.accent === 'white' ? '#08084f' : accentColors[activity.accent],
            days: dayNumbers(schedule.days),
            start: period.start,
            end: period.end,
            teacher: business.teachers[schedule.teacherId].name,
            href: buildWhatsAppUrl(business.teachers[schedule.teacherId], buildScheduleMessage(activity, schedule, business.teachers[schedule.teacherId])),
          })),
        ),
    ),
  }).replace(/</g, '\\u003c');
  const starPaths = [0, 1, 2, 3, 4].map((index) => `<path transform="translate(${index * 26} 0)" d="M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/>`).join('');
  // CSP-safe partial fill: an SVG clip with a width attribute, no inline styles.
  const ratingStars = `<svg class="stars" viewBox="0 0 128 24" role="img" aria-label="${escapeHtml(String(business.googleRating.value).replace('.', ','))} de 5 estrellas" focusable="false"><defs><clipPath id="stars-fill"><rect width="${((business.googleRating.value / 5) * 128).toFixed(1)}" height="24"/></clipPath></defs><g class="stars-empty">${starPaths}</g><g class="stars-full" clip-path="url(#stars-fill)">${starPaths}</g></svg>`;
  // Dated fallback totals; the existing browser clock refreshes them without annual publication.
  const anniversaryMetrics = business.anniversary.metrics
    .map((metric) => {
      const formatted = new Intl.NumberFormat('es-AR').format(metric.value);
      return `<div class="time-metric"><dt>${escapeHtml(metric.label)}</dt><dd><span class="metric-number" data-time-unit="${metric.id}" aria-hidden="true">${formatted}</span><span class="sr-only" data-time-accessible="${metric.id}">${formatted}</span></dd></div>`;
    })
    .join('\n');
  const replacements = {
    public_url: project.publicUrl,
    site_title: `${business.name} | Actividades y horarios en ${business.address.locality}`,
    meta_description: `${business.name} en ${business.address.locality}: musculación, spinning, gimnasia grupal y pilates en colchoneta. Horarios, profesores y consultas en ${business.address.street}.`,
    share_description: `${business.name} · Desde ${business.foundedYear} en ${business.address.locality}, ${business.address.region}.`,
    name: business.name,
    founded_year: business.foundedYear,
    founded_date: business.foundedDate,
    logo_file: assets.logo.png || assets.logo.jpeg,
    anniversary_years: business.anniversary.years,
    anniversary_year: business.anniversary.referenceYear,
    anniversary_metrics: anniversaryMetrics,
    anniversary_snapshot_label: business.anniversary.snapshotDate.split('-').reverse().join('/'),
    visit_photos: `<div class="visit-photos">${photoFigure('facadeDay', 'visit-photo', '(max-width: 960px) min(calc(100vw - 2.5rem), 34rem), 36vw')}${photoFigure('facadeNight', 'visit-photo is-night', '(max-width: 960px) min(32vw, 12rem), 12vw')}</div>`,
    maps_notice: mapNotice ? `<p class="maps-notice">${escapeHtml(mapNotice)}</p>` : '',
    maps_faq_title: mapNotice ? '¿Y si Maps muestra San Martín?' : '¿Cómo llego al gimnasio?',
    maps_faq_text:
      mapNotice ||
      `El botón Cómo llegar con Google Maps abre las indicaciones hacia Tu Gimnasio en ${business.address.street}.`,
    directions_url: directionsUrl,
    phone_display: defaultTeacher.phoneDisplay,
    phone_href: 'tel:+' + defaultTeacher.phoneInternational,
    default_teacher_name: defaultTeacher.name,
    whatsapp_url: whatsappUrl,
    instagram_url: business.contacts.instagram,
    maps_url: business.contacts.maps,
    street_address: business.address.street,
    postal_locality: `${business.address.postalCode} ${business.address.locality}`,
    region_country: `${business.address.region}, Argentina`,
    plus_code: business.address.plusCode,
    weekday_hours: formatSchedulePeriods(generalSchedule.periods),
    hours_notice: business.hours.notice,
    weekday_label: formatScheduleDays(generalSchedule.days),
    weekend_label: business.hours.weekendLabel,
    weekend_hours: business.hours.weekendNotice,
    activity_count: business.activities.length,
    motto_main: business.mottos.equality,
    motto_return: business.mottos.returnToBasics,
    motto_place: business.mottos.yourPlace,
    rating_display: ratingDisplay,
    rating_count: business.googleRating.reviewCount,
    rating_verified_label: business.googleRating.verifiedAt.split('-').reverse().join('/'),
    activity_cards: activityCards,
    activity_index: activityIndex,
    teacher_cards: teacherCards,
    contact_options: contactOptions,
    agenda_data: agendaData,
    street_lines: (() => {
      const match = business.address.street.match(/^(.*\S)\s+(\d+[A-Za-z]?)$/);
      const lines = match ? [match[1], match[2]] : [business.address.street];
      return lines.map((line, index) => `<span class="ln${index ? " street-number" : ""}"><span>${escapeHtml(line)}</span></span>`).join(" ");
    })(),
    footer_teachers: teacherOrder.map((id) => `<p>Profe ${escapeHtml(business.teachers[id].name)} <a href="tel:+${business.teachers[id].phoneInternational}">${escapeHtml(business.teachers[id].phoneDisplay)}</a></p>`).join(""),
    rating_stars: ratingStars,
    weekday_hours_short: generalSchedule.periods.map((p) => `${formatScheduleTime(p.start)} a ${formatScheduleTime(p.end)}`).join(' y '),
    general_teacher: generalTeacher.name,
    official_host: project.publicUrl.replace(/^https:\/\//, '').replace(/\/$/, ''),
    boot_script: bootScript,
    icon_wa: icon.wa,
    icon_arrow: icon.arrow,
    icon_down: icon.down,
    icon_pin: icon.pin,
    icon_up: icon.up,
    structured_data: jsonLd,
    csp,
    style_file: styleFile,
    script_file: scriptFile,
    style_integrity: sri(css),
    script_integrity: sri(browserScript),
    identity_image_url: new URL(assets.identity.png, project.publicUrl).href,
    identity_image_width: assets.identity.width,
    identity_image_height: assets.identity.height,
    image_header_logo: picture('brand', 'brand-logo', '', { eager: true, sizes: '44px' }),
    image_menu_logo: picture('brand', 'brand-logo', '', { sizes: '44px' }),
    image_footer_logo: picture('brand', 'brand-logo', '', { sizes: '76px' }),
    image_hero_logo: picture('brand', 'hero-logo', 'Logo de Tu Gimnasio', {
      eager: true,
      sizes: '(max-width: 480px) 54vw, (max-width: 960px) 60vw, (min-width: 1760px) 528px, 30vw',
    }),
    image_manifesto: picture(
      'manifesto',
      'manifesto-image',
      'Volvamos a las bases. Tu Gimnasio, desde 1996. Fuerza, constancia y comunidad.',
      { sizes: '(max-width: 960px) 100vw, (min-width: 1760px) 900px, 56vw' },
    ),
  };
  const rawKeys = new Set([
    'activity_cards',
    'activity_index',
    'teacher_cards',
    'contact_options',
    'agenda_data',
    'street_lines',
    'footer_teachers',
    'rating_stars',
    'anniversary_metrics',
    'maps_notice',
    'visit_photos',
    'structured_data',
    'boot_script',
    ...Object.keys(replacements).filter((key) => key.startsWith('image_') || key.startsWith('icon_')),
  ]);
  let html = renderTemplate(template, replacements, rawKeys);
  // Hash the final script bytes, including whitespace introduced by any HTML formatter.
  const inlineJsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  if (!inlineJsonLd) throw new Error('Falta el bloque de datos estructurados.');
  const finalJsonLdHash = createHash('sha256').update(inlineJsonLd).digest('base64');
  html = html.replace(`sha256-${jsonLdHash}`, `sha256-${finalJsonLdHash}`);
  // The CSP must allow exactly the bootstrap bytes that reached the page, and nothing else inline.
  const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  if (inlineScripts.length !== 1 || inlineScripts[0] !== bootScript)
    throw new Error('El único script en línea permitido es el marcador de JavaScript.');
  if (/\{\{[^}]+\}\}/.test(html)) throw new Error('Quedaron marcadores sin resolver.');
  const errorTemplate = await readFile(path.join(ROOT, 'src/404.template.html'), 'utf8');
  const errorHtml = renderTemplate(errorTemplate, {
    ...replacements,
    home_path: new URL(project.publicUrl).pathname,
    error_logo_path: new URL(replacements.logo_file, project.publicUrl).pathname,
    error_brand_webp: new URL(assets.brand.responsive.find((v) => v.width === 320).file, project.publicUrl).pathname,
    error_brand_png: new URL(assets.brand.png, project.publicUrl).pathname,
    brand_width: assets.brand.width,
    brand_height: assets.brand.height,
    error_style_path: new URL(styleFile, project.publicUrl).pathname,
    logo_width: assets.logo.width,
    logo_height: assets.logo.height,
  });
  const llms = `# ${business.name}\n\n> Gimnasio de ${business.address.locality}, ${business.address.region}, Argentina. Desde ${business.foundedYear}. Actividades, horarios y consultas con cada profe.\n\nLas franjas y los docentes se consultan en la página oficial. En spinning sólo se publica la hora de inicio: no inferir la duración. Las cuotas se consultan con el profe. La información del sitio no es un anuncio de reapertura ni una confirmación de apertura efectiva.\n\n## Información del gimnasio\n\n- [Sitio oficial](${project.publicUrl}): identidad, actividades, horarios y contactos.\n- [Actividades y profes](${new URL('#actividades', project.publicUrl).href}): ${business.activities.map((activity) => activity.name).join(', ')}.\n- [Horarios y ubicación](${new URL('#horarios', project.publicUrl).href}): franjas de atención y acceso a las indicaciones de llegada.\n- [Historia](${new URL('#historia', project.publicUrl).href}): identidad del gimnasio y lemas originales.\n\n## Optional\n\n- [Instagram oficial](${business.contacts.instagram}): novedades del gimnasio.\n`;
  const outputs = new Map([
    ['index.html', Buffer.from(html)],
    ['404.html', Buffer.from(errorHtml)],
    ['llms.txt', Buffer.from(llms)],
    [styleFile, Buffer.from(css)],
    [scriptFile, Buffer.from(browserScript)],
    [timeFile, Buffer.from(timeSource)],
    ['.nojekyll', Buffer.from('')],
    [
      'robots.txt',
      Buffer.from(
        `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', project.publicUrl).href}\n`,
      ),
    ],
    [
      'sitemap.xml',
      Buffer.from(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeHtml(project.publicUrl)}</loc></url></urlset>\n`,
      ),
    ],
    [
      'README.md',
      Buffer.from(
        '# Tu Gimnasio — publicación generada\n\nNo editar esta rama a mano. La fuente, documentación y scripts están en la rama main del mismo repositorio.\n',
      ),
    ],
  ]);
  const archivedFiles = new Set(
    Object.values(assets)
      .filter((image) => image.archived)
      .flatMap((image) => [image.png, image.jpeg, image.webp].filter(Boolean)),
  );
  for (const file of assetFiles)
    if (!archivedFiles.has(file))
      outputs.set(file, await readFile(path.join(ROOT, 'assets', file)));
  assertPublicSite(outputs, project);
  const manifest = {
    formatVersion: 1,
    generator: 'tu-gimnasio-static/2',
    publicUrl: project.publicUrl,
    files: [...outputs]
      .map(([name, bytes]) => ({
        name,
        bytes: bytes.length,
        sha256: sha256(bytes),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'en')),
  };
  outputs.set('build-manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
  await mkdir(outputDirectory, { recursive: true });
  // Only replace artifacts produced by a previous build; never recursively delete a directory.
  const existing = await readdir(outputDirectory);
  if (
    existing.some(
      (name) =>
        !outputs.has(name) &&
        !/^styles\.[a-f0-9]{12}\.css$|^(?:site|elapsed-time)\.[a-f0-9]{12}\.js$/.test(name),
    )
  )
    throw new Error(
      'La carpeta de salida contiene archivos ajenos. Usar una carpeta de salida vacía.',
    );
  const { unlink } = await import('node:fs/promises');
  for (const name of existing)
    if (!outputs.has(name)) await unlink(path.join(outputDirectory, name));
  for (const [name, bytes] of outputs) await writeFile(path.join(outputDirectory, name), bytes);
  return manifest;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const result = await buildSite();
  console.log(`Sitio generado: ${result.files.length + 1} archivos en dist/.`);
}
