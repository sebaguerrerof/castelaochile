# Activación de seguimiento terapéutico

> **Modelo vigente — publicado en producción, Dirección y perfiles, 2026-10-11:** por decisión explícita del usuario, `superadmin` representa a la Dirección del centro y tiene acceso completo a sus pacientes, equipo, biblioteca y seguimiento, sin asignación individual ni configuración adicional. Psicólogo, Psiquiatra y Coach Recovery son perfiles reales con permisos iniciales automáticos y alcance por asignación vigente. El correo no se usa como excepción de autorización. Ver [reporte de la mejora](reportes/seguimiento/UX_DIRECCION_PERFILES_2026_10_11.md). Esta decisión sustituye el modelo histórico de «superadmin técnico sin lectura clínica» descrito más abajo.

> **Pendiente institucional:** Recovery sigue sin rúbrica aprobada; no se activó piloto ni cron care. La aceptación humana corresponde a Dirección/superadmin desde la PWA por navegador. Las pruebas técnicas de Chromium/WebKit no acreditan uso en teléfonos físicos. No se aprobaron políticas de urgencias ni custodia.

## Antecedentes y evidencia histórica

> **Estado vigente — producción, 2026-10-10:** puesta en producción autorizada y ejecutada en www.castelaochile.cl. 22 migraciones care aplicadas (36 totales), bandera activa, build remoto/TypeScript, 8 HTTP del candidato, 27 HTTP del dominio y 5 controles de autorización DB PASS. Reporte: [PRODUCCION_2026_10_10](reportes/seguimiento/PRODUCCION_2026_10_10.md). Las secciones fechadas anteriores conservan evidencia histórica; sus restricciones de despliegue quedaron sustituidas por la autorización del usuario.

> **Pendiente institucional:** capacidades/asignaciones reales se configuran en `/admin/seguimiento/equipo`; no se otorgó lectura clínica automática. Recovery v1.0 continúa como propuesta, sin piloto/criterios ni validaciones. Sin jobs/cron care. Dirección acepta y registra las decisiones operativas desde la PWA en navegador; conformidad humana general, dispositivos físicos y políticas de urgencias/custodia siguen pendientes. No se acredita escritura clínica ni PDF con sesión real en producción.

Preparación histórica: 2026-10-10, anterior a la autorización de producción registrada arriba. En ese corte el alcance era local y no estaban autorizados migraciones remotas ni despliegue. La activación técnica posterior está ejecutada; cron care, aceptación, dispositivos físicos y decisiones con el cliente siguen pendientes según PRODUCCION_2026_10_10 y CASTELAO_SEGUIMIENTO_ACEPTACION.md.

## Inventario para revisar antes de autorizar

- Rama de trabajo codex/seguimiento-terapeutico, base 4fbf785; conservar modificaciones previas de portal/CMS. Preparar el commit/revisión final antes de una futura publicación autorizada.
- Next.js 16.3.6, React 19.3.0, Supabase JS 2.117.1/SSR 0.12.7, PDFKit 0.20.2, CLI local 2.117.0. Versiones fijadas; no se actualizaron paquetes durante el paso 11.
- Migraciones del portal y diez migraciones care en orden cronológico. El inventario efectivo con firmas/grants/políticas está en tmp/care-qa/step-11/migration-manifest.json, ignorado. Comparar historial y esquema del destino autorizado antes de decidir cuáles faltan; no reaplicar a ciegas.
- Las migraciones care no registran el scheduler. Una migración previa de analítica contiene su propio cron de retención; revisarlo como dependencia separada y preservar esa configuración existente. No trasladar su política de retención a información clínica.
- Bucket care-informs privado, solo PDF, 5 MB; descargar mediante ruta autenticada y permisos actuales. El logo institucional debe estar incluido en el build del servidor. No conceder lectura directa o enlaces públicos para resolver un error.
- Mantener dominio/DNS/remitente, Auth/onboarding, pacientes, biblioteca y CMS existentes. Configurar CARE_PORTAL_ENABLED solo al autorizar el alcance; conservar PATIENT_PORTAL_ENABLED y las banderas independientes de correos, contacto y analítica conforme al entorno revisado. Secretos solo servidor.

## Puertas pendientes para datos reales

