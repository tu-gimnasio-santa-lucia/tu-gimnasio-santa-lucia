# Historial de cambios

## 2026-11-05 — Integración local de «Detalle» v4 (sin publicar)

- Perfeccionamiento v4 aprobado por el propietario e integrado tal como se revisó en `propuestas/rediseno-2026-11-v4/` (mismo build `f830f5fc…`). Cambian sólo `src/index.template.html`, `src/styles.css`, `src/site.js` y `DESIGN.md`.
- Sistema de movimiento: 3 curvas y 5 duraciones como tokens; salidas más cortas que las entradas; un único escalonado de revelados.
- Portada: coreografía como un solo gesto (1,4 s), firma tricolor dibujada de un trazo, nunca vacía más de 0,5 s después del primer pintado, y en celular y tablet un solo eje izquierdo.
- Corregido: con movimiento reducido y un script fallido la portada podía quedar oculta; dos marcas visibles con movimiento reducido; escalonado del menú al cerrar.
- Microinteracciones: indicador de sección deslizante, botón flotante que sólo aparece sin otra consulta en pantalla, hoja de consulta arrastrable, confirmación al copiar, pestañas con bordes difuminados y línea «Ahora» que no cruza la escala.
- Etiquetas con un mismo estilo; la tarjeta de actividad ya no repite el nombre junto al índice; «¿» colgante en escritorio. Anton antes que Impact, aprobado formalmente.
- Sin cambios en datos, recursos, QR ni puertas. `scripts/browser-check.mjs` sólo cambia la sincronización del paso 404: espera la navegación de «Volver al inicio» antes de comprobar `#actividades`, con la misma exigencia, y se comprobó con casos negativos.
- `README.md`, `docs/ESTABILIDAD.md` y `docs/ETAPAS-ACTUALIZACION.md` describen «Detalle» v4.

## 2026-11-05 — Integración local de «Detalle» (sin publicar)

- Dirección «Detalle» aprobada por el propietario e integrada en src/: capítulos superpuestos, tipografía monumental, índice fijo de actividades, «¿Qué hay hoy?», opiniones con presencia propia, menú y hoja de consulta, cabecera compacta automática con texto ampliado.
- Logo maestro aprobado publicado sin cambios, con derivados WebP sin pérdida verificados píxel por píxel (prepare-assets.py, Pillow fijado).
- CSP endurecida en la práctica: sin atributos style ni imágenes data:; único script en línea autorizado por hash.
- Se conservan datos, mensajes de WhatsApp por horario, Maps con Place ID, QR original, compartir/copiar/descargar, preguntas, contador con pausa, orden comercial y 404.
- browser-check adapta las comprobaciones de la presentación y del logo al diseño aprobado con criterios iguales o más estrictos; performance-check mide el logo de portada y el cierre; site.test agrega pruebas de CSP, estilos en línea, maestro intacto y compactación.

## 2026-10-29 — Revisión final y calidad web

- Conservadas las mejoras locales previas de 404, llms y contratos de calidad.
- Años sin JavaScript sustituidos por una referencia duradera a 1996; los tres años automáticos conservan aniversario argentino, pausa y actualización eficiente.
- Cabecera adaptable al ampliar texto, navegación equilibrada y desplazamiento normal en tableta/paisaje. Enlace de salto oculto por recorte hasta recibir foco.
- Respuestas completas y etiquetas legibles al imprimir; controles interactivos retirados del papel.
- Presentación de 1040 ms conservada; cancelación esperada diferenciada de errores y efectos omitidos con colores forzados/ahorro de datos.
- Valoración fechada y aviso condicional de Maps, sin cambios en datos, destino o cuentas externas.
- Pruebas ampliadas de texto, espaciado, foco, impresión, preferencias y aniversarios 2026/2027. Sin dependencias de producción nuevas. Publicación autorizada por el propietario después de la revisión local.

## 2026-10-27 — Recursos, seguridad y verificación de publicación

- Imágenes responsive y fuente WOFF2, conservando originales, alternativas y licencia.
- Nodos/calendario del reloj reutilizados y escrituras sólo cuando cambia el valor; aniversario argentino preservado.
- Valoración visible conservada; aggregateRating propio retirado del JSON-LD y entidad con ID estable.
- Preview local restringido por autoridad/origen/método y archivos; pruebas negativas añadidas.
- Medición reproducible de cuatro escenarios, control de aniversario y puerta de publicación que rechaza informes obsoletos/incompletos.
- Preparación de assets con versiones fijadas en un entorno privado del proyecto. Sin dependencias de producción, servicios o agentes nuevos.

## 2026-10-25 — Segunda etapa

Presentación única del logo/años hacia cabecera, cancelable y sin bloqueo, con alternativas por preferencias o demora; revelado suave por grupos. Profe Martita antes de Profe Titi en presentación general. Nueve grupos y 48 casos aprobados; auditoría sin vulnerabilidades. Contador, horarios, contactos, QR e identidad conservados. Gestión externa de Maps registrada fuera del sitio público.

