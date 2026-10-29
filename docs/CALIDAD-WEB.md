# Calidad web: los 20 puntos revisados

Revisión del 29/10/2026. Aplicar a la fuente actual de Tu Gimnasio; una captura de recomendaciones no reemplaza el análisis del sitio. Estos cambios se integran en la entrega final cuya publicación autorizó el propietario el 29/10, después de su verificación local.

## Prevención que se ejecuta

`node scripts/check.mjs` ejecuta pruebas y el informe SEO; `node scripts/build.mjs` también rechaza un paquete que incumpla los contratos de `scripts/quality-gates.mjs`. Por lo tanto, la publicación habitual hereda ese control. `node scripts/seo-check.mjs` guarda `artifacts/seo-report.json` con la huella del build. No deshabilitar verificaciones para forzar una entrega.

Los contratos comprueban metadatos, contenido estático, H1, idioma, alt, favicon e imagen social existentes, datos JSON-LD, recuperación 404, llms.txt, sitemap, política de rastreo, ausencia de mapas de fuentes/runtime de desarrollo y presupuesto de JavaScript. El parser está acotado al HTML controlado de este generador; no pretende ser un validador universal de HTML ni de robots.txt.

Los errores de consola, navegación, imágenes, teclado, accesibilidad y ausencia de JavaScript se verifican en `scripts/browser-check.mjs`. La 404 añade ocho casos: cuatro motores, 320 y 1280 px, estado HTTP real, recursos, regreso desde una ruta anidada y funcionamiento sin JavaScript. Los informes de navegador y rendimiento deben seguir correspondiendo al build exacto antes de una publicación.

## Resultado punto por punto

| N.º | Punto de la captura | Decisión y control del proyecto |
| --- | --- | --- |
| 1 | URL de vercel.app | No aplica: la URL oficial es GitHub Pages y se conserva. Un dominio propio es una elección, no una reparación automática. No comprar dominios ni cambiar URLs/QR sin un pedido específico. |
| 2 | View source vacío | Ya había contenido completo en HTML. El build exige información legible dentro de main y un H1 con texto; la batería verifica funcionamiento sin JavaScript. |
| 3 | Sin página 404 | Se agregó `src/404.template.html`, generada como `404.html`, con identidad original, título propio, noindex y regreso a portada/actividades. La vista local devuelve HTTP 404, también desde rutas anidadas; no redirige todo a una portada con estado 200. |
| 4 | Todo en Vite y React | La fuente vigente es HTML/CSS/JS estándar, sin dependencias de producción. Conservar esa arquitectura. React/Vite no son fallos por sí mismos: evaluar HTML entregado, recursos y necesidades; no imponer otro framework por una lista. El paquete rechaza rutas/runtime de desarrollo. |
| 5 | Mismo título en todo | La portada conserva su título descriptivo. La 404 usa «Página no encontrada | Tu Gimnasio». Los títulos vacíos o repetidos hacen fallar el build. |
| 6 | Sin meta description | Ya existía; se exige una descripción útil en cada página indexable. La 404 también tiene una descripción propia. No duplicar etiquetas en un documento. |
| 7 | Sin OG image | Ya existía una imagen de identidad con URL absoluta y alt. Se agregaron sus dimensiones reales. Se comprueba que el destino sea una imagen incluida en el paquete. |
| 8 | Datos sin estructura | Ya existía JSON-LD ExerciseGym, derivado de business.json. El control exige JSON válido, tipo, identidad y URL coherentes; las pruebas existentes contrastan dirección, contactos y horarios. No inventar reseñas, apertura efectiva ni datos por completar. |
| 9 | Varios H1 por página | El build exige uno solo con texto por documento. Encabezados inferiores conservan la jerarquía existente. |
| 10 | Ningún H1 | También se rechazan cero H1, encabezados vacíos o etiquetas que sólo imiten su nombre. |
| 11 | Sin canonical | La portada ya lo tenía. Las páginas indexables deben tener uno, absoluto y coherente con su URL. La 404 se excluye de indexación; no se le impone un canonical engañoso hacia el inicio. |
| 12 | Sin llms.txt | Se agregó un índice breve generado desde datos reales, enlazado con rel=describedby. Orienta a la página oficial y a sus secciones. Es una ayuda opcional, no un requisito de Google ni garantía de aparecer en IA. |
| 13 | Robots bloqueando IA | La política del paquete permite rastreo. **En este hosting, el robots efectivo está en la raíz del dominio**, no en la subcarpeta del gimnasio. La raíz devolvió 404 el 29/10; Google lo interpreta sin restricciones. No se configura otro repositorio, cuenta o dominio como parte de esta revisión. Ver el alcance abajo. |
| 14 | Sin favicon | Ya estaba enlazado al logo original publicado. Se conserva y se comprueba que el destino sea una imagen existente. No es obligatorio crear un .ico si el icono utilizado funciona. |
| 15 | Sin sitemap | Ya existía y enumera la portada canónica. Se comprueba que no falten páginas indexables ni se incluyan errores, duplicados o URLs ajenas. |
| 16 | Sin atributo idioma | Ya existía lang=es-AR. Se exige también en la nueva 404. |
| 17 | Sin texto alt | Las imágenes existentes tienen el atributo. Se exige su presencia; alt vacío sigue siendo válido cuando la imagen es decorativa o redundante. Revisar el significado, no llenar todo con nombres de archivo. |
| 18 | Source maps | No se publicaban. El paquete rechaza .map y sourceMappingURL. Los mapas pueden ser útiles en desarrollo; esta es una política de distribución del proyecto, no una afirmación de que siempre sean un fallo. |
| 19 | Errores en consola | La batería detecta errores de ejecución, consola y recursos. La respuesta HTTP 404 del documento de error es esperada; no se ignoran fallos de sus imágenes/estilos. No se modificaron informes a mano para aprobar. |
| 20 | bundle.js gigante | Los dos módulos del candidato final suman **16.875 bytes sin comprimir** (la revisión anterior sumaba 16.226). El máximo combinado sigue en **32 KiB**. Se conservan los presupuestos de imágenes/fuentes; no se presenta una cifra local como rendimiento de usuarios reales. |

