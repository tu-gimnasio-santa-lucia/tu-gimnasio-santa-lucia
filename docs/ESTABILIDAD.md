# Estabilidad y mantenimiento breve

Vigente para «Detalle» v4 (05/11/2026, integrado en local y pendiente de publicación). Actualiza la revisión del 29/10/2026, que sigue publicada hasta que se autorice la nueva versión. El sitio conserva HTML/CSS/JavaScript estándar, cero dependencias de producción, datos canónicos y marca original. Las cuentas de Maps e Instagram no forman parte de esta entrega.

## Antigüedad que no depende de una publicación anual

La cabecera, el sello de trayectoria y el pie entregan «Desde 1996» o «Con vos desde 1996» como alternativa estática. Los números de años quedan ocultos hasta que `initializeLiveClock()` calcula una fecha válida por calendario argentino y revela los tres a la vez. Si falta JavaScript o no se carga el módulo, la información sigue siendo verdadera después del aniversario.

Los totales detallados sin JavaScript conservan una fecha visible, generada desde `anniversary.snapshotDate`. Con JavaScript el reloj actualiza años y unidades desde `foundedDate`, sin animarlos desde cero. El 03/11/2026 son 29 años; el 04/11/2026 son 30; el 04/11/2027 son 31. La pausa y la pestaña oculta detienen las actualizaciones hasta retomar. No cambiar la fecha del equipo para probarlo: usar el reloj del navegador de pruebas.

Una fecha prevista de mudanza no acredita apertura efectiva. El sitio no activa ni anuncia una sede por el reloj. El texto de Maps distingue la dirección confirmada del nombre mostrado en la última comprobación documentada; no afirmar que ya se actualizó por haber transcurrido tiempo.

La valoración visible conserva su fecha real de consulta, tomada de `googleRating.verifiedAt`, sin inventar nuevas reseñas. El aviso de Maps dice que Google «puede mostrar» el nombre anterior: no asegura que continúe pendiente durante las próximas semanas. No se modificaron el destino, las coordenadas ni el estado confirmado en los datos.

## Cabecera y movimiento

La cabecera es fija y translúcida al desplazarse. Se oculta al bajar y vuelve al subir, y nunca se oculta si tiene el foco. Cuando su contenido no entra en una fila (por ejemplo, con texto ampliado), pasa sola al modo compacto con menú en lugar de deformar el nombre; la batería exige que no ocupe más de media pantalla. Sin JavaScript se desplaza con el documento y muestra toda la navegación. En la cabecera hay una sola marca visible a la vez: el logo de la portada le cede el lugar al desplazarse, y con movimiento reducido cambia sin fundido.

La presentación de la portada dura 1,4 s (contrato de la batería: 1600 ms como máximo y ninguna pieza de más de 1300 ms), usa sólo transformación y opacidad, no bloquea ninguna acción y termina al tocar, usar el teclado, desplazar, cambiar el tamaño u ocultar la pestaña. Espera la fuente y el logo hasta 0,9 s contados desde el inicio de la navegación; si no llegan, se omite. Si el script no la inició 0,5 s después del primer pintado, una salvaguarda CSS muestra la portada y el script ya no la oculta: nunca queda vacía más de medio segundo, ni oculta con movimiento reducido aunque el script falle. Cada mejora se inicializa por separado: un error se registra en consola sin desactivar las demás ni ocultar contenido, y no se silencia para aprobar una prueba.

Movimiento reducido y colores forzados dejan una alternativa estática; las manipulaciones directas, como cerrar la hoja de consulta arrastrándola, siguen disponibles sin animación. Con ahorro de datos se omiten los efectos, sin cancelar el reloj ni las consultas. Los efectos usan los tokens de movimiento de `src/styles.css`: transformación y opacidad, sin bucles ni rebotes. El parallax leve del logo y del título al desplazar es el aprobado en «Detalle». No hay vídeo ni dependencias.

## Impresión

Las respuestas de los desplegables se imprimen aunque estén cerrados. Las etiquetas de horario general/especial pasan a negro y se retiran los controles de pausa/copia sin utilidad en papel. Se mantienen dirección, franjas, docentes, contactos y QR. La prueba automática revisa la visibilidad real del contenido nativo, además de sus estilos.

## Actualizar en las próximas semanas

1. Crear y recuperar un respaldo según [recuperación](RECUPERACION.md).
2. Editar horarios y contactos en `data/business.json`. Cada franja referencia su docente por ID; conservar la pausa de musculación y las duraciones desconocidas de spinning. No copiar datos de placas antiguas.
3. Para ubicación/apertura efectiva, obtener confirmación y actualizar [verificación](VERIFICACION.md). Conservar el nombre de negocio y Place ID al comprobar la llegada. No restaurar fotos retiradas ni repetir cargas pendientes.
4. Ejecutar [mantenimiento y QA](MANTENIMIENTO.md): código/SEO, navegador y rendimiento del mismo build. Revisar visualmente lo afectado, incluidos texto ampliado y alternativa sin JavaScript. No instalar de nuevo herramientas disponibles.
5. Guardar qué cambió, comprobaciones y pendientes. Publicar únicamente con autorización explícita, por el script existente, y comprobar después la versión pública.

No hace falta una tarea anual ni un servicio permanente para cambiar los años. Las métricas Core Web Vitals de usuarios reales siguen **no medidas**: los controles locales no certifican WCAG completa ni todos los dispositivos físicos.
