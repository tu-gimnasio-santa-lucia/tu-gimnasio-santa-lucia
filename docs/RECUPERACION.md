# Recuperación y traslado a otra PC

Un respaldo creado por `node scripts/backup.mjs` es una carpeta nueva fuera del repositorio. Contiene `files/`, `repository.bundle` y `manifest.json`. El bundle conserva el historial Git; files también conserva el estado de trabajo y dist cuando exista.

1. Verificar las huellas SHA-256 del manifiesto y ejecutar `git bundle verify <ruta>/repository.bundle`. Git exige ejecutar esta verificación dentro de un repositorio, por ejemplo `web/` o un clon existente; fuera de uno responde «need a repository to verify a bundle». `git bundle list-heads <ruta>/repository.bundle` muestra las referencias guardadas.
2. Conservar la versión que se vaya a reemplazar en otro respaldo. Nunca extraer encima del único ejemplar disponible.
3. Para recuperar el historial: `git clone <ruta>/repository.bundle carpeta-recuperada`. El clon trae `main` y su `origin/main`, pero **no** la rama de publicación: el bundle la guarda como referencia remota `refs/remotes/origin/site`, y `git clone` sólo copia las ramas `refs/heads`. Para recuperarla, desde la carpeta recuperada:

   ```text
   git fetch <ruta>/repository.bundle refs/remotes/origin/site:refs/remotes/respaldo/site
   git log -1 --oneline respaldo/site
   ```

   El commit debe coincidir con el `origin/site` que muestra `list-heads`. Se usa el nombre `respaldo/site` para no confundirlo con el `origin/site` del repositorio oficial. Después de configurar origin (paso 5), `git fetch origin` trae el `origin/site` publicado; compararlo con `respaldo/site` antes de cualquier publicación. Nunca reconstruir `site` a mano ni forzarla con el contenido del respaldo.
4. Copiar el contenido de files a la carpeta recuperada, sin alterar el único respaldo.
5. Revisar origin: un clon de un bundle apunta al archivo local. Sólo después de revisar, configurar el repositorio oficial de project.json.
6. Ejecutar `node scripts/check.mjs`, las comprobaciones de navegador y la vista local.
7. Publicar sólo la versión revisada por el procedimiento normal. No forzar la rama para resolver conflictos.

El respaldo omite node_modules, perfiles, artifacts y metadatos internos de Git —el bundle conserva su historial—. Las dependencias de desarrollo se recuperan con pnpm y su archivo de bloqueo; el build de producción sólo necesita Node.

Para elegir otro disco de respaldo, definir `TU_GIMNASIO_BACKUP_DIR` con una carpeta fuera del repositorio. Esa ruta es configuración local y no se debe fijar en el código compartido. Las credenciales de GitHub se configuran en el equipo por medios normales y nunca se copian dentro del repositorio.

## Cuándo respaldar y cuándo ensayar

Crear un respaldo es barato y `backup.mjs` ya verifica sus huellas y el bundle; la proporcionalidad se aplica al ensayo de recuperación, no al respaldo.

| Situación | Respaldo | Ensayo |
| --- | --- | --- |
| Lectura o diagnóstico | No hace falta | — |
| Documentación o instrucciones | Nuevo; el manifiesto debe incluir la versión actual de lo que se edita | No obligatorio |
| Datos, `src/`, `assets/`, scripts o pruebas | Nuevo antes de cada tanda de cambios | Una vez por sesión, antes del primer cambio |
| Commit local | Inmediatamente antes | No |
| Rebase, merge, reset o cambio de rama con trabajo pendiente | Inmediatamente antes | Sí, comparando también el diff local |
| Cambios en `backup.mjs` o en esta guía | Con la versión anterior | Sí, con la versión nueva |
| Publicación | Recuperado antes y final después | Sí |

Ensayo: pasos 1, 3 y 4 en una carpeta nueva fuera del repositorio; las huellas deben coincidir con el manifiesto, con el mismo `HEAD`, el mismo `git status` y el mismo diff local que el original, y `node scripts/check.mjs` aprobado en la copia. El navegador sólo hace falta si el ensayo precede a una publicación. La carpeta de ensayo puede eliminarse después de registrar el resultado; el respaldo, nunca. Los checkpoints de un editor o asistente complementan, pero no reemplazan, este respaldo.

## Destino del QR y versiones antiguas

El QR mantiene su destino porque la dirección oficial no cambió. No reemplazarlo por un QR de una publicación histórica personal. La restauración de una versión antigua debe conservar las correcciones de datos que sigan vigentes.
