# Tu Gimnasio: reglas de mantenimiento

Este repositorio contiene la fuente oficial. Empezar por README.md y docs/ARQUITECTURA.md; consultar sólo la documentación pertinente al pedido. Estas reglas sirven para personas y cualquier asistente, sin depender de una aplicación o modelo.

1. Antes de modificar o publicar, crear un respaldo fechado y verificarlo. `node scripts/backup.mjs` conserva fuentes, archivos generados e historial. No borrar respaldos anteriores.
2. Mantener nombre, apertura en 1996, logo, azul oscuro y los tres lemas de data/business.json. Funcional ya no se ofrece y no debe aparecer en la página pública. La dirección principal sigue en project.json.
3. Cambiar datos reales sólo con evidencia del gimnasio o una fuente comprobada. Registrar fuente y fecha en docs/VERIFICACION.md. No inventar horarios, precios, reseñas ni actividades.
4. Datos: data/business.json. Estructura/textos: src/index.template.html. Estilos: src/styles.css. Funciones del navegador: src/site.js. Nunca editar dist/ o site a mano.
5. HTML, CSS y JavaScript estándar; ninguna dependencia de producción. No agregar backend, rastreadores, fuentes remotas, servicios, autenticación o frameworks sin necesidad del pedido.
6. Antes de publicar: `node scripts/check.mjs`, auditoría de dependencias y `node scripts/browser-check.mjs`. Corregir errores y registrar límites; una captura o compilación por sí sola no verifica la web.
7. Probar móvil, escritorio, 320 px, texto ampliado, teclado, movimiento reducido, ausencia de JavaScript, enlaces, QR, portapapeles y sus alternativas. No ocultar fallos de pruebas ni modificar la página para aparentar un resultado.
8. No publicar archivos privados, claves, perfiles del navegador, respaldos, artefactos de pruebas ni node_modules. Los valores HTML se escapan y el hash CSP se genera automáticamente.
9. Publicación: main conserva la fuente; site contiene exclusivamente la salida generada. `node scripts/publish.mjs` exige fuente confirmada en origin, respaldo y QA del build exacto. Nunca force-push ni borrar ramas.
10. Informar cambios, verificaciones, límites, commits, respaldo y dirección pública. Actualizar documentos y contratos cuando cambie una responsabilidad o función. Conservar los nombres estables salvo que una migración documentada lo justifique.

Las habilidades de diseño son asesoramiento subordinado al pedido y a la identidad existente. No autorizan cambios de datos, dependencias o publicaciones por sí solas.

## Aniversario y próxima sede

- Primera jornada autorizada el 24/10/2026: actividades, horarios, docentes, consultas y ubicación, con respaldo y pruebas. La publicación y la nueva presentación animada quedan para la segunda jornada; esperar el pedido posterior del propietario. Leer docs/ETAPAS-ACTUALIZACION.md.
- Apertura anunciada de la nueva sede: 03/11/2026, sin hora de inauguración confirmada. `relocation.status` es `scheduled`; no afirmar que ya está abierta ni activarla automáticamente por el reloj.
- `address` es Héroes de Malvinas 150, dirección de la sede anunciada. La ficha de Maps ya se movió al pin nuevo pero muestra San Martin s/n; distinguir `locationUpdated` y `streetNameUpdated`. El botón de llegada conserva el Place ID comprobado, no sólo coordenadas ni la cámara de Street View. Leer docs/MUDANZA-Y-ANIVERSARIO.md y volver a comprobar Maps antes de publicar.
- Horarios y contactos se definen en `activities[].schedules` y `teachers`, con referencias por ID. El especial de Martita es de lunes a viernes 8:00–9:00 y 20:00–21:00. No inventar duración de spinning ni alterar horarios por su coincidencia con otras actividades. No publicar precios ni recuperar el horario general continuo anterior.
- Fecha de apertura confirmada: 04/11/1996. Las cifras son automáticas y los años se calculan por aniversario de calendario, hora argentina. El snapshot sin JavaScript tiene fecha explícita. No restaurar las cifras conmemorativas anteriores ni inventar la hora real de apertura.
- Las animaciones son opcionales, breves y sin ciclos infinitos. Respetar movimiento reducido y mantener contenido visible sin JavaScript. Conservar el logo original; ningún marco debe recortar el nombre.
