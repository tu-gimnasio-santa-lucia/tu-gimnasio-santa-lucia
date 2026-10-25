# Tu Gimnasio — sitio oficial

**Segunda etapa — 25/10/2026:** implementada y verificada localmente, con presentación rápida del logo/años hacia cabecera y movimiento suave, cancelable y opcional. Nueve grupos y 48 casos aprobados. Se preservan consultas, contador penúltimo, cierre original y ausencia de anuncio de reapertura. Presentación: Profe Martita y Profe Titi. La publicación se cierra por el procedimiento de mantenimiento; las esperas inferiores del 24/10 son históricas.

Web informativa de Tu Gimnasio, Santa Lucía, Corrientes. Conserva la identidad original y “Desde 1996”.

**Correcciones posteriores, 24/10/2026:** consultas simétricas, diseño pulido, contador en la penúltima sección y gráfica «Volvamos a las bases» en la última. Se retiraron el anuncio, la fecha visible y la sección de reapertura. Esta versión sigue local; la segunda etapa sólo comienza con la orden directa «comencemos la 2da etapa». Leer [etapas](docs/ETAPAS-ACTUALIZACION.md).

La antigüedad automática desde el 4 de noviembre de 1996 se conserva: 29 años el 03/11/2026 y 30 desde el 04/11/2026. Maps ya apunta al pin nuevo, pero todavía muestra San Martin s/n; la web distingue la dirección confirmada y ese nombre pendiente. Leer [mudanza y aniversario](docs/MUDANZA-Y-ANIVERSARIO.md) antes de activar la sede o cambiar la llegada.

**Página pública:** https://tu-gimnasio-santa-lucia.github.io/tu-gimnasio-santa-lucia/

## Empezar sin depender de un modelo o plataforma

1. Leer [AGENTS.md](AGENTS.md) y [arquitectura](docs/ARQUITECTURA.md).
2. Usar Node.js 22 o posterior. No hace falta instalar paquetes para generar la web.
3. Crear un respaldo: `node scripts/backup.mjs`.
4. Editar datos en `data/business.json`: teléfonos en `teachers`, franjas en `activities[].schedules`. La atención general referencia una de esas franjas; no duplicar horarios. Estructura en `src/index.template.html`, estilos en `src/styles.css` y mejoras del navegador en `src/site.js`.
5. Ejecutar `node scripts/check.mjs` y `node scripts/preview.mjs`.
6. Consultar [mantenimiento y publicación](docs/MANTENIMIENTO.md) para las pruebas de navegador y publicación.

La rama **main** contiene toda la fuente. La rama **site** sólo contiene la publicación generada. **No editar dist ni site a mano**: se reconstruyen a partir de la fuente.

## Documentos

- [Arquitectura, contratos y nombres de funciones](docs/ARQUITECTURA.md).
- [Edición, pruebas y publicación](docs/MANTENIMIENTO.md).
- [Identidad visual](DESIGN.md).
- [Seguridad y sus límites](docs/SEGURIDAD.md).
- [Fuentes y verificaciones](docs/VERIFICACION.md).
- [Recuperación y traslado a otra PC](docs/RECUPERACION.md).
- [Historial de cambios](CHANGELOG.md).
- [Estado de la mudanza y cifras del aniversario](docs/MUDANZA-Y-ANIVERSARIO.md).

No hay claves, usuarios, base de datos, rastreadores, fuentes remotas ni dependencias de producción. Las herramientas de desarrollo no se incluyen en GitHub Pages. Los originales y sus derechos pertenecen al gimnasio; no reutilizarlos como identidad de otro negocio.
