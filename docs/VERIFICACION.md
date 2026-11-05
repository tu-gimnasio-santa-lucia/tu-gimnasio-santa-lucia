# Fuentes y verificaciones

## Integración local de «Detalle» v4 — 05/11/2026 (sin publicar)

Aprobada por el propietario después de revisar la comparación v3/v4. Se integraron, sin modificarlos, `src/index.template.html`, `src/styles.css` y `src/site.js` de `../propuestas/rediseno-2026-11-v4/sitio/`; también se actualizaron `DESIGN.md` y `CHANGELOG.md`. El build integrado reproduce la huella del prototipo revisado: **`f830f5fceffa49ad1961cd33323c303e2ae558525cd8eddb389d94d20adb61d6`**. Datos, recursos (con el QR), scripts, pruebas y puertas no cambiaron.

- Respaldo previo: `../tu-gimnasio-respaldos/2026-11-05T21-13-53-325Z-46112578/`, verificado. El estado es el mismo que se ensayó en esta sesión con el respaldo `2026-11-05T20-19-21-430Z-b2aa2b06` (mismo HEAD, estado, diff y `check`). La evidencia de v3 (`1ae49278…`) está en `../tu-gimnasio-respaldos/2026-11-05-fuera-de-git-antes-v4/web-artifacts/`.
- `node scripts/check.mjs`: 17/17 pruebas, contratos SEO y CSP; JavaScript público de 30.765 de 32.768 bytes; `script-src 'self'` más los dos hashes; SRI en estilos y script.
- `node scripts/browser-check.mjs`: aprobado en Chromium, Firefox, WebKit y Edge, con 24 casos generales, 24 de presentación y 8 de 404. Incluye las salvaguardas, la durabilidad (texto al 200 %, espaciado, teclado, impresión, colores forzados, ahorro de datos), movimiento, fuentes, axe y el QR leído con jsQR (`artifacts/qa-report.json`).
- `node scripts/performance-check.mjs`: aprobado. Imágenes de 143.610 B (390 px, DPR 1) y 309.504 B (DPR 2), iguales que v3 (`artifacts/performance-after.json`).
- `pnpm audit`: sin vulnerabilidades conocidas.
- `validateReleaseReports` de `scripts/release-check.mjs`, en memoria y sin publicar: acepta los informes del build exacto.
- Comprobaciones propias de v4 (`../propuestas/rediseno-2026-11-v4/qa/funciones-v4.mjs`) contra la vista previa oficial: 13/13 en Chromium, Firefox y WebKit, sin errores de consola.
- Revisión visual de la integración a 390, 768 y 1440 px: portada, menú, hoja de consulta, horarios y profes (`../propuestas/rediseno-2026-11-v4/comparacion/integracion/`).
- Antes de integrar, sobre el mismo build del prototipo, un intento de la batería tuvo un fallo intermitente en WebKit al volver desde la 404, porque la prueba no esperaba la navegación. Se reprodujo 60 veces sin fallar con v3 y con v4. Con autorización del propietario, sólo se corrigió esa sincronización en `scripts/browser-check.mjs`: espera la navegación a la ruta propia del sitio y después comprueba `#actividades` con la misma exigencia. Dos casos negativos provocados (`../propuestas/rediseno-2026-11-v4/qa/negativo-404.mjs`) siguen fallando: un enlace con otra ruta falla por tiempo de espera y `#actividades` oculto falla en la comprobación.
- Prepublicación: `check` (17/17) y la batería completa de cuatro motores se repitieron con la prueba corregida sobre `f830f5fc…`: aprobados (`artifacts/qa-report.json`, creado el 05/11/2026 a las 21:28 UTC), con la puerta de informes en memoria aprobada. El informe de rendimiento del mismo build sigue vigente. Evidencia preservada en `../tu-gimnasio-respaldos/2026-11-05-evidencia-prepublicacion-f830f5fc/` con `SHA256SUMS`.
- Documentación actualizada: `README.md`, `docs/ESTABILIDAD.md` y `docs/ETAPAS-ACTUALIZACION.md` describen «Detalle» v4.
- Límites: sin teléfonos físicos ni métricas de usuarios reales; axe no equivale a una auditoría WCAG completa.

## Integración local de «Detalle» — 05/11/2026 (sin publicar)

Build verificado: `1ae4927847511297a9a835d3daa1769dab9a80398a77fc67f8d039d641fd0c13`. Estado: integrado y probado en local; **no publicado**. La página pública conserva la entrega del 29/10.

