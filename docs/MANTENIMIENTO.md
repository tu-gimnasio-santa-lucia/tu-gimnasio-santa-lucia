# Edición, pruebas y publicación

## Qué editar

| Quiero cambiar                                                    | Archivo                                                            |
| ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| Horario, teléfono, actividades, dirección o valoración comprobada | `data/business.json`                                               |
| Textos editoriales y disposición                                  | `src/index.template.html`                                          |
| Colores, tipografía, márgenes o diseño adaptable                  | `src/styles.css`                                                   |
| Compartir/copiar y alternativas del navegador                     | `src/site.js`                                                      |
| Imágenes                                                          | `assets/` y su `manifest.json`; conservar originales y dimensiones |
| Reglas para personas y asistentes                                 | `AGENTS.md` y documentación pertinente                             |

Crear y comprobar un respaldo nuevo antes de editar. Los cambios del negocio se confirman con el gimnasio. Cuando se actualice Google, registrar fecha y fuente; no copiar una valoración vieja sólo porque está en un chat.

## Comandos

Para la próxima sede y las cifras conmemorativas, leer [mudanza y aniversario](MUDANZA-Y-ANIVERSARIO.md). No reemplazar la ubicación actual con el anuncio: Maps y datos estructurados deben seguir describiendo la sede vigente hasta confirmar el cambio real.

Con Node.js 22 o posterior, desde la raíz del repositorio:

```text
node scripts/backup.mjs
node scripts/check.mjs
node scripts/preview.mjs
```

La vista local usa `http://127.0.0.1:4173`. Recargar la portada regenera los archivos después de editar. Un editor de texto cualquiera sirve: no es necesario Codex, Claude, React ni un plugin.

Si cambia el código del generador o del servidor, reiniciar la vista local. Si se retira un recurso público del manifiesto, usar una salida vacía y conservar la salida anterior como respaldo; el generador rechaza archivos ajenos en vez de borrarlos automáticamente.

Para las pruebas completas instalar las herramientas de desarrollo fijadas en el archivo de bloqueo:

```text
pnpm install --frozen-lockfile --ignore-scripts
pnpm exec playwright install chromium firefox webkit
node scripts/browser-check.mjs
pnpm audit
```

La batería completa de 24 casos requiere Microsoft Edge instalado, además de los tres motores descargados por Playwright. Si falta un motor, el informe falla y debe resolverse o documentarse explícitamente antes de publicar; no se omiten pruebas silenciosamente. La batería usa perfiles temporales; no conectarla a sesiones personales. Consultar `docs/VERIFICACION.md` para los motores efectivamente comprobados y cualquier diferencia del equipo. Emular un celular no sustituye todas las pruebas en dispositivos físicos.

La variable opcional `TU_GIMNASIO_FIREFOX_PATH` permite seleccionar una compilación oficial de Firefox preparada para el equipo. En esta PC se probó Firefox 155 de Playwright, porque la compilación 157 descargada presentaba un fallo de inicio SideBySide/mozglue de Windows. La ruta queda en configuración local, no se fija dentro del código compartido. No se deshabilitaron medidas de seguridad ni se modificó el perfil personal.

Los resultados quedan en `artifacts/`. Deben revisarse las capturas y los errores; una ejecución que no realizó las comprobaciones no se considera aprobada. No se deben editar informes a mano para habilitar una publicación.

## Publicación

1. Verificar diferencias, archivos privados, textos, navegación, móvil, escritorio, QR y accesibilidad.
2. Guardar los cambios revisados en un commit de main y subir esa fuente a origin.
3. Ejecutar `node scripts/publish.mjs`.
4. Esperar a GitHub Pages y comprobar la URL pública, HTML, recursos y QR reales.
5. Crear un respaldo final y actualizar el registro de versión.

El script de publicación hace otro respaldo verificado, repite las pruebas de código y exige que el informe de navegador corresponda exactamente al build. Si otra persona publicó primero, el push normal falla y debe revisarse la diferencia. Nunca usar force-push para evitar esa comprobación.

La rama main conserva el código y la documentación; site es una salida generada y GitHub Pages continúa publicando esa rama. La URL principal no cambia.

## Compatibilidad

El sitio usa HTML semántico y CSS estándar, con mejoras opcionales. Funciona para leer datos, abrir contacto, navegar y usar el QR sin JavaScript. El portapapeles tiene alternativa manual; compartir tiene alternativa de copia. WebP tiene PNG de respaldo; el contenido respeta movimiento reducido e impresión.

No se promete compatibilidad absoluta con cualquier navegador, extensión, modelo de lenguaje o dispositivo. Cada entrega enumera las pruebas realizadas. Para asistir con otro modelo, compartir este repositorio y comenzar por README.md, AGENTS.md y docs/ARQUITECTURA.md.
