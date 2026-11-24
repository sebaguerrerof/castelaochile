# Contrato de permisos clínicos

> **Corrección publicada y verificada: agenda y acceso por rol — 2026-10-11:** Dirección no requiere asignaciones individuales para su agenda. Los perfiles clínicos aplican sus accesos automáticamente; la pantalla de equipo permite asignar pacientes y ya no presenta casillas de capacidades. [Reporte y estado de verificación](reportes/seguimiento/AGENDA_ROLES_2026_10_11.md).

> **Modelo vigente — publicado en producción, Dirección y perfiles, 2026-10-11:** por decisión explícita del usuario, `superadmin` representa a la Dirección del centro y tiene acceso completo a sus pacientes, equipo, biblioteca y seguimiento, sin asignación individual ni configuración adicional. Psicólogo, Psiquiatra y Coach Recovery son perfiles reales con permisos iniciales automáticos y alcance por asignación vigente. El correo no se usa como excepción de autorización. Ver [reporte de la mejora](reportes/seguimiento/UX_DIRECCION_PERFILES_2026_10_11.md). Esta decisión sustituye el modelo histórico de «superadmin técnico sin lectura clínica» descrito más abajo.

> **Pendiente institucional:** Recovery sigue sin rúbrica aprobada; no se activó piloto ni cron care. La aceptación humana corresponde a Dirección/superadmin desde la PWA por navegador. Las pruebas técnicas de Chromium/WebKit no acreditan uso en teléfonos físicos. No se aprobaron políticas de urgencias ni custodia.

## Contrato actual

| Perfil | Acceso y tareas |
| --- | --- |
| Dirección · Superadministrador | Todos los pacientes del centro, sus fichas, equipo, biblioteca, agenda, coordinación, reservas y borradores profesionales por RPC auditadas, decisiones e informes; administración del sitio web. |
| Psicólogo | Pacientes asignados actualmente, seguimiento y registros psicológicos; sin indicaciones psiquiátricas ni administración del sitio/equipo. |
| Psiquiatra | Pacientes asignados actualmente, seguimiento, consultas y registros con indicaciones psiquiátricas; sin administración del sitio/equipo. |
| Coach Recovery | Pacientes asignados actualmente, seguimiento, actividades, compromisos y revisiones Recovery; sin indicaciones psiquiátricas ni administración del sitio/equipo. |
| Editor del sitio web | CMS; sin acceso clínico heredado. Permisos explícitos anteriores se conservan hasta un cambio de rol. |
| Solo lectura del sitio web | Lectura CMS; sin acceso clínico heredado. Permisos explícitos anteriores se conservan hasta un cambio de rol. |

Las cuentas deben estar activas. La asignación de Psicología/Psiquiatría/Recovery debe coincidir con el perfil; la base de datos y las rutas repiten la autorización. El cambio de rol reemplaza las capacidades de seguimiento por las del nuevo perfil: pasar de Psiquiatra a Coach Recovery retira el permiso médico. La revocación de asignación y la desactivación siguen siendo efectivas con sesiones anteriores.

Dirección no necesita asignarse a cada paciente ni activar casillas técnicas para operar. La lectura privilegiada profesional mantiene auditoría y no concede acceso directo a tablas privadas. El autor real continúa viniendo de Auth: Dirección puede consultar registros ajenos, pero no enmendarlos haciéndose pasar por su autor. Crear registros mantiene la responsabilidad propia de la sesión, sus requisitos de asistencia/finalización y las versiones inmutables.

El acceso completo del centro no publica reservas al paciente, no altera la audiencia de materiales y no sustituye los flujos del portal. Los borradores privados de autorreporte del paciente mantienen su flujo original. Aprobar clínicamente una rúbrica requiere una decisión expresa en el formulario; disponer del rol de Dirección no aprueba Recovery ni activa tareas automáticas.

## Contrato anterior — histórico, sustituido por la decisión del 2026-10-11

Lo que sigue documenta la implementación y las verificaciones previas. Las referencias a superadmin sin lectura clínica, Dirección obligatoriamente asignada y reservas excluidas para Dirección no describen el contrato vigente.

> **Estado vigente — producción, 2026-10-10:** puesta en producción autorizada y ejecutada en www.castelaochile.cl. 22 migraciones care aplicadas (36 totales), bandera activa, build remoto/TypeScript, 8 HTTP del candidato, 27 HTTP del dominio y 5 controles de autorización DB PASS. Reporte: [PRODUCCION_2026_10_10](reportes/seguimiento/PRODUCCION_2026_10_10.md). Las secciones fechadas anteriores conservan evidencia histórica; sus restricciones de despliegue quedaron sustituidas por la autorización del usuario.

