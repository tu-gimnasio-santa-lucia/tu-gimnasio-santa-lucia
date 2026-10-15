/** Deterministic static-site build. No network, external packages or platform APIs. */
import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
export const serializeJsonLd = (value) =>
  JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

/** Validate edited business data before it can reach HTML or executable markup. */
export function validateBusinessData(data, project) {
  if (data.name !== 'Tu Gimnasio' || data.foundedYear !== 1996)
    throw new Error('Revisar nombre oficial y año de apertura.');
  const anniversary = data.anniversary;
  if (
    !anniversary ||
    anniversary.commemorative !== true ||
    !Number.isSafeInteger(anniversary.referenceYear) ||
    !Number.isSafeInteger(anniversary.years) ||
    anniversary.years < 1 ||
    anniversary.referenceYear - data.foundedYear !== anniversary.years ||
    !Array.isArray(anniversary.metrics) ||
    anniversary.metrics.length !== 4
  )
    throw new Error(
      'Aniversario conmemorativo inválido. No calcular una fecha de apertura desconocida.',
    );
  const metricIds = ['days', 'hours', 'minutes', 'seconds'];
  anniversary.metrics.forEach((metric, index) => {
    if (
      metric.id !== metricIds[index] ||
      !Number.isSafeInteger(metric.value) ||
      metric.value < 1 ||
      typeof metric.label !== 'string' ||
      !metric.label.trim()
    )
      throw new Error('Cifra de aniversario inválida.');
    if (
      index > 0 &&
      metric.value !== anniversary.metrics[index - 1].value * (index === 1 ? 24 : 60)
    )
      throw new Error('Las equivalencias conmemorativas no coinciden.');
  });
  if (
    data.relocation?.status !== 'announced' ||
    data.relocation.openingDate !== null ||
    data.relocation.mapsUpdated !== false ||
    !data.relocation.futureAddress
  )
    throw new Error('La nueva sede sigue anunciada: no inferir apertura ni Maps actualizado.');
  for (const key of ['street', 'locality', 'region', 'country'])
    if (
      typeof data.relocation.futureAddress[key] !== 'string' ||
      !data.relocation.futureAddress[key].trim()
    )
      throw new Error('Dirección futura incompleta.');
  if (!/^\d{10,15}$/.test(data.phoneInternational))
    throw new Error('Teléfono internacional inválido.');
  if (project.publicUrl !== 'https://tu-gimnasio-santa-lucia.github.io/tu-gimnasio-santa-lucia/')
    throw new Error('La dirección pública principal debe conservarse.');
  for (const key of ['instagram', 'maps']) {
    const url = new URL(data.contacts[key]);
    const allowed =
      key === 'instagram'
        ? ['www.instagram.com', 'instagram.com']
        : ['maps.app.goo.gl', 'www.google.com'];
    if (
      url.protocol !== 'https:' ||
      !allowed.includes(url.hostname) ||
      url.username ||
      url.password
    )
      throw new Error(`Enlace ${key} inválido.`);
  }
  for (const key of ['opens', 'closes'])
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.hours[key])) throw new Error('Horario inválido.');
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  if (
    !Array.isArray(data.hours.weekdays) ||
    !data.hours.weekdays.length ||
    data.hours.weekdays.some((day) => !validDays.includes(day)) ||
    typeof data.hours.weekendClosed !== 'boolean'
  )
    throw new Error('Días de atención inválidos.');
  if (!Array.isArray(data.activities) || !data.activities.length)
    throw new Error('Faltan las actividades.');
  const ids = new Set();
  for (const activity of data.activities) {
    if (!/^[a-z][a-z0-9-]*$/.test(activity.id) || ids.has(activity.id))
      throw new Error('Identificador de actividad inválido o duplicado.');
    ids.add(activity.id);
    if (!['yellow', 'blue', 'red', 'white'].includes(activity.accent))
      throw new Error('Acento visual desconocido.');
  }
  if (/\bFuncional\b/i.test(JSON.stringify(data)))
    throw new Error('Los datos incluyen una actividad retirada.');
  if (!(
    data.googleRating.value > 0 &&
    data.googleRating.value <= 5 &&
    Number.isInteger(data.googleRating.reviewCount) &&
    data.googleRating.reviewCount > 0
  ))
    throw new Error('Valoración de Google inválida.');
  for (const value of [
    data.phoneDisplay,
    data.hours.weekdayLabel,
    data.hours.weekendLabel,
    data.hours.notice,
    data.contacts.whatsappMessage,
    ...Object.values(data.address),
    ...Object.values(data.relocation.futureAddress),
    ...Object.values(data.mottos),
    ...data.activities.flatMap((a) => [a.name, a.description]),
  ]) {
    if (typeof value !== 'string' || !value.trim() || value.length > 1000)
      throw new Error('Dato obligatorio vacío o demasiado largo.');
  }
  return data;
}

