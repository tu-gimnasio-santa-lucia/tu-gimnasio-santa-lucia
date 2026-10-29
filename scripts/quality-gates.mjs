/** Offline contracts for this static site; not a ranking score or a general HTML/robots parser. */
export const JAVASCRIPT_BUDGET_BYTES = 32 * 1024;

function attributes(source) {
  const result = {};
  for (const match of source.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))
    result[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  return result;
}
function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}(?=[\\s/>])([^>]*)>`, 'gi'))].map((match) =>
    attributes(match[1]),
  );
}
const text = (value) => value.replace(/\s+/g, ' ').trim();

export function inspectPublicSite(outputs, project) {
  const errors = [];
  const expect = (ok, file, message) => {
    if (!ok) errors.push({ file, message });
  };
  const source = (name) => outputs.get(name)?.toString('utf8') ?? '';
  const base = new URL(project.publicUrl);
  expect(
    base.protocol === 'https:' && !base.search && !base.hash,
    'project.json',
    'URL pública HTTPS sin parámetros ni fragmento.',
  );
  function publishedAsset(reference) {
    if (!reference) return false;
    try {
      const url = new URL(reference, base);
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return false;
      const name = decodeURIComponent(url.pathname.slice(base.pathname.length));
      return outputs.has(name) && outputs.get(name).length > 0;
    } catch {
      return false;
    }
  }
  const pages = [];
  const titles = new Set();
  const indexableUrls = [];
  for (const [name, bytes] of outputs) {
    if (!name.endsWith('.html')) continue;
    const html = bytes.toString('utf8').replace(/<!--[\s\S]*?-->/g, '');
    const markup = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
    const title = text(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
    const meta = tags(html, 'meta');
    const links = tags(html, 'link');
    const metadata = (key) => meta.filter((item) => item.name === key || item.property === key);
    const robots = metadata('robots')
      .map((item) => item.content || '')
      .join(',');
    const noindex = /\bnoindex\b/i.test(robots);
    const headingCount = [...markup.matchAll(/<h1(?=[\s>])/gi)].length;
    const headingText = text(
      (markup.match(/<h1(?=[\s>])[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '').replace(/<[^>]*>/g, ' '),
    );
    const visibleBody = text(
      (markup.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '').replace(/<[^>]*>/g, ' '),
    );
    expect(
      title.length > 0 && !titles.has(title.toLowerCase()),
      name,
      'Título vacío o repetido entre páginas.',
    );
    titles.add(title.toLowerCase());
    expect(
      tags(html, 'html')[0]?.lang === project.language,
      name,
      'Declarar el idioma del proyecto en html[lang].',
    );
    expect(
      headingCount === 1 && headingText.length > 0,
      name,
      'Conservar exactamente un H1 con texto por página.',
    );
    expect(
      visibleBody.length >= 120 && /<main\b/i.test(markup),
      name,
      'El HTML debe contener información legible sin JavaScript.',
    );
    expect(
      tags(markup, 'img').every((image) => Object.hasOwn(image, 'alt')),
      name,
      'Falta alt; usar texto útil o alt vacío sólo si es decorativo.',
    );
    const icon = links.find((link) => (link.rel || '').split(/\s+/).includes('icon'));
    expect(
      /\.(?:png|jpe?g|webp|svg|ico)(?:[?#]|$)/i.test(icon?.href || '') &&
        publishedAsset(icon?.href),
      name,
      'El favicon debe apuntar a una imagen pública existente.',
    );
    for (const script of tags(html, 'script').filter((item) => item.src))
      expect(
        publishedAsset(script.src),
        name,
        'No incluir scripts remotos, privados o rutas de desarrollo.',
      );
    if (name === '404.html') {
      expect(noindex, name, 'La página de error debe declarar noindex.');
      expect(
        tags(html, 'script').length === 0,
        name,
        'La recuperación 404 debe funcionar sin scripts.',
      );
      const recovery = tags(markup, 'a').some((link) => link.href === base.pathname);
      expect(
        recovery,
        name,
        'La página 404 debe ofrecer un regreso a la portada incluso desde una ruta anidada.',
      );
    } else {
      expect(!noindex, name, 'No bloquear por accidente la indexación de una página pública.');
      const canonical = links.filter((link) => link.rel === 'canonical');
      const expectedUrl = name === 'index.html' ? base.href : new URL(name, base).href;
      expect(
        canonical.length === 1 && canonical[0].href === expectedUrl,
        name,
        'Canonical único y coherente con la URL oficial.',
      );
      indexableUrls.push(expectedUrl);
      const description = metadata('description');
      expect(
        description.length === 1 && text(description[0].content || '').length >= 40,
        name,
        'Falta una descripción útil y única en el documento.',
      );
      const image = metadata('og:image');
      expect(
        image.length === 1 &&
          /^https:\/\//.test(image[0].content || '') &&
          /\.(?:png|jpe?g|webp)(?:[?#]|$)/i.test(image[0].content || '') &&
          publishedAsset(image[0].content),
        name,
        'OG image debe usar una URL HTTPS absoluta de una imagen publicada.',
      );
      expect(
        metadata('og:url')[0]?.content === expectedUrl,
        name,
        'OG url debe coincidir con canonical.',
      );
      const blocks = [
        ...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
      ];
      let structured;
      try {
        structured = blocks.length === 1 ? JSON.parse(blocks[0][1]) : null;
      } catch {
        structured = null;
      }
      expect(
        structured?.['@context'] === 'https://schema.org' &&
          structured?.['@type'] === 'ExerciseGym' &&
          structured?.url === expectedUrl &&
          Boolean(structured?.name),
        name,
        'Datos estructurados de gimnasio ausentes, inválidos o incoherentes.',
      );
      expect(
        links.some((link) => link.rel === 'describedby' && link.href === 'llms.txt'),
        name,
        'Enlazar el índice público llms.txt.',
      );
    }
    pages.push({ file: name, title, headingCount, noindex });
  }
  expect(outputs.has('index.html'), 'index.html', 'Falta la portada estática.');
  expect(outputs.has('404.html'), '404.html', 'Falta la página de recuperación de GitHub Pages.');
  const robots = source('robots.txt');
  expect(
    /^User-agent:\s*\*\s*$/im.test(robots) && /^Allow:\s*\/\s*$/im.test(robots),
    'robots.txt',
    'Conservar la política pública de rastreo del proyecto.',
  );
  for (const match of robots.matchAll(/^Disallow:[ \t]*(\S[^\r\n]*)$/gim)) {
    const value = match[1].split('#')[0].trim();
    expect(
      value !== '/' && value !== '/*' && !base.pathname.startsWith(value),
      'robots.txt',
      'Una regla Disallow bloquearía el sitio público; revisar antes de cambiar la política.',
    );
  }
  expect(
    robots.includes(`Sitemap: ${new URL('sitemap.xml', base).href}`),
    'robots.txt',
    'Declarar el sitemap oficial.',
  );
  const sitemap = source('sitemap.xml');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  expect(
    locations.length === indexableUrls.length &&
      new Set(locations).size === locations.length &&
      indexableUrls.every((url) => locations.includes(url)),
    'sitemap.xml',
    'El sitemap debe enumerar las páginas indexables, sin 404 ni URLs ajenas.',
  );
  const llms = source('llms.txt');
  expect(
    /^#\s+\S/m.test(llms) && llms.includes(base.href) && llms.includes('## '),
    'llms.txt',
    'Falta un índice breve, con título y enlaces al sitio oficial.',
  );
  let javascriptBytes = 0;
  for (const [name, bytes] of outputs) {
    expect(!/\.map$/i.test(name), name, 'No publicar source maps en este paquete.');
    if (/\.(?:js|css)$/.test(name)) {
      const code = bytes.toString('utf8');
      expect(
        !/sourceMappingURL\s*=/.test(code),
        name,
        'No publicar referencias a mapas de fuentes.',
      );
      expect(
        !/@vite\/client|react-refresh|node_modules\//.test(code),
        name,
        'Se filtró una ruta o runtime de desarrollo.',
      );
    }
    if (name.endsWith('.js')) javascriptBytes += bytes.length;
  }
  expect(
    javascriptBytes <= JAVASCRIPT_BUDGET_BYTES,
    'JavaScript público',
    `Presupuesto superado: ${javascriptBytes} de ${JAVASCRIPT_BUDGET_BYTES} bytes sin comprimir.`,
  );
  return {
    status: errors.length ? 'failed' : 'passed',
    pages,
    javascriptBytes,
    javascriptBudgetBytes: JAVASCRIPT_BUDGET_BYTES,
    robotsEffectiveUrl: new URL('/robots.txt', base).href,
    robotsProjectPathIsEffective: base.pathname === '/',
    limits: [
      'La consola y los recursos se comprueban por separado en navegador.',
      'Cumplir estos contratos no garantiza indexación, ranking ni inclusión en respuestas de IA.',
    ],
    errors,
  };
}

export function assertPublicSite(outputs, project) {
  const report = inspectPublicSite(outputs, project);
  if (report.errors.length)
    throw new Error(
      'Control de calidad web:\n' +
        report.errors.map(({ file, message }) => `${file}: ${message}`).join('\n'),
    );
  return report;
}