> **Pendiente institucional:** capacidades/asignaciones reales se configuran en `/admin/seguimiento/equipo`; no se otorgó lectura clínica automática. Recovery v1.0 continúa como propuesta, sin piloto/criterios ni validaciones. Sin jobs/cron care. Dirección acepta y registra las decisiones operativas desde la PWA en navegador; conformidad humana general, dispositivos físicos y políticas de urgencias/custodia siguen pendientes. No se acredita escritura clínica ni PDF con sesión real en producción.

Modelo independiente de CMS y biblioteca. Toda lectura clínica exige cuenta staff activa, capacidad y asignación vigente al paciente. El paciente necesita además su cuenta de portal habilitada para leer su información. Suspender el acceso del paciente no termina su episodio ni impide la coordinación profesional autorizada. Dirección recibe asignaciones explícitas por paciente; ninguna identidad/correo obtiene privilegios especiales.

| Capacidad | Recurso / condición | No concede |
| --- | --- | --- |
| `care.directory.read` | Identidad mínima de pacientes dentro del alcance | Correo, materiales, notas |
| `care.patient.read` | Episodios/ficha compartida de pacientes asignados | Reserva ni terceros |
| `care.assignments.manage` | Asignación/episodios/catálogos; directorio mínimo para configurar | Notas clínicas sin asignación |
| `care.records.create` | Registros de pacientes asignados | Indicaciones médicas |
| `care.records.read` | Coordinación de pacientes asignados; reservas propias o concesión explícita | Reserva ajena por ser dirección |
| `care.medical.create` | Indicaciones (Paso 4) | Se concede solo expresamente |
| `care.family.read` | Terceros solo con concesión explícita adicional | Familia por ser equipo/director |
| `care.alerts.review` | Seguimiento validado (Paso 5) | Rojo automático |
| `care.decisions.manage` | Deliberación de dirección (Paso 8) | Deliberación para delegado |
| `care.reports.export` | Informes autorizados (Paso 9) | Exportación irrestricta/reservas |

Superadmin técnico configura capacidades, pero no hereda lectura clínica. Un usuario CMS puede tener capacidades profesionales sin cambiar su rol CMS. Un paciente usa su identidad existente y solo su episodio e información explícitamente compartida; nunca un resolver staff en el portal.

Visibilidad: paciente explícita, coordinación, reservado profesional, terceros/familia. Reserva y terceros se almacenan separados de coordinación. La reserva exige autor o lector explícito y alcance/capacidad activos; terceros exigen lector explícito y capacidad familiar. No se ocultará contenido recibido mediante CSS. Las versiones conservan idénticos controles. Suspensión/revocación se consulta en DB, sin depender de claims obsoletos.

Asignaciones y cambios auditados sin contenido clínico; notas sensibles solo por RPC de lectura auditada. El alcance y pruebas efectivas se precisan en cada reporte, sin prometer auditoría de copias descargadas.

## Paso 2 — Agenda y compromisos

El equipo lee eventos y asistencia de sus pacientes asignados. Crear eventos exige directorio, lectura de paciente y creación de registros; editar/cerrar un grupo exige alcance sobre todos sus participantes. Un profesional con alcance parcial recibe solo nombres/asistencia autorizados y no altera el evento completo. La asistencia observada se registra solo después de cerrar como realizada; el paciente no la autocertifica.

El portal recibe exclusivamente su participación en eventos, su plan personal y compromisos publicados explícitamente. Los planes derivan el paciente de la sesión, ignorando IDs aportados. La creación/reprogramación personal no modifica sesiones institucionales. El equipo puede leer planes autorizados, pero no completarlos haciéndose pasar por el paciente.

Compromisos de coordinación son internos por defecto. Publicarlos requiere confirmación expresa. Responsable profesional exige cuenta activa y asignación vigente; el paciente solo completa responsabilidad propia compartida y solo edita compromisos creados por él. Dirección/equipo autorizado puede verificar realización sin reemplazar la fecha original autodeclarada. Versiones, motivos y resultados compartidos siguen la visibilidad correspondiente; revocar alcance bloquea también su historia.

## Paso 3 — Reportes diarios

Paciente activo: solo obligaciones propias, editor RPC de borrador privado, envío confirmado y correcciones propias con motivo; no elige autor/paciente ni revisa profesionalmente. Borrador no tiene grant de lectura para el equipo, ni aparece en HTML de ficha. Historial de enviados conserva el mismo alcance que contenido actual. El portal recibe solo metadatos de revisión y explicación genérica de exención.

Lectura de autorreporte enviado: staff activo + `care.patient.read` + `care.records.read` + asignación vigente. Registrar revisión añade `care.records.create` y exige versión actual y profesional distinto del autor. Comentario de coordinación se guarda físicamente separado en `private.care_report_review_notes`; solo RPC staff autorizado auditado permite leerlo. Dirección no lo recibe por su rol CMS ni por configurar reglas.

