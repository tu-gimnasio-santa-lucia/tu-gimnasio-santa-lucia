# Identidad y criterios visuales

## Dirección vigente: «Detalle» v4 — aprobada el 05/11/2026

El propietario aprobó la dirección «Detalle» (prototipo v3, `propuestas/rediseno-2026-11-v3/`) y las decisiones de su `DECISIONES.md`. Ese mismo día aprobó para integración local su perfeccionamiento v4 (`propuestas/rediseno-2026-11-v4/`, decisiones y verificación en su `DECISIONES.md`): sistema de movimiento, coreografía de la portada, portada móvil sobre un solo eje, etiquetas y microinteracciones. Reemplaza a la presentación de la segunda etapa (25/10/2026), que se conserva en el historial de Git y en los respaldos. Las reglas de marca, datos y orden comercial de abajo siguen vigentes.

Concepto: «la diferencia está en los detalles». Escenario azul profundo, tipografía monumental, capítulos de color que se superponen con bordes redondeados (azul, claro, amarillo) y la firma tricolor del logo como línea fina, nunca como decoración repetida. El objetivo principal sigue siendo consultar por WhatsApp; después, encontrar horarios y ubicación, y compartir la página.

## Tokens

- Paleta aprobada: azul oscuro `#08084f`; fondo profundo `#050537`; amarillo `#ffc31b`, verde `#009b3d`, rojo `#f13c2c`, azul `#0753a0`; texto `#101020`; superficies claras `#f7f8fb`; blanco.
- Derivado aprobado: celeste `#3d8bf0`, sólo para identificar spinning sobre azul profundo, donde `#0753a0` no contrasta.
- Títulos: Anton autohospedado mediante el alias CSS `Tu Gimnasio Display` (WOFF2 con TTF de respaldo, licencia OFL en assets), con Impact y Arial Narrow como respaldo. Anton va primero, antes que Impact, para que la portada se vea igual en todos los dispositivos (orden aprobado formalmente por el propietario el 05/11/2026).
- Texto: fuente del sistema (`system-ui`: SF Pro en Apple, Segoe UI Variable en Windows, Roboto en Android), con Arial de respaldo. Cero bytes descargados.
- No cargar fuentes ni recursos de terceros. Los colores de acento no implican texto blanco: comprobar contraste (en el amarillo se usa texto azul muy oscuro).
- Escala tipográfica, ritmo vertical y contenedor máximo de 1560 px definidos como variables en `src/styles.css`.
- Etiquetas: una sola voz, en mayúsculas pequeñas (0,8 rem, peso 750, tracking 0,14–0,16 em). Se usan para el nombre de la actividad junto al índice, «Profe», el encabezado de la agenda y los títulos del pie. Nunca se aplican a los lemas.
- Movimiento: tres curvas (`--ease-out` quint para entradas, `--ease-in-out` para desplazamientos entre estados visibles, `--ease-in` para salidas) y cinco duraciones (`--t-press` 0,12 s, `--t-micro` 0,22 s, `--t-ui` 0,42 s, `--t-reveal` 0,8 s, `--t-hero` 1 s), con `--stagger` 60 ms y `--rise` 18 px. Ninguna transición usa valores sueltos.

## Logo

Se usa el maestro aprobado `materiales/identidad/logo-tu-gimnasio-transparente-contorno-negro.png`, publicado byte a byte como `assets/tu-gimnasio-logo-maestro.png`, con derivados WebP sin pérdida (160 a 1080 px y tamaño completo) verificados píxel por píxel por `scripts/prepare-assets.py`. Nunca se recorta, deforma, enmarca en un círculo que lo corte ni regenera. El logo original con fondo azul se conserva como ícono y en la fuente.

## Composición y orden

Portada (título «Tu lugar. Tu gimnasio.» y logo), lema «Todos somos iguales, la diferencia está en los detalles.» con la historia, actividades con índice fijo, «¿Qué hay hoy?», profes, ubicación con opiniones, compartir con el QR, preguntas, contador penúltimo y «Volvamos a las bases» al cierre. Sin anuncio de reapertura.

En celular y tablet la portada sigue un solo eje izquierdo (logo, título, firma y textos); en escritorio y en horizontal, título a la izquierda y logo a la derecha. Junto al índice grande de actividades, la tarjeta nombra la actividad con una etiqueta y su descripción funciona como titular; en celular, el título de la tarjeta se mantiene. El «¿» inicial cuelga en el margen sólo desde 961 px.