| Puerta | Evidencia requerida | Situación |
| --- | --- | --- |
| Aceptación | Dirección valida todos los perfiles con su cuenta actual o superadministrador; registrar recorridos, incidencias y aprobación | Responsable definido; ejecución/firma pendientes |
| Móviles/PWA | Android e iPhone, navegador y pantalla de inicio; orientación, notch, teclado, zoom, sesión y errores de conexión en equipos físicos | Plataforma definida; instalación y aceptación físicas pendientes |
| Configuración clínica | Ventanas/campos/exenciones, fases, rúbrica Recovery, vigencia de valoraciones y protocolo de urgencias aprobados | Pendiente; sin valores oficiales inventados |
| Privacidad y custodia | Encuadre como ficha clínica, finalidades, bases de tratamiento, derechos, confidencialidad, transferencias y conservación | Revisión institucional/jurídica pendiente |
| Operación | Plan/región/capacidad, responsables de incidentes, MFA del equipo, objetivos de recuperación, copias protegidas y prueba en el destino | Pendiente; ejercicio local no acredita servicios remotos |
| Publicación | Destino exacto, cambios revisados, respaldo previo y autorización explícita de migración/despliegue/cron | No autorizada |

## Secuencia de una futura activación autorizada

1. Confirmar proyecto y entorno exactos, revisar el diff y los artefactos, registrar autorización y ventana de trabajo. No usar scripts QA contra un destino remoto.
2. Mantener scheduler detenido y coordinar escritores antes del respaldo. Capturar DB/esquemas/datos/grants y objetos privados con manifiesto de claves, bytes y hashes; preservar configuración/roles de servicios según el entorno. Probar la recuperación en un destino aislado antes de usar datos reales.
3. Comparar historial de migraciones del destino, aplicar solo las revisadas y faltantes. Verificar RLS/grants, schema USAGE, helpers y bucket. No usar refresh-* de desarrollo para migrar el destino.
4. Publicar únicamente el build autorizado, comprobar Auth y banderas, noindex/no-store, aislamiento, biblioteca/CMS/blog, errores recuperables y PDF. Realizar aceptación humana conforme a la pauta.
5. Configurar profesionales reales por capacidades/asignaciones; separar roles CMS. Registrar reglas aprobadas con autor/referencia, sin convertir datos inexistentes en incumplimiento.
6. Cada responsable autoriza sus jobs con motivo y alcance fijo. Nuevas asignaciones no amplían una configuración existente. La frecuencia normal del worker es cada minuto, periodos civiles America/Santiago; el modo de 10 segundos es exclusivamente QA.
7. Solo después de autorización específica, registrar el cron privado bajo su rol dueño. SQL revisable: `select cron.schedule('castelao-care-tick','* * * * *','select private.care_scheduler_tick();');`. No ejecutado en destino. No hay endpoint HTTP ni JWT/secretos almacenados en el job.
8. Comprobar ejecución real en cron.job_run_details, heartbeat actual y resultado de aplicación, población/corte/revisión pendiente y procedencia del informe. Un SQL cron exitoso por sí solo no acredita un informe exitoso. Revisar fallos/intentos sin borrar historia. Documentar quién observa y atiende los fallos.
9. Verificar que el cliente entiende datos faltantes, N=0, registros pendientes y revisión humana. Registrar qué quedó activado, cuándo y qué se comprobó realmente.

## Recuperación y reversión

El ejercicio local usa dos bases nuevas dentro del clúster QA marcado; no restaura sobre postgres. Aplica los 24 archivos de migración con exclusión explícita del registro de cron de analítica, porque pg_cron solo se instala en la base configurada del clúster. Esa exclusión no cambia ningún SQL care ni el cron real; el esquema care se contrasta con QA y sus pruebas normales. Auth/Storage de infraestructura se reutilizan como esquema, sin copiar usuarios reales ni contraseñas. `--no-owner` evita cambiar roles administrados; el procedimiento conserva los privilegios efectivos de las tres identidades de aplicación y verifica lectura/denegación tras restaurar. No equivale a recuperar servicios Auth, roles de plataforma, correo o región en un proyecto remoto.