`care.assignments.manage` permite configurar reglas globales aprobadas. Incorporación/excepciones requieren además lectura de paciente y asignación al paciente. El gestor puede consultar metadatos de obligaciones/incorporación sin contenido de reportes si carece de `care.records.read`. Excepciones, motivos internos e historia de cambios de exigibilidad son visibles solo al gestor dentro de su alcance. No existen grants directos de insert/update/delete sobre reportes, revisiones, reglas o borradores para authenticated/service_role; las mutaciones pasan por RPC autorizadas y transaccionales.

Revocación/suspensión comprobada con JWT previo: bloquea nueva lectura de contenido, versiones/editor/comentarios según actor. Auditoría sin texto registra configuración, generación/cierre, borrador, envío y revisión; lectura RPC de comentario interno se audita. No se afirma auditoría individual de cada SELECT REST ordinario sobre reportes enviados.

## Paso 4 — Registros de sesión

Crear/finalizar/enmendar exige staff activo, `care.patient.read`, `care.records.create`, asignación vigente de la especialidad y responsabilidad propia en una sesión no cancelada con ese paciente. El autor proviene de Auth. Finalizar añade sesión realizada, asistencia registrada, objetivo, evolución explícita y confirmación. Solo el autor modifica su borrador; la combinación paciente/sesión/autor/especialidad es única. Las versiones finales son inmutables; enmendar exige motivo y conserva la primera finalización.

Metadatos de borrador y cuerpo de trabajo solo para el autor autorizado. Los campos estructurados finales son coordinación para profesionales con `care.records.read` y alcance actual; la selección «Sin resumen compartido» no transforma esos campos en una reserva. La interfaz lo explica antes de finalizar. Contenido y versiones se leen mediante `care_record_read`, auditando actor/recurso sin texto clínico. Notas reservadas se almacenan por separado: autor o lector concedido expresamente por el autor, con cuenta, lectura y asignación vigentes. Dirección y superadmin técnico no heredan reserva. Revocar lector/asignación bloquea también versiones anteriores con el JWT previo.

Indicaciones/cambios médicos solo en Psiquiatría y con `care.medical.create`. Si cualquier versión contiene indicaciones, retirar esa capacidad impide enmendar o vaciar el contenido para eludir el control. Recovery/Psicología no aceptan esos campos. Texto manual, sin esquema de medicación ni recomendación automática.

Resumen por versión: ninguno por defecto, coordinación autorizada o publicación expresa al paciente. El portal activo recibe exclusivamente resúmenes publicados para él, sin hechos clínicos, reservas ni solicitud interna. La vista del portal presenta la publicación de la revisión actual. Una publicación histórica expresamente confirmada conserva su lectura REST por el propio paciente activo aunque una enmienda posterior sea interna; cambiar visibilidad no es una retractación de versiones ya publicadas. No se inventa política de eliminación/retención. Otro paciente no accede a ninguna revisión.

La solicitud de intervención es interna y mínima, separada de la reserva. El autor autorizado puede consultar su estado; dirección requiere `care.decisions.manage`, lectura de paciente y alcance vigente para recibirla. Recepción no equivale a ejecución, decisión o delegación (Paso 8). Nuevas tablas no conceden escritura directa a authenticated/service_role; cuerpos privados carecen de grants de lectura directa. Los operadores privilegiados de DB siguen fuera de la promesa de aislamiento de la aplicación.

## Panel, alertas y valoración manual (Paso 5)

Dashboard/listas globales/fuentes: staff activo + care.directory.read + care.patient.read + care.records.read; solo asignaciones actuales DISTINCT. CMS/superadmin sin esas capacidades no reciben indicadores clínicos. Suspender acceso del paciente al portal es independiente de lectura del equipo y del estado de su episodio.

Lectura de seguimiento individual: patient.read + records.read + asignación actual. Valoración y recepción/resolución: además care.alerts.review. Motivo, autor, evidencia y revisiones son coordinación interna; no publicación al paciente ni reserva clínica del autor. Evidencia exige registro finalizado del mismo paciente. Actor proviene de auth.uid(), versión optimista y bloqueo de paciente/alerta impiden sobrescritura concurrente. Tablas públicas solo SELECT RLS; escrituras solo RPC. Notas/historial privados sin acceso directo. No se transfieren reservas ni respuestas de autorreporte a agregados.

Solicitudes/conteos de próxima intervención exigen care.decisions.manage dentro del alcance; se envían identificador/fecha mínima a tabla y cuerpo mínimo únicamente en listado autorizado existente. Cada enlace a registro o sesión vuelve a comprobar permisos. Revocación/asignación/cuenta se consulta de nuevo aun con JWT previo. Auditoría de dashboard/seguimiento y gestión registra actor/acción/recurso, sin motivos ni textos clínicos.

record_revision se captura desde fuente finalizada, no desde payload editable. El enlace histórico aplica las mismas reglas actuales de lectura y reserva del registro; no entrega una copia privilegiada de la evidencia. Un autor/revisión enviados desde cliente son ignorados en favor de identidad y versión de DB.