- `check`: 17 pruebas aprobadas (incluye CSP con hashes, ningún atributo style, logo maestro intacto, compactación del script) y contratos SEO; JavaScript público 28.027 de 32.768 bytes.
- `browser-check`: aprobado en Chromium 156, Firefox 157, WebKit 27.2 y Edge 156; 24 casos principales, 24 presentaciones (1510 ms en total, transform/opacity), salvaguardas de presentación, durabilidad (texto al 200 % en 320/844/1024/1280, espaciado WCAG, teclado, impresión, colores forzados, ahorro de datos), movimiento, fuentes, 8 casos de 404 y QR del paquete.
- `performance-check`: aprobado. Imágenes elegidas (logo de portada + cierre): 143.610 bytes a 390 px/DPR 1 y 309.504 a DPR 2 (antes, con las imágenes de historia y cierre: 275.602 y 626.234). Sin escrituras ni consultas repetidas del reloj; aniversario argentino 29→30 comprobado.
- `pnpm audit`: sin vulnerabilidades conocidas. Puerta `release-check`: aprueba los informes reales de este build.
- Paridad con la versión anterior (generada desde el respaldo recuperado): los 23 enlaces/destinos, todos los mensajes de WhatsApp por horario y todos los anclajes siguen presentes; QR idéntico byte a byte y leído con jsQR desde la imagen mostrada a 390 y 1440 px.
- Medición exploratoria de laboratorio (Chromium local, no son métricas de usuarios): CLS 0 en celular y escritorio; LCP entre 0,13 y 1,5 s según si corre la presentación, 1,9 s con CPU simulada ×4; interacción más lenta 72 ms. Un desplazamiento real del QR (CLS 0,121) se detectó y corrigió durante esta revisión.
- Límites: sin pruebas en teléfonos físicos ni métricas de campo; axe no equivale a una auditoría WCAG completa.

Respaldo previo a la integración: `tu-gimnasio-respaldos/2026-11-05T15-59-21-256Z-f0e122c3/` (87 huellas, bundle verificado, recuperación ensayada). Evidencia anterior de artifacts: `tu-gimnasio-respaldos/2026-11-05-web-artifacts-antes-integracion/`.

## Revisión final y entrega autorizada — 29/10/2026

Manifiesto aprobado: `b6fe8200f5c48ad5ccb6a2f3b0c5be1dfa32a5eda120f8ef7bf1c555dc7ae002`; 25 archivos contando el manifiesto. Dieciséis grupos de código, 56 casos principales en Chromium 156, Firefox 155, WebKit 27.2 y Edge 156, cuatro bloques ampliados, cuatro mediciones y diez casos límite adicionales de Chromium. Auditoría Node: cero avisos conocidos, sin instalar paquetes.

Los informes aprobados corresponden exactamente al build. Se revisaron capturas antes/después, texto ampliado, impresión, alternativas sin JavaScript y movimiento. Los aniversarios 2026/2027 se probaron con reloj emulado y zona del dispositivo en Tokio. Recuperación previa completa e idéntica. No se atribuyen resultados de campo ni pruebas físicas de teléfonos a esta batería. Ver [estabilidad](ESTABILIDAD.md).

El propietario autorizó publicar el 29/10. Los commits, bytes públicos y respaldo posterior se registran en la continuidad local de la publicación, fuera del paquete público. Las menciones inferiores a candidato local o entregas previas describen sus respectivas revisiones. Esta entrega mantiene el destino de Maps y los contactos confirmados, y no agrega analítica ni cuentas externas.

## Optimización web — 27/10/2026

Doce grupos de código aprobados; 48 casos de navegador (24 generales y 24 de presentación) y cuatro mediciones de recursos/reloj aprobados. Manifiesto: f4de190435caa6f034a16eab442ec7306bd3fdabba7b8fef7bec6325b5081e3b. Capturas de móvil/escritorio revisadas antes del cierre. Se conservan contactos, horarios, pausa, datos, QR, identidad, contador penúltimo y bases último.

390 px: dos imágenes de historia/cierre bajan de 1.347.430 a 275.602 bytes en DPR 1 (79,55 %) y a 626.234 en DPR 2 (53,52 %). Fuente seleccionada al cargar Anton: 170.812 a 57.412 bytes (66,39 %). En cinco ticks, escrituras de años estables 15→0 y consultas 30→0. Cambio de 29 a 30 al cruzar medianoche argentina del 04/11/2026 comprobado en los tres lugares visibles. Son mediciones locales de archivos elegidos, no LCP de usuarios reales ni garantías de SEO.