## Alcance real de robots y llms

La URL de rastreo del host es `https://tu-gimnasio-santa-lucia.github.io/robots.txt`. El archivo conservado dentro de `/tu-gimnasio-santa-lucia/` sirve como política portable, pero no administra ese host. La ausencia de un robots efectivo no equivale a bloquear Google. Si se desea administrarlo en el futuro, deberá hacerse en el sitio raíz o en un dominio controlado, con alcance autorizado. No se cambian políticas de privacidad o entrenamiento de otras cuentas por esta lista.

`llms.txt`, a diferencia de robots, admite un índice que cubra una ruta según su propuesta vigente. No reemplaza contenido accesible, sitemap, HTML o datos estructurados. Esta revisión no acredita indexación en Google, aceptación por cada bot ni posiciones en resultados.

## Mantenimiento

1. Editar fuente y datos, nunca dist/site a mano. Respaldo y recuperación antes del cambio.
2. Ejecutar `node scripts/check.mjs`; revisar errores por archivo y `artifacts/seo-report.json`.
3. Ejecutar navegador/rendimiento cuando corresponda; las publicaciones mantienen toda la batería habitual.
4. Revisar visualmente 404 y portada; no tratar un hash o el puntaje de una herramienta como aprobación de diseño.
5. Si se crea una página nueva, darle propósito, título, H1, descripción, canonical y entrada de sitemap propios. Si no debe indexarse, declararlo deliberadamente y ajustar el contrato con evidencia.
6. Antes de publicar, revisar la política real del hosting y los resultados públicos. Un build local no demuestra que el cambio ya esté en Internet.

## Fuentes primarias consultadas el 29/10/2026

- [Google: JavaScript, contenido, títulos, canonical y estados HTTP](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).
- [Google: ubicación y alcance de robots.txt; tratamiento de 4xx](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec).
- [Google: funciones de IA y ausencia de requisitos especiales](https://developers.google.com/search/docs/appearance/ai-features).
- [GitHub Pages: página 404 propia](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site).
- [Propuesta llms.txt, versión 2](https://llmstxt.org/).
- [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md), para los controles pertinentes de semántica, imágenes y accesibilidad; las preferencias de estilo externas no reemplazan la identidad aprobada.
