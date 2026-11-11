# Claude Code en este repositorio (versionado, también para sesiones en la nube)

@../AGENTS.md

Las reglas de `AGENTS.md` mandan. Este archivo sólo agrega cómo trabajar con Claude Code; no contiene configuración de ninguna PC. Español de Argentina con voseo: primero el resultado, después lo necesario.

## Al empezar

- `git status --short` y `git log -1 --oneline`. Los cambios sin commit son trabajo vigente: no uses `reset`, `restore`, `clean`, `stash` ni rebase sobre ellos.
- Leé `README.md`, `docs/ARQUITECTURA.md` y sólo la documentación de la zona que vas a tocar. Marca, paleta, lemas y movimiento: `DESIGN.md`.
- En una sesión en la nube no existen los respaldos, materiales ni notas locales de la PC del propietario: no los inventes ni los busques; trabajá con lo versionado y dejá los pendientes escritos.

## Preservación y separación

- No borres ni renombres clases CSS, IDs ni atributos (`data-*`, `aria-*`, anclas) existentes. Si un cambio aprobado lo exige, actualizá en el mismo cambio todos sus usos en plantillas, CSS, JS y pruebas.
- Estructura en `src/*.template.html`, presentación en `src/styles.css`, comportamiento en `src/*.js`. Sin atributos `style` ni scripts en línea nuevos (CSP) y sin dependencias de producción.
- Datos sólo desde `data/business.json`. No edites `dist/`, `artifacts/` ni la rama `site`.

## Verificación

- Cambios en datos, HTML, CSS o JS: `node scripts/check.mjs` y revisión visual de lo afectado con `node scripts/preview.mjs` (127.0.0.1:4173) y la batería Playwright del repo (`docs/MANTENIMIENTO.md`).
- Documentación: revisá rutas y coherencia con los documentos relacionados.
- No declares terminado nada que no ejecutaste; informá resultado, comprobaciones, límites y pendientes.

## Skills de este repositorio (`.claude/skills/`)

Asesoran; la marca, los datos aprobados y las puertas prevalecen.

| Skill | Cuándo |
|---|---|
| `ponytail` | Cualquier cambio de código: el más chico que resuelve todo. Nunca recorta respaldos, pruebas ni verificación. |
| `frontend-design` | Interfaces y propuestas de diseño, dentro de `DESIGN.md`. |
| `review-animations` | Revisar un cambio de movimiento contra los tokens de `DESIGN.md`. |
| `improve-animations` | Auditar el movimiento del sitio y escribir planes (no edita código). |
| `security-review` | Revisar código o un diff por vulnerabilidades. |
| `security-and-hardening` | Construir algo que toque datos externos, formularios o dependencias. |

## Git

Commits sólo a pedido del propietario. Push y publicación sólo con autorización explícita que nombre repositorio, rama y versión. Nunca force-push ni edición manual de `site`; publicación sólo por `node scripts/publish.mjs`.

## Créditos

Skills copiadas sin cambios, cada una con su licencia: Ponytail (MIT, DietrichGebert/ponytail), review-animations e improve-animations (MIT, emilkowalski/skills), security-and-hardening y `references/security-checklist.md` (MIT, addyosmani/agent-skills), security-review (Apache-2.0, getsentry/skills) y frontend-design (Apache-2.0, anthropics/skills).
