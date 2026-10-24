# Fuentes y verificaciones

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