El marcado del propio negocio ya no emite aggregateRating; valoración visible y enlace permanecen según la guía de Google. El preview local rechaza autoridades/orígenes ajenos, POST y rutas privadas, y soporta HEAD/WOFF2. No se atribuyen esas cabeceras a Pages.

Pillow 12.3.0 disponible en el runtime tenía avisos publicados; se preparó un entorno privado del proyecto con Pillow 13.0.0, FontTools 4.67.0 y Brotli 1.2.1. Consulta OSV final sin avisos para esas versiones; Node mantiene su bloqueo y seis dependencias de desarrollo, ninguna de producción. No se actualizaron runtimes globales ni proyectos ajenos. El cambio de Pillow no alteró los derivados generados; sus bytes y originales se comprobaron.

Evidencia completa, estado de publicación y respaldos: registro local de esta optimización, fuera del sitio. Fuente técnica: RENDIMIENTO.md. Los resultados inferiores son históricos respecto de este build.

## Publicación comprobada — 25/10/2026

Fuente de la implementación: f6fbde3f10e2f8768be0f999245156123aa297b5. Publicación generada: bc37f1588749df2654138be5c30e19ad0b6cac01. Se usó scripts/publish.mjs, sin force-push, con respaldo y QA del build exacto. **17 archivos públicos HTTP 200 y SHA-256 coincidentes**, incluido el manifiesto f852d353f700ff9a0626aef0c28b29cd258c4ccc0d3bf26c0fa607edeaf9ab84.

La página pública real se abrió y comprobó: cuatro actividades, diez filas, antigüedad real de 29 años en cabecera/contador/pie, presentación terminada, Profe Martita primero, sin desbordamiento. Horas de Maps públicas verificadas de lunes a viernes 07:00–11:00 y 13:30–22:00. Los fines de semana conservan Closed preexistente. Recibos detallados y respaldo recuperado permanecen fuera de la publicación.

## Segunda etapa — 25/10/2026

**Nueve grupos y 48 casos aprobados**: 24 generales y 24 entradas reales, mismos cuatro motores y seis vistas de 320 a 1920 px documentados abajo. Salvaguardas por motor: interacción, cambio de movimiento reducido, resize, documento oculto, enlace profundo, decode demorado y ausencia de Web Animations. Cero errores de aplicación, desbordamientos e infracciones detectadas por axe.

Manifiesto aprobado: f852d353f700ff9a0626aef0c28b29cd258c4ccc0d3bf26c0fa607edeaf9ab84. Informe: artifacts/qa-report.json. Presentación de 1040 ms sólo con transform/opacity, sin bloquear puntero, teclado o scroll. Contenido estático alternativo y comprobaciones de 200 % de texto, sin JavaScript, reloj, aniversario, contactos y QR conservados. Capturas revisadas. Auditoría nueva de dependencias: cero vulnerabilidades, ninguna dependencia de producción; no se instalaron paquetes.

Se corrigieron y preservaron dos fallos de prueba: visita con hash en página nueva y simulación de demora por decode en Firefox 155, cuyo protocolo no admite una opción de route de Playwright 1.64.1. Se comprueba la alternativa por demora, sin afirmar una medición física de red o rendimiento.

El 25/10 Maps conserva pin correcto, 4,8/18 y calle San Martín s/n; se mantiene la aclaración. El propietario autorizó logo/placas, horas y cuatro actividades, además de retirar 21 imágenes antiguas tras respaldo y confirmación específica. Los estados de aprobación y recibos privados se conservan fuera del sitio. La presentación general usa Profe Martita antes de Profe Titi. Los apartados inferiores del 24/10 son históricos; no sustituyen la comprobación pública de esta entrega.

## Correcciones posteriores a la primera jornada — 24/10/2026

Pedido directo: consultas simétricas, pulido general, contador penúltimo y «Volvamos a las bases» último, retirando la reapertura. Implementado como corrección independiente; **segunda etapa y publicación pendientes hasta la orden «comencemos la 2da etapa»**.

Se retiraron anuncio, fecha visible, sección, consulta promocional y descripción de reapertura. La fecha confirmada se conserva como antecedente de la fuente y `validFrom` técnico; no se afirma apertura efectiva. Se preservaron horarios, docentes, números, Maps, originales y cálculo de antigüedad.

