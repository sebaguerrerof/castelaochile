# Cambios de seguimiento terapéutico

## 2026-10-17 — Autonomía personal (solo local)

Instrumento independiente integrado con Recovery y portal: transcripción, versiones, borradores, carga asistida, acuerdos aceptados por ambas partes, cinco resultados de revisión, aprendizaje, constancias y fuentes en informes privados. [Estado, validación y reportes A–E](CASTELAO_AUTONOMIA_PERSONAL_STATUS.md). Sin publicación ni cambio de gobernanza de la rúbrica anterior.

## 2026-10-12 — Agenda del centro visible para Dirección

- Nuevo acceso directo, actividades agrupadas por día y filtros de profesional, estado y periodo.
- Corregido enlace DEMO que intentaba filtrar a un coach desde la agenda personal.
- Verificados datos reales de ejemplo, filtros, detalle, paginación y alcance del rol; sin cambios en datos o usuarios productivos. [Reporte](reportes/seguimiento/AGENDA_CENTRO_2026_10_12.md).

## 2026-10-12 — Demostración removible para el cliente

- Panel privado y borradores del sitio con identidades nuevas DEMO bloqueadas, sin cambios en usuarios existentes ni correos.
- Recorrido por módulos, PDF privado, analítica ficticia separada y limpieza completa con protección de datos anteriores.
- 21 controles funcionales y 176 responsive Chromium/WebKit PASS; publicación verificada y ejemplos conservados para el cliente. [Reporte](reportes/seguimiento/DEMO_CLIENTE_2026_10_12.md).

## 2026-10-11 — Corrección de agenda y permisos por rol

- Corregida la exigencia de asignación individual para Dirección al filtrar su propia agenda.
- Roles clínicos con accesos habituales derivados del rol activo y sincronizados internamente.
- Eliminadas las casillas de capacidades de la pantalla de equipo; elegir rol y asignar pacientes es el flujo operativo.
- Añadida la ruta real y sus cuatro filtros a la regresión de navegador. [Reporte](reportes/seguimiento/AGENDA_ROLES_2026_10_11.md).

## 2026-10-11 — Dirección y perfiles profesionales

- Decisión institucional: superadmin es Dirección y administra todo el centro; sin excepción por correo.
- Inicio orientado a tareas: pacientes, agenda, Recovery, equipo, asignaciones e informes; sitio web en sección secundaria.
- Perfiles reales de Psicólogo, Psiquiatra y Coach Recovery con permisos por función y asignación vigente.
- Formularios móviles de usuarios legibles, navegación secundaria agrupada y configuración avanzada plegada.
- Dos migraciones aditivas nuevas, 966 controles SQL de seguimiento; detalle de pruebas y publicación en [reporte](reportes/seguimiento/UX_DIRECCION_PERFILES_2026_10_11.md).

> **Estado vigente — producción, 2026-10-10:** puesta en producción autorizada y ejecutada en www.castelaochile.cl. 22 migraciones care aplicadas (36 totales), bandera activa, build remoto/TypeScript, 8 HTTP del candidato, 27 HTTP del dominio y 5 controles de autorización DB PASS. Reporte: [PRODUCCION_2026_10_10](reportes/seguimiento/PRODUCCION_2026_10_10.md). Las secciones fechadas anteriores conservan evidencia histórica; sus restricciones de despliegue quedaron sustituidas por la autorización del usuario.

> **Pendiente institucional:** capacidades/asignaciones reales se configuran en `/admin/seguimiento/equipo`; no se otorgó lectura clínica automática. Recovery v1.0 continúa como propuesta, sin piloto/criterios ni validaciones. Sin jobs/cron care. Dirección acepta y registra las decisiones operativas desde la PWA en navegador; conformidad humana general, dispositivos físicos y políticas de urgencias/custodia siguen pendientes. No se acredita escritura clínica ni PDF con sesión real en producción.

## 2026-10-09 — Paso 0

Auditoría de Next 16.3.6, Supabase SSR 0.12.7 / JS 2.117.1 y CLI 2.117.0. Se conserva trabajo previo sin commit y se crea rama local `codex/seguimiento-terapeutico`. Se inicializan PLAN/STATUS/PERMISOS/MÉTRICAS/OPERACIÓN y reporte Paso 0. No existen reportes diarios, agenda, asistencia o seguimiento clínico en la base actual.

La creación inicial de rama falló por permiso de escritura en `.git`; se completó mediante escalación autorizada. Supabase CLI inicialmente falló al escribir telemetría fuera del workspace; con permiso local se comprobó que el stack aislado `castelao-patient-qa` está disponible. No se imprimieron claves. No se cambió producción ni SMTP ni se actualizaron dependencias.

## 2026-10-09 — Paso 1

Migración aditiva `20261009172648_care_foundation.sql`: capacidades, asignaciones vigentes, fases sin seed, episodios e historia, coordinación explícita, reservas/terceros físicamente privados, lectores explícitos y auditoría clínica. RPC invoker delegan a definers privados con grants restrictivos y comprobaciones actuales. Directorio/ficha proyectan identidad mínima sin ampliar RLS de perfiles existentes. El paciente no puede leer motivos internos del historial. Suspender portal no cierra tratamiento ni bloquea a su equipo autorizado.

