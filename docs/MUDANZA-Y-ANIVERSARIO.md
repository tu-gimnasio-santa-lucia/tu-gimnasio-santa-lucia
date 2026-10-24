# Mudanza, apertura y antigüedad

Estado de la fuente al 24/10/2026: primera jornada implementada localmente, todavía sin publicar. Nueva sede anunciada para el **martes 3 de noviembre de 2026**, en **Héroes de Malvinas 150, Santa Lucía, Corrientes, Argentina**. El propietario autorizó anunciar dirección y fecha sin «en construcción». No hay hora de inauguración confirmada ni confirmación de apertura efectiva.

La apertura de esta sede y la fundación del gimnasio son hechos distintos: se fundó el **4 de noviembre de 1996**. El 03/11/2026 tiene 29 años; el 04/11/2026 cumple 30.

## Sede anunciada

| Campo | Significado vigente |
| --- | --- |
| `address` | Dirección autorizada de la sede anunciada; alimenta anuncio, contacto y JSON-LD. Ya no representa Av. Italia 109. |
| `relocation.status` | `scheduled`: apertura prevista; no implica funcionamiento efectivo. |
| `relocation.openingDate` | `2026-11-03`, fecha sin hora. |
| `contacts.maps` | Ficha persistente de Tu Gimnasio; comprobada nuevamente, ya apunta al pin nuevo. |
| `relocation.maps.locationUpdated` | `true`: el perfil cambió al punto nuevo. |
| `relocation.maps.streetNameUpdated` | `false`: la ficha aún dice `San Martin s/n`. |
| `relocation.maps.verifiedAt` | `2026-10-24`, fecha de consulta, no promesa de que Maps no cambiará. |
| `relocation.maps.coordinateSource` | `business-profile`: coordenadas de la ficha, no de una cámara o centro de mapa. |
| `relocation.maps.placeId` | `ChIJ97NG_pRjTpQRJB6lqKeqmWU`, identidad comprobada en las indicaciones. |

Los campos antiguos `relocation.futureAddress` y `relocation.mapsUpdated` fueron sustituidos. No mantener dos direcciones activas o un indicador ambiguo. Descripción, anuncio y horarios distinguen próxima apertura. Las dos franjas generales de JSON-LD llevan `validFrom: "2026-11-03"`. Fines de semana y feriados se consultan: el cierre antiguo no es una confirmación nueva.

El calendario no cambia automáticamente `scheduled` a abierto. Después de esa fecha, confirmar apertura efectiva y migrar coherentemente validación, esquema, textos y pruebas. No agregar una hora de inauguración a partir de musculación.

## Maps: punto correcto y nombre pendiente

Referencia del propietario: <https://maps.app.goo.gl/p6qmCQExy6iP9ZMV8>. Abre Street View, cámara en `-28.9769495, -59.0984732`, imágenes de septiembre de 2024. No es un enlace de indicaciones ni el pin del negocio.

Ficha comprobada: <https://maps.app.goo.gl/M5ivz5WYEiGhwfAX8>. Mostró Tu Gimnasio, teléfono `03777 72-3911`, web oficial, `San Martin s/n, W3440ABB Santa Lucía, Corrientes`, plus code `2WF2+5J` y pin `-28.9770634, -59.0984372`. Estos datos proceden de la ficha nueva, no del mapa anterior. El nombre autorizado de la calle proviene del propietario; no se auditó un registro legal.

**«Cómo llegar con Google Maps»** usa Maps URLs con `api=1`, **`destination=Tu Gimnasio, Santa Lucía, Corrientes, Argentina`** y **`destination_place_id`**. Se comprobó el enlace exacto: las indicaciones identificaron **Tu Gimnasio, San Martin s/n**. Google resolvía un comercio vecino al recibir coordenadas como destino, incluso en una prueba con el Place ID; esa variante se descartó. Conservar el nombre del negocio como fallback, sin sustituirlo por la cámara ni las coordenadas. No fijar el origen privado de la persona.

Mientras `streetNameUpdated` sea `false`, se explica la diferencia de nombres. Antes de publicar en la segunda jornada, comprobar otra vez ficha y destino. Si aparece el nombre correcto, actualizar `displayedStreet`, `streetNameUpdated` y `verifiedAt`, retirar el aviso obsoleto y ejecutar las pruebas pertinentes. La solicitud del propietario no demuestra aprobación de Google.

La URL pública y el QR se conservan. Logo y fotos del perfil pertenecen a la segunda jornada, con acceso al perfil correcto, originales conservados y registro de carga, revisión y visibilidad.

## Antigüedad automática: contrato conservado

`foundedDate` es `1996-11-04`. `calculateElapsed()` en `src/elapsed-time.js` se comparte entre generador y navegador. Calcula años cumplidos por calendario con `America/Argentina/Buenos_Aires`, incluyendo bisiestos; no divide días por 365.

Días, horas, minutos y segundos son **totales transcurridos**, no partes restantes. Origen convencional: `1996-11-04T00:00:00-03:00`. Medianoche es una convención, **no una hora real de apertura confirmada**. La exactitud depende del reloj del dispositivo.

`initializeLiveClock()` recalcula cada segundo sólo con la pestaña visible, sin acumular ticks. Permite pausar y recupera el tiempo real al reanudar o volver a la pestaña. No necesita servidor, tarea anual o API externa; no anuncia cada segundo al lector de pantalla.

`anniversary.snapshotDate` y sus valores son un respaldo fechado coherente para HTML sin JavaScript y un build reproducible. `noscript` identifica la fecha. Con JavaScript, años y totales se recalculan al visitar sin publicación anual. Los metadatos usan la fundación sin fijar una edad que envejezca.

No restaurar cifras conmemorativas antiguas ni animar totales desde cero. La nueva entrada visual y la ubicación definitiva del contador cerca del final corresponden a la segunda jornada, conservando cálculo, pausa y alternativa sin JavaScript.

## Logo, fuente y movimiento

Logo original completo; encuadre circular mediante CSS. Impact tiene prioridad donde existe; Anton es el respaldo deportivo local, alias `Tu Gimnasio Display`, con `font-display: swap`, origen fijado, licencia y SHA-256 en `assets/manifest.json`. No se instala una fuente del sistema ni se consulta un servidor de fuentes al visitar.

`initializeMotion()` realiza entradas una vez y respeta movimiento reducido también al cambiar la preferencia durante la visita. La información empieza visible y permanece sin JavaScript, IntersectionObserver o Web Animations. Las animaciones no reinician el reloj ni se confunden con sus cifras. No se guardan preferencias ni datos personales.