Revisión UX/UI 1–5 (2026-10-09): la etiqueta «Equipo de atención» del shell orienta al profesional dentro de seguimiento; no es un nuevo rol ni una concesión. Los roles CMS y todas las capacidades/asignaciones/visibilidades mantienen sus controles originales. Labels, navegación por capacidades y cierre del menú no habilitan rutas ni datos adicionales. Regresiones nuevas: 339 SQL/RLS de atención, 104 controles de recorridos/aislamiento y biblioteca 76 SQL + 30 E2E/Auth; detalle en REVISION_UX_UI_01_05.


Paso 6 (2026-10-09): indicadores colectivos/individuales y fuentes requieren cuenta staff vigente + las tres capacidades directory.read/patient.read/records.read + asignación actual. El profesional/capacidad clínica no se infiere del rol CMS. Grupos/profesionales ajenos se rechazan; opciones solo dentro de alcance. RPC pública invoker→privada definer comprueba alcance actual incluso para cortes históricos; helpers con filas completas no son invocables por authenticated. Proxy protege las tres rutas antes de streaming. Patient/CMS/suspendidos no reciben métricas internas. Evolución devuelve solamente categoría/autor/especialidad/revisión autorizada, sin payload clínico, reservas o borradores. Fuentes vuelven a validar permisos al abrirse. Auditoría no almacena contenido clínico.


## Recovery y terceros (Paso 7)

| Recurso | Lectura | Escritura y visibilidad |
| --- | --- | --- |
| Instrumentos | Staff activo + records.read; aprobados/retirados, borradores solo con decisions.manage | decisions.manage + records.read; referencia/confirmación de aprobación; aprobados inmutables |
| Autonomía | patient.read + records.read + asignación actual, finales y borrador propio habilitado | records.create + autor de registro Recovery finalizado + asignación Recovery actual; no autor/escala desde cliente |
| Sesión familiar | patient.read + records.read + family.read + alcance actual; finales y borrador propio | Autor y responsable de evento familiar + records.create; finalizar exige sesión realizada y asistencia registrada, aunque el paciente figure ausente |
| Reserva familiar | Autor o lector explícito de esa versión, con cuenta/capacidades/alcance vigentes | Autor concede una reserva específica; una enmienda no hereda lectores. Revocar retira todas las reservas del registro para ese lector |
| Acuerdo interno | Misma lectura familiar, exclusivamente RPC privado | Profesional autorizado con records.create y alcance familiar; responsable mínimo, fecha y motivo; cumplir exige resultado; historial conservado |
| Acuerdo del portal | Propio paciente activo, proyección de seis campos | Sin escritura del paciente. Compartir requiere texto independiente y confirmación; retiro también tras cumplimiento; futuras lecturas no reciben historia interna |

Tablas nuevas: RLS, SELECT solo para metadatos públicos, sin escritura directa authenticated/service_role; cuerpos/historias privados sin grants. Siete RPC invoker con comprobación en implementaciones privadas definer. Proxy protege rutas antes de streaming; acciones verifican origen, Auth y capacidades, DB vuelve a comprobar alcance/autoría. No se autoriza con user_metadata ni se infiere clínica desde roles CMS. Auditoría identificadores/acción/actor sin evidencia, participantes, notas o motivos. La publicación explícita comparte únicamente patient_body/fecha/estado, nunca título interno/responsable/fuente/reserva. Identidades y datos QA sintéticos eliminados del entorno al finalizar; capturas neutrales permanecen en evidencia local ignorada.

Salida Paso 7: 495 controles SQL/RLS acumulados (95 nuevos) y 33 recorridos nuevos PASS, incluidos permisos actuales con JWT anterior, autoría/especialidad, aislamiento de borradores/reservas y proyección mínima del paciente. Regresión biblioteca/Auth actual 76 SQL/30 E2E PASS; limpieza independiente y guard habilitado. Conteos y límites en PASO_07.


## Decisiones, delegación y supervisión (Paso 8)

Dirección: staff activo + patient.read + records.read + decisions.manage + asignación vigente por paciente. CMS/superadmin sin capacidades/asignaciones no recibe deliberación. Borrador de decisión solo autor; final y revisiones para dirección autorizada; enmienda solo autor. Fuentes deben pertenecer al paciente, ser finales y conservar su revisión; abrirlas aplica el permiso actual de origen y no concede reservas.

Destinatario de tarea: staff activo + patient.read + records.create + asignación actual + responsable actual de esa tarea. No recibe ID de decisión, deliberación, fuentes ni notas; solo instrucción/plazo/estado/resultado e historia de las versiones que le fueron asignadas. Reasignar retira el acceso del responsable anterior y limpia resultado actual; dirección conserva historia completa. Solo el destinatario informa ejecución; solo dirección verifica, devuelve o cancela. Cancelación de decisión comparte un motivo neutro fijo para las tareas, sin copiar motivo interno. Paciente sin acceso a estas RPC, tablas o acciones.