Navegación existente integra `/admin/seguimiento`, `/equipo` y `/pacientes/[id]`; formularios breves con errores asociados, foco, guardado y aviso de cambios sin guardar. Configuración protegida por `CARE_PORTAL_ENABLED=false` por defecto. QA usa env del stack local; ningún envío real. 78 aserciones PostgreSQL, 18 REST/navegador sobre build local de producción, 76 regresiones RLS biblioteca, 84 tests, lint/tipos/build PASS. Asesor de seguridad local: sin incidencias. Capturas neutrales 320/375/768/1440, fixtures retirados.

Fallos corregidos: variable `kind` ambigua en revocación de lector (primer intento de cualificación también falló; se renombró); selección de estado tras guardado; legibilidad móvil de headers y responsables; selector del botón de login de QA; aserción de foco sin punto de inicio; headers de dev sustituidos por comprobación sobre build. Denegación de página durante streaming podía responder 200: proxy ahora rechaza antes de renderizar, manteniendo autorización de dominio/RLS. Typecheck inicial dentro de sandbox no resolvió dependencias existentes; fuera de ese límite pasó sin cambios de paquetes.

## 2026-10-09 — Paso 2

Migración aditiva `20261009175355_care_planning.sql`: series/instancias, participantes, asistencia y correcciones, planes personales, objetivos y compromisos con historia/versiones. RPC y RLS separan paciente/equipo y alcance completo/parcial de grupo. Ficha conecta agenda y acuerdos; portal reutiliza shell/Auth/biblioteca con Hoy, Mi semana y Compromisos. Recurrencia conserva hora civil; cancelación/cierre no infieren ausencia. Responsabilidad profesional usa solo asignados vigentes. Publicación al paciente expresa y realización propia separada de verificación.

145 comprobaciones SQL acumuladas (78 foundation + 67 planificación), 32 controles REST/navegador, 86 unitarias en serie, 76 regresiones SQL de biblioteca, lint/build con TypeScript PASS. QA móvil/desktop 320/375/768/1440 sin desbordamiento, capturas neutrales y fixtures retirados. No gráficos todavía: pasos 5–6 pendientes, no se declara Etapa 1 finalizada. Campos/plazos clínicos y aceptación institucional siguen pendientes. No acciones remotas ni correos reales.

Revisión final: 30 regresiones E2E de biblioteca/Auth con seguimiento desactivado PASS, incluyendo invitación/recuperación en Mailpit local, aislamiento y gestión administrativa. Limpieza completada, protección del último superadministrador restaurada y registro de IDs pendientes vacío. Asesor de seguridad del esquema final: sin incidencias.

## 2026-10-09 — Paso 3

Migración aditiva `20261009184332_care_daily_reports.sql` aplicada solo en QA local: reglas explícitamente aprobadas sin seed clínico, incorporación/historia, excepciones, obligaciones con ventana congelada y cambios auditados, enviados/versiones, borradores privados y revisión profesional de versión con comentarios internos separados. Portal Hoy/Reportes/editor e historia propia; ficha Reportes y configuración de dirección reutilizan shells/capacidades/asignaciones existentes. Generación/cierre autorizados al consultar; no se activó scheduler ni se crean omisiones retroactivas tras falla de generación.

Validación nueva: 215 SQL acumuladas (78 foundation + 67 planificación + 70 reportes), 19 controles REST/navegador de reportes con limpieza (incluye desconexión/reintento y dos escrituras concurrentes reales), 32 regresiones de ficha/planificación, 89 unitarias, lint y build final con TypeScript PASS. Regresión biblioteca/Auth nueva: 76 SQL y 30 E2E PASS; correos solo en Mailpit local, fixtures retirados y limpieza Auth vacía. Advisors security final sin incidencias. Capturas sintéticas en 320/375/768/1440 inspeccionadas, sin desbordamiento; no datos reales ni acciones remotas.

Casos comprobados: primer envío incluso exactamente al deadline, borrador no enviado, corrección conserva original/primer tiempo, revisión antigua no acredita nueva versión; igualdad de timestamps no altera orden de reglas gracias a revisión monotónica. Pausa al abrir/sin agenda/exención excluyen exigencia; ventana individual, DST inválido, incorporación no retroactiva y falla real transaccional muestran estado fiel. Exención de fila generada presenta explicación genérica sin motivo interno. Paciente B, staff sin editor de borrador, superadmin técnico y anon denegados según recurso; revocación/suspensión evaluadas con sesión previa.