/** Restrict asset paths and types: an accidental file in assets must never be published. */
export function validateAssetManifest(assets) {
  const names = new Set(['qr-tu-gimnasio.png']);
  const font = assets.fonts?.display;
  if (
    !font ||
    !/^[a-z][a-z0-9-]*\.ttf$/.test(font.file) ||
    !/^[a-z][a-z0-9-]*\.txt$/.test(font.license) ||
    !/^[a-f0-9]{64}$/.test(font.sha256)
  )
    throw new Error('Fuente local o licencia insegura.');
  names.add(font.file);
  names.add(font.license);
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
    sha256(await readFile(path.join(ROOT, 'assets', assets.fonts.display.file))) !==
    assets.fonts.display.sha256
  )
    throw new Error('La fuente no coincide con su versión verificada.');
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
  const styleFile = `styles.${sha256(css).slice(0, 12)}.css`;
  const scriptFile = `site.${sha256(script).slice(0, 12)}.js`;
  const sri = (text) => 'sha384-' + createHash('sha384').update(text).digest('base64');
  const whatsappUrl = `https://wa.me/${business.phoneInternational}?text=${encodeURIComponent(business.contacts.whatsappMessage)}`;
  const ratingDisplay = String(business.googleRating.value).replace('.', ',');
  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'ExerciseGym',
    name: business.name,
    foundingDate: String(business.foundedYear),
    url: project.publicUrl,
    image: new URL(assets.identity.png, project.publicUrl).href,
    telephone: '+' + business.phoneInternational,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: business.address.locality,
      addressRegion: business.address.region,
      postalCode: business.address.postalCode,
      addressCountry: business.address.country,
    },
    sameAs: [business.contacts.instagram, business.contacts.maps],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: String(business.googleRating.value),
      reviewCount: String(business.googleRating.reviewCount),
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: business.hours.weekdays,
        opens: business.hours.opens,
        closes: business.hours.closes,
      },
    ],
  });
  const jsonLdHash = createHash('sha256').update(jsonLd).digest('base64');
  const csp = `default-src 'none'; base-uri 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; img-src 'self'; style-src 'self'; script-src 'self' 'sha256-${jsonLdHash}'; font-src 'self'; connect-src 'none'`;
  function picture(key, className, alt, eager = false) {
    const image = assets[key];
    return `<picture>${image.webp ? `<source srcset="${escapeHtml(image.webp)}" type="image/webp">` : ''}<img class="${escapeHtml(className)}" src="${escapeHtml(image.png || image.jpeg)}" width="${image.width}" height="${image.height}" alt="${escapeHtml(alt)}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"${eager ? ' fetchpriority="high"' : ''}></picture>`;
  }
  const activityCards = business.activities
    .map(
      (a) =>
        `<article class="activity-card ${a.accent}" id="actividad-${a.id}"><h3>${escapeHtml(a.name)}</h3><p>${escapeHtml(a.description)}</p><a href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Consultar por ${escapeHtml(a.name)}">Consultar <span aria-hidden="true">↗</span></a></article>`,
    )
    .join('\n');
  // Fixed owner-supplied anniversary figures; never a live clock or a guessed founding date.
  const anniversaryMetrics = business.anniversary.metrics
    .map((metric) => {
      const formatted = new Intl.NumberFormat('es-AR').format(metric.value);
      return `<div class="time-metric"><dt>${escapeHtml(metric.label)}</dt><dd><span class="metric-number" data-count="${metric.value}" aria-hidden="true">${formatted}</span><span class="sr-only">${formatted}</span></dd></div>`;
    })
    .join('\n');
  const futureAddress = business.relocation.futureAddress;
  const futureWhatsappUrl = `https://wa.me/${business.phoneInternational}?text=${encodeURIComponent(`Hola Tu Gimnasio, quisiera consultar por la apertura de la nueva sede en ${futureAddress.street}.`)}`;
  const replacements = {
    public_url: project.publicUrl,
    site_title: `${business.name} | ${business.anniversary.years} años y una nueva sede en camino`,
    meta_description: `${business.name}: ${business.anniversary.years} años desde ${business.foundedYear} en ${business.address.locality}. Próxima sede en ${futureAddress.street}, en construcción. Consultá actividades y novedades.`,
    share_description: `${business.name} · Desde ${business.foundedYear} en ${business.address.locality}, ${business.address.region}.`,
    name: business.name,
    founded_year: business.foundedYear,
    logo_file: assets.logo.png || assets.logo.jpeg,
    anniversary_years: business.anniversary.years,
    anniversary_year: business.anniversary.referenceYear,
    anniversary_metrics: anniversaryMetrics,
    future_street: futureAddress.street,
    future_locality: `${futureAddress.locality}, ${futureAddress.region}, ${futureAddress.country}`,
    future_whatsapp_url: futureWhatsappUrl,
    phone_display: business.phoneDisplay,
    phone_href: 'tel:+' + business.phoneInternational,
    whatsapp_url: whatsappUrl,
    instagram_url: business.contacts.instagram,
    maps_url: business.contacts.maps,
    street_address: business.address.street,
    postal_locality: `${business.address.postalCode} ${business.address.locality}`,
    region_country: `${business.address.region}, Argentina`,
    plus_code: business.address.plusCode,
    weekday_hours: `${business.hours.opens} — ${business.hours.closes}`,
    hours_notice: business.hours.notice,
    weekday_label: business.hours.weekdayLabel,
    weekend_label: business.hours.weekendLabel,
    short_hours: `${business.hours.opens.endsWith(':00') ? business.hours.opens.slice(0, 2) : business.hours.opens}–${business.hours.closes.endsWith(':00') ? business.hours.closes.slice(0, 2) : business.hours.closes} h`,
    weekend_hours: business.hours.weekendClosed ? 'Cerrado' : 'Consultar por WhatsApp',
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
    script_integrity: sri(script),
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
    [scriptFile, Buffer.from(script)],
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
        !outputs.has(name) && !/^styles\.[a-f0-9]{12}\.css$|^site\.[a-f0-9]{12}\.js$/.test(name),
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