**Resultado nuevo: nueve grupos de código y 24 casos de navegador aprobados.** Además de los controles inferiores, se midieron las 14 consultas de WhatsApp/Instagram: mismas dimensiones por vista; también altura uniforme de todas las acciones principales. Se verificaron orden real de las últimas secciones, gráfica única al cierre, ausencia de reapertura, texto al 200%, teclado, ausencia de JavaScript, reloj y movimiento reducido. Capturas de escritorio/móvil y tablet revisadas; se ajustó el título del contador de tablet para evitar cuatro líneas.

Manifiesto final: `12f784cdd0e84742fa6001c08413bc70cf14087d856528f417c6aadacbdbc1ee`. Reporte local: `artifacts/qa-report.json`. Sin infracciones detectadas por axe, desbordamientos horizontales, errores de aplicación o solicitudes remotas al cargar. No equivale a certificación ni prueba física de todos los dispositivos. No se instalaron dependencias ni se publicaron cambios. Se preservaron el fallo de altura de Maps y las inspecciones previas; se corrigieron y repitieron las pruebas, sin relajar criterios. La auditoría de dependencias se renovará antes de publicar.

Las preferencias de Taste se usan como asesoramiento subordinado a la marca y accesibilidad: etiquetas reales, separadores de horarios, foco visible y ausencia de video pendiente no se retiran para obtener una puntuación. La nueva entrada animada no se implementó. Los resultados inferiores de la primera jornada son históricos respecto de este build.

## Primera jornada — 24/10/2026, versión local sin publicar

Orden directa: «comenza con la primera etapa». Se completan datos, consultas, ubicación y prioridad de actividades. Nueva presentación animada, logo/fotos de Maps, publicación y comprobación pública quedan para una segunda jornada solicitada posteriormente. Ver [etapas](ETAPAS-ACTUALIZACION.md).

### Datos y procedencia