Fallos/correcciones: selectores QA de mensajes y botón de incorporación cambiado tras guardar; ajustados. Regresión de hechos sintéticos con reloj host/DB produjo fecha levemente futura: fixture ahora representa un hecho de hace un minuto, manteniendo validación de aplicación. Regresión detectó acceso directo a `children.props.id` en control recibido desde servidor; normalización con API pública React Children antes de clonar restaura verificación profesional de compromisos, ambos recorridos y build finales aprobados. [React Children](https://react.dev/reference/react/Children) documenta tratar children como estructura opaca; también se revisaron guías locales Next de frontera servidor/cliente. Intentos incompletos no se contabilizan como PASS.

Pendientes: aprobación real de campos/horarios/exenciones, pasos 4–11, gráficos pasos 5–6 y scheduler/reintentos/monitorización Paso 10. No revocación anticipada de excepciones ni aceptación institucional/restauración demostrada. Etapa 1 aún incompleta; siguiente Paso 4. Reporte `reportes/seguimiento/PASO_03.md` y contratos STATUS/PERMISOS/MÉTRICAS/OPERACIÓN actualizados.

Fallos/correcciones: índice homónimo a tabla en primera migración falló y quedó en rollback; índice renombrado. Concurrencia de build/lint agotó memoria y test runner concurrente falló creando procesos; limitar build QA a dos workers y ejecutar verificación en serie solucionó sin omitir TypeScript. Caída del servidor durante pruebas concurrentes; recorridos posteriores aislados pasaron. Selectores de prueba ambiguos de objetivos, formulario de compromiso y login/recuperación corregidos. Etiquetas de select incluían opciones en nombre accesible; componente ahora asocia etiqueta separada por ID. Login de build local de producción carecía del limitador compartido requerido por biblioteca: memoria con límite activo únicamente con opt-in y endpoints QA exactos, probado que origen remoto nunca habilita alternativa. Hoy filtraba después de paginar y podía mostrar vacío falso: consulta específica de próxima actividad y compromiso paciente, fixture con 25 cancelaciones + programada en posición 26 aprobado. Filtro semanal estilizado y capturas desde scroll inicial para evitar artefacto de elementos sticky en full-page.

## 2026-10-09 — Paso 4

Migración aditiva `20261009211311_care_professional_records.sql` aplicada solo a QA marcado: metadatos de sesión, borradores/versiones/reservas/lectores privados, resumen por revisión, solicitud mínima y operación idempotente. Autor servidor, sesión propia/especialidad vigente, finalización con asistencia/objetivo/evolución explícitos, enmienda con motivo/original/primera finalización conservados. Capacidad médica independiente, sin dosis/medicación estructurada ni recomendación automática. Formulario breve por especialidad desde ficha y agenda; coordinación final y reserva se explican antes de finalizar. Paciente Hoy/Resúmenes recibe solo publicación expresa, dirección puede registrar recepción de solicitud sin certificar ejecución o decisión.

Validación nueva: 281 SQL/RLS acumuladas (66 nuevas), 24 controles específicos REST/navegador, 19 regresiones de reportes, 32 de planificación/compromisos, 76 SQL biblioteca y 30 E2E biblioteca/Auth en reintento aprobado; 92 unitarias, lint/tipos/build final y advisors seguridad PASS. Normal JWT para aislamiento/revocación, concurrencia real una escritura/otro 40001, cuatro anchos con contenido cargado y teclado móvil. Fixtures retirados, conteos de ambos intentos de biblioteca cero y guard superadmin habilitado; correos exclusivamente Mailpit. Evidencia ignorada `tmp/care-qa`, reporte PASO_04 y contratos actualizados. Sin acciones remotas.

Fallos/correcciones: cast enum de fixture SQL; shape ZodType para categoría; validator generado truncado preservado en carpeta QA ignorada. Primer guardado perdía navegación al sustituirse el formulario durante refresco: ruta servidor resuelve registro existente y redirige, reintento solo cliente insuficiente. Revocación por fila desmontaba su propio formulario y espera del stream quedó detenida; formulario estable termina con feedback y se desactiva sin lectores. Lectura QA prematura reemplazada por confirmación de acción. Capturas iniciales con skeleton/transición repetidas tras esperar contenido y reducir movimiento; breadcrumbs contextuales corregidos. Fuente de sesiones filtra paciente/profesional antes de limitar, 26 eventos ajenos no ocultan registro. Typecheck en sandbox no resolvió tipos Supabase; mismo comando con dependencias accesibles PASS, sin cambios de paquetes. Primer E2E biblioteca terminó por aserción interna Playwright/CDP; limpieza transaccional limitada a su run sintético exacto, reintento nuevo PASS. Fallos no contados como pruebas aprobadas.

Pendientes: Paso 5 dashboard/gráficos/pendientes profesionales/semáforo; pasos 6–11, aprobación institucional de campos/protocolo/vigencias, rúbrica Recovery y scheduler Paso 10. Publicación histórica expresa sigue autorizada para paciente activo aunque enmienda actual sea interna; sin retractación/retención inventada. Historia por registro completa aún requiere evaluar paginación/rendimiento en QA final. Etapa 1 incompleta hasta Paso 5; sin producción ni despliegue.

## 2026-10-09 — Paso 5

Validado localmente: panel integrado con tarjetas/lista priorizada/tabla y próxima solicitud, dos gráficos de asistencia/reportes con n/N, base cero, tablas y fuentes autorizadas. Periodos 7/30/90, pacientes/alertas/fuentes/evidencia paginados a 25; filtros de pacientes explicitados como locales a tabla. Pendientes profesionales derivados de sesiones reales, sin plazo ni atraso universal inventado. Solicitudes existentes filtran open para corresponder a tarjeta.

Migración 20261009220656_care_dashboard.sql solo QA local: alertas de obligación requerida cerrada sin envío y compromiso pendiente vencido, deduplicadas por fuente; recepción/resolución/motivos/historial. Valoración manual con evidencia finalizada, revisión exacta capturada bajo bloqueo, actor autenticado, motivo/hora/revisión prevista, sin color preseleccionado. Gris sin valoración vigente; rojo validado conserva visibilidad al vencer revisión. Motivos segregados, alcance actual, RLS/grants y auditoría sin texto clínico; sin reservas en agregados ni información interna al paciente.

Evidencia nueva: 339 SQL/RLS acumuladas (58 nuevas), 29 controles REST/navegador del panel, 24 regresiones finales de registros, 19 reportes, 32 planificación, 76 SQL biblioteca y 30 E2E biblioteca/Auth con Mailpit únicamente. 95 unitarias, lint/typecheck/build finales PASS; asesor local sin incidencias. Capturas cargadas dashboard/seguimiento/fuentes a 320/375/768/1440 sin overflow, teclado/error/foco y revisión visual. Limpieza independiente: namespaces de Auth/perfiles a cero, alertas/valoraciones QA a cero y trigger de último superadmin habilitado. Código previo preservado; sin nuevo commit, paquetes, push ni despliegue.

Fallos/correcciones registrados en PASO_05: espera de navegación en QA, etiqueta de selector, selector de alerta cambiante, corte de aplicación sustituido por corte DB, render de vigencia basado en DB, feedback persistido al retirar fila de filtro y botón coherente. React reiniciaba controles tras acción resuelta con estado de error: CareForm permite reset solo tras guardado; prueba real preserva texto/selecciones/checkbox y las regresiones aprueban. Evidencia ahora conserva revisión exacta tras enmienda posterior, sin copiar reserva. SQL y navegador se superpusieron una vez y falló baseline global de staff de la suite; rollback/limpieza y ejecución exclusiva posterior aprobada. Ningún intento incompleto se declaró PASS.

Salida básica de Etapa 1 comprobada únicamente local. Pendientes: indicadores/filtros completos (6), rúbrica/familia (7), decisiones/supervisión/plazos (8), informes/PDF (9), jobs/reglas configurables (10), volumen/historiales/restauración/aceptación (11). No hay scheduler verificado ni criterio clínico automatizado ni aceptación institucional con pacientes reales.


## 2026-10-09 — Revisión UX/UI de los pasos 1–5, antes del Paso 6

A solicitud del usuario se detuvo el avance de funcionalidades para evaluar la base entregada con recorridos reales. Baseline funcional PASS, pero auditoría UX FAIL: contraste de texto secundario, controles pequeños, textareas heredadas del CMS, breadcrumbs 404, referencias ARIA y menú móvil sin foco/aislamiento. Capturas revelaron superposición del logo y recorte en pantallas bajas; se revisaron también barra contraída, nombres accesibles, menú de cuenta, jerarquía de borrador y navegación de fuentes/resúmenes.

Correcciones locales: formularios compactos, borrador secundario, casillas con etiqueta táctil, controles de 44px, tinta secundaria institucional, rutas intermedias válidas, foco/Tab/Shift+Tab/Escape/inert y scroll del menú, logo adaptable, labels de navegación/menú de cuenta, fuentes con título/estado coherente, resúmenes del paciente en menú, acceso/carga/error contextual y salida de recuperación al panel/inicio. Roles, capacidades, Auth/RLS, reglas clínicas, métricas y publicaciones no cambian.

Evidencia final nueva: `care-local ux-audit` PASS 136 comprobaciones en 27 rutas/estados y 12 contextos, cero hallazgos abiertos; 108 inspecciones de anchos 320/375/768/1440 y menús móviles 320×568, barra contraída/cuenta/error. Las cuatro suites incluidas aprobaron 32/19/24/29 controles (104), con limpieza entre suites. SQL 339 + biblioteca 76 con rollback; biblioteca/Auth 30 E2E con código actual y Mailpit; 95 unitarias, lint sin avisos, tipos y build finales PASS. Limpieza independiente: Auth/perfiles QA a cero, alertas/valoraciones a cero en stack dedicado y guard de último superadmin habilitado.

Iteraciones y límites conservados en `reportes/seguimiento/REVISION_UX_UI_01_05.md`: baseline y corrección intermedia fallaron; no se contaron como PASS. Ref de cleanup corregida; última compilación y auditoría incluyen los ajustes de labels del shell. Revisiones fechadas añadidas a PASO_01–05; STATUS/PLAN/OPERACION actualizados. Sin migración nueva, paquete, commit, push, deploy, correo real ni producción. No se inició Paso 6. Aceptación institucional, dispositivos/lectores reales, tiempos de llenado y volumen siguen pendientes de QA final.


## 2026-10-09 — Paso 6 validado localmente

Indicadores colectivos/individuales reutilizan Auth, permisos, grupos, panel y componentes. Nuevas rutas indicadores, ficha/indicadores e indicadores/fuentes; tres RPC autorizadas y ayudantes privados en migración 20261009233412. Diez gráficos, stock y semanas, filtros coherentes, comparación de fechas civiles y fuentes de 25 con corte conservado. Compromisos/asistencia/revisiones/exenciones reconstruidos al corte; flujos separados de personas, categorías clínicas sin score. Aperturas de alerta se incluyen antes de recepción y se distingue caso de acción.

Validación nueva: 400 SQL/RLS (61 nuevas), 19 controles Paso 6 + 29 dashboard, 32 planificación, 19 reportes, 24 registros; biblioteca 76 SQL/30 E2E. Auditoría UX 170 controles, 34 rutas/estados, 14 contextos, 0 hallazgos; capturas seleccionadas inspeccionadas. 95 unitarias, build, lint y TypeScript PASS. Limpieza final: sin usuarios/datos QA pendientes y guard habilitado. Advisors: 5 WARN de rendimiento existentes, sin ERROR. Fallos de implementación/fixtures/artefactos y corrección de apertura constan en PASO_06; un intento se detuvo por límite del revisor y después se ejecutó con autorización vigente. No cambios de paquetes ni producción. Pendientes 7–11, plazos/rúbricas/scheduler y aceptación real.

## 2026-10-09 — Paso 7: mecanismos validados localmente

Autonomía Recovery desde registros propios finalizados: ocho dimensiones, evidencia cualitativa/no evaluable, fecha, evaluador, borrador y enmiendas por revisión. Rúbricas sin escala por defecto, aprobación expresa con referencia, versiones inmutables y retiro sin reactivar versiones anteriores. Trayectorias separadas por dimensión/instrumento, leyendas y fechas legibles, huecos para no evaluable y clic hacia evidencia original. El usuario confirmó que aún no existe rúbrica institucional aprobada; continúa pendiente y no se sustituye por fixtures.

Seguimiento familiar desde agenda realizada: participantes mínimos, campos breves/fuente, reserva por revisión y lectores explícitos sin herencia. Acuerdos privados con responsable, fecha, verificación/resultado, cancelación e historia; texto independiente y confirmación para publicar al paciente, retiro incluso tras cumplimiento. Portal existente muestra solo seis campos autorizados. Indicadores individuales n/N con agenda original, paginación 25 y ausencia de episodio/denominador explícita. Reutiliza Auth, permisos, diseño y navegación; migración 20261010000320 aplicada exclusivamente en QA marcado.

Validación final: 495 SQL/RLS (95 nuevas), 33 controles Recovery/familia y 123 regresiones de atención (156 funcionales); biblioteca 76 SQL/30 E2E actuales, 95 unitarias, lint/tipos/build PASS. Consolidación UX 227 controles, 46 rutas/estados, 18 contextos, cero hallazgos (57 nuevos); capturas seleccionadas inspeccionadas. Advisors conserva cinco WARN de rendimiento existentes, db lint tres avisos previos de variables, sin ERROR. Consulta independiente: Auth/perfiles/datos nuevos/alertas/valoraciones QA a cero y guard superadmin habilitado; biblioteca sin IDs pendientes.

Correcciones verificadas: forma/fecha de borradores, elegibilidad de lectores bajo RLS, preservación de feedback al revocar último lector, fecha null sin 1969, leyenda móvil, gráfico enlazado y retiro sin reactivación. Auditoría inicial falló con 12 hallazgos de jerarquía en cuatro anchos de rúbricas; borrador secundario y repetición final sin hallazgos. Fixtures/esperas/selectores fallidos corregidos y limpiados; ningún intento fallido se declaró PASS. Detalle en PASO_07 y seis documentos actualizados. Pendientes institucionales, aceptación/volumen y pasos 8–11; sin commit, push, deploy, correo real ni producción.

## 2026-10-09 — Paso 8 validado localmente

Decisiones de dirección con borrador privado, situación/evaluación/decisión, responsable/fechas/fuentes, finalización confirmada, enmiendas, resultado y cierre. Deliberación exclusiva de dirección; delegación independiente mínima, responsable vigente, plazo opcional explícito o derivado de agenda, ejecución informada y verificación/devolución por dirección. Reasignación conserva historia y revoca al anterior; cancelar decisión no transmite su motivo interno a tareas. Solicitudes conservan fuente/revisión original y unicidad, recepción separada de ejecución. Cinco tablas privadas y siete RPC autorizadas en migración 20261010005911, solo QA local.

Mi trabajo muestra acciones propias incluso para dirección; Supervisión consulta el equipo dentro del alcance actual. Agenda, registros esperados/familia con permiso, tareas y alertas con fuentes paginadas y gráficos de estado. El usuario respondió «No necesariamente» al consultar un plazo aprobado para registros: no se inventa plazo universal ni atraso; tareas admiten fecha opcional o término actual de agenda. Navegación compacta, formularios breves y fuentes exactas reutilizan panel/Auth/permisos/diseño existentes.

Validación actual: 592 SQL/RLS (97 nuevas), seis suites PASS —32 planificación, 19 reportes, 24 registros, 48 dashboard/métricas, 33 Recovery/familia, 28 decisiones/supervisión—, 184 controles funcionales. UX 304 comprobaciones/63 rutas-estados/21 contextos, cero hallazgos; 77 nuevos. Biblioteca/Auth 76 SQL/30 E2E actuales y 95 unitarias/lint/tipos/build PASS. Capturas finales seleccionadas inspeccionadas. Advisors cinco WARN y db lint tres avisos previos, sin ERROR. Limpieza read-only: trece conteos QA a cero, guard superadmin habilitado; biblioteca sin IDs pendientes/completed=true.

Fallos corregidos y verificados: fixtures de reprogramación/paginación y selector de confirmación; enlace al ancla de revisión, conservación de selección antigua, fuente original de solicitud, breadcrumb, separación trabajo propio/equipo y navegación. Inspección visual detectó tarjeta vacía de revisión en tarea terminal y plurales de cantidades: corregidos, recompilados lint/build/tipos y repetidos 28 controles/77 UX; consolidación sin duplicados. Total de evidencia inicialmente null por clave count/counts corregido y validado como 184. Ningún intento fallido se contó como PASS; detalle PASO_08. Seis documentos actualizados. Pendientes 9–11, rúbrica/aceptación institucional, reglas/jobs y escala; sin commit, push, deploy, correo real ni producción.

## 2026-10-09/10 — Paso 9 validado localmente

Autorizada implementación local de informes semanales/mensuales, snapshot v1 de fuentes autorizadas y corte explícito, revisión con confirmación, regeneración trazable, PDFs privados por versión. Migración 20261010013747_care_period_informs.sql, RPC/grants restrictivos, bloqueo/optimismo, Storage privado y finalización service_role con lease/bytes/hash/permiso actual; ningún acceso directo o enlace firmado de aplicación. Panel/SSR/diseño/forms/gráficos reutilizados; fuente original, paginación y lista de pendientes documentados por paciente. PDFKit fijado con pnpm.

Evidencia final nueva: 662 SQL/RLS PASS (70 nuevas); siete suites funcionales aprobadas, 184 regresiones y 25 controles nuevos (209), con retiro de fixtures entre suites. UX 363 comprobaciones/74 rutas-estados/26 contextos, cero hallazgos (59 nuevas). Biblioteca/Auth 76 SQL/30 E2E y build/tipos/lint/95 unitarias finales PASS. Cinco PDFs exportados por el flujo real, 34 páginas con contenido/fuentes/márgenes/cabeceras/numeración comprobados e inspección visual completa; muestras de panel/formularios/móvil revisadas. Advisors cinco WARN/db lint tres avisos previos, sin errores nuevos. Consulta independiente read-only: 17 conteos QA a cero, incluido Storage PDF, guard superadmin habilitado y bucket privado; biblioteca sin IDs pendientes.

Correcciones verificadas: SQL inicial, fixture fecha, promesa thenable, enlaces pnpm, selectores QA, 28 alertas generadas adicionales/paginación/limpieza; footer con páginas vacías y cabeceras de continuidad, unidades/singular/categorías legibles. Revisión de privacidad detectó snapshots de tareas reasignadas: autorización de todas las tareas conservadas y nuevo contexto privado bloquean informe/PDF listo al anterior responsable con su JWT previo; generar otra serie excluye la instrucción. Regeneración desde revisión histórica vuelve a versión vigente. Intentos fallidos no contabilizados como PASS, ni repeticiones sumadas como funciones nuevas; PASO_09 conserva el detalle. Seis documentos actualizados. Sin producción, commit/push/deploy/jobs/correos reales. Rúbrica institucional y SLA universal no inventados; jobs/reglas y aceptación/volumen/restauración pendientes 10–11.

## Paso 10 — Registro de avance inicial (2026-10-10; cierre actualizado abajo)

Migración aditiva 20261010122821_care_jobs_rules.sql: cinco tablas privadas con RLS, jobs de semana/mes/operaciones, historial de ejecuciones e intentos, reglas append-only por paciente y heartbeat. Nuevas rutas programaciones y comparación. SQL actual: 734 controles PASS. En curso REST/navegador, cron real y regresión. Pruebas fallidas y reparaciones quedarán registradas en PASO_10.

## Paso 10 — Cierre validado localmente (2026-10-10)

Entrega local del Paso 10: programaciones semanales/mensuales y operaciones por minuto, autorización permanente explícita y alcance congelado; fallos seguros, cinco intentos/backoff, supervisión del equipo con alcance completo, reglas versionadas por paciente, recuperación de reservas PDF y comparaciones congeladas. 747 SQL/RLS (85 nuevas), 22 controles nuevos y 231 funcionales de atención en ocho suites; 424 UX/84 rutas-estados/33 contextos, cero hallazgos. Biblioteca 76 SQL/30 E2E, 95 unitarias y lint/tipos/build PASS. Cron nativo real verificado en QA y detenido al finalizar. Seis PDFs reales/36 páginas verificadas e inspeccionadas. Limpieza independiente: 21 conteos a cero, cinco tablas nuevas RLS, guard habilitado y bucket privado. Fallos de SQL/tipos/selectores/limpieza y correcciones documentados en PASO_10; no sumados como controles aprobados. Después de ajustes de disponibilidad/procedencia se repitieron informes y jobs; después de textos finales, solo jobs. Resumen contrastado tmp/care-qa/step-10-final-validation.json. Sin commit/push/deploy/producción/correos reales.

Revisión final de concurrencia del Paso 10: pausa posterior a selección de cola reproducida con fallo; worker verifica enabled antes de cada intento. Cinco controles nuevos comprueban que el run pausado conserva pending/0 intentos, sin consumir historia, y se ejecuta una vez al reanudar. Total final 747 SQL (85 nuevas); 22 controles de cron real repetidos PASS y limpieza/PDF finales nuevamente comprobados. Configuración de alcance inmutable, sin cambio de permisos ni despliegue.

## 2026-10-10 — Paso 11, QA técnica y aceptación en espera

Nuevas herramientas guardadas release-db/release-web y pautas ACEPTACION/ACTIVACION/DATOS_PRIVACIDAD. Recuperación aislada PASS en 18 escenarios: 24 migraciones ordenadas con excepción cron analítica explícita, 823 SQL existentes repetidos, estructura/permisos/contenido reservado conservados y recuperación de bytes Storage por hash. Volumen 500 pacientes adicionales/10000 actividades y quince llamadas medidas; límites de informes sin truncar. Web/CMS/blog 36 controles PASS (26 capturas + 10 escenarios), fixtures retirados.

Aviso común de lectura no inmediata/canal no urgente en índice y editor de reportes del paciente, con verificación E2E. Regresión completa y revisión visual final en PASO_11; no tomar evidencia histórica como ejecución actual. Fallos intermedios de fixtures, deparser/grants de recuperación y espera del stream documentados, sin contarlos como PASS.

El usuario confirmó ausencia de protocolo/política y solicitó aceptación/validadores/dispositivos en espera para consultar al cliente después. Sin automatización/contacto. Matriz conserva alertas automáticas de inasistencia reiterada/atraso profesional pendientes de criterios y no implementadas. Ninguna migración nueva ni cambios de producción, commit/push/deploy o correos reales.


### Cierre técnico del Paso 11 (2026-10-10)

232 controles funcionales de atención en ocho suites; 424 UX/84 rutas-estados/33 contextos, cero hallazgos. Biblioteca 76 SQL/30 E2E (Mailpit local), 95 unitarias y lint/tipos/build PASS. 747 SQL actuales y 823 controles existentes repetidos en migraciones limpias, sin contarlos como nuevos. Recuperación aislada 18 escenarios y web/CMS/blog 36 controles (26 capturas + 10 escenarios) PASS. Seis PDFs actuales/36 páginas comprobadas e inspeccionadas. Limpieza independiente: 21 conteos más cuatro recursos propios a cero; guard habilitado, bucket privado y cron detenido. Estado/evidencia y fallos intermedios en PASO_11; resumen contrastado tmp/care-qa/step-11-final-validation.json. Aceptación institucional/dispositivos y decisiones con el cliente en espera por instrucción del usuario. Sin producción, commit/push/deploy o correos reales.


## 2026-10-10 — Paso 11, suplemento PWA/móvil

Responsable de aceptación definido por el usuario: dirección, cuenta actual o superadministrador. Plataforma Android/iPhone mediante navegador/PWA; recorridos y firma físicos pendientes. Implementación local del manifiesto e iconos con marca institucional existente; áreas seguras, campos de 16 px, navegación horizontal alcanzable y controles nativos limitados al ancho. Auditor nuevo Chromium/WebKit reutiliza sesiones Auth y fixtures existentes. CSP mantiene HTTPS fuera del triple marcador QA de sitio/DB local; cuatro pruebas cubren ese límite. No nuevas capacidades, migraciones, métricas ni reglas clínicas. Fallos intermedios y verificación efectiva en PASO_11_PWA_MOVIL; no sumar evidencia histórica como nueva ni interpretar la aclaración como aceptación.


### Cierre técnico del suplemento PWA/móvil (2026-10-10)

366 controles móviles Chromium/WebKit en 20 rutas/estados y seis contextos; 149 comprobaciones UX en diez contextos; 101 recorridos funcionales (33 Recovery/familia, 20 reportes y 48 dashboard/métricas), todos PASS y sin hallazgos. Build/tipos integrados, lint y 99 unitarias PASS (cuatro nuevas de CSP). No sumar esta regresión parcial a los 232/424 históricos como funciones nuevas. Inspección visual de 24 capturas actuales; limpieza independiente: 21 conteos y cuatro recursos a cero, guard/RLS/bucket preservados y cron detenido. Evidencia: tmp/care-qa/mobile/final-validation.json y cleanup-validation.json; reporte PASO_11_PWA_MOVIL. Responsable y plataforma definidos: dirección acepta con cuenta actual o superadministrador; Android/iPhone en PWA/navegador. Instalación, teclado/notch reales, modelos/versiones y firma pendientes. Sin producción ni activación.


## Paso 11 — Ampliación móvil de recorridos profesionales (2026-10-10)

Validado localmente en el alcance técnico: 452 controles móviles Chromium/WebKit en 24 rutas-estados/16 contextos, 275 UX/23 contextos y 131 funcionales/cinco suites. Inspección de 36 capturas seleccionadas y seis PDF actuales/36 páginas. Detectados y corregidos texto desactualizado de capacidades y desborde del selector de participantes en WebKit al reducir 390→320; el ajuste de ancho inicial fue insuficiente. Repetición final afectada: 126 móviles/42 UX/32 funcionales PASS tras el nuevo build/tipos, sin sumar duplicados. ESLint focalizado y sintaxis PASS. Limpieza independiente: 47 conteos y cuatro recursos a cero; guard/RLS/bucket/cron/worker preservados.

La cobertura anterior más la ampliación suma 818 móviles/44 rutas-estados/22 contextos, 424 UX/33 contextos y 232 funcionales/ocho suites sobre el build de 18:32 UTC. Tras las correcciones se repitió planificación/capacidades; las otras suites y las 99 unitarias conservan su fecha anterior. Evidencia por build y repeticiones en PASO_11_PWA_PROFESIONALES y tmp/care-qa/mobile/{extended-final-validation,copy-fix-validation,extended-cleanup-validation}.json. No nueva migración, Auth, capacidad o fórmula clínica. Dirección acepta con cuenta actual/superadministrador; Android/iPhone PWA/navegador definidos. Instalación, teclado/notch físicos, modelos/versiones, firma y criterios institucionales pendientes. Sin producción ni activación.

Cambios: catálogo compartido care-mobile-coverage.mjs; acciones mobile-extended-audit/mobile-extended-report; validación de rutas seleccionadas completas y agregados posteriores al inicio. Psiquiatría auditada antes de retirar su capacidad, con formulario editable y capturas médicas. Título de capacidades actualizado. Fieldset de participantes usa flex y legend envuelto, conservando espaciado y semántica; capturas explícitas en ambos motores. El fallo 351/320 y el intento de ancho insuficiente permanecen documentados.

## Complemento Recovery RC-00 (2026-10-10)

Auditoría validada localmente: nueve secciones del DOCX fuente y complemento contrastados con código/esquema. Diferencias y dependencias en CASTELAO_RECOVERY_COACH y reportes/recovery/RC_00; estado por paso en CASTELAO_RECOVERY_COACH_STATUS. RC-01 en implementación. No hay rúbrica aprobada: ICC-REC-AUT-001 v1.0 es propuesta. Registro cualitativo independiente de niveles, sin score global ni criterios activados. Históricos y permisos conservados; pruebas previas no prueban cambios nuevos. Aclaración del usuario: Dirección/superadmin acepta solo por PWA; no bloquear programación por un recorrido independiente de navegador/dispositivo. Nada desplegado.
# Complemento Recovery — RC-01, 2026-10-10

Editor Recovery breve con apoyo/participación sin preselección y fuente separada, compromiso transaccional real o excepción motivada, pestaña Recovery y revisión privada versionada. Migraciones QA 20261010194749 y 20261010195825. Esta última reparó textos UTF-8 sin editar la migración ya aplicada. Feedback de revisión reparado y E2E completo repetido. Detalles y pruebas en reportes/recovery/RC_01.md; producción sin cambios.


## Complemento Recovery — RC-02, 2026-10-10

Añadida propuesta documental exacta, gobierno/piloto/aprobación/criterio separado, sucesores inmutables y revisión semanal privada/final/enmiendas. Tres migraciones QA: 20261010200621, 20261010201717 y 20261010201921. Corregidos feedback de aprobación y desbordamientos WebKit; repetición final 14 funcionales/40 móviles/14 UX PASS; no modificaciones a migraciones aplicadas ni producción.


## Complemento Recovery — RC-03, 2026-10-10

Migración QA 20261010224700 añade lectura de supervisión sobre alcance/corte existentes y fuentes paginadas. Ficha/mi trabajo/dirección enlazan apoyo, compromisos y pendientes; ocho gráficos con versiones/modos/huecos y matriz mensual sin promedios. Navegación compacta reutilizada. Build/lint y repetición final RC_03 PASS.


## Complemento Recovery — RC-04, 2026-10-10

Informe mensual privado con entrega/revisión separadas y fuentes semanales; constancia real de contacto versionada; reiteración en motor existente sin valores ni activación inicial. RC_04 registra 18+45 SQL, regresión completa 928, 113 unitarias y 27 funcionales/156 móviles/50 UX PASS. Repetición final de presentación PDF pendiente; RC-05 en curso, sin afirmar cierre. Dirección/superadmin acepta PWA abierta en el navegador o instalada; no concede capacidad clínica por rol CMS. Propuesta v1.0 y criterio intactos; producción sin cambios.


RC-04 cerrado localmente: repetición final 27 funcionales PASS, 156 móviles/50 UX sin hallazgos, PDF privado de cuatro páginas inspeccionado tras corregir título aislado. RC_04 conserva pruebas y fallos corregidos. RC-05 en curso: estados individuales desde agenda grupal, 31 funcionales de registros/154 móviles/54 UX PASS, mensual no aplicable fuera de Recovery; 930 SQL actuales y recuperación con 1.006 sobre instalación nueva/136 Recovery sobre esquema restaurado. Sin aceptación institucional ni producción.

## Complemento Recovery — RC-05, cierre local 2026-10-10

Correcciones finales: estados individuales Recovery desde evento grupal; mensual excluido cuando no corresponde a Recovery e historial preservado tras fin de asignación; título/texto unidos en PDF y etiquetas canónicas; fixtures antiguas actualizadas a campos obligatorios; pruebas esperan streaming y evento close reales. .gitignore conserva reportes Recovery exigidos. Migración nueva 20261011002000_care_recovery_monthly_scope.sql aplicada solo a QA, sin editar anteriores.

RC-00 a RC-05 validados técnicamente en castelao-patient-qa. RC_05 registra nueve suites/266 funcionales, 1.032 controles móviles Chromium/WebKit en 30 contextos y 492 UX en 41, cero hallazgos. 930 SQL seguimiento + 76 biblioteca; 113 unitarias, lint y build/TypeScript PASS. Biblioteca/Auth 30 y web/CMS 36 controles PASS; siete PDF privados/40 páginas renderizadas e inspeccionadas. Instalación fresca 36 migraciones/1.006 SQL y restauración 136 Recovery, sin sumarlos a la regresión base. Consolidación y limpieza independiente: tmp/recovery-qa/release-summary.json.

Pendiente institucional: aprobar propuesta/piloto/criterio de evidencia, ventana global común y equivalencias; excepción motivada sin compromiso; parámetros/exclusiones/revisión de reiteración; protocolo/canales de urgencias y retención/respaldo. Dirección/superadmin acepta PWA abierta en el navegador o instalada según el usuario; aceptación humana pendiente, no bloqueo de programación local. ICC-REC-AUT-001 v1.0 sigue propuesta sin aprobador y criterio apagado; ningún paciente validado. Sin producción, migraciones remotas, push, despliegue ni mensajes externos.

## Aclaración de aceptación: PWA en navegador

Dirección/superadmin autorizado debe poder revisar y aceptar desde la PWA abierta en el navegador, sin instalación obligatoria ni requisito de modo standalone. La PWA instalada ofrece los mismos recorridos. No se exige una aceptación separada para cada modo. Las comprobaciones en teléfonos reales son evidencia de compatibilidad; no obligan a instalar la PWA para registrar una aprobación.

«Aceptación pendiente» describe que todavía no consta la conformidad humana de Dirección sobre el sistema, no una función deshabilitada ni una limitación del navegador. La pauta de aceptación del sistema es documentación para esa validación humana; no se ha implementado una firma global del sistema dentro de la aplicación. Las decisiones operativas ya implementadas —aprobar la rúbrica, autorizar piloto y revisar el mensual— sí tienen formularios web con confirmación y guardado real, sujetos a Auth y permisos actuales. No se ejecuta ni presume aprobación institucional por esta aclaración.
