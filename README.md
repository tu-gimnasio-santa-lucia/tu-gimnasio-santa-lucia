# Tu Gimnasio — sitio oficial

Web informativa de Tu Gimnasio, Santa Lucía, Corrientes. Conserva la identidad original y “Desde 1996”.

Edición aniversario: 30 años en 2026 y anuncio de la próxima sede, todavía en construcción. La nueva dirección no reemplaza la ubicación actual ni el enlace de Maps hasta confirmar la mudanza. Leer [mudanza y aniversario](docs/MUDANZA-Y-ANIVERSARIO.md) antes de actualizar esos datos.

**Página pública:** https://tu-gimnasio-santa-lucia.github.io/tu-gimnasio-santa-lucia/

## Empezar sin depender de un modelo o plataforma

1. Leer [AGENTS.md](AGENTS.md) y [arquitectura](docs/ARQUITECTURA.md).
2. Usar Node.js 22 o posterior. No hace falta instalar paquetes para generar la web.
3. Crear un respaldo: `node scripts/backup.mjs`.
4. Editar datos en `data/business.json`, estructura en `src/index.template.html`, estilos en `src/styles.css` o funciones en `src/site.js`.
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
