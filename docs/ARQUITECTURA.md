# Arquitectura y mapa del código

Identificador estable: `tu-gimnasio-santa-lucia`. Contrato revisado el 24/10/2026 (arquitectura 3). La fuente portátil es este repositorio: no requiere un chat, proveedor de IA, plugin o ruta de una PC. La primera jornada está implementada localmente; publicación y nueva presentación animada quedan para la segunda. Leer [etapas](ETAPAS-ACTUALIZACION.md).

## Responsabilidades

| Archivo o carpeta | Responsabilidad |
| --- | --- |
| `project.json` | Identidad técnica, URL canónica, repositorio, ramas, idioma y zona horaria; sin credenciales. |
| `data/business.json` | Datos del negocio: docentes, actividades, horarios, consultas, dirección anunciada y estado comprobado de Maps. |
| `data/business.schema.json` | Tipos y restricciones para edición. El generador también valida relaciones y coherencia con JavaScript. |
| `scripts/business-data.mjs` | Validación y funciones puras para días, franjas, mensajes e indicaciones. Sin red, DOM ni reloj del equipo. |
| `assets/manifest.json` | Recursos originales, dimensiones, roles, origen y huellas de la fuente local. Los recursos `archived: true` se conservan, pero no se publican. |
| `src/index.template.html` | Estructura semántica y textos editoriales; marcadores `{{nombre}}` resueltos al generar. Actividades antes del contador. |
| `src/styles.css` | Identidad, diseño adaptable, foco, impresión y movimiento reducido. |
| `src/elapsed-time.js` | Cálculo compartido de antigüedad, a partir de fundación e instante de consulta. |
| `src/site.js` | Mejoras independientes de reloj, compartir/copiar y movimiento; información y enlaces ya existen en HTML. |
| `scripts/build.mjs` | Valida datos/recursos, escapa HTML, genera JSON-LD/CSP/SRI y archivos públicos deterministas. |
| `scripts/check.mjs`, `tests/site.test.mjs` | Sintaxis, contratos, seguridad de generación y reproducibilidad; sólo necesitan Node. |
| `scripts/browser-check.mjs` | Navegadores, horarios/contactos, accesibilidad, reloj, enlaces, imágenes, compartir y QR; usa dependencias de desarrollo. |
| `scripts/preview.mjs` | Servidor de lectura en `127.0.0.1`; sólo sirve la lista pública de `dist/` y regenera al abrir la portada. Reiniciar si cambian los módulos del generador. |
| `scripts/backup.mjs` | Respaldo fechado fuera del repositorio, SHA-256 e historial Git en bundle. |
| `scripts/publish.mjs` | Publicación explícita sin force-push, con origen, ramas, limpieza, respaldo y QA del build exacto comprobados. |
| `dist/` | Salida generada e ignorada en `main`; no editar a mano. |
| `artifacts/` | Informes/capturas locales, ignorados y excluidos de publicación. |

## Contratos y relaciones

- `teachers` es un diccionario por ID (`titi`, `martita`): nombre, teléfono visible e internacional. `contacts.defaultTeacherId` elige el contacto general; no duplicar teléfonos en actividades.
- `activities[].id` es estable y ASCII, por ejemplo `gimnasia-grupal`. El nombre visible puede ampliarse sin cambiar ID: `pilates` se muestra como «Pilates en colchoneta».
- `activities[].schedules[]` define `id`, `label` opcional, `days`, `teacherId` y `periods`. Los días usan nombres de Schema.org en inglés, ordenados de lunes a domingo; las horas locales usan `HH:mm`.
- Cada período tiene `start` y `end`. `end: null` significa que sólo se conoce el inicio; no equivale a duración cero ni permite inventar un final. Es el caso de las seis franjas de spinning.
- Las franjas de una modalidad deben estar ordenadas y no superponerse. Actividades diferentes pueden coincidir: no inventar suplentes ni cancelar horarios confirmados.
- `hours.generalActivityId` y `hours.generalScheduleId` referencian el horario general de musculación. Horarios y JSON-LD se generan desde esa misma fuente: 07:00–11:00 y 13:30–22:00, respetando la pausa.
- `address` contiene la dirección de la **sede anunciada**, Héroes de Malvinas 150. `relocation.status: "scheduled"` y `openingDate: "2026-11-03"` distinguen próxima apertura de apertura efectiva. El reloj no cambia ese estado. No se confirmó una hora de inauguración.
- `relocation.maps` distingue pin actualizado y nombre de calle actualizado. Conserva fecha de consulta, referencia del propietario, coordenadas de la ficha y Place ID. El botón usa ese Place ID; una cámara de Street View o coordenadas solas no son un destino validado. Ver [mudanza](MUDANZA-Y-ANIVERSARIO.md).
- `foundedDate: "1996-11-04"` es la fundación original. `anniversary` conserva un snapshot fechado coherente para HTML sin JavaScript; los años reales se actualizan por aniversario argentino.