- Consultas de WhatsApp e Instagram con ancho/altura y columna alineados; acciones principales de altura uniforme sin recortar texto ni limitar su crecimiento al ampliar.
- Contador automático como penúltima sección; gráfica original «Volvamos a las bases» en la última. Pulido de portada, espaciado, contador, preguntas frecuentes y cierre, conservando la marca y los datos.
- Anuncio, fecha visible, sección y consulta promocional de reapertura retirados por pedido posterior; fecha confirmada conservada en fuente/registro y `validFrom` de horarios.
- Antecedente del 24/10, superado por la autorización y entrega del 25/10: la segunda etapa seguía pendiente hasta la orden directa «comencemos la 2da etapa». En ese estado anterior no se había implementado la transición nueva del logo ni publicado o cargado imágenes en Maps.

# En preparación — primera jornada, 24/10/2026

- Horarios completos y docentes de cuatro actividades; especial de Martita confirmado de lunes a viernes, 8:00–9:00 y 20:00–21:00; pausa de musculación 11:00–13:30 y horas de spinning sin duración inventada.
- Teléfonos centralizados y consultas por franja/profesor, con mensaje específico e Instagram por actividad. Actividades antes del contador, listas semánticas y adaptación al ancho disponible.
- Nueva sede en Héroes de Malvinas 150 y apertura anunciada para el 03/11/2026. Pin de Maps actualizado, nombre San Martin s/n aún pendiente; llegada con Place ID para evitar que se identifique un comercio cercano.
- Datos estructurados con dos franjas y `validFrom` en la fecha de apertura. Contrato de datos documentado en módulo puro, esquema y arquitectura.
- Verificación local de código y navegador. Esta entrada no afirma publicación: animación inicial, refinamiento final, fotos/logo de Maps y publicación siguen en la segunda jornada.

# Fecha confirmada y contador automático — 15/10/2026

- Apertura confirmada: 4 de noviembre de 1996. Años cumplidos por calendario argentino; 29 hasta el 03/11/2026 y 30 desde el 04/11/2026.
- Totales en vivo de días, horas, minutos y segundos desde el inicio de esa fecha, con pausa manual y suspensión en pestaña oculta. No hay nuevas dependencias ni servicios.
- Módulo compartido de cálculo, importación con nombre derivado del contenido, respaldo fechado sin JavaScript y metadatos con fecha permanente.
- Pruebas del aniversario, años bisiestos, avance por segundo, pausa y recuperación al volver a ver la página; nueva autorización acotada del propietario.

# Historial de cambios

## 2.1.0 — 2026-10-15

- Edición aniversario de 30 años, con las cuatro equivalencias conmemorativas aportadas por el propietario y animación opcional de una sola pasada.
- Anuncio público de la próxima sede en Héroes de Malvinas 150, Santa Lucía. Ubicación actual y Maps separados; no se supone una apertura ni una ficha actualizada.
- Portada, jerarquía tipográfica, filas de actividades, historia, contacto, cierre y pie rediseñados; preguntas frecuentes accesibles sin JavaScript.
- Encuadre del logo completo, sin recortar el nombre. Tipografía deportiva de respaldo Anton alojada con su licencia en el sitio, sin consultas a servidores de fuentes.
- Animaciones nativas de entrada y respuesta al puntero, movimiento reducido y cancelación inmediata al cambiar la preferencia. Sin nuevas dependencias de producción.
- Pruebas ampliadas para escritorio grande, móvil horizontal, encuadre del logo, aniversario, mudanza, animación real, cambio de preferencia y ausencia de APIs opcionales.

## 2.0.0 — 2026-10-15

- Fuente única y portátil en main; site generado y reproducible.
- Datos del negocio centralizados, nombres descriptivos y documentación de contratos, mantenimiento y recuperación.
- Navegación móvil visible, legibilidad, contraste, nombres accesibles y adaptación a pantallas de 320 px.
- Compartir/copiar con alternativas cuando faltan APIs o permisos; contenido y contacto disponibles sin JavaScript.
- Imágenes con dimensiones explícitas y carga diferida; variantes WebP sin pérdida sólo donde reducen tamaño.
- CSP generada, SRI y nombres derivados del contenido; pruebas de inyección, datos y reproducibilidad.
- Valoración Google verificada: 4,8/5, ahora 18 opiniones. Las reseñas literales se consultan en la fuente.
- Afiches con horarios antiguos conservados intactos en la fuente y excluidos de la publicación; composición institucional con HTML/CSS en su lugar.
- Respaldo y publicación con controles, sin force-push y con verificación del build exacto.
- Implementación React/Vinext anterior conservada como histórico local.

## Publicación anterior — 2026-08-16

Commit site: abd16582ddca0424a0052a0cdc43c2c4b1d7062e. La dirección oficial, identidad, año, actividades y QR se conservan.
