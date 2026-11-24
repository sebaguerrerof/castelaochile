# Agenda y pendientes — acceso automático por rol

Fecha: 2026-10-11 (America/Santiago). Rama: `codex/seguimiento-terapeutico`.
Estado: **corregido, publicado y verificado en producción**.

## Problema reproducido

Dirección/superadmin recibía 403 al abrir «Mi agenda y pendientes». El servidor llamaba `care_supervision` con el ID del usuario como filtro profesional; la función exigía una asignación vigente incluso para Dirección. La llamada con la cuenta solicitada se reprodujo en producción, devolviendo `42501: Profesional no disponible`, sin leer ni exportar contenido clínico. Un fixture local reprodujo el mismo error.

La verificación del cambio anterior no abrió esta ruta; el reporte anterior acredita las pantallas recorridas, pero no podía acreditar este enlace. Se añade a la matriz de regresión de forma explícita.

## Cambios

- Nueva migración aditiva `20261011140159_care_role_agenda_access.sql`: la agenda personal de Dirección no exige una asignación de paciente; sus sesiones y registros esperados se incluyen con autor y especialidad reales. Los profesionales conservan alcance vigente por paciente y no pueden consultar el trabajo de otra persona.
- Los accesos habituales de Dirección, Psicólogo, Psiquiatra y Coach Recovery se resuelven directamente desde su rol activo en servidor/proxy/DB. La migración sincroniza sus filas internas; el cambio de rol sigue reemplazándolas automáticamente. No hay excepción por correo.
- Se retiran de «Equipo y asignaciones» los formularios y casillas de capacidades. Las acciones web de seguimiento y biblioteca ya no aceptan cambios manuales de capacidades. La RPC de seguimiento rechaza alterar manualmente los perfiles clínicos. La ruta antigua `/admin/pacientes/permisos` lleva a `/admin/usuarios` tras verificar Dirección, y Pacientes enlaza a «Equipo y usuarios». Las concesiones históricas explícitas a cuentas CMS se mantienen internamente por compatibilidad; no se añaden derechos clínicos por el rol Editor/Solo lectura ni una interfaz para configurarlos.
- «Mi agenda y pendientes» abre por defecto la agenda; conserva filtros de agenda, tareas, registros y alertas. Se desactivan las precargas de filtros y enlaces privados en los recorridos de usuarios, pacientes y equipo, corrigiendo errores de cancelación observados en WebKit al navegar entre pantallas. Errores inesperados de DB dejan de presentarse como si fueran una falta de rol; solo `42501` activa la respuesta de autorización.
- Los controles de cuenta activa, especialidad, audiencia del paciente, autoría, notas reservadas y RLS continúan en servidor/DB.

## Pruebas ejecutadas

- Antes del arreglo: reproducción del fallo SQL en producción y en QA local.
- Después: 977 comprobaciones SQL/RLS de atención PASS en PostgreSQL real con rollback. Once nuevas sobre agenda de Dirección sin asignación, eventos propios, registro pendiente, filtros vacíos, agenda de los tres perfiles, denegación de trabajo ajeno, accesos por rol y rechazo de casillas manuales para perfiles clínicos.
- Regresión de biblioteca: 76 comprobaciones SQL PASS con rollback.
- 113 pruebas unitarias PASS. Build/TypeScript local PASS. Lint focalizado PASS. Navegador final: 33 controles funcionales y 80 pantallas responsivas PASS en Chromium y WebKit. Dirección en 320/375/768/1440 px y los tres perfiles profesionales en 375/1440 px. Clic real en el enlace de agenda, filtros de agenda/tareas/registros/alertas, ausencia de casillas, redirección de la ruta antigua de permisos, modificación real del rol y denegaciones de trabajo ajeno. Cero errores de aplicación; fixtures retirados y protección del último superadmin restaurada y comprobada. Capturas de agenda móvil/escritorio inspeccionadas visualmente.
- Dry-run remoto identificó exclusivamente la nueva migración.

## Pendientes y límites

- Este arreglo no aprueba la rúbrica Recovery ni políticas clínicas, y no activa cron care.
- Las cuentas de QA son sintéticas locales y se retiran al finalizar. No se envían invitaciones ni se crean datos clínicos en producción.
- Las pruebas de navegador no acreditan dispositivos Android/iPhone físicos ni aceptación humana.
- No se exportan datos o credenciales de producción; no se solicita nuevamente el respaldo completo rechazado por revisión automática en el cambio anterior.

## Evidencia

`tmp/care-production/agenda-reproduction.log`, `agenda-local-migration.log`, `agenda-db-regression.log`, `agenda-build.log`, `agenda-unit-tests.log`, `agenda-lint.log`, `agenda-e2e.log`, `agenda-migration-dry-run.log`; resultados/capturas locales `tmp/care-qa/director/`. Los archivos de QA se excluyen del despliegue.

## Verificación remota del arreglo

Se aplicó la única migración nueva prevista: 39 migraciones totales en producción. Se repitió `care_supervision` con la identidad de la cuenta solicitada, rol `authenticated` y filtro de profesional propio en las cuatro vistas (agenda, tareas, registros y alertas): PASS, sin el `42501` previo. La comprobación usó una transacción con rollback; no publicó contenido ni creó registros clínicos.

Asesor de seguridad: mismo aviso informativo de 42 tablas privadas con RLS y sin políticas permisivas; no errores o advertencias nuevos. [Descripción oficial](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy). Se mantienen RPC auditadas para los contenidos privados.

## Publicación verificada

- Despliegue final: `dpl_8HyHgQthqJZbdHmwHuWNsDJb7RNs`, [candidato](https://castelaochile-a5ypuy0j0-sebastian-guerreros-projects.vercel.app).
- Build/TypeScript remoto PASS; ocho controles HTTP del candidato PASS antes de promover.
- Promoción completada el 2026-10-11. Inspección de `www.castelaochile.cl`: despliegue final y estado Ready.
- 28 controles HTTP del dominio PASS después de promover, incluida la agenda privada sin acceso anónimo, sitio público, login, manifiesto/iconos PWA, biblioteca, PDF y API de archivos protegidos.
- Regresiones finales: 977 SQL de atención, 76 SQL de biblioteca, 113 unitarias, build/tipos, lint y `git diff --check` PASS.
- Las asignaciones de pacientes continúan siendo el vínculo profesional-paciente; no son una configuración de permisos de Dirección. Dirección conserva el acceso completo al centro por su rol activo.
- No se modificaron variables de producción, cron, rúbricas aprobadas ni políticas institucionales. No se hizo commit ni push del árbol compartido.

Evidencia adicional: `agenda-link-lint.log`, `agenda-library-db.log`, `agenda-deploy.log`, `agenda-candidate-inspect.log`, `agenda-promote.log`, `agenda-production-inspect.log`, `agenda-production-smoke.log` y `tmp/care-production/production-http.json`.
