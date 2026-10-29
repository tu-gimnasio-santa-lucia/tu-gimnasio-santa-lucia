# Estabilidad y mantenimiento breve

Revisión del 29/10/2026, cuya publicación fue autorizada después de comprobar el candidato local. El sitio conserva HTML/CSS/JavaScript estándar, cero dependencias de producción, datos canónicos y marca original. Las cuentas de Maps/Instagram no forman parte de esta entrega.

## Antigüedad que no depende de una publicación anual

La cabecera, el sello de trayectoria y el pie entregan «Desde 1996» o «Con vos desde 1996» como alternativa estática. Los números de años quedan ocultos hasta que `initializeLiveClock()` calcula una fecha válida por calendario argentino y revela los tres a la vez. Si falta JavaScript o no se carga el módulo, la información sigue siendo verdadera después del aniversario.

Los totales detallados sin JavaScript conservan una fecha visible, generada desde `anniversary.snapshotDate`. Con JavaScript el reloj actualiza años y unidades desde `foundedDate`, sin animarlos desde cero. El 03/11/2026 son 29 años; el 04/11/2026 son 30; el 04/11/2027 son 31. La pausa y la pestaña oculta detienen las actualizaciones hasta retomar. No cambiar la fecha del equipo para probarlo: usar el reloj del navegador de pruebas.

Una fecha prevista de mudanza no acredita apertura efectiva. El sitio no activa ni anuncia una sede por el reloj. El texto de Maps distingue la dirección confirmada del nombre mostrado en la última comprobación documentada; no afirmar que ya se actualizó por haber transcurrido tiempo.

La valoración visible conserva su fecha real de consulta, tomada de `googleRating.verifiedAt`, sin inventar nuevas reseñas. El aviso de Maps dice que Google «puede mostrar» el nombre anterior: no asegura que continúe pendiente durante las próximas semanas. No se modificaron el destino, las coordenadas ni el estado confirmado en los datos.

## Cabecera y movimiento

Las columnas de escritorio pueden contraerse y la navegación ajustarse sin convertir el nombre en una columna de letras al ampliar texto. Cuando la navegación ocupa dos filas (hasta 1100 px) o la pantalla es baja (hasta 500 px), la cabecera se desplaza con el documento para dejar espacio al contenido. En escritorio amplio conserva la posición fija durante el desplazamiento.

La presentación original conserva 1040 ms, su vigilancia de 1450 ms, salida al interactuar, logo completo y contenido disponible desde el inicio. La cancelación de Web Animations genera `AbortError`, que se trata como interrupción esperada; otros errores se registran en consola después de limpiar la presentación. No se silencian para obtener una prueba aprobada.

Movimiento reducido y colores forzados dejan una alternativa estática. Con ahorro de datos se omiten las entradas JavaScript y CSS, sin cancelar el reloj ni las consultas. Los efectos sólo cambian transformaciones/opacidad; no se agregaron ciclos, vídeo, parallax ni dependencias.

## Impresión

Las respuestas de los desplegables se imprimen aunque estén cerrados. Las etiquetas de horario general/especial pasan a negro y se retiran los controles de pausa/copia sin utilidad en papel. Se mantienen dirección, franjas, docentes, contactos y QR. La prueba automática revisa la visibilidad real del contenido nativo, además de sus estilos.

## Actualizar en las próximas semanas

1. Crear y recuperar un respaldo según [recuperación](RECUPERACION.md).
2. Editar horarios y contactos en `data/business.json`. Cada franja referencia su docente por ID; conservar la pausa de musculación y las duraciones desconocidas de spinning. No copiar datos de placas antiguas.
3. Para ubicación/apertura efectiva, obtener confirmación y actualizar [verificación](VERIFICACION.md). Conservar el nombre de negocio y Place ID al comprobar la llegada. No restaurar fotos retiradas ni repetir cargas pendientes.
4. Ejecutar [mantenimiento y QA](MANTENIMIENTO.md): código/SEO, navegador y rendimiento del mismo build. Revisar visualmente lo afectado, incluidos texto ampliado y alternativa sin JavaScript. No instalar de nuevo herramientas disponibles.
5. Guardar qué cambió, comprobaciones y pendientes. Publicar únicamente con autorización explícita, por el script existente, y comprobar después la versión pública.

No hace falta una tarea anual ni un servicio permanente para cambiar los años. Las métricas Core Web Vitals de usuarios reales siguen **no medidas**: los controles locales no certifican WCAG completa ni todos los dispositivos físicos.
