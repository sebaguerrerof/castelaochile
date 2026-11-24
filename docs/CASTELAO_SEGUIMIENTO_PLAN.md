# Ejecución de seguimiento terapéutico

> **Corrección publicada y verificada: agenda y acceso por rol — 2026-10-11:** Dirección no requiere asignaciones individuales para su agenda. Los perfiles clínicos aplican sus accesos automáticamente; la pantalla de equipo permite asignar pacientes y ya no presenta casillas de capacidades. [Reporte y estado de verificación](reportes/seguimiento/AGENDA_ROLES_2026_10_11.md).

> **Modelo vigente — publicado en producción, Dirección y perfiles, 2026-10-11:** por decisión explícita del usuario, `superadmin` representa a la Dirección del centro y tiene acceso completo a sus pacientes, equipo, biblioteca y seguimiento, sin asignación individual ni configuración adicional. Psicólogo, Psiquiatra y Coach Recovery son perfiles reales con permisos iniciales automáticos y alcance por asignación vigente. El correo no se usa como excepción de autorización. Ver [reporte de la mejora](reportes/seguimiento/UX_DIRECCION_PERFILES_2026_10_11.md). Esta decisión sustituye el modelo histórico de «superadmin técnico sin lectura clínica» descrito más abajo.

> **Pendiente institucional:** Recovery sigue sin rúbrica aprobada; no se activó piloto ni cron care. La aceptación humana corresponde a Dirección/superadmin desde la PWA por navegador. Las pruebas técnicas de Chromium/WebKit no acreditan uso en teléfonos físicos. No se aprobaron políticas de urgencias ni custodia.

## Antecedentes y evidencia histórica

> **Estado vigente — producción, 2026-10-10:** puesta en producción autorizada y ejecutada en www.castelaochile.cl. 22 migraciones care aplicadas (36 totales), bandera activa, build remoto/TypeScript, 8 HTTP del candidato, 27 HTTP del dominio y 5 controles de autorización DB PASS. Reporte: [PRODUCCION_2026_10_10](reportes/seguimiento/PRODUCCION_2026_10_10.md). Las secciones fechadas anteriores conservan evidencia histórica; sus restricciones de despliegue quedaron sustituidas por la autorización del usuario.

> **Pendiente institucional:** capacidades/asignaciones reales se configuran en `/admin/seguimiento/equipo`; no se otorgó lectura clínica automática. Recovery v1.0 continúa como propuesta, sin piloto/criterios ni validaciones. Sin jobs/cron care. Dirección acepta y registra las decisiones operativas desde la PWA en navegador; conformidad humana general, dispositivos físicos y políticas de urgencias/custodia siguen pendientes. No se acredita escritura clínica ni PDF con sesión real en producción.

Fecha: 2026-10-09 · rama `codex/seguimiento-terapeutico` · base `4fbf785` con trabajo previo sin commit conservado.

## Inventario comprobado (Paso 0)

| Módulo | Estado al inicio | Evidencia / reutilización |
| --- | --- | --- |
| Auth, recuperación, invitaciones | Existente | `src/lib/supabase`, `src/lib/auth/admin.ts`, `src/app/auth/confirm`, acciones pacientes; identidad compartida |
| Shell administrativo y portal | Existente | `admin-shell.tsx`, `patient-shell.tsx`; azul/naranja/gris, Arial/PT Sans, componentes `admin-ui` |
| Pacientes, grupos, permisos biblioteca | Existente | `patient_profiles`, `therapeutic_staff_permissions`, `therapy_groups`; migración 20261008142003 |
| Biblioteca privada y auditoría de biblioteca | Existente | RLS, RPC, bucket privado, rutas `/pacientes/biblioteca` y `/admin/biblioteca` |
| Capacidades clínicas, asignaciones, episodios | Nuevo | Ninguna tabla o ruta encontrada en código/migraciones |
| Agenda, asistencia, planes, compromisos | Nuevo | No existen; los materiales tipo «activity» no son eventos ni asistencia |
| Reportes mañana/noche | Nuevo | Los materiales tipo «report» son documentos de biblioteca, no obligaciones ni autorreportes |
| Sesiones, familia, decisiones, alertas, informes | Nuevo | No existe modelo de seguimiento; no reutilizar analítica web como métrica terapéutica |