Cada fila tiene ID DOM `horario-{activity.id}-{schedule.id}`, atributos `data-schedule-id` y `data-teacher-id` y su propio WhatsApp. Las cuatro actividades incluyen Instagram. Son contratos comprobables sin depender de posición o traducción.

La migración retiró `phoneDisplay`/`phoneInternational` de la raíz, `relocation.futureAddress`, `relocation.mapsUpdated` y la cadena duplicada del horario general. Sus reemplazos son `teachers`, `address`, `relocation.maps` y la referencia al horario canónico. No recrear ambos contratos.

## Funciones estables

| Función y módulo | Entrada, salida y efecto |
| --- | --- |
| `validateBusinessData(data, project)` — `business-data.mjs` | Valida relaciones, fechas, docentes, períodos y enlaces; devuelve datos válidos o lanza error. Se reexporta desde `build.mjs` para conservar su API. |
| `formatScheduleDays(days)` | Días ordenados → etiqueta en español. |
| `formatScheduleTime(time)`, `formatSchedulePeriods(periods)` | Horarios → texto legible; marca «inicio» si falta final. |
| `formatOpeningDate(date)` | Fecha → texto en español con zona argentina; no agrega hora real de apertura. |
| `getGeneralSchedule(data)` | Resuelve las referencias del horario general sin duplicarlo. |
| `buildScheduleMessage(activity, schedule, teacher)` | Mensaje con docente, actividad, días y franjas; consulta disponibilidad y cuota sin publicar importes. |
| `buildWhatsAppUrl(teacher, message)` | Móvil argentino internacional y mensaje → enlace `wa.me` con texto codificado. No envía mensajes. |
| `buildDirectionsUrl(data)` | Negocio, localidad/provincia y Place ID comprobado → Maps Directions con `api=1`, destino con nombre y `destination_place_id`. Las coordenadas quedan en datos/JSON-LD; no se usan como fallback de la ruta. |
| `validateAssetManifest(assets)` — `build.mjs` | Rechaza rutas inseguras, recursos o dimensiones incoherentes. |
| `escapeHtml(value)`, `serializeJsonLd(value)` | HTML escapado y JSON que no puede cerrar su etiqueta `script`. |
| `renderTemplate(template, replacements, rawKeys)` | Resuelve marcadores; falla si faltan valores. Sólo el generador permite fragmentos ya construidos y escapados. |
| `buildSite(outputDirectory)` | Genera salida pública determinista y devuelve su manifiesto. |
| `calculateElapsed(foundedDate, now)` — `elapsed-time.js` | Instante → años por calendario argentino y totales de días, horas, minutos y segundos. |
| `startPreview(port)` — `preview.mjs` | Devuelve `{server, url}`; el llamador cierra el servidor. |
| `createBackup()` — `backup.mjs` | Crea copia y bundle verificados; devuelve su ruta. |
| `verifyStagedOutput(checkout, outputDirectory)` — `publish.mjs` | Compara SHA-256 de los blobs que Git confirmará con la salida aprobada. |

Funciones privadas del navegador: `initializeLiveClock()`, `initializeSharing()` e `initializeMotion()`. El reloj usa `updateElapsed()` y `scheduleClock()`; compartir dispone de `copyOfficialUrl()`, `showManualCopy()` y `shareOfficialPage()`; el movimiento utiliza `animateSection()` y `handleMotionPreference()`. Ya no existe una animación numérica `animateMetric()` ni se reinicia el contador desde cero.

`data-elapsed-years`, `data-time-unit`, `data-time-accessible`, `live-clock`, `toggle-clock` y `clock-status` conectan HTML y reloj. `data-reveal` conecta las entradas opcionales. Conservar o migrar explícitamente estos contratos en la segunda jornada. Las preguntas frecuentes usan `details/summary` nativos.

## Generación, seguridad y portabilidad

Los datos se escapan por defecto. Los fragmentos HTML permitidos sólo provienen del generador, que escapa valores y atributos. JSON-LD tiene su hash CSP; CSS/JavaScript usan nombres derivados del contenido e integridad SRI. El manifiesto incluye tamaños y SHA-256; `qa-report.json` identifica su huella. Una QA anterior no valida un build nuevo.

La generación no depende de la fecha actual ni de servicios remotos; el snapshot es explícito. No hay backend, formularios de usuarios, rastreadores, cookies, scripts de terceros ni fuentes remotas. Las dependencias son de desarrollo y no llegan a `dist/`. Los enlaces externos se abren por iniciativa de la persona.

`.gitattributes` fija LF para código y conserva bytes originales de imágenes, fuente y licencia. No formatear recursos del proveedor. La publicación también compara los bytes preparados por Git, usando `core.autocrlf=false` sólo en esa operación. Ver [seguridad](SEGURIDAD.md), [mantenimiento](MANTENIMIENTO.md) y [recuperación](RECUPERACION.md).

React/Vinext y las copias HTML históricas están fuera de esta fuente; no sincronizarlas de vuelta. Una migración futura debe conservar o trasladar explícitamente datos, identificadores, recursos, URL canónica y pruebas, sin reconstruir decisiones desde prompts.
