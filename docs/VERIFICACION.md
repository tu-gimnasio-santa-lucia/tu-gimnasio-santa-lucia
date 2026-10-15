# Registro de fuentes y verificaciones

## Datos del negocio

- Fuente del propietario y documentación del proyecto: nombre Tu Gimnasio, apertura 1996, cuatro actividades, identidad y lemas.
- Google Maps consultado el 15/10/2026: dirección Av. Italia 109, W3440 Santa Lucía, Corrientes; teléfono 03777 72-3911; valoración 4,8/5 y 18 opiniones. La ficha mostraba cierre a las 22:00 en la consulta. Fuente: https://maps.app.goo.gl/M5ivz5WYEiGhwfAX8
- El horario completo de lunes a viernes 07:00–22:00 y cierre de fin de semana proviene del registro oficial anterior; confirmar con el gimnasio al cambiarlo. Las clases se consultan por WhatsApp y los feriados pueden variar.
- Instagram oficial conservado: https://www.instagram.com/tugimnasio1/ . La identidad del perfil fue comprobada anteriormente; una limitación de acceso automático no se debe interpretar como eliminación del perfil.
- Se retiraron las citas editoriales de reseñas para evitar presentar paráfrasis como citas literales. Se conserva la valoración comprobada y un enlace a las opiniones originales.
- Los dos afiches de horarios y spinning incluyen horas de publicaciones anteriores. Se conservaron intactos en assets, marcados archived en el manifiesto y excluidos de la página y de dist. La sección de experiencia conserva el lema y el logo mediante HTML/CSS, sin inventar fotografías ni clases actuales.

## Criterio de aprobación

### Entrega 2.1.0 — aniversario y anuncio de próxima sede

El propietario aportó el 15/10/2026 la dirección futura Héroes de Malvinas 150, Santa Lucía, Corrientes, Argentina, indicó que la nueva sede está en construcción y confirmó publicar el anuncio ahora. No aportó una fecha de apertura ni un nuevo enlace de Maps. Se conservan por separado la dirección actual y su ficha. La ubicación futura no aparece como sede abierta en JSON-LD ni enlaza al mapa anterior.

Cifras aportadas por el propietario: 30 años, 10.957 días, 262.968 horas, 15.778.080 minutos y 946.684.800 segundos. Se usan como conmemoración fija de 2026, sin inferir el día de fundación ni simular tiempo real.

La batería se amplió a 24 casos: los cuatro navegadores de la tabla inferior y seis vistas, 320×800, 390×844, 768×1024, 844×390 horizontal, 1280×800 y 1920×1080. Incluye logo completo dentro del círculo, distinción entre ambas direcciones, imágenes, texto al 200%, teclado, ausencia de JavaScript y preguntas frecuentes nativas. Se prueban además animaciones reales en los cuatro motores, su cancelación al activar movimiento reducido, tipografía local a 320/390/1280 e impresión. Se revisa alto contraste en Chromium; se desactiva la mezcla del logo en alto contraste e impresión para que no desaparezca sobre el fondo claro.

Cinco grupos de pruebas de código cubren ahora también equivalencias conmemorativas y rechazo de cambios que anunciarían una apertura o Maps actualizado sin completar la migración. La fuente Anton se aloja junto con su licencia, SHA-256 y origen fijado; no se carga desde Google. La auditoría de las seis dependencias de desarrollo volvió a informar cero vulnerabilidades; no se agregaron dependencias de producción.

El logo original es un JPEG que se había guardado con extensión png. Se conserva el archivo anterior intacto en la fuente y se publica una copia idéntica con extensión jpg y MIME correctos. El encuadre se corrigió con CSS, sin alterar sus píxeles. Dos intentos de extracción transparente generaron bordes defectuosos y se descartaron: ninguno se incluyó en la web ni en sus recursos publicados.

Taste se usó como asesoramiento de composición y revisión, con dirección editorial de aniversario y marca conservada. Su inspector no es un criterio de seguridad o accesibilidad: señala etiquetas contextuales y exige un mínimo arbitrario de movimiento; registra entre cinco y siete elementos móviles según la vista, por debajo de su mínimo de ocho. Se conserva movimiento breve y útil. También advierte sobre ausencia de vídeo, escala tipográfica y fuente nativa; no se fabricaron vídeos del edificio ni se alteró la marca para obtener una puntuación. Los controles funcionales son independientes y los límites permanecen documentados.

### Entrega 2.0.0 — 15/10/2026

| Navegador probado | Versión | Anchos en píxeles |
| --- | --- | --- |
| Chromium | 156.0.8078.4 | 320, 390, 768, 1280 |
| Firefox de Playwright | 155.0 | 320, 390, 768, 1280 |
| WebKit de Playwright | 27.2 | 320, 390, 768, 1280 |
| Microsoft Edge instalado | 155.0.4283.45 | 320, 390, 768, 1280 |

Resultado: 16 casos aprobados, sin desbordamiento horizontal, imágenes rotas, solicitudes remotas al cargar, errores de la aplicación ni infracciones detectadas por axe con reglas WCAG 2/2.1 A/AA. Texto al 200% en 320 px, salto al contenido, funcionamiento sin JavaScript en los cuatro motores, copia real al portapapeles, alternativa con permiso denegado, cancelación de compartir y decodificación del QR aprobados. Capturas móvil/escritorio revisadas visualmente. WebKit es un motor automatizado; no representa una prueba física en todos los iPhone o Safari.

Cuatro grupos de pruebas de código aprobados: rutas y archivos públicos, inyección HTML/JSON-LD, validación de datos, reproducción idéntica y hashes CSP/SRI. Auditoría de las seis dependencias de desarrollo: cero vulnerabilidades informadas al momento de la consulta; cero dependencias de producción. No implica ausencia de vulnerabilidades futuras.

Las reglas genéricas de Taste son asesoramiento visual. Se conservaron la identidad deportiva, las etiquetas y los indicadores de foco accesible aunque no coincidan con todas sus preferencias estéticas. Los controles de accesibilidad y seguridad tienen prioridad sobre esa puntuación editorial.

El informe de navegador está en artifacts/qa-report.json y corresponde a la huella del build. Las pruebas automáticas no certifican WCAG ni todos los dispositivos físicos. Registrar aquí el resultado final de cada publicación y sus límites.

Las huellas de archivos, CSP, SRI y la determinación de salida se prueban sin red. La comprobación pública posterior debe comparar la publicación real con dist y comprobar contacto/QR.

En WebKit se prueba el foco del enlace para saltar al contenido y su activación con Enter; la preferencia de la plataforma puede limitar Tab a controles. En Chromium, Firefox y Edge se comprueba además que sea el primer destino de Tab. No se modifica la preferencia del usuario.

La captura de Playwright en WebKit intenta aplicar un estilo auxiliar que la CSP bloquea. El informe separa ese aviso exacto de la herramienta —sólo durante la captura— de los errores de la página. Se conserva la política restrictiva; no se agrega unsafe-inline para ocultar ese aviso. La carga y la auditoría de accesibilidad se comprueban antes de capturar, sin errores de la aplicación.