Las cinco tablas son privadas, RLS habilitada y sin grants directos a aplicación/service_role. RPC públicas invoker hacia implementaciones privadas definer con search_path vacío, Auth/capacidades/alcance actuales y bloqueo de decisión común a cierre/delegación. Dos helpers internos sin EXECUTE authenticated. Proxy valida objeto/paciente antes de streaming; acciones repiten origen y permisos, DB decide actor. Auditoría actor/acción/recurso sin contenido.

Supervisión: dirección autorizada ve equipo dentro de sus pacientes; profesionales ven sus propias tareas/agenda/registros. Filtro de un profesional ajeno rechazado, no solo vacío. Familia requiere family.read actual del lector y profesional. Sin telemetría de movimientos/texto ni acceso a reservas; recepción de alerta es estado registrado, no entrega de notificaciones.

Mi trabajo limita el filtro al usuario actual también para dirección; consultar a otros se hace desde Supervisión. Validación Paso 8 PASS: 97 SQL nuevas/592 acumuladas y 28 recorridos REST/navegador con sesiones normales; incluye aislamiento de borradores, historia propia del delegado, revocación/reasignación con JWT anterior, lectura familiar excluida tras revocación, fuente original y rechazo antes de streaming. Biblioteca/Auth actual: 76 SQL/30 E2E PASS. Consulta independiente dejó Auth/perfiles/las cinco tablas nuevas a cero y guard superadmin habilitado; evidencia y límites en PASO_08. Sin publicación al paciente ni activación productiva.

## Informes y PDF privado (Paso 9)

Validación final local: 70 comprobaciones SQL nuevas y 25 controles REST/navegador/PDF, incluidas revocaciones con JWT previo, tarea reasignada e informe/PDF ya preparado, denegación de tablas/helpers/Storage directo y actores falsificados. Limpieza independiente con informes/versiones/intentos/objetos PDF a cero; bucket privado y guard de último superadmin habilitado. Evidencia y límites en PASO_09; no activación productiva.

Generar/listar/abrir: staff activo, directory.read + patient.read + records.read + reports.export y asignación actual a cada paciente incluido. Autor original o dirección con decisions.manage puede abrir; solo autor regenera. Alcance congelado: perder una asignación impide abrir el informe entero, incluidas versiones/PDF históricos. Se exigen también las capacidades family.read y decisions.manage que estaban presentes al generar. Ganarlas cambia el contexto y requiere crear otra serie, evitando incorporar contenido adicional al regenerar una serie antigua. Paciente/CMS y profesional sin export no acceden.

Tres tablas privadas con RLS y sin grants directos. RPC invoker/definer con search_path vacío y actores derivados de Auth. Helpers de fuentes/snapshot/elegibilidad sin EXECUTE de aplicación. Proxy comprueba objeto antes de streaming; página/acción/DB repiten comprobaciones actuales. La descarga autoriza antes y después de leer bytes, verifica tamaño/SHA256 y usa no-store/noindex/CSP sandbox, sin URL pública ni firmada.

Bucket care-informs privado (PDF, 5 MB), política restrictive que niega todo acceso Storage de anon/authenticated incluso ante otras políticas permisivas. Servidor usa service_role solo con claves de objetos acuñadas por la DB y reserva normal autorizada. Finalización restringida a service_role, token del intento, plazo y metadata Storage reales; revisa permisos actuales del actor original. Cada intento queda pending/ready/failed; no se sobrescribe un PDF confirmado. Auditoría conserva acción/actor/recurso, sin contenido, token ni ruta de archivo. La publicación al paciente continúa excluida. Resultados efectivos en PASO_09.

Revisión de privacidad Paso 9: las instrucciones mínimas de tareas también conservan su autorización de recurso. Para un profesional sin dirección, todas las tareas presentes en cualquier versión deben seguir asignadas a ese usuario y este debe seguir habilitado para ejecutarlas. Reasignación/retiro de permiso bloquean la serie histórica y sus PDFs. El contexto de idempotencia incorpora el conjunto actual de tareas propias; si cambia, generar otra serie, sin regenerar una anterior con contenido privado adicional. Dirección con alcance completo conserva lectura autorizada. Se verifican SQL y navegación con JWT anterior; resultados exactos en PASO_09. Revisión o regeneración vuelve al informe vigente para no dejar una versión histórica como resultado de una escritura.

## Paso 10 — Registro de avance inicial (2026-10-10; cierre actualizado abajo)

Programaciones requieren cuenta administrativa activa y directory.read, patient.read, records.read, reports.export, decisions.manage, con alcance actual de cada paciente. Autorización permanente explícita, propietario derivado de Auth, población/contexto congelados. Solo propietario autorizado controla/reintenta. Dirección puede supervisar fallos de otros responsables si conserva acceso a toda la población y familia incluida; no asume la autorización ajena. Regla exige además alerts.review. Paciente/CMS/sin export y service_role no pueden invocar cron ni forjar autorizaciones. Sin tablas privadas expuestas. Comparación exige autor original, contexto actual y permiso de todo el informe; RPC normal omite fuentes del periodo anterior.

