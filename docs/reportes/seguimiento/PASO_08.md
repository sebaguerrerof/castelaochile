# Paso 08 — Decisiones y supervisión

Fecha / entorno / rama / commit si existe: 2026-10-09, QA local `castelao-patient-qa`, localhost:3450; rama `codex/seguimiento-terapeutico`, base `4fbf785`, cambios sin commit. Timestamp de migración UTC 2026-10-10; fecha de trabajo Chile 2026-10-09. Producción sin cambios.
Estado: Validado localmente. Implementación, pruebas funcionales/SQL, regresión, UX y limpieza comprobadas; sin activación productiva.

Objetivo y requisitos cubiertos:

§11/§13/§16: deliberación exclusiva de dirección, situación/evaluación/decisión/fuentes, responsable/fecha/revisión, tareas mínimas delegadas, ejecución/resultados y supervisión desde agenda real. Se reutilizan Auth, capacidades/asignaciones, solicitudes de intervención, alertas, registros y shell/diseño institucional. Al consultar un plazo aprobado de registros, el usuario indicó «No necesariamente»; no se asume plazo universal ni se impide registrar trabajo sin fecha.

Cambios implementados y rutas disponibles:

- `/admin/seguimiento/decisiones`: listado por estado de decisiones autorizadas, fuentes paginadas y acceso a nueva decisión por paciente. Búsqueda de pacientes reutiliza directorio.
- Ficha `/decisiones`, `/decisiones/nuevo`, `/decisiones/[did]`: borrador solo del autor, situación/evaluación/decisión de máximo 600 caracteres, responsable de dirección vigente, fecha prevista y próxima revisión. Registrar exige confirmación; enmendar conserva original/fuentes y requiere motivo. Cerrar exige resultado/motivo y tareas verificadas o canceladas; cancelar conserva motivo interno y retira acciones pendientes con mensaje neutro.
- Ficha `/tareas/[tid]`: instrucción independiente de máximo 300 caracteres, responsable actual, fecha opcional explícita o de agenda. Iniciar/informar resultado solo destinatario; verificar/devolver/cancelar solo dirección. Reasignación conserva historia, limpia resultado actual y retira acceso anterior. Nuevo destinatario solo ve sus versiones, no historial de otros responsables.
- `/admin/seguimiento/mi-trabajo`: acciones/agenda/registros/alertas propias, incluso para dirección. `/admin/seguimiento/supervision`: equipo dentro de pacientes autorizados, filtros de profesional/periodo/tipo/estado y fuentes de 25.
- Dashboard integra un bloque de siguientes acciones con cantidades y enlaces. Solicitud de intervención abre nueva decisión con solicitud/registro de origen; recibir sigue distinto de ejecutar. Enlace al registro de origen abre el ancla de su revisión exacta y comprueba su permiso actual.

Migraciones / configuración requerida:

`supabase/migrations/20261010005911_care_decisions_supervision.sql`, creada mediante `supabase migration new`: cinco tablas privadas con RLS y sin grants directos, siete RPC públicas invoker/siete implementaciones privadas definer, dos helpers internos sin EXECUTE para authenticated. Índices de todas las FK y filtros por paciente/responsable/estado. Aplicada/iterada solo mediante contenedor QA marcado, sin reset ni pérdida de historial. Sin tablas públicas con deliberación, nuevos roles CMS, paquetes, credenciales, SMTP o servicios externos. Se consultaron guías Next locales de formularios, documentación/changelog oficiales Supabase y guía de índices Postgres; sin upgrade de dependencias.

UX/UI: recorridos probados, móvil, teclado y gráficos:

CareForm/CareField y componentes del panel existentes, errores asociados/foco/conservación de texto, guardado y estados visibles. Borrador secundario, registro principal con casilla de confirmación; fuentes/plazos/enmiendas/cierre bajo secciones desplegables. Navegación breve en las pantallas nuevas: ficha/decisiones y pacientes/Mi trabajo/dirección/supervisión. La revisión visual detectó exceso de enlaces antes del formulario; se redujeron en estas rutas, con acceso al módulo completo desde seguimiento. Secciones abiertas en móvil para revisar formularios reales.

