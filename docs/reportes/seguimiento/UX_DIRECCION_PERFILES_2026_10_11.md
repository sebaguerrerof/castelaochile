# Mejora de Dirección, UX/UI y perfiles profesionales

Estado: **publicado y verificado en producción**.

Fecha: 2026-10-11, America/Santiago. Rama: `codex/seguimiento-terapeutico`.

## Solicitud y decisión institucional

El usuario identificó que `seba.guerrero.f@gmail.com` no encontraba un panel sencillo para gestionar pacientes y equipo. Definió que superadmin representa al director del centro y puede acceder a todo el centro. Se verificó que su cuenta estaba activa y ya tenía el rol superadmin; faltaba aplicar ese significado en permisos y navegación. No se codificó una excepción por correo.

## Implementado

- Inicio «Panel del centro» con conteos reales de pacientes, alertas abiertas y borradores; accesos directos a fichas, Nuevo paciente, agenda/pendientes, Recovery, equipo, asignaciones e informes. Los profesionales reciben «Mi espacio profesional».
- Menú con tareas del centro primero y sitio web como sección secundaria. Seguimiento agrupa enlaces secundarios en «Más opciones del centro», manteniendo visible la sección actual.
- «Equipo y usuarios» permite invitar o modificar perfiles Psicólogo, Psiquiatra, Coach Recovery, Dirección/superadmin, Editor del sitio web y Solo lectura del sitio web. Mantiene Auth, invitación y protección de la cuenta propia/último superadmin.
- Permisos iniciales automáticos por perfil, actualización transaccional al cambiar rol y control de especialidad de las asignaciones. Psiquiatría incluye escritura médica; Psicología/Recovery no.
- Dirección accede a pacientes sin asignación individual, gestiona biblioteca y accede a coordinación, familia, reservas y borradores profesionales por rutas auditadas. No modifica registros ajenos como si fuera el autor.
- Formularios de usuarios y encabezados adaptados a móvil; configuración de capacidades adicionales plegada. Se retiraron precargas del menú privado para evitar solicitudes innecesarias y fallos de cancelación observados en WebKit.

## Verificado

- 966 comprobaciones SQL de atención en PostgreSQL local real, con `authenticated`, rollback y controles positivos/negativos. Incluye 36 nuevos controles de Dirección, perfiles, especialidad, revocación, lectura reservada y ausencia de impersonación.
- Biblioteca: 76 comprobaciones SQL, rollback. Dos expectativas históricas actualizadas al acceso completo de Dirección; las denegaciones CMS/pacientes permanecen.
- 113 pruebas unitarias PASS; build/TypeScript local PASS; lint focalizado PASS y `git diff --check` PASS.
- Navegador final: 21 controles funcionales y 60 pantallas responsivas PASS en Chromium y WebKit; Dirección en 320/375/768/1440 px y los tres perfiles profesionales en 375/1440 px. Login real local, cambio de rol mediante formulario, fichas no asignadas para Dirección, denegaciones para profesionales y cero errores de aplicación. Capturas revisadas visualmente de inicio, usuarios, asignaciones y espacio profesional. Fixtures retirados y protección del último superadmin restaurada/verificada. No se declara aceptación humana ni verificación en teléfonos físicos.
- Producción: 38 migraciones totales verificadas después de aplicar `20261011003758_care_director_professional_roles.sql` y `20261011004828_care_director_access_polish.sql`; dry-run identificó exclusivamente esas dos. La cuenta solicitada tiene acceso de Dirección, gestión de equipo/pacientes/biblioteca, lectura de registros/familia e informes. Se verificó el alcance de todos los pacientes existentes sin mostrar contenido clínico.
- Cero rúbricas aprobadas y cero cron care activos; el cron de analítica existente permanece activo.

## Respaldo y alcance

Respaldo de esquema previo: `tmp/care-production/pre-director-schema.sql`, SHA256 `BE6C0B7749423B26BB6F69DEF57591611544C261F7A88047D3DA273905DBD3AC`. No contiene exportación de los datos de pacientes. Las migraciones son aditivas y mantienen los registros existentes.

La revisión automática rechazó una nueva exportación completa de datos de producción a un archivo local por incluir pacientes, Auth y Storage. No se intentó eludir el rechazo ni se repitió la exportación. La publicación se puede verificar sin esa exportación. Los respaldos del despliegue anterior conservan su evidencia histórica, sin afirmar que sean un respaldo completo actualizado.

## Pendiente

- Aceptación humana de Dirección/superadmin desde PWA/navegador y comprobación en Android/iPhone físicos.
- Aprobar la rúbrica Recovery, criterios/piloto y políticas de urgencias/custodia cuando el cliente los defina; este cambio no los aprueba.
- Invitar a personas reales y asignar sus pacientes desde las pantallas existentes. No se enviaron invitaciones durante QA; solo se usaron cuentas sintéticas locales, retiradas al finalizar (verificación PASS).

## Evidencias locales

`tmp/care-production/roles-db-regression.log`, `roles-library-db.log`, `roles-unit-tests.log`, `roles-build.log`, `roles-lint.log`, `director-e2e.log`; capturas y resultados `tmp/care-qa/director/`. Los archivos temporales se excluyen del despliegue y de Git.

## Publicación y seguimiento

Candidato final: `dpl_5PjfQm67rnCihJyHKvGeiV52GP5K`, [URL del candidato](https://castelaochile-l9haxa263-sebastian-guerreros-projects.vercel.app). Build remoto/TypeScript PASS y ocho verificaciones HTTP del candidato PASS antes de promover. Despliegue previo de referencia: `dpl_5CJHCbbLzMwpV2PcXz6VSHcb5j5J`.

Promoción completada el 2026-10-11. `vercel inspect www.castelaochile.cl` confirmó el despliegue final `dpl_5PjfQm67rnCihJyHKvGeiV52GP5K`, estado Ready. Las 27 verificaciones HTTP del dominio PASS después de promover: sitio público, login, manifiesto/iconos PWA, redirecciones de rutas privadas, PDF privado y API de archivos sin acceso anónimo. Evidencia: `tmp/care-production/director-promote.log`, `director-production-inspect.log`, `director-production-smoke.log` y `production-http.json`. Se mantuvieron las variables de producción y servicios existentes; no se extrajeron credenciales ni se invitó a usuarios reales. No se hizo commit ni push del árbol local.

## Asesor de seguridad posterior a la migración

Supabase devolvió únicamente el aviso informativo `rls_enabled_no_policy` sobre 42 tablas privadas existentes. Es coherente con su diseño: tablas privadas de atención sin grants de lectura directa para anon/authenticated, consultadas por RPC autorizadas y auditadas. No se añadieron políticas permisivas para silenciarlo. [Descripción oficial del aviso](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Verificación final de privilegios en producción: cero grants SELECT directos de `anon`/`authenticated` sobre tablas `private.care_%`; la cuenta solicitada tiene las diez capacidades de Dirección y los seis roles están presentes en el enum de DB. Las dos tablas privadas de analítica con lectura autenticada preexistente mantienen sus políticas actuales; no pertenecen al almacenamiento privado de atención.