## Paso 10 — Cierre validado localmente (2026-10-10)

Validación local efectiva del Paso 10: 85 SQL nuevos y 22 REST/navegador/cron/PDF. Cuenta suspendida, paciente, CMS, sin export, alcance parcial, propietario ajeno y worker invocado por service_role quedan denegados. Con JWT previo, revocar un paciente del alcance retira job, comparación e informe/PDF histórico completo. Dirección con alcance íntegro supervisa el fallo seguro de otro responsable incluso si este perdió permisos, sin botones ni RPC de control ajeno. Privacidad del periodo anterior: nunca sale en care_inform_read; comparación exige contexto/autor actuales, todas las tareas propias y autorización vigente. Link ausente para versión legacy, contexto distinto o comparación fuera del último año; fuentes originales conservadas. Cinco tablas RLS y sin grants directos; EXECUTE worker denegado a authenticated/service_role comprobado independientemente. No aprobación clínica o publicación al paciente automática.

Revisión final de concurrencia del Paso 10: pausa posterior a selección de cola reproducida con fallo; worker verifica enabled antes de cada intento. Cinco controles nuevos comprueban que el run pausado conserva pending/0 intentos, sin consumir historia, y se ejecuta una vez al reanudar. Total final 747 SQL (85 nuevas); 22 controles de cron real repetidos PASS y limpieza/PDF finales nuevamente comprobados. Configuración de alcance inmutable, sin cambio de permisos ni despliegue.

## Paso 11 — Privacidad y recuperación comprobadas (2026-10-10)

La reinstalación limpia y recuperación aislada pasan 823 controles SQL existentes (747 atención + 76 biblioteca); no son controles nuevos. El manifiesto compara USAGE/CREATE de schemas, columnas/defaults, índices/restricciones, RLS/políticas, funciones/search_path/grants y ACL efectivos. --no-owner evita modificar roles administrados; los permisos efectivos de schemas para anon/authenticated/service_role se capturan, reaplican y comparan en la base desechable.

Restauración: originales y dos reservas/versiones con hashes conservados; dirección autenticada lee el informe sin texto reservado. Pacientes A/B y CMS, acceso directo a reserva y asignación revocada siguen denegados con identidades SQL normales. La prueba de revocación se revierte en su transacción. El objeto privado neutral se recupera de una copia separada y coincide clave/tamaño/SHA256; servicio solo opera su objeto propio. Ningún cron se crea o activa al restaurar.

Regresión web independiente: CMS normal crea/edita un borrador persistido, anon no lo lee, acceso clínico CMS denegado, suspensión bloquea la sesión previa; respuestas privadas no-store/noindex. Mapa de datos y fuentes para revisión institucional en DATOS_PRIVACIDAD. MFA, aceptación real y encuadre jurídico pendientes; no certificación normativa ni recuperación completa de Auth/plataforma remota.


### Cierre técnico del Paso 11 (2026-10-10)

232 controles funcionales de atención en ocho suites; 424 UX/84 rutas-estados/33 contextos, cero hallazgos. Biblioteca 76 SQL/30 E2E (Mailpit local), 95 unitarias y lint/tipos/build PASS. 747 SQL actuales y 823 controles existentes repetidos en migraciones limpias, sin contarlos como nuevos. Recuperación aislada 18 escenarios y web/CMS/blog 36 controles (26 capturas + 10 escenarios) PASS. Seis PDFs actuales/36 páginas comprobadas e inspeccionadas. Limpieza independiente: 21 conteos más cuatro recursos propios a cero; guard habilitado, bucket privado y cron detenido. Estado/evidencia y fallos intermedios en PASO_11; resumen contrastado tmp/care-qa/step-11-final-validation.json. Aceptación institucional/dispositivos y decisiones con el cliente en espera por instrucción del usuario. Sin producción, commit/push/deploy o correos reales.

## Aceptación de dirección y PWA (2026-10-10)

El usuario definió que dirección siempre valida y acepta todos los recorridos usando su cuenta/correo actual o el superadministrador. Esta atribución de responsabilidad no concede capacidades clínicas, asignaciones ni lectura de reservas a una cuenta técnica. Para ejecutar la pauta se usan cuentas autorizadas y perfiles de prueba con los permisos existentes; no se codifica un email ni se modifica Auth/RLS. Firma humana aún pendiente.

El manifiesto y los iconos PWA son públicos y contienen solo identidad institucional. Inicio / y alcance / no conceden acceso a las rutas cubiertas por ese alcance. /admin, /pacientes y descargas conservan autenticación, comprobación de permisos actuales y encabezados privados. No se añadió service worker ni almacenamiento clínico sin conexión. Evidencia y límites del suplemento móvil en PASO_11_PWA_MOVIL.


### Cierre técnico del suplemento PWA/móvil (2026-10-10)