Dos gráficos operativos reutilizan barras de base cero y tabla accesible: acciones por estado y registros finalizados/pendientes. Unidades explícitas acciones/registros de sesión, con singular cuando corresponde; clic abre lista filtrada y fuente real. No score, productividad por caracteres, radar ni telemetría. Resumen/gráfico calcula el conjunto completo de periodo/profesional; estado filtra lista, explicado junto a fuentes. Auditoría 320/375/768/1440 y menús 320×568 PASS: 304 controles/63 rutas-estados/21 contextos, cero hallazgos automáticos; 77 controles/17 rutas-estados/3 contextos del Paso 8. Capturas finales de formulario móvil, supervisión/gráfico/tabla, tarea/historial y estados vacíos inspeccionadas. Las tareas terminales conservan resultado e historia sin tarjeta de revisión vacía.

Permisos: perfiles y casos positivos/negativos comprobados:

Dirección vigente: patient.read + records.read + decisions.manage + alcance actual. Draft solo autor; final/revisiones para dirección autorizada, enmienda solo autor. Responsable de decisión debe tener dirección vigente. Fuente debe pertenecer al paciente; registro final captura revisión, solicitud conserva revisión de origen y unicidad. Director no hereda reserva del registro. Delegado: staff activo, patient.read + records.create + asignación vigente y responsable actual. RPC/HTML excluyen deliberación/fuentes/ID de decisión; historia solo de versiones propias. Otro profesional asignado no recibe tarea; paciente, CMS y cuenta suspendida no obtienen clínica. Reasignación/revocación bloquea JWT anterior. Cierre/delegación usan bloqueo común del padre y versiones optimistas.

Supervisión de terceros exclusiva de dirección; profesional ve trabajo propio. Familia exige permiso separado de lector/profesional; la revocación excluye sus fuentes/conteos. Proxy comprueba objeto/paciente antes de streaming; acciones validan origen/Auth, DB repite permisos y deriva actor. Auditoría de lecturas y cambios contiene actor/acción/recurso, sin situación/evaluación/instrucción/resultados. No publicación al paciente ni aviso por correo.

Datos/métricas: fuentes, reglas y casos límite verificados:

Ventanas civiles 7/30/90 de Santiago hasta corte actual; agenda incluye siguientes siete días. Tareas/alertas abiertas antiguas permanecen accionables. Sin reconstrucción histórica, comparación ni promedio de productividad. Tarea pendiente/en ejecución solo vencida con due_at explícito o término de agenda vigente < corte; informada requiere revisión, completada exige verificación. Reprogramación cambia plazo derivado; cancelación de fuente lo deja null y no completa tarea. Fecha explícita independiente. Sin fecha no se infiere atraso.

Registros esperados desde paciente–sesión realizada–especialidad vigente: psychology para group/individual; Recovery/psiquiatría según agenda; familia separada con permiso específico y aunque paciente ausente. Final propio completa; borrador no. No hay plazo universal configurado: atrasos de registros no se inventan. Agenda/alertas muestran estados efectivamente registrados; recepción no demuestra notificación externa. Fuentes paginan 25 y resumen usa conjunto completo; SQL verificó 34 tareas/25+9 y pendientes anteriores al periodo. Historial de fuentes/reasignación y decisiones conserva contenido original; cancelar decisión no transfiere su motivo interno a tareas. Denominador cero sin barras/porcentajes ficticios.

Pruebas: comando, resultado real y evidencia segura:

