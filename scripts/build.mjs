/** Deterministic static-site build. No network, external packages or platform APIs. */
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  for (const key of [
    'logo',
    'identity',
    'manifesto',
    'schedule',
    'spinning',
    ...(assets.originalLogo ? ['originalLogo'] : []),
  ]) {
    const image = assets[key];
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
  const browserScript = script.replace("'./elapsed-time.js'", `'./${timeFile}'`);
  const styleFile = `styles.${sha256(css).slice(0, 12)}.css`;
  const scriptFile = `site.${sha256(browserScript).slice(0, 12)}.js`;
  const sri = (text) => 'sha384-' + createHash('sha384').update(text).digest('base64');
  const defaultTeacher = business.teachers[business.contacts.defaultTeacherId];
  const whatsappUrl = buildWhatsAppUrl(defaultTeacher, business.contacts.whatsappMessage);
  const directionsUrl = buildDirectionsUrl(business);
  const generalSchedule = getGeneralSchedule(business);
  const mapNotice = business.relocation.maps.streetNameUpdated
    ? ''
    : `En Google Maps, esta calle todavía aparece como ${business.relocation.maps.displayedStreet}. La dirección es ${business.address.street} y el punto indicado corresponde al gimnasio. La actualización del nombre está en trámite.`;
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
  const csp = `default-src 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; img-src 'self'; style-src 'self'; script-src 'self' 'sha256-${jsonLdHash}'; font-src 'self'; connect-src 'none'`;
  function picture(key, className, alt, eager = false) {
    const image = assets[key];
    const srcset = image.responsive?.length
      ? [
          ...image.responsive.map((variant) => `${variant.file} ${variant.width}w`),
          `${image.webp} ${image.width}w`,
        ].join(', ')
      : image.webp;
    // Conservative width estimate for these two lazy artwork slots; CSS remains the layout authority.
    const sizes = image.responsive?.length
      ? ' sizes="(max-width: 620px) calc(100vw - 2.2rem), 560px"'
      : '';
    return `<picture>${image.webp ? `<source srcset="${escapeHtml(srcset)}"${sizes} type="image/webp">` : ''}<img class="${escapeHtml(className)}" src="${escapeHtml(image.png || image.jpeg)}" width="${image.width}" height="${image.height}" alt="${escapeHtml(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}></picture>`;
  }
  const activityCards = business.activities
    .map((activity) => {
      const schedules = activity.schedules
        .map((schedule) => {
          const teacher = business.teachers[schedule.teacherId];
          const days = formatScheduleDays(schedule.days);
          const periods = schedule.periods
            .map(
              ({ start, end }) =>
                `<span class="schedule-period">${end === null ? '<span class="time-label">Inicio </span>' : ''}<time datetime="${start}">${formatScheduleTime(start)}</time>${end === null ? '' : ` a <time datetime="${end}">${formatScheduleTime(end)}</time>`}</span>`,
            )
            .join('<span class="period-separator"> y </span>');
          const contact = buildWhatsAppUrl(
            teacher,
            buildScheduleMessage(activity, schedule, teacher),
          );
          return `<li class="activity-session" data-reveal="schedule" id="horario-${activity.id}-${schedule.id}" data-schedule-id="${schedule.id}" data-teacher-id="${schedule.teacherId}"><div class="session-information">${schedule.label ? `<h4>${escapeHtml(schedule.label)}</h4>` : ''}<p class="schedule-days">${escapeHtml(days)}</p><p class="schedule-times">${periods}</p></div><div class="session-contact"><p>Profe <strong>${escapeHtml(teacher.name)}</strong><span class="teacher-phone">${escapeHtml(teacher.phoneDisplay)}</span></p><a class="button button-yellow teacher-contact" href="${escapeHtml(contact)}" target="_blank" rel="noopener noreferrer" aria-label="Consultar con ${escapeHtml(teacher.name)} por ${escapeHtml(activity.name)}, ${escapeHtml(days.toLowerCase())}, ${escapeHtml(formatSchedulePeriods(schedule.periods))}">Consultar con ${escapeHtml(teacher.name)} <span aria-hidden="true">↗</span></a></div></li>`;
        })
        .join('\n');
      return `<article class="activity-card ${activity.accent}" id="actividad-${activity.id}" data-activity-id="${activity.id}" aria-labelledby="titulo-${activity.id}"><header class="activity-card-header" data-reveal="group"><div><h3 id="titulo-${activity.id}">${escapeHtml(activity.name)}</h3><p class="activity-description">${escapeHtml(activity.description)}</p></div><a class="activity-instagram" href="${escapeHtml(business.contacts.instagram)}" target="_blank" rel="noopener noreferrer" aria-label="Consultar en Instagram por ${escapeHtml(activity.name)} de Tu Gimnasio">Consultar en Instagram <span aria-hidden="true">↗</span></a></header><ul class="activity-schedules" aria-label="Horarios y profesores de ${escapeHtml(activity.name)}">${schedules}</ul></article>`;
    })
    .join('\n');
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
    maps_notice: mapNotice ? `<p class="maps-notice">${escapeHtml(mapNotice)}</p>` : '',
    maps_faq_title: mapNotice ? '¿Por qué Maps muestra San Martín?' : '¿Cómo llego al gimnasio?',
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
    activity_cards: activityCards,
    structured_data: jsonLd,
    csp,
    style_file: styleFile,
    script_file: scriptFile,
    style_integrity: sri(css),
    script_integrity: sri(browserScript),
    identity_image_url: new URL(assets.identity.png, project.publicUrl).href,
    image_header_logo: picture('logo', 'brand-logo', '', true),
    image_footer_logo: picture('logo', 'brand-logo', '', false),
    image_hero_logo: picture('logo', 'hero-logo', 'Logo de Tu Gimnasio', true),
    image_final_logo: picture('logo', 'final-logo', '', false),
    image_identity: picture(
      'identity',
      'identity-image',
      'Identidad de Tu Gimnasio: todos somos iguales, la diferencia está en los detalles.',
    ),
    image_manifesto: picture(
      'manifesto',
      'manifesto-image',
      business.mottos.returnToBasics + ' Tu Gimnasio.',
    ),
  };
  const rawKeys = new Set([
    'activity_cards',
    'anniversary_metrics',
    'maps_notice',
    'structured_data',
    ...Object.keys(replacements).filter((key) => key.startsWith('image_')),
  ]);
  let html = renderTemplate(template, replacements, rawKeys);
  // Hash the final script bytes, including whitespace introduced by any HTML formatter.
  const inlineJsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  if (!inlineJsonLd) throw new Error('Falta el bloque de datos estructurados.');
  const finalJsonLdHash = createHash('sha256').update(inlineJsonLd).digest('base64');
  html = html.replace(`sha256-${jsonLdHash}`, `sha256-${finalJsonLdHash}`);
  if (/\{\{[^}]+\}\}/.test(html)) throw new Error('Quedaron marcadores sin resolver.');
  const outputs = new Map([
    ['index.html', Buffer.from(html)],
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
  const manifest = {
    formatVersion: 1,
    generator: 'tu-gimnasio-static/2',
    publicUrl: project.publicUrl,
    files: [...outputs]
      .map(([name, bytes]) => ({ name, bytes: bytes.length, sha256: sha256(bytes) }))
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