366 controles móviles Chromium/WebKit en 20 rutas/estados y seis contextos; 149 comprobaciones UX en diez contextos; 101 recorridos funcionales (33 Recovery/familia, 20 reportes y 48 dashboard/métricas), todos PASS y sin hallazgos. Build/tipos integrados, lint y 99 unitarias PASS (cuatro nuevas de CSP). No sumar esta regresión parcial a los 232/424 históricos como funciones nuevas. Inspección visual de 24 capturas actuales; limpieza independiente: 21 conteos y cuatro recursos a cero, guard/RLS/bucket preservados y cron detenido. Evidencia: tmp/care-qa/mobile/final-validation.json y cleanup-validation.json; reporte PASO_11_PWA_MOVIL. Responsable y plataforma definidos: dirección acepta con cuenta actual o superadministrador; Android/iPhone en PWA/navegador. Instalación, teclado/notch reales, modelos/versiones y firma pendientes. Sin producción ni activación.


## Paso 11 — Ampliación móvil de recorridos profesionales (2026-10-10)

Validado localmente en el alcance técnico: 452 controles móviles Chromium/WebKit en 24 rutas-estados/16 contextos, 275 UX/23 contextos y 131 funcionales/cinco suites. Inspección de 36 capturas seleccionadas y seis PDF actuales/36 páginas. Detectados y corregidos texto desactualizado de capacidades y desborde del selector de participantes en WebKit al reducir 390→320; el ajuste de ancho inicial fue insuficiente. Repetición final afectada: 126 móviles/42 UX/32 funcionales PASS tras el nuevo build/tipos, sin sumar duplicados. ESLint focalizado y sintaxis PASS. Limpieza independiente: 47 conteos y cuatro recursos a cero; guard/RLS/bucket/cron/worker preservados.

La cobertura anterior más la ampliación suma 818 móviles/44 rutas-estados/22 contextos, 424 UX/33 contextos y 232 funcionales/ocho suites sobre el build de 18:32 UTC. Tras las correcciones se repitió planificación/capacidades; las otras suites y las 99 unitarias conservan su fecha anterior. Evidencia por build y repeticiones en PASO_11_PWA_PROFESIONALES y tmp/care-qa/mobile/{extended-final-validation,copy-fix-validation,extended-cleanup-validation}.json. No nueva migración, Auth, capacidad o fórmula clínica. Dirección acepta con cuenta actual/superadministrador; Android/iPhone PWA/navegador definidos. Instalación, teclado/notch físicos, modelos/versiones, firma y criterios institucionales pendientes. Sin producción ni activación.

Las cinco suites conservan JWT ordinario y verifican autor/alcance vigente, reservas, permiso médico/publicación, bloqueo de CMS y superadministrador técnico, revocación con sesión previa y privacidad de tareas/informes/jobs. La auditoría médica precede a la prueba de retiro de capacidad; ambas se ejecutan. Corregir la descripción no concede acceso clínico al aceptante ni modifica grants. SQL/RLS integral conserva su evidencia previa.

## Complemento Recovery RC-00 (2026-10-10)

Auditoría validada localmente: nueve secciones del DOCX fuente y complemento contrastados con código/esquema. Diferencias y dependencias en CASTELAO_RECOVERY_COACH y reportes/recovery/RC_00; estado por paso en CASTELAO_RECOVERY_COACH_STATUS. RC-01 en implementación. No hay rúbrica aprobada: ICC-REC-AUT-001 v1.0 es propuesta. Registro cualitativo independiente de niveles, sin score global ni criterios activados. Históricos y permisos conservados; pruebas previas no prueban cambios nuevos. Aclaración del usuario: Dirección/superadmin acepta solo por PWA; no bloquear programación por un recorrido independiente de navegador/dispositivo. Nada desplegado.
# Complemento Recovery — RC-01, 2026-10-10

care_rc_commitment_review exige care.records.create y paciente/asignación activa Recovery o Dirección; care_rc_commitments exige care.records.read y alcance vigente. Evidencia/historia privada sin lectura directa autenticada ni paciente; CMS técnico no hereda acceso. SQL/JWT normal verifican revocación, fuera de alcance y concurrencia. Autor/fecha generados por servidor. UI restringe la acción por especialidad sin sustituir la autorización RPC. Reporte RC_01.


## Complemento Recovery — RC-02, 2026-10-10

Gobierno/validación exigen care.decisions.manage explícita; escritura semanal care.records.create y asignación Recovery/Dirección vigente, lectura por recurso care.records.read/patient.read. Borrador solo autor. Paciente/CMS sin lectura; profesional no gobierna. JWT existente revocado y ruta directa bloqueados. RPC/grants y legado separados: renombrada función anterior sin acceso directo para impedir bypass documental. RC_02 contiene evidencia nueva.


## Complemento Recovery — RC-03, 2026-10-10

