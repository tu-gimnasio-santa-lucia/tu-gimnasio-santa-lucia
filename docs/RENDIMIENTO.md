# Recursos, medición y preparación de assets

Revisión: 27/10/2026. La arquitectura sigue siendo HTML/CSS/JS estático, sin dependencias de producción ni servicios nuevos. Los datos, logo y originales se conservan; una puntuación no justifica alterar la marca o retirar contenido.

## Cambios comprobados

| Medición local reproducible | Antes | Después |
| --- | ---: | ---: |
| Dos imágenes de historia/cierre, 390 px y DPR 1 | 1.347.430 bytes | 275.602 bytes |
| Las mismas, 390 px y DPR 2 | 1.347.430 bytes | 626.234 bytes |
| Fuente solicitada al cargar Anton expresamente | 170.812 bytes TTF | 57.412 bytes WOFF2 |
| Escrituras de años sin cambio en cinco ticks | 15 | 0 |
| Consultas de selectores del reloj en cinco ticks | 30 | 0 |

Son bytes de los archivos seleccionados por el navegador, no tiempo de descarga, puntuación de Lighthouse, tráfico real ni créditos ahorrados. La medición usa Chromium aislado y cuatro combinaciones de viewport/DPR, incluyendo escritorio. En pantallas grandes de alta densidad se conserva la resolución original. El paquete publicado contiene más archivos alternativos; el navegador elige una versión de cada imagen, sin descargarlas todas.

La fuente WOFF2 conserva el mapa Unicode completo, orden de glifos y métricas. TTF sigue como alternativa. Las imágenes pequeñas se redimensionan con Lanczos y después se codifican WebP sin pérdida respecto de esos píxeles redimensionados; no significa que una imagen pequeña tenga los mismos píxeles que el original grande. Se conservan originales y alternativas PNG.

## Contrato del manifiesto

- `fonts.display.file/sha256`: TTF original; licencia y sus bytes siguen intactos.
- `fonts.display.woff2`: `{file, sha256}`, derivado comprimido. CSS pide WOFF2 y conserva TTF de respaldo.
- `identity.responsive`, `manifesto.responsive`: candidatos ordenados `{file, width, height, sha256}`. Anchos menores al original, proporción conservada, rutas WebP seguras y archivos sin duplicar.
- El generador valida rutas, dimensiones declaradas y hashes de derivados antes de publicar. `srcset` y `sizes` permiten al navegador seleccionar resolución. El logo y su animación conservan el recurso original.
- `sizes` es una estimación conservadora para estos dos espacios. Si cambia su disposición CSS, contrastar de nuevo los archivos seleccionados a varios anchos/DPR, además de la revisión visual.

## Medir y prevenir regresiones

Con las dependencias de desarrollo ya instaladas:

```text
node scripts/check.mjs
node scripts/performance-check.mjs
node scripts/browser-check.mjs
```

`performance-check.mjs` inicia su propio servidor en un puerto libre de loopback y un perfil Chromium temporal, que cierra al terminar. Comprueba selección WOFF2, avance del reloj, ausencia de escrituras/consultas repetidas, presupuestos móviles de imágenes y cambio de 29 a 30 en los tres años visibles al cruzar el 04/11/2026 argentino. Guarda `artifacts/performance-after.json` con huella del build. Los límites son 350 KB para estas dos imágenes en 390 px/DPR 1 y 800 KB en DPR 2.

`--baseline` mide el checkout donde se ejecuta, sin exigir los presupuestos nuevos; no restaura una versión anterior. Para comparar antes/después usar una copia anterior recuperada, la misma instrumentación y las mismas condiciones. No editar los resultados para aprobar.

## Regeneración opcional de derivados

La generación normal sólo necesita Node: los derivados están versionados. Para cambiar las imágenes originales o regenerar variantes hace falta Python 3.10 o posterior y las versiones fijadas en `scripts/requirements-assets.txt` (Pillow 13.0.0, FontTools 4.67.0 y Brotli 1.2.1). Usar un entorno privado del proyecto fuera de `web/`; no actualizar runtimes compartidos.

Ejemplo portable, con un Python ya disponible y activando el entorno privado según el sistema:

```text
python -m venv ../herramientas/.venv-assets
python -m pip install -r scripts/requirements-assets.txt
python scripts/prepare-assets.py
python scripts/prepare-assets.py --check
```

La instalación debe ejecutarse con el Python de ese entorno activado. `--check` regenera en una carpeta temporal y compara bytes, sin escribir en `assets/`. Conservar hashes, versiones del codificador y licencias; crear un respaldo antes de regenerar. Los scripts fallan ante otra versión para no presentar una salida diferente como idéntica. Las rutas específicas de esta PC quedan en el registro local, fuera de la fuente pública.

## Decisiones y límites

- Se conserva la web estática: un framework, backend, analítica o agentes adicionales no aportaban un beneficio demostrado a este alcance.
- Se corrige el marcado de reseñas propias: la valoración visible y el enlace a Google permanecen, pero no se emite `aggregateRating` del propio negocio. [Guía de Google](https://developers.google.com/search/docs/appearance/structured-data/local-business).
- El servidor local restringe hosts/orígenes, métodos y archivos, y sirve WOFF2 con su MIME. Esto no cambia las cabeceras que controla GitHub Pages; ver [seguridad](SEGURIDAD.md).
- Las pruebas de laboratorio no certifican todos los dispositivos ni resultados de SEO. No se prometen posiciones en buscadores ni un LCP de usuarios reales que no se haya medido. [LCP y diferencias entre laboratorio y campo](https://web.dev/articles/optimize-lcp).

Referencias: [imágenes responsive y rendimiento](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Performance/Multimedia), [fuentes](https://web.dev/articles/font-best-practices), [WOFF2](https://fonttools.readthedocs.io/en/latest/ttLib/woff2.html) y [correcciones de Pillow 13](https://pillow.readthedocs.io/en/stable/releasenotes/13.0.0.html).