Los resultados productivos relatados en documentación anterior son históricos. No se consultaron datos clínicos remotos ni se reprodujeron sus conteos como pruebas actuales.

## Secuencia y puertas de salida

| Paso | Entrega | Aceptación necesaria |
| --- | --- | --- |
| 0 | Auditoría, inventario, navegación, permisos, métricas, trazabilidad | Revisión de código y documentación; divergencias registradas |
| 1 | Capacidades, asignaciones, episodios/fases y visibilidad | Migración aditiva local; aislamiento y revocación reales; configuración usable |
| 2 | Ficha, agenda, asistencia, plan y compromisos | Recorrido paciente/profesional y reprogramación trazable |
| 3 | Reportes diarios | Unicidad, deadlines configurados, borrador/corrección/historial y cierre fiable |
| 4 | Registros profesionales | Autor servidor, borrador/final/enmienda, visibilidad y restricción médica |
| 5 | Dashboard y alertas básicas | Gráficos reales con evidencia; revisión manual, gris sin valoración |
| 6 | Indicadores completos | Periodos 7/30/90/ingreso, población, drilldown y accesibilidad |
| 7 | Recovery y familia | Rúbrica aprobada/versionada; terceros segregados |
| 8 | Decisiones y supervisión | Deliberación exclusiva, delegación mínima y cierre con resultado |
| 9 | Informes | Consolidación determinista y PDF privado renderizado/inspeccionado |
| 10 | Jobs y reglas | Idempotencia, reintentos, scheduler local verificado, fallos visibles |
| 11 | QA y activación preparada | Regresión, REST/RPC, móvil/teclado, recuperación, checklist sin despliegue |

## Recorridos y estados acordados técnicamente

Integrar «Seguimiento» en el shell actual solo con capacidad explícita. Dirección/profesionales: listado autorizado → ficha → acción contextual; gestión de equipo y asignaciones en el mismo módulo. Paciente: Hoy → planificación/reportes/compromisos/progreso; biblioteca conserva rutas actuales. Formularios de una acción, paciente contextual, errores recuperables, guardado visible. No mostrar enlaces a módulos aún inexistentes.

Fichas con Resumen, Planificación/actividad, Reportes, Evolución, Familia y Seguimiento según permiso. No agregar pestañas vacías como sustituto de implementación. Sin datos nunca equivale a estabilidad, cumplimiento o verde. El estado de la cuenta se distingue del tratamiento. Navegación privada sin prefetch, no-store/noindex y sin analítica pública.

Cada paso se documenta antes de continuar al siguiente. Un paso implementado no se marca validado sin sus pruebas; QA pendiente queda explícita.

Revisión solicitada antes del Paso 6: volver sobre los recorridos y UX/UI de los pasos 1–5, corregir hallazgos y publicar su evidencia en `reportes/seguimiento/REVISION_UX_UI_01_05.md`. La puerta local incluye interfaz móvil, formularios desplegados, enlaces reales, contraste, foco, barra contraída, recuperación de errores y regresiones de permisos/biblioteca/Auth. No sustituye la aceptación con profesionales y dispositivos reales del Paso 11 fue validada antes de iniciar el Paso 6.

Entregas locales realizadas: Paso 0 auditado; Paso 1 base de permisos/modelo validada; Paso 2 ficha/agenda/planes/compromisos validado; Paso 3 reportes diarios con reglas/obligaciones, borrador/envío/correcciones y revisión validado; Paso 4 registros de las tres especialidades con autoría real, borrador/finalización/enmiendas, reserva explícita, permiso médico y solicitudes mínimas validado. Paso 5 validado: panel con asistencia/reportes y fuentes, alertas deduplicadas, valoración manual con revisión exacta de evidencia y pendientes profesionales derivados de agenda. La salida básica de Etapa 1 se verificó solo en QA local; el Paso 6 completa indicadores y filtros. Generación de reportes actual al consultar: automatización/scheduler verificado sigue siendo dependencia del Paso 10 y no se declara ejecutada.

## Decisiones institucionales pendientes