Supervisión reutiliza directory/patient/records.read y asignación vigente; filtros de pacientes/grupos jamás amplían alcance. Consulta interna sin grants directos. Solo metadata de borrador propio, sin textos privados agregados. Paciente/CMS/IDs ajenos/grupo inactivo/revocación probados en SQL/JWT. Enlaces de fuente vuelven a comprobar acceso.


## Complemento Recovery — RC-04, 2026-10-10

Informe mensual privado con entrega/revisión separadas y fuentes semanales; constancia real de contacto versionada; reiteración en motor existente sin valores ni activación inicial. RC_04 registra 18+45 SQL, regresión completa 928, 113 unitarias y 27 funcionales/156 móviles/50 UX PASS. Repetición final de presentación PDF pendiente; RC-05 en curso, sin afirmar cierre. Dirección/superadmin acepta PWA abierta en el navegador o instalada; no concede capacidad clínica por rol CMS. Propuesta v1.0 y criterio intactos; producción sin cambios.


RC-04 cerrado localmente: repetición final 27 funcionales PASS, 156 móviles/50 UX sin hallazgos, PDF privado de cuatro páginas inspeccionado tras corregir título aislado. RC_04 conserva pruebas y fallos corregidos. RC-05 en curso: estados individuales desde agenda grupal, 31 funcionales de registros/154 móviles/54 UX PASS, mensual no aplicable fuera de Recovery; 930 SQL actuales y recuperación con 1.006 sobre instalación nueva/136 Recovery sobre esquema restaurado. Sin aceptación institucional ni producción.

## Complemento Recovery — RC-05, cierre local 2026-10-10

Verificación final por lectura independiente: ocho tablas privadas Recovery con RLS y sin grants directos a anon/authenticated/service_role/PUBLIC; buckets care privados, cron detenido y protección superadmin habilitada. Cero cuentas/datos temporales Recovery. RPC y exportaciones conservan Auth/capacidades/asignación vigentes; las suites ejercen revocación con JWT previo. Agenda expone solamente borrador propio; aceptar la PWA como superadmin CMS no concede permisos clínicos.

RC-00 a RC-05 validados técnicamente en castelao-patient-qa. RC_05 registra nueve suites/266 funcionales, 1.032 controles móviles Chromium/WebKit en 30 contextos y 492 UX en 41, cero hallazgos. 930 SQL seguimiento + 76 biblioteca; 113 unitarias, lint y build/TypeScript PASS. Biblioteca/Auth 30 y web/CMS 36 controles PASS; siete PDF privados/40 páginas renderizadas e inspeccionadas. Instalación fresca 36 migraciones/1.006 SQL y restauración 136 Recovery, sin sumarlos a la regresión base. Consolidación y limpieza independiente: tmp/recovery-qa/release-summary.json.

Pendiente institucional: aprobar propuesta/piloto/criterio de evidencia, ventana global común y equivalencias; excepción motivada sin compromiso; parámetros/exclusiones/revisión de reiteración; protocolo/canales de urgencias y retención/respaldo. Dirección/superadmin acepta PWA abierta en el navegador o instalada según el usuario; aceptación humana pendiente, no bloqueo de programación local. ICC-REC-AUT-001 v1.0 sigue propuesta sin aprobador y criterio apagado; ningún paciente validado. Sin producción, migraciones remotas, push, despliegue ni mensajes externos.

## Aclaración de aceptación: PWA en navegador

Dirección/superadmin autorizado debe poder revisar y aceptar desde la PWA abierta en el navegador, sin instalación obligatoria ni requisito de modo standalone. La PWA instalada ofrece los mismos recorridos. No se exige una aceptación separada para cada modo. Las comprobaciones en teléfonos reales son evidencia de compatibilidad; no obligan a instalar la PWA para registrar una aprobación.

«Aceptación pendiente» describe que todavía no consta la conformidad humana de Dirección sobre el sistema, no una función deshabilitada ni una limitación del navegador. La pauta de aceptación del sistema es documentación para esa validación humana; no se ha implementado una firma global del sistema dentro de la aplicación. Las decisiones operativas ya implementadas —aprobar la rúbrica, autorizar piloto y revisar el mensual— sí tienen formularios web con confirmación y guardado real, sujetos a Auth y permisos actuales. No se ejecuta ni presume aprobación institucional por esta aclaración.

## Autonomía personal — local, 2026-10-17

El paciente activo lee y registra su propio autorreporte y acuerdos. La lectura del equipo exige el alcance ya vigente de ficha y registros; escribir exige coach/Dirección autorizado mediante `care_rc_writer`. Cada aceptación o constancia representa al usuario autenticado, sin suplantar a otra persona. Las observaciones reservadas permanecen en tablas privadas, accesibles a autor y Dirección; ni el paciente ni otro coach asignado las recibe. Los informes incluyen únicamente observaciones y revisiones compartidas. No se cambian capacidades ni roles. Revocación por asignación se comprueba en base de datos. [Estado](CASTELAO_AUTONOMIA_PERSONAL_STATUS.md).
