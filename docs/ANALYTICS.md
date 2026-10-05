# Analítica con consentimiento

Implementada el 5 de octubre de 2026. Panel: `/admin/analitica`; resumen también disponible en `/admin`.

## Qué se cuenta

- **Navegadores únicos**: identificadores distintos dentro de los últimos 7, 30 o 90 días, incluido hoy. Se calcula sobre todo el periodo, no sumando visitantes diarios.
- **Vistas de página**: navegación pública, regreso o recarga de una página, después de aceptar. Los reintentos conservan el ID del evento y no vuelven a incrementar el contador.
- **Navegadores hoy**: identificadores distintos desde las 00:00 de America/Santiago.
- Gráfico diario con ambas series, tabla accesible y ranking de rutas por vistas. La variación se muestra cuando existen dos periodos completos observados y el periodo anterior tiene visitantes.

Estas cifras no equivalen a personas identificadas. Cambiar de dispositivo o borrar cookies puede duplicar una persona; un navegador compartido puede representar varias. Quienes rechazan, bloquean el seguimiento o no ejecutan JavaScript quedan fuera. No hay recuperación de visitas anteriores a la activación. No se insertan datos de ejemplo ni se extrapolan totales.

## Consentimiento y privacidad

La captura está apagada por defecto en cada navegador. Los botones Aceptar y Rechazar tienen igual peso visual. El enlace «Preferencias de privacidad» al pie permite cambiar la elección. El aviso detallado está en `/privacidad-analitica`.

- `castelao_analytics_consent`: elección aceptada/rechazada, SameSite=Lax, ruta `/`, duración de 180 días.
- `castelao_analytics_visitor`: UUID aleatorio, HttpOnly, SameSite=Lax, Secure en HTTPS, duración de 180 días; se crea solo al aceptar y se elimina al rechazar.
- La base guarda únicamente un hash del UUID, ID del evento, ruta sin parámetros, fecha local y timestamp. No guarda IP, user agent, búsquedas, datos de formularios, correos ni asociación a cuentas.
- Se respetan DNT y GPC, se excluyen robots conocidos, navegadores automatizados, usuarios autenticados del CMS, rutas `/admin` y `/api`.
- El limitador Redis usa claves hash transitorias por red y navegador (60 segundos); no se persisten IP sin transformar.
- Retirar el permiso detiene solicitudes futuras y elimina la cookie identificadora. Los registros anteriores siguen su plazo de retención.

## Configuración y límites

`ANALYTICS_ENABLED=true`, credenciales Supabase del servidor y Upstash son requisitos. Es independiente de `NEXT_PUBLIC_SITE_MODE`: se puede medir el despliegue real manteniendo el sitio de revisión sin indexación.

La captura solo se admite con `VERCEL_ENV=production`, HTTPS, mismo Origin y dominio canónico `NEXT_PUBLIC_SITE_URL`. Los previews y localhost no generan datos; pueden mostrar el UI y consultar estadísticas mediante cuentas del administrador. Actualizar el dominio canónico al habilitar un dominio propio.

El banner solo se monta cuando la funcionalidad está configurada. La API verifica nuevamente consentimiento y UUID antes de usar los servicios. Fallos de proveedor devuelven 503; el navegador reintenta hasta tres envíos con el mismo ID. Los límites son 120 solicitudes por navegador y 300 por red por minuto; un límite excedido no se cuenta.

## Base de datos

Migración `20261005140314_visitor_analytics.sql`:

- `private.analytics_events`: PK de evento para deduplicación; índice fecha/visitante para periodos y retención. RLS y esquema fuera del Data API.
- `private.analytics_configuration`: fecha del primer evento real, sin asignar una fecha de inicio artificial.
- `record_consented_page_view`: RPC SECURITY INVOKER, ejecutable solo por service_role, fecha generada por la base. Inserción de evento e incremento de `analytics_daily` en una transacción.
- `get_web_analytics`: RPC SECURITY INVOKER, lectura agregada con autorización de staff activo; no entrega identificadores. Calcula totales en SQL para evitar el límite de filas del Data API. No consulta datos privados de contactos, por lo que también funciona para viewer.
- La RPC anterior `record_page_view` queda sin permiso de ejecución para service_role.
- Supabase Cron elimina diariamente eventos fuera de la ventana de 180 días, conservando el periodo actual de 90 días y el anterior. Los agregados por fecha/ruta permanecen sin identificadores. Job `castelao-analytics-retention`, 08:15 UTC, con limpieza de su propio historial después de siete días.

## Verificación

60 pruebas unitarias, lint, TypeScript y build. Los casos nuevos comprueban consentimiento ausente/rechazado, UUID inválido, DNT/GPC/robots/staff, hash estable, IDs de reintento, rutas privadas, parámetros y cuerpos excesivos, límites y errores de proveedor, entorno canónico y comparación de periodos.

QA de navegador en 1440 y 375 px con eventos interceptados: ninguna captura previa al consentimiento, rechazo persistente, creación de cookie HttpOnly al aceptar, reintentos, navegación con identidad estable, retirada y eliminación del identificador, aviso responsive, errores de consentimiento y origen externo. Sin visitas ficticias en producción.

La migración se validó inicialmente dentro de una transacción revertida, sin crear eventos de prueba. Después de aplicarla se consultó la RPC con rol authenticated y una cuenta de staff existente, comprobando cifras vacías reales; job de retención activo y advisors de seguridad sin incidencias. La migración adicional `20261005143538_analytics_service_permissions.sql` permite que el servidor evalúe el predicado interno de staff al planificar la RPC; no cambia permisos anónimos ni autorización del CMS. Las consultas de 7/30/90 días, la denegación a anon y el rechazo de rutas inválidas se verifican sin insertar eventos.