- `node scripts/care-local.mjs db-test`: PASS, 592 SQL/RLS acumuladas, 97 nuevas; authenticated/anon, rollback completo. Incluye privacidad, borrador/enmienda, fuente exacta, plazos, paginación, familia, cierre/resultados y revocaciones.
- `node scripts/care-local.mjs ux-audit`: seis suites PASS, 32 planificación + 19 reportes + 24 registros + 48 dashboard/métricas + 33 Recovery/familia + 28 decisiones/supervisión = 184 controles funcionales. Limpieza entre suites, 304 comprobaciones UX sin hallazgos.
- `CARE_UX_AUDIT=true node scripts/care-local.mjs decisions-e2e`: repetición final PASS, 28 controles y 77 UX nuevos, limpieza completa; `ux-report` consolida 304/21 sin duplicar las repeticiones. Ejecutada tras recompilar los últimos ajustes visuales. La ejecución intermedia de 27 controles no se suma al total final.
- `node scripts/patient-local.mjs db-test` y `test`: regresión actual PASS, 76 SQL/RLS con rollback y 30 E2E biblioteca/Auth; correo exclusivamente capturado en Mailpit. IDs Auth pendientes vacíos y completed=true.
- `node scripts/care-local.mjs build`, `npm run lint`, `npm run typecheck`: PASS sobre código final; siete rutas nuevas compiladas. `npm run test`: 95 unitarias PASS ejecutadas en esta etapa.
- `supabase db advisors --local --workdir tmp/patient-supabase-local --type all --level warn --fail-on error`: PASS, cinco WARN de rendimiento previos, sin nuevo WARN/ERROR. `db lint --schema public,private --fail-on error`: PASS, tres avisos previos de variables en planning/report_configure, sin ERROR.
- Consulta independiente read-only en el stack marcado: cero Auth QA, perfiles, decisiones/borradores/versiones/tareas/historia, autonomía/familia/rúbricas/alertas/valoraciones; guard protect_last_active_superadmin habilitado (O). PASS en `tmp/care-qa/step-08-cleanup-verification.txt`.
- Evidencia ignorada: `tmp/care-qa/db-results.json`, `decisions-e2e-results.json`, `decisions-server-local.log`, `ux/*.json`/PNG, `step-08-advisors.json`, `step-08-db-lint.txt`, `step-08-unit-tests.txt`, `step-08-code-checks.txt`, `step-08-validation-summary.json`; biblioteca en `tmp/patient-library-qa/real-db.json`, `e2e.json`, `pending-auth-cleanup.json`. Fixtures neutrales @example.test, Auth/JWT normales; service role solo setup/limpieza, no demostración de aislamiento.

Fallos detectados y correcciones:

Primer fixture de reprogramación movía solo el término y violaba duración máxima 24h de agenda: separado a actividad programada y movidos inicio/término, respetando estado/cierre. Primera expectativa de paginación incluía un responsable cuya asignación se había revocado en la prueba anterior: restaurado alcance del fixture antes de probar el conjunto completo; no cambiado el filtro de seguridad. Primer navegador esperaba un texto exacto que CareField prefija con la etiqueta: selector cambiado al control invalidado y confirmación sin marcar; no se tomó timeout como PASS. Todos esos fixtures terminaron con rollback/limpieza antes de repetir.

Durante revisión se corrigieron enlace de fuente a ancla revision-N, conservación de selección de fuentes antiguas en borrador, breadcrumb virtual de tareas, fuente de solicitud con revisión original, unidades del gráfico y distinción de trabajo propio/equipo. Navegación nueva compactada tras inspección visual. La auditoría automática completa pasó; al inspeccionar sus capturas se detectaron tarjeta de revisión vacía en tarea terminal y cantidades siempre plurales. Corregidas ambas, recompilados lint/build/tipos y repetidos 28 controles/77 UX del Paso 8; capturas finales revisadas sin esos defectos. Mi trabajo, formularios y fuentes verificados sobre build final. Ninguna ejecución fallida se declara aprobada. Una primera consolidación de evidencia usó count en vez de counts de planificación y produjo total null; corregida leyendo ambas claves y comprobando explícitamente 184.

Pendientes/bloqueos y su impacto:

Sin plazo universal requerido de registros; cada tarea puede tener fecha explícita o fuente de agenda. Reglas operativas versionadas/jobs del Paso 10 continúan pendientes. Rúbrica Recovery institucional pendiente del Paso 7. Aceptación de dirección/profesionales con casos reales, tiempos efectivos, dispositivos físicos, escala/historiales extensos, retención/restauración y requisitos jurídicos en Paso 11. Supervisión actual no reconstruye cortes históricos y no mide productividad. Informes/PDF (9) no iniciados.

Qué está local, qué está desplegado y qué no se probó:

SQL/código/UI y pruebas locales con fixtures neutros. Sin commit, push, db push remoto, deploy, producción, correos reales, publicaciones al paciente o scheduler. No aceptación institucional, dispositivos reales ni volúmenes productivos. Los textos de QA no representan decisiones clínicas reales.

Siguiente paso concreto:

Paso 9: informes semanales/mensuales en pantalla, revisión y PDF privado con fuentes autorizadas; verificar permisos actuales de apertura/descarga y renderizar el PDF. Mantener pendientes rúbrica/aceptación institucional y reglas/jobs del Paso 10; no publicar ni desplegar sin autorización.