Un respaldo DB incluye metadatos de Storage, pero no los objetos. Mantener las copias de objetos y verificar correspondencia antes de marcar un export como disponible. Referencia: [Backups de Supabase](https://supabase.com/docs/guides/platform/backups). No confiar en un dump sin una restauración comprobada.

Ante un incidente: detener nuevas ejecuciones del scheduler propio, preservar ejecuciones/versiones/objetos y registrar causa. Pausar un job no borra pendientes ni consume intentos; corregir la causa y reintentar dentro del máximo de cinco. No reiniciar contadores terminales ni declarar aprobado un informe manualmente. Los intentos PDF ambiguos no se purgan mientras no exista política aprobada.

Rollback de despliegue y rollback de datos son operaciones distintas: mantener banderas deshabilitadas y un build anterior puede frenar la exposición, pero no deshace migraciones ni escrituras. Toda restauración del destino requiere autorización, alcance y reconciliación de datos posteriores al corte. El cron propio se puede retirar conservando historia; no detener crons ajenos. No ejecutar down migrations destructivas como reversión automática.

Retención, cifrado de copias, custodia externa, RPO/RTO, acceso de operadores, frecuencia y calendario de ejercicios siguen pendientes del cliente. El cron existente de analítica no constituye aprobación de estas políticas clínicas.


## Suplemento móvil verificado localmente (2026-10-10)

PASO_11_PWA_MOVIL registra 366 controles Chromium/WebKit, 149 UX y 101 funcionales de las tres suites seleccionadas sobre el build final, sin hallazgos; 24 capturas inspeccionadas. Manifiesto/iconos institucionales y áreas seguras implementados. No activa las puertas pendientes: dirección sigue debiendo ejecutar/firmar en Android/iPhone físicos, navegador e instalación. Revisar versiones reales frente a los mínimos del stack y requisitos de conexión antes de aceptar el alcance. Producción no modificada.


## Ampliación móvil profesional verificada (2026-10-10)

PASO_11_PWA_PROFESIONALES amplía la revisión técnica a agenda/capacidades, registros de cada especialidad, decisiones/tareas/supervisión, informes y programaciones: 452 móviles/275 UX/131 funcionales, 36 capturas y seis PDF/36 páginas inspeccionados. Texto y selector corregidos con repetición afectada 126 móviles/42 UX/32 funcionales PASS. Los conteos por build y las repeticiones se distinguen en el reporte. Dirección conserva la aceptación; ejecutar y firmar los recorridos en Android/iPhone físicos y registrar modelo/SO/navegador, instalación, teclado, giro, zoom y áreas seguras. Esta ampliación no cambia las puertas institucionales pendientes ni autoriza producción.

## Aclaración vigente del usuario (2026-10-10)

La aceptación de Dirección/superadmin se hará mediante PWA abierta en el navegador o instalada. No exigir un recorrido separado de navegador ni tratar dispositivos/aceptación como bloqueo de la implementación local. La firma de aceptación no se presume; tampoco equivale a aprobar la rúbrica Recovery. Mantener pruebas PWA y criterios institucionales documentados, sin volver a preguntar la modalidad definida.

## Complemento Recovery — RC-05, cierre local 2026-10-10

Implementación local del complemento cerrada según RC_05; no es autorización de activar en producción. La propuesta y reglas clínicas permanecen sin decisión real. Preparar cualquier activación concreta solo tras autorización explícita del usuario y decisiones institucionales pertinentes; no automatizar aprobación por haber terminado las pruebas.

RC-00 a RC-05 validados técnicamente en castelao-patient-qa. RC_05 registra nueve suites/266 funcionales, 1.032 controles móviles Chromium/WebKit en 30 contextos y 492 UX en 41, cero hallazgos. 930 SQL seguimiento + 76 biblioteca; 113 unitarias, lint y build/TypeScript PASS. Biblioteca/Auth 30 y web/CMS 36 controles PASS; siete PDF privados/40 páginas renderizadas e inspeccionadas. Instalación fresca 36 migraciones/1.006 SQL y restauración 136 Recovery, sin sumarlos a la regresión base. Consolidación y limpieza independiente: tmp/recovery-qa/release-summary.json.

Pendiente institucional: aprobar propuesta/piloto/criterio de evidencia, ventana global común y equivalencias; excepción motivada sin compromiso; parámetros/exclusiones/revisión de reiteración; protocolo/canales de urgencias y retención/respaldo. Dirección/superadmin acepta PWA abierta en el navegador o instalada según el usuario; aceptación humana pendiente, no bloqueo de programación local. ICC-REC-AUT-001 v1.0 sigue propuesta sin aprobador y criterio apagado; ningún paciente validado. Sin producción, migraciones remotas, push, despliegue ni mensajes externos.

## Aclaración de aceptación: PWA en navegador

Dirección/superadmin autorizado debe poder revisar y aceptar desde la PWA abierta en el navegador, sin instalación obligatoria ni requisito de modo standalone. La PWA instalada ofrece los mismos recorridos. No se exige una aceptación separada para cada modo. Las comprobaciones en teléfonos reales son evidencia de compatibilidad; no obligan a instalar la PWA para registrar una aprobación.

«Aceptación pendiente» describe que todavía no consta la conformidad humana de Dirección sobre el sistema, no una función deshabilitada ni una limitación del navegador. La pauta de aceptación del sistema es documentación para esa validación humana; no se ha implementado una firma global del sistema dentro de la aplicación. Las decisiones operativas ya implementadas —aprobar la rúbrica, autorizar piloto y revisar el mensual— sí tienen formularios web con confirmación y guardado real, sujetos a Auth y permisos actuales. No se ejecuta ni presume aprobación institucional por esta aclaración.