Catálogo oficial de fases/motivos; campos definitivos y horarios de reportes; exenciones; rúbrica Recovery; vigencia de evaluaciones; protocolo urgente y contactos aprobados; retención/consentimientos/encuadre jurídico; aceptación por usuarios reales. No se crean fases, escalas, horarios ni criterios clínicos ficticios. Catálogos sin configuración muestran vacío explicativo.

Guías consultadas: Next 16.3.6 locales (layouts/pages, authentication, server-actions, forms); [RLS Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security), [SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [changelog](https://supabase.com/changelog). El índice markdown falló por tipo de contenido; se consultó la versión HTML. Sin actualización de paquetes.


Ejecución Paso 6 autorizada el 2026-10-09 después de la revisión UX/UI: indicadores colectivos e individuales sobre fuentes reales existentes, filtros de periodo/grupo/profesional/tipo, 7/30/90 y último episodio, comparación equivalente, fuentes de 25 registros, stock/flujos separados y avisos de calidad. Mantiene pendientes instrumentos/familia del 7, decisiones del 8 y plazos/jobs del 10. Resultados ejecutados y estado de cierre en STATUS/PASO_06. No se declara activación ni aceptación institucional.


Puerta local Paso 6 aprobada: 400 SQL/RLS, 19 recorridos nuevos de métricas, 123 controles funcionales de atención, 170 UX/34 rutas/14 contextos, 76 SQL/30 E2E biblioteca, 95 unitarias y lint/tipos/build. QA sintética completamente retirada y guard activo. Siguiente entrega: Paso 7; requiere instrumentos de autonomía/visibilidad familiar, sin inferir una escala oficial. Ver PASO_06 para límites, evidencia y fallos corregidos.


## Paso 7 — Ejecución local (2026-10-09)

Se reutilizan ficha, panel, Auth, capacidades, asignaciones y portal. Autonomía por dimensión desde un registro Recovery finalizado propio, evidencia cualitativa/no evaluable y enmiendas; instrumentos con borrador, aprobación explícita, referencia/versionado inmutable y retiro sin reactivar versiones anteriores. El usuario confirmó ausencia de rúbrica institucional aprobada: esa aprobación sigue pendiente, independiente de verificar el mecanismo con fixtures sintéticos eliminados. Familia usa agenda realizada, participantes mínimos, fuentes y reservas por versión/lector; acuerdos con fecha/responsable/resultado y texto publicado separado. No se crean cuentas familiares.

Criterio de salida local: persistencia real, RLS y revocaciones con JWT previo, fuentes/periodos/paginación, gráfico con huecos/versiones, móvil/teclado/contraste y regresiones. Puerta local verificada: 495 SQL/RLS (95 nuevas), 33 recorridos nuevos/156 funcionales de atención, 227 UX/46 rutas-estados/18 contextos sin hallazgos, biblioteca 76 SQL/30 E2E, 95 unitarias y lint/tipos/build PASS; fixtures retirados y guard habilitado. Estado y evidencia en PASO_07/STATUS. El cierre de mecanismos locales no certifica aprobación clínica ni aceptación institucional. Siguiente módulo independiente: Paso 8, decisiones/delegación/supervisión; mantener pendientes 9–11 y reglas/plazos clínicos.


## Paso 8 — Ejecución local (2026-10-09)

Registro de dirección desde ficha o solicitud, situación/evaluación/decisión/responsable/fechas/fuentes y revisiones; borradores exclusivos del autor. Deliberación y tareas en tablas privadas separadas. Delegación solo de instrucción mínima, responsable vigente y plazo opcional explícito o término de agenda. Ejecución informada por el responsable, revisión/verificación por dirección, cambio de responsable/cancelación/historial; cierre exige resultado y tareas resueltas. No publicación automática al paciente.

Supervisión del equipo autorizado y Mi trabajo propio reutilizan agenda, registros, familia, alertas y tareas. Fuentes paginadas y gráficos de cantidades por estado con enlaces. Sin regla institucional de plazo configurada para registros: pendientes sin atribuir atraso; el usuario indicó «No necesariamente» al consultar un plazo aprobado; no se asume una regla universal. Plazos/reglas globales del Paso 10 permanecen pendientes. Puerta local: SQL/RLS/REST, persistencia y concurrencia, navegación/móvil/teclado, fuentes exactas, regresión y limpieza. Resultados efectivos en PASO_08/STATUS; no activación.

Puerta local Paso 8 verificada: 592 SQL/RLS (97 nuevas), 28 recorridos nuevos y 184 funcionales de atención, 304 UX/63 rutas-estados/21 contextos sin hallazgos; biblioteca 76 SQL/30 E2E actuales, 95 unitarias y lint/tipos/build PASS. Regresión de seis suites, nueva repetición del Paso 8 después de ajustes visuales y consulta independiente sin fixtures/guard habilitado. Reporte PASO_08 y seis documentos actualizados. Los mecanismos de Etapa 2 quedan verificados localmente; rúbrica Recovery y aceptación institucional continúan pendientes. Siguiente Paso 9: consolidación semanal/mensual, revisión y PDF privado con render inspeccionado; jobs/reglas en 10 y volumen/restauración/aceptación en 11.

## Paso 9 — Ejecución local (2026-10-09)

Autorizado por el usuario: informes semanales/mensuales en el panel existente, alcance individual o colectivo de hasta 50 pacientes, periodos civiles cerrados y corte de conocimiento explícito. Snapshot determinista, revisión deliberada que conserva versión original, regeneración con motivo y bloqueo optimista, fuente original y PDF privado por revisión. Nunca copiar reservas, participantes familiares ni evaluación interna de dirección. Estado inicial «Generado a partir de registros; pendiente de revisión».

Puerta de salida aprobada localmente: 662 SQL/RLS (70 nuevas), 25 controles nuevos y 209 funcionales de atención; 363 UX/74 rutas-estados/26 contextos, cero hallazgos. Biblioteca 76 SQL/30 E2E, 95 unitarias y lint/tipos/build PASS. Versiones y bytes originales conservados, revocación bloquea informe/PDF listo, reintento visible y fuentes completas paginadas. Cinco PDF reales/34 páginas comprobadas e inspeccionadas visualmente; muestras finales de panel/móvil revisadas. Limpieza independiente: 17 conteos QA a cero, guard habilitado y bucket privado. PDFKit fijado en servidor, sin proveedor externo. Evidencia efectiva en PASO_09/STATUS; sin activación. Siguiente Paso 10: scheduler/reglas, comparación y recuperación operativa; aceptación/volumen/restauración del 11 pendientes.

Revisión de privacidad Paso 9: las instrucciones mínimas de tareas también conservan su autorización de recurso. Para un profesional sin dirección, todas las tareas presentes en cualquier versión deben seguir asignadas a ese usuario y este debe seguir habilitado para ejecutarlas. Reasignación/retiro de permiso bloquean la serie histórica y sus PDFs. El contexto de idempotencia incorpora el conjunto actual de tareas propias; si cambia, generar otra serie, sin regenerar una anterior con contenido privado adicional. Dirección con alcance completo conserva lectura autorizada. Se verifican SQL y navegación con JWT anterior; resultados exactos en PASO_09. Revisión o regeneración vuelve al informe vigente para no dejar una versión histórica como resultado de una escritura.

## Paso 10 — Registro de avance inicial (2026-10-10; cierre actualizado abajo)

Paso 10 autorizado por el usuario: cerrar programaciones privadas y reglas operativas con ejecución pg_cron real, comparaciones congeladas y supervisión de fallos. Se conservan Auth, panel, capacidades, asignaciones, formularios y métricas. Código y 734 controles SQL locales comprobados; recorrido real, regresión completa y PDF en curso. Paso 11 sigue pendiente: aceptación, volumen y recuperación institucional.

## Paso 10 — Cierre validado localmente (2026-10-10)

Puerta local del Paso 10 verificada: 747 SQL/RLS (85 nuevas), 22 controles nuevos y 231 funcionales de atención en ocho suites; 424 UX/84 rutas-estados/33 contextos, cero hallazgos. Biblioteca 76 SQL/30 E2E, 95 unitarias y lint/tipos/build PASS. Cron nativo real verificado en QA y detenido al finalizar. Seis PDFs reales/36 páginas verificadas e inspeccionadas. Limpieza independiente: 21 conteos a cero, cinco tablas nuevas RLS, guard habilitado y bucket privado. Etapa 3 tiene informes y scheduler comprobados únicamente en el entorno QA autorizado. Paso 11 sigue pendiente: QA integral de aceptación institucional, dispositivos físicos, volumen, retención y respaldo/restauración; no equivale a autorización de despliegue.

Revisión final de concurrencia del Paso 10: pausa posterior a selección de cola reproducida con fallo; worker verifica enabled antes de cada intento. Cinco controles nuevos comprueban que el run pausado conserva pending/0 intentos, sin consumir historia, y se ejecuta una vez al reanudar. Total final 747 SQL (85 nuevas); 22 controles de cron real repetidos PASS y limpieza/PDF finales nuevamente comprobados. Configuración de alcance inmutable, sin cambio de permisos ni despliegue.

## Paso 11 — Alcance local y aceptación en espera (2026-10-10)

El usuario confirmó que aún no existen protocolo de urgencias ni política de retención/respaldo aprobados y pidió dejar los recorridos con validadores y dispositivos reales en espera para consultarlos después con su cliente. Continúa la QA técnica independiente; pauta y preguntas en CASTELAO_SEGUIMIENTO_ACEPTACION.md. Sin contacto al cliente ni recordatorio automático.

La recuperación aplica 24 archivos de migración en orden a una base vacía aislada, excluyendo expresamente el registro cron de analítica ligado a la única base cron del clúster. Diez migraciones care completas, 823 controles SQL existentes de atención/biblioteca repetidos con rollback y comparación de estructura, permisos efectivos y contenido reservado restaurado. Backup de la aplicación y bytes Storage separados; no restaura producción ni roles/servicios administrados del proveedor. Volumen sintético: 500 pacientes adicionales, 10000 actividades y quince consultas medidas. Estado final y límites en PASO_11.

Alertas automáticas por inasistencias reiteradas y atraso de registros profesionales (§11) pendientes de criterios aprobados, todavía no implementadas. La supervisión de registros pendientes sí existe. No declarar esas alertas completadas por validar obligaciones de reportes o reglas de seguimiento. Activación futura requiere aceptación y autorización explícitas; guía ACTIVACION y mapa/fuentes oficiales DATOS_PRIVACIDAD.


### Cierre técnico del Paso 11 (2026-10-10)

232 controles funcionales de atención en ocho suites; 424 UX/84 rutas-estados/33 contextos, cero hallazgos. Biblioteca 76 SQL/30 E2E (Mailpit local), 95 unitarias y lint/tipos/build PASS. 747 SQL actuales y 823 controles existentes repetidos en migraciones limpias, sin contarlos como nuevos. Recuperación aislada 18 escenarios y web/CMS/blog 36 controles (26 capturas + 10 escenarios) PASS. Seis PDFs actuales/36 páginas comprobadas e inspeccionadas. Limpieza independiente: 21 conteos más cuatro recursos propios a cero; guard habilitado, bucket privado y cron detenido. Estado/evidencia y fallos intermedios en PASO_11; resumen contrastado tmp/care-qa/step-11-final-validation.json. Aceptación institucional/dispositivos y decisiones con el cliente en espera por instrucción del usuario. Sin producción, commit/push/deploy o correos reales.


## Paso 11 — Suplemento PWA/móvil (2026-10-10)

Aclaración posterior del usuario: dirección siempre valida y acepta con su cuenta actual o superadministrador; Android/iPhone, navegador/PWA, son la plataforma definida. Esta decisión sustituye la incertidumbre anterior sobre responsable/plataforma; ejecución y firma físicas siguen pendientes. Implementación local del manifiesto/iconos institucionales, áreas seguras, formularios de 16 px y navegación en horizontal corto, conservando Auth/permisos/diseño. Auditor Chromium/WebKit con toque y casos 320–932 px, giro, ventana reducida y márgenes seguros simulados. La puerta técnica exige build/lint/tests, matriz completa sin hallazgos, regresión propietaria y limpieza; no certificar instalación, teclado o equipos reales desde la emulación. Resultados y fallos en PASO_11_PWA_MOVIL; sin producción ni activación.


### Cierre técnico del suplemento PWA/móvil (2026-10-10)

366 controles móviles Chromium/WebKit en 20 rutas/estados y seis contextos; 149 comprobaciones UX en diez contextos; 101 recorridos funcionales (33 Recovery/familia, 20 reportes y 48 dashboard/métricas), todos PASS y sin hallazgos. Build/tipos integrados, lint y 99 unitarias PASS (cuatro nuevas de CSP). No sumar esta regresión parcial a los 232/424 históricos como funciones nuevas. Inspección visual de 24 capturas actuales; limpieza independiente: 21 conteos y cuatro recursos a cero, guard/RLS/bucket preservados y cron detenido. Evidencia: tmp/care-qa/mobile/final-validation.json y cleanup-validation.json; reporte PASO_11_PWA_MOVIL. Responsable y plataforma definidos: dirección acepta con cuenta actual o superadministrador; Android/iPhone en PWA/navegador. Instalación, teclado/notch reales, modelos/versiones y firma pendientes. Sin producción ni activación.


## Paso 11 — Ampliación móvil de recorridos profesionales (2026-10-10)

Validado localmente en el alcance técnico: 452 controles móviles Chromium/WebKit en 24 rutas-estados/16 contextos, 275 UX/23 contextos y 131 funcionales/cinco suites. Inspección de 36 capturas seleccionadas y seis PDF actuales/36 páginas. Detectados y corregidos texto desactualizado de capacidades y desborde del selector de participantes en WebKit al reducir 390→320; el ajuste de ancho inicial fue insuficiente. Repetición final afectada: 126 móviles/42 UX/32 funcionales PASS tras el nuevo build/tipos, sin sumar duplicados. ESLint focalizado y sintaxis PASS. Limpieza independiente: 47 conteos y cuatro recursos a cero; guard/RLS/bucket/cron/worker preservados.

La cobertura anterior más la ampliación suma 818 móviles/44 rutas-estados/22 contextos, 424 UX/33 contextos y 232 funcionales/ocho suites sobre el build de 18:32 UTC. Tras las correcciones se repitió planificación/capacidades; las otras suites y las 99 unitarias conservan su fecha anterior. Evidencia por build y repeticiones en PASO_11_PWA_PROFESIONALES y tmp/care-qa/mobile/{extended-final-validation,copy-fix-validation,extended-cleanup-validation}.json. No nueva migración, Auth, capacidad o fórmula clínica. Dirección acepta con cuenta actual/superadministrador; Android/iPhone PWA/navegador definidos. Instalación, teclado/notch físicos, modelos/versiones, firma y criterios institucionales pendientes. Sin producción ni activación.

Siguiente acción: conservar la pauta completa de aceptación física para cuando Dirección la retome; incluir agenda, cada especialidad, decisiones/tareas, informes y programaciones. No sustituir la firma por emulación ni habilitar alertas sin criterios aprobados.

## Complemento Recovery RC-00 (2026-10-10)

Auditoría validada localmente: nueve secciones del DOCX fuente y complemento contrastados con código/esquema. Diferencias y dependencias en CASTELAO_RECOVERY_COACH y reportes/recovery/RC_00; estado por paso en CASTELAO_RECOVERY_COACH_STATUS. RC-01 en implementación. No hay rúbrica aprobada: ICC-REC-AUT-001 v1.0 es propuesta. Registro cualitativo independiente de niveles, sin score global ni criterios activados. Históricos y permisos conservados; pruebas previas no prueban cambios nuevos. Aclaración del usuario: Dirección/superadmin acepta solo por PWA; no bloquear programación por un recorrido independiente de navegador/dispositivo. Nada desplegado.
# Complemento Recovery — RC-01, 2026-10-10

Registro cualitativo y revisión verificable implementados y validados localmente; reporte docs/reportes/recovery/RC_01.md. Continúa RC-02 propuesta ICC-REC-AUT-001 v1.0 y revisión semanal; después RC-03 supervisión, RC-04 mensual y RC-05 regresión. Producción intacta. Aceptación PWA abierta en el navegador o instalada, sin bloquear trabajo local por validación humana pendiente.


## Complemento Recovery — RC-02, 2026-10-10

RC-02 local verificado; seguir RC-03 supervisión y gráficos con huecos/versión/cobertura; después RC-04 informes/constancia/reglas y RC-05 regresión. Reporte RC_02 y STATUS Recovery actualizados. Piloto, aprobación, criterio y validación individual permanecen decisiones independientes de Dirección.


## Complemento Recovery — RC-03, 2026-10-10

RC-03 integrado y verificado. Continuar RC-04 extendiendo informes y estados reales de entrega/revisión, registrar comunicación realizada sin envío y añadir reiteración sobre resultados verificados con configuración desactivada. Después RC-05 regresión integral; decisiones institucionales separadas.


## Complemento Recovery — RC-04, 2026-10-10

Informe mensual privado con entrega/revisión separadas y fuentes semanales; constancia real de contacto versionada; reiteración en motor existente sin valores ni activación inicial. RC_04 registra 18+45 SQL, regresión completa 928, 113 unitarias y 27 funcionales/156 móviles/50 UX PASS. Repetición final de presentación PDF pendiente; RC-05 en curso, sin afirmar cierre. Dirección/superadmin acepta PWA abierta en el navegador o instalada; no concede capacidad clínica por rol CMS. Propuesta v1.0 y criterio intactos; producción sin cambios.


RC-04 cerrado localmente: repetición final 27 funcionales PASS, 156 móviles/50 UX sin hallazgos, PDF privado de cuatro páginas inspeccionado tras corregir título aislado. RC_04 conserva pruebas y fallos corregidos. RC-05 en curso: estados individuales desde agenda grupal, 31 funcionales de registros/154 móviles/54 UX PASS, mensual no aplicable fuera de Recovery; 930 SQL actuales y recuperación con 1.006 sobre instalación nueva/136 Recovery sobre esquema restaurado. Sin aceptación institucional ni producción.

## Complemento Recovery — RC-05, cierre local 2026-10-10

Realizado: actividad cualitativa/compromisos, propuesta/gobernanza/semanas, supervisión/gráficos, mensual/entrega/revisión, contacto y reiteración. Agenda grupal permite completar desempeño individual y continuar el registro original. Próximo trabajo condicionado a decisiones de Dirección y autorización explícita de activación; no quedan pasos técnicos RC locales pendientes.

RC-00 a RC-05 validados técnicamente en castelao-patient-qa. RC_05 registra nueve suites/266 funcionales, 1.032 controles móviles Chromium/WebKit en 30 contextos y 492 UX en 41, cero hallazgos. 930 SQL seguimiento + 76 biblioteca; 113 unitarias, lint y build/TypeScript PASS. Biblioteca/Auth 30 y web/CMS 36 controles PASS; siete PDF privados/40 páginas renderizadas e inspeccionadas. Instalación fresca 36 migraciones/1.006 SQL y restauración 136 Recovery, sin sumarlos a la regresión base. Consolidación y limpieza independiente: tmp/recovery-qa/release-summary.json.

Pendiente institucional: aprobar propuesta/piloto/criterio de evidencia, ventana global común y equivalencias; excepción motivada sin compromiso; parámetros/exclusiones/revisión de reiteración; protocolo/canales de urgencias y retención/respaldo. Dirección/superadmin acepta PWA abierta en el navegador o instalada según el usuario; aceptación humana pendiente, no bloqueo de programación local. ICC-REC-AUT-001 v1.0 sigue propuesta sin aprobador y criterio apagado; ningún paciente validado. Sin producción, migraciones remotas, push, despliegue ni mensajes externos.

## Aclaración de aceptación: PWA en navegador

Dirección/superadmin autorizado debe poder revisar y aceptar desde la PWA abierta en el navegador, sin instalación obligatoria ni requisito de modo standalone. La PWA instalada ofrece los mismos recorridos. No se exige una aceptación separada para cada modo. Las comprobaciones en teléfonos reales son evidencia de compatibilidad; no obligan a instalar la PWA para registrar una aprobación.

«Aceptación pendiente» describe que todavía no consta la conformidad humana de Dirección sobre el sistema, no una función deshabilitada ni una limitación del navegador. La pauta de aceptación del sistema es documentación para esa validación humana; no se ha implementado una firma global del sistema dentro de la aplicación. Las decisiones operativas ya implementadas —aprobar la rúbrica, autorizar piloto y revisar el mensual— sí tienen formularios web con confirmación y guardado real, sujetos a Auth y permisos actuales. No se ejecuta ni presume aprobación institucional por esta aclaración.