- **Propietario:** Tu Gimnasio, fundación 04/11/1996, nueva sede Héroes de Malvinas 150, apertura prevista 03/11/2026 sin hora de inauguración. Autorizó el anuncio sin «en construcción». No se certificó la dirección mediante documentos legales.
- **Horarios confirmados:** musculación general con Titi de lunes a viernes 07:00–11:00 y 13:30–22:00; especial con Martita de lunes a viernes 08:00–09:00 y 20:00–21:00. La última confirmación comprende ambas franjas. Gimnasia grupal lunes a viernes 14:00–15:00 y pilates en colchoneta martes/jueves 19:00–20:00, con Martita.
- **Spinning, seis inicios:** martes/jueves 08:00 Martita; lunes a viernes 09:00 Titi, 14:00 Titi y 15:00 Martita; lunes/miércoles/viernes 19:00 Martita; lunes a jueves 20:00 Titi. La duración no se confirmó: `end: null`. No se inventaron fines de semana o feriados.
- **Titi:** `03777 72-3911`; móvil internacional `5493777723911`. La correspondencia se contrastó nuevamente con «Titi F» en Google Contacts y con el teléfono de la ficha del negocio. Se conservaron sólo datos de contacto necesarios, sin campos privados.
- **Martita:** número `3777472060` aportado por el propietario; móvil internacional `5493777472060`. No se enviaron mensajes de prueba.
- **Instagram oficial:** <https://www.instagram.com/tugimnasio1/>, confirmado por el propietario. Se comprobaron el destino y los cuatro enlaces de la web; no se presume sesión iniciada ni entrega de mensajes.
- **Maps, consulta nueva del 24/10/2026:** [ficha de Tu Gimnasio](https://maps.app.goo.gl/M5ivz5WYEiGhwfAX8). Ya muestra el pin `-28.9770634, -59.0984372`, pero conserva `San Martin s/n, W3440ABB Santa Lucía, Corrientes`. Se comprobaron nombre, teléfono, web, plus code `2WF2+5J`, valoración 4,8/5 y 18 opiniones. Se conserva el aviso del nombre pendiente.
- **Referencia del propietario:** [Street View](https://maps.app.goo.gl/p6qmCQExy6iP9ZMV8), cámara diferente del pin. Las indicaciones con Place ID `ChIJ97NG_pRjTpQRJB6lqKeqmWU` identificaron Tu Gimnasio. Coordenadas solas elegían un comercio vecino y se descartaron. El enlace sigue la [documentación oficial de Maps URLs](https://developers.google.com/maps/documentation/urls/get-started), sin clave API.
- **Identidad:** logo original, azul oscuro, colores deportivos y tres lemas conservados. Afiches antiguos archivados y excluidos del sitio. Sin Funcional o precios publicados; QR y URL canónica conservados.

La coincidencia del especial de Martita con spinning martes/jueves 08:00 queda como observación operativa, sin cancelar horarios ni inventar suplentes. Las reseñas no se reescriben como citas: se muestra valoración comprobada y enlace a las originales.

### Resultado ejecutado

`node scripts/check.mjs`: **9 grupos aprobados**: sintaxis, recursos permitidos, escapado/inyección, relaciones de horarios/docentes, enlaces, snapshot, aniversario argentino y generación reproducible. La salida contiene 16 archivos declarados y su manifiesto (17 en total), con CSP/SRI y fuente local verificados.

`node scripts/browser-check.mjs`: **24 casos aprobados**, cuatro navegadores y seis vistas: 320×800, 390×844, 768×1024, 844×390, 1280×800 y 1920×1080.

| Navegador | Versión |
| --- | --- |
| Chromium de Playwright | 156.0.8078.4 |
| Firefox de Playwright | 155.0 |
| WebKit de Playwright | 27.2 |
| Microsoft Edge instalado | 156.0.4314.42 |

Sin desbordamiento horizontal, imágenes rotas, errores de la aplicación, solicitudes remotas al cargar ni infracciones detectadas por axe con las reglas configuradas. Se comprobaron diez filas, docente y teléfono de cada enlace, mensaje codificado y franjas, cuatro accesos a Instagram, dirección, Place ID y ausencia de datos anteriores contradictorios.

También aprobaron teclado/salto al contenido, texto al 200%, ausencia de JavaScript en los cuatro motores, logo completo, movimiento real/reducido y cambio de preferencia durante la visita, fuente local, impresión y alto contraste en Chromium. Se comprobaron aniversario, avance del reloj, pausa/reanudación, pestaña oculta/visible, compartir/cancelación, portapapeles/alternativa y decodificación del QR. Capturas de musculación y spinning revisadas visualmente en móvil y escritorio.

La primera ejecución detectó cuatro nombres accesibles de Instagram que no incluían en orden la etiqueta visible. Se corrigió `aria-label` para comenzar por «Consultar en Instagram» y se repitió toda la batería: aprobó. Se preservó el informe fallido en la auditoría local; no se debilitó la regla.

`artifacts/qa-report.json` identifica el SHA-256 del manifiesto aprobado: `e0697023205eb77b0e3f3c312f1a059392e12dfddd60013b8f3bc553e401fa91`. No se añadieron ni actualizaron dependencias; cero dependencias de producción. Renovar la auditoría de dependencias antes de publicar en la segunda jornada; un resultado antiguo no equivale a una consulta nueva.

### Alcance y límites

- Resultados de la versión local en los motores/versiones indicados. No certifican WCAG, seguridad absoluta, todos los dispositivos ni pruebas físicas en iPhone/Safari o Android.
- Se verificaron correspondencia de contactos, enlaces y mensajes sin enviarlos. No se probó recepción de mensajes ni se modificó una cuenta ajena.
- Maps identifica negocio y pin; no se inspeccionó físicamente el acceso. Comprobar el nombre de calle otra vez antes de publicar. La fecha anunciada no demuestra apertura efectiva.
- Durante la captura, WebKit registra el bloqueo CSP de un estilo auxiliar de Playwright. Se distingue de errores de la aplicación; carga y accesibilidad se comprueban antes de capturar. No se agregó `unsafe-inline` para silenciarlo.
- En WebKit se comprueba foco y activación del salto con Enter; la preferencia de plataforma puede limitar Tab. No se modificó esa preferencia.
- No se publicó ni se comparó esta versión con la web pública. No se cargaron imágenes en Maps. El respaldo previo se recuperó en una carpeta aislada y reconstruyó una salida idéntica. Evidencia de cierre y respaldos finales: registro local de continuidad, fuera del sitio.

## Verificaciones históricas

Las entregas anteriores se conservan en Git, respaldos y auditorías locales. Av. Italia 109, horario continuo, días especiales desconocidos, apertura sin fecha y cifras conmemorativas fijas quedan superados por los datos actuales. No reutilizar QA histórica para una salida nueva. Originales, fuente y licencia se conservan intactos.
