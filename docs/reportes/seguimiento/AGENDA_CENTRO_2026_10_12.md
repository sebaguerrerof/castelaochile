# Agenda visible para Dirección · 2026-10-12

## Resultado

Publicada **Agenda del centro** en `/admin/seguimiento/agenda`, con acceso directo desde el menú de Dirección y el recorrido DEMO. Presenta las participaciones del equipo en tarjetas agrupadas por fecha, horarios de Chile, estado, paciente, profesional y enlace al detalle de la actividad.

El enlace de demostración anterior usaba `/mi-trabajo?profesional=<coach DEMO>`; la vista personal rechaza correctamente profesionales ajenos. Ahora dirige a la agenda del centro, cuyo acceso requiere las capacidades vigentes de Dirección ya existentes. **Mi agenda y pendientes** conserva su comportamiento personal.

## Implementación

- Vista nueva con filtros de periodo 7/30/90 días, profesional y estado; acceso a todo el equipo autorizado y a Nueva actividad mediante el formulario existente.
- Se reutilizan `care_supervision`, su schema, sus controles de alcance, sus fechas y su paginación de 25 participaciones. Incluye historial del periodo y actividades de los próximos siete días; no promete un calendario de reservas a futuro ilimitado.
- Una actividad grupal puede producir varias participaciones. La interfaz identifica esta unidad y los totales no se presentan como citas distintas.
- Proxy rechaza la agenda del centro antes del streaming si faltan capacidades; el servidor repite la autorización. Los perfiles clínicos mantienen la agenda personal con sus accesos automáticos.
- Sin cambios en migraciones, Auth, usuarios, datos productivos, cron ni acciones de crear, reprogramar, cerrar o registrar asistencia.

## Verificación

- Build local final con TypeScript PASS; lint de los archivos modificados PASS; 118 unitarias existentes PASS.
- **32 controles funcionales y 176 comprobaciones responsive**, Chromium y WebKit, a 320/375/768/1440 px. Se verifican HTTP 200, título exacto de agenda y tarjetas realmente cargadas, además de ausencia de desbordamiento y errores de página.
- Navegación real desde Demostración: profesional DEMO preseleccionado y actividades visibles en ambos motores.
- Filtro Programadas: tres actividades futuras. Apertura del detalle real. Paginación del centro: 25 + 17 = 42 participaciones DEMO. Agenda personal de Dirección sigue vacía cuando no tiene actividades propias.
- Coach con rol real en QA: agenda personal disponible con actividades propias; HTTP 403 al intentar agenda del centro. No aparecen sus sesiones psicológicas ajenas.
- Regresión del recorrido, PDF y retirada DEMO completa PASS. Fixtures locales retiradas, cero cuentas DEMO QA, cero conjuntos abiertos y protección del último superadmin habilitada.
- Candidato Ready: 15 controles HTTP PASS con acceso de Vercel y sesión anónima de aplicación. Dominio: 31 controles HTTP PASS después de la promoción, incluyendo redirección de la nueva agenda a login sin sesión.

La prueba de agenda anterior esperaba un h1 genérico y podía aceptar la pantalla Forbidden como si estuviera cargada. Se corrigió esa comprobación y la nueva evidencia sustituye la afirmación de agenda del reporte DEMO anterior.

## Publicación y evidencia

Despliegue: `dpl_BeoiQAoJoQNS33F2fpP6v4EZgXUG`, https://castelaochile-5g8ocgf72-sebastian-guerreros-projects.vercel.app. Publicado en https://www.castelaochile.cl/admin/seguimiento/agenda. Referencia previa: `dpl_7muajFUVLu5wSd6dR4RxRzjpmRmS`. La base permanece con sus 43 migraciones y el conjunto DEMO activo anterior.

Evidencia: `tmp/care-qa/agenda-results.json`, `tmp/care-qa/agenda-unit.log`, capturas `tmp/care-qa/demo/*-10-*.png` y `tmp/care-production/agenda-*.json`/logs. El dominio se inspeccionó para confirmar la identidad exacta promovida. Las pruebas autenticadas se hicieron con identidades ficticias locales; producción se comprobó mediante build e HTTP, sin usar credenciales ni pacientes reales.

## Pendiente

Dirección revisa la agenda desde navegador/PWA con su cuenta habitual. La aceptación humana y los teléfonos físicos conservan su estado pendiente; las pruebas técnicas anteriores no se convierten en aceptación clínica o institucional.