Profe Martita antes de Profe Titi en la presentación general; las filas conservan su docente y orden de horarios. Consultas simétricas: todos los botones de consulta por horario y de Instagram comparten un mismo tamaño. Los tres lemas son literales: “Todos somos iguales, la diferencia está en los detalles.”, “Volvamos a las bases.” y “Tu lugar, tu gimnasio.”. No inventar precios, horarios ni fotografías. El QR conserva su matriz, margen y destino; no modificarlo por estética.

Fotos de la sede (aprobadas por el propietario el 06/11/2026): sólo fotos reales de Héroes de Malvinas 150. Las seis fotos usan el formato 4:3 y el radio de las tarjetas, con su pie como etiqueta translúcida sobre la imagen. En «Visitanos» la fachada es una postal sobre las opiniones: la vista de día, con la de noche como recuadro superpuesto en su esquina inferior. Cada actividad lleva una foto de su espacio: en computadora, junto al texto y con los horarios debajo; en celular, entre la descripción y los horarios. Las cuatro actividades llevan foto o ninguna, y el build lo exige. Gimnasia grupal y Pilates comparten el salón de clases grupales, con dos encuadres de la misma foto y el mismo pie. La portada sigue sin foto. No se usan fotos con personas sin consentimiento, ni video, ni imágenes generadas o retocadas más allá de recortar. Los pies y textos alternativos describen sólo lo visible y no anuncian aperturas. Los marcos usan el radio de las tarjetas, los pies la voz de etiqueta y el revelado es el de la imagen del cierre (`data-clip`).

## Movimiento

Sin bucles ni rebotes; sólo transformación y opacidad. El contenido nunca depende de una animación y, con movimiento reducido, colores forzados o ahorro de datos, todo queda estático.

- Presentación de la portada, un solo gesto de 1,4 s (la batería exige 1600 ms como máximo y ninguna pieza supera 1300 ms). Primero sube el título por líneas, después se asienta el logo y la firma tricolor se dibuja de un trazo; al final entran lugar, descripción y botones, escalonados. Espera la fuente y el logo hasta 0,9 s, contados desde el inicio de la navegación; si no llegan, se omite. Si el script no la inició 0,5 s después del primer pintado, una salvaguarda CSS muestra la portada y el script ya no la vuelve a ocultar: la portada nunca queda vacía más de medio segundo. Termina al tocar, hacer clic, usar el teclado, desplazar, cambiar el tamaño, ocultar la pestaña o cambiar la preferencia. Estados en la raíz: `data-hero-intro` = `skipped`, `running`, `complete`.
- Al desplazarse: el logo de la portada toma profundidad y pasa a la cabecera, con una sola marca visible a la vez (con movimiento reducido cambia sin fundido); el lema se enciende palabra por palabra (mínimo 50 % de opacidad para conservar contraste); los aros del aniversario se completan.
- Revelados únicos: el título sube por líneas enmascaradas, el texto que lo acompaña entra 140 ms después y los grupos usan un solo escalonado. La opacidad se completa antes que el movimiento. Lo que ya está en pantalla nunca se oculta primero.
- Salir es más rápido que entrar: hover, diálogos y botón flotante se retiran con `--t-micro` y la curva de salida. Al presionar, la respuesta usa `--t-press`.
- Microinteracciones:
  - Relleno de botones y desplazamiento magnético leve, sólo con mouse.
  - Indicador amarillo de sección que se desliza en la cabecera y se oculta sobre las secciones sin enlace.
  - Menú circular, con escalonado sólo al abrir.
  - Hoja de consulta que en celular se cierra arrastrándola desde la manija.
  - Botón flotante que sólo aparece donde no hay otro botón de consulta en pantalla.
  - Indicador de día deslizante y línea «Ahora» que no cruza la escala.
  - Pestañas de actividades con bordes difuminados.
  - Preguntas con apertura medida.
  - Confirmación de copia en el mismo botón.

## Revisión

Inspeccionar 320, 390, 768, 844 horizontal, 1024, 1280 y 1920 px; probar texto al 200 %, teclado, ausencia de JavaScript, tipografía de respaldo, impresión y colores forzados. Las recomendaciones de skills o guías externas son asesoramiento; no justifican alterar la marca, inventar contenido o agregar movimiento a costa de la compatibilidad.
