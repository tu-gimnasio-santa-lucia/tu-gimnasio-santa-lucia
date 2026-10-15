# Actualización vigente — contador automático

El propietario confirmó el 4 de noviembre de 1996. foundedDate es 1996-11-04. Los años cumplidos cambian al aniversario en Argentina: el 15/10/2026 son 29; el 04/11/2026 pasan a 30. Días, horas, minutos y segundos son totales desde el inicio de esa fecha (00:00 UTC-3, convención de cálculo, no hora real de apertura confirmada).

src/elapsed-time.js define calculateElapsed(), compartida por build y navegador. Se publica como módulo con nombre derivado del contenido. initializeLiveClock() calcula desde el reloj del dispositivo, actualiza cada segundo sólo si la pestaña está visible, permite pausar y recupera el tiempo real al reanudar; no acumula ticks ni usa servicios externos. El contador no es una animación de entrada y no se reinicia por movimiento reducido. No se anuncia cada segundo al lector de pantalla.

anniversary conserva un snapshotDate fijo para el respaldo sin JavaScript y un build reproducible; se identifica su fecha en un aviso noscript. Con JavaScript, todos los años y cifras visibles se recalculan al visitar, sin publicación anual. Los metadatos usan la fecha de fundación, evitando una edad estática que envejezca. El reloj depende de que el dispositivo tenga fecha/hora correctas.

Lo siguiente conserva decisiones anteriores; las cifras conmemorativas y la afirmación de fecha desconocida quedan superadas por esta confirmación.

---

# Mudanza y aniversario: datos y estados

El propietario autorizó el 15/10/2026 publicar ahora el rediseño anunciando la próxima sede. El gimnasio nuevo sigue en construcción. No hay fecha de apertura confirmada ni ubicación de Google Maps actualizada.

## Dos direcciones con funciones diferentes

| Dato | Estado y uso |
| --- | --- |
| `address` | Sede actual: Av. Italia 109. Alimenta contacto, código de ubicación y JSON-LD. |
| `contacts.maps` | Ficha de la sede actual, conservada. Los enlaces indican expresamente sede actual. |
| `relocation.futureAddress` | Próxima sede: Héroes de Malvinas 150, Santa Lucía, Corrientes, Argentina. Sólo se presenta como anuncio. |
| `relocation.status` | `announced`: evita tratar el anuncio como una mudanza ya realizada. |
| `relocation.openingDate` | `null`: no se inventa una fecha ni una cuenta regresiva. |
| `relocation.mapsUpdated` | `false`: ningún botón de la nueva dirección apunta al mapa viejo. |

La validación rechaza un cambio aislado de esos indicadores que deje el anuncio incoherente. La futura apertura es un cambio editorial y de datos completo, no sólo un reemplazo de enlace.

## Cuando el propietario confirme la apertura y envíe Maps

1. Crear y verificar otro respaldo antes de editar.
2. Abrir y comprobar el enlace nuevo: dirección, nombre, teléfono, ubicación y vigencia. No inferir código postal, plus code o coordenadas a partir de la sede anterior.
3. Confirmar fecha de apertura, horarios y actividades vigentes; la construcción no demuestra que el gimnasio ya haya abierto.
4. Migrar los datos a la ubicación actual nueva en `address` y `contacts.maps`. Actualizar de forma explícita el contrato de `relocation`, su esquema y la validación para admitir el estado confirmado.
5. Revisar portada, anuncio, contacto y preguntas frecuentes. Retirar frases sobre construcción o Maps pendiente que hayan dejado de ser ciertas. Eliminar o identificar como histórica la dirección anterior.
6. El JSON-LD se genera desde `address`; comprobar que ya no describa la sede anterior. Actualizar la prueba que actualmente exige mantener separados anuncio y sede actual, con una expectativa veraz para el nuevo estado.
7. Verificar enlaces, móvil, escritorio, animaciones, QR y dirección pública; publicar por el procedimiento normal, comprobar la página real y crear respaldo final.

No reemplazar la dirección pública del sitio ni el QR: ambos siguen sirviendo después de la mudanza.

## Cifras del aniversario

El propietario aportó estas cifras exactas: 30 años, 10.957 días, 262.968 horas, 15.778.080 minutos y 946.684.800 segundos. Se guardan en `anniversary`, con año de referencia 2026 y `commemorative: true`.

Las equivalencias días→horas→minutos→segundos se validan. No se conoce una fecha completa de fundación: no se deriva una de estas cifras, no se recalcula con el reloj del equipo ni se presenta una precisión temporal falsa. La animación de 1,2 segundos termina en el valor fijo aportado. El texto accesible conserva ese valor sin anunciar cada fotograma.

## Tipografía y movimiento

Impact conserva prioridad en equipos que la tienen. Anton es el respaldo deportivo local, alias CSS `Tu Gimnasio Display`, servido con font-display swap y sin solicitudes a Google. Fuente y licencia provienen del [repositorio oficial de Google Fonts](https://github.com/google/fonts/tree/cee74d7ca45d66d5c1878c828645c862f2788d2d/ofl/anton); versión y SHA-256 quedan fijados en assets/manifest.json. No se instala ninguna fuente en el sistema del usuario.

`initializeSharing()` y `initializeMotion()` son independientes. Sin JavaScript, IntersectionObserver o Web Animations, se leen las cifras completas y funcionan navegación, contacto, preguntas frecuentes y QR. La preferencia de movimiento reducido evita las animaciones; al activarla durante una animación, se cancelan los efectos y se restauran todos los valores finales. No se guardan preferencias ni datos personales.
