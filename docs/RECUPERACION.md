# Recuperación y traslado a otra PC

Un respaldo creado por `node scripts/backup.mjs` es una carpeta nueva fuera del repositorio. Contiene `files/`, `repository.bundle` y `manifest.json`. El bundle conserva el historial Git; files también conserva el estado de trabajo y dist cuando exista.

1. Verificar las huellas SHA-256 del manifiesto y ejecutar `git bundle verify repository.bundle`.
2. Conservar la versión que se vaya a reemplazar en otro respaldo. Nunca extraer encima del único ejemplar disponible.
3. Para recuperar el historial: `git clone repository.bundle carpeta-recuperada`.
4. Copiar el contenido de files a la carpeta recuperada, sin alterar el único respaldo.
5. Revisar origin: un clon de un bundle apunta al archivo local. Sólo después de revisar, configurar el repositorio oficial de project.json.
6. Ejecutar `node scripts/check.mjs`, las comprobaciones de navegador y la vista local.
7. Publicar sólo la versión revisada por el procedimiento normal. No forzar la rama para resolver conflictos.

El respaldo omite node_modules, perfiles, artifacts y metadatos internos de Git —el bundle conserva su historial—. Las dependencias de desarrollo se recuperan con pnpm y su archivo de bloqueo; el build de producción sólo necesita Node.

Para elegir otro disco de respaldo, definir `TU_GIMNASIO_BACKUP_DIR` con una carpeta fuera del repositorio. Esa ruta es configuración local y no se debe fijar en el código compartido. Las credenciales de GitHub se configuran en el equipo por medios normales y nunca se copian dentro del repositorio.

El QR mantiene su destino porque la dirección oficial no cambió. No reemplazarlo por un QR de una publicación histórica personal. La restauración de una versión antigua debe conservar las correcciones de datos que sigan vigentes.
