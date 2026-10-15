# Modelo de seguridad

La web es estática y pública. No gestiona usuarios, datos de socios, contraseñas, pagos ni una base de datos. La superficie principal es el contenido servido por GitHub Pages y el acceso de escritura al repositorio.

- CSP mediante metadato: recursos propios, sin conexiones de datos, marcos, objetos ni formularios; hash del JSON-LD generado automáticamente.
- CSS/JavaScript con huellas en sus nombres y SRI. No usar JavaScript inline, eval, innerHTML con datos externos ni URLs javascript.
- Enlaces externos con noopener y noreferrer; contacto por servicios oficiales.
- Contenido disponible sin JavaScript; no hay rastreadores ni dependencias de producción.
- Fuentes y documentación en main; sólo artefactos permitidos en site. Respaldos y perfiles del navegador permanecen fuera del repositorio público.
- Publicación con historial normal y sin force-push. Conservar la protección de site y revisar accesos a GitHub.

## Límites reales

GitHub Pages controla las cabeceras HTTP. No se deben crear archivos .htaccess, fingir cabeceras con metadatos que el navegador no admite o afirmar que se controla toda la configuración del servidor. `frame-ancestors`, HSTS y otras políticas de cabecera dependen del alojamiento, no de una etiqueta meta. La CSP de la web no equivale a una garantía contra todos los ataques.

No se usa upgrade-insecure-requests en el metadato: WebKit puede convertir también las peticiones de la vista local HTTP en HTTPS y dejarla sin recursos. La web pública conserva HTTPS del alojamiento, sólo carga recursos del mismo origen y genera los enlaces externos con HTTPS. La vista local escucha exclusivamente en la interfaz de loopback.

La configuración de 2FA, colaboradores y aplicaciones de GitHub requiere comprobar la cuenta; no asumir que se hizo a partir de una recomendación previa. No cambiar permisos generales ni almacenar tokens para automatizar esta web.

Las herramientas de desarrollo pueden tener avisos nuevos con el tiempo. Revisar la auditoría al actualizar; no usar una actualización masiva con cambios incompatibles sólo para ocultar un aviso. No se necesitan versiones de producción de esas herramientas en Pages.

Ante un incidente, preservar evidencia y respaldos, revocar únicamente el acceso afectado según autorización, reconstruir desde una fuente verificada y seguir docs/RECUPERACION.md.
