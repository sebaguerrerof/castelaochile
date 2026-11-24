# Paso 06 — Indicadores y gráficos completos

Fecha / entorno / rama / commit si existe: 2026-10-09, QA local `castelao-patient-qa`, localhost:3450, rama `codex/seguimiento-terapeutico`, base `4fbf785`, cambios sin commit. Sin producción.
Estado: Validado localmente. No activado en producción.

Objetivo y requisitos cubiertos:

§6/§12: indicadores colectivos e individuales, periodos 7/30/90 y último ingreso, filtros compartidos, comparación equivalente, fuentes autorizadas, población y datos incompletos. Se reutilizan administrador, capacidades, asignaciones, grupos, componentes y colores institucionales. No se introduce dependencia de gráficos.

Cambios implementados y rutas disponibles:

- `/admin/seguimiento/indicadores`: diez gráficos de asistencia, reportes, compromisos realizados/en plazo, cobertura de observaciones, sesiones con registro, evolución categórica, ingresos/salidas, casos y gestiones de alertas. Tarjeta y serie de stock activo separadas de flujos; distribución por semana local y comparación anterior.
- `/admin/seguimiento/pacientes/[id]/indicadores`: el mismo cálculo dentro de una ficha autorizada. Acceso desde la tabla actual y navegación de esa vista.
- `/admin/seguimiento/indicadores/fuentes`: metadatos paginados de 25 en 25. Conserva filtros/corte y vuelve al mismo conjunto; actividad, día de reporte, compromiso, episodio y revisión exacta de registro abren sus rutas existentes.
- Periodo/grupo/profesional/tipo se aplican en servidor. Los grupos son membresías actuales, no una reconstrucción de grupos históricos. El profesional delimita población y autor/responsable de fuentes profesionales. Reportes/ingresos/alertas no se atribuyen a un tipo de actividad y se excluyen al seleccionar tipo.

Migraciones / configuración requerida:

`supabase/migrations/20261009233412_care_metrics.sql`, generada con CLI `migration new care_metrics`: nueve funciones, tres RPC públicas invoker, implementación privada, privilegios explícitos y `search_path=''`. No crea tablas ni cambia los permisos existentes. Aplicada/iterada únicamente con el ejecutor local que valida el marcador del contenedor. `CARE_PORTAL_ENABLED` y `PATIENT_PORTAL_ENABLED` se mantienen en QA; ninguna activación productiva.

UX/UI: recorridos probados, móvil, teclado y gráficos:

Filtros GET de una acción; navegación institucional, etiquetas, resúmenes, valores n/N y tablas accesibles. N=0 explícito. Evolución/flujo/alertas muestran cantidades por categoría, sin porcentaje clínico. Semanas lunes–domingo con primera/última parcial señaladas. Distribución semanal despliega tabla y barras de cantidades; sus enlaces abren la categoría completa del periodo, explicitado en pantalla. Fuentes individuales muestran autor/especialidad y revisión; no reservas. Inspección de capturas desktop/móvil y controles automáticos 320/375/768/1440, menú 320×568, teclado/foco, contraste y fuentes. Evidencia final y conteos abajo al terminar las suites.

Permisos: perfiles y casos positivos/negativos comprobados:

Cuenta staff activa, directory.read + patient.read + records.read y asignación actual. Sin bypass por superadmin/CMS. El paciente no recibe indicadores clínicos internos, alertas o filtros de equipo. Opciones limitadas al alcance actual, filtros ajenos rechazados. Revocación con JWT existente retira agregados/fuentes; suspensión deniega rutas. Proxy antes del streaming + verificación SQL en cada RPC. Auditoría de lectura con actor/acción/recurso, sin payload clínico ni respuestas de reportes. Ayudantes de filas completas sin grant a authenticated.

Datos/métricas: fuentes, reglas y casos límite verificados:

- Totales suman numeradores/denominadores; fixture ponderado 2/5=40 %, nunca media 62,5 %. Fuente paginada cuenta total completo.
- Reportes usan primera entrega y requerimiento reconstruido de cambios al corte. Exenciones posteriores no reescriben cortes anteriores; abiertas/no generadas no se inventan como omisiones.
- Compromisos usan último historial registrado al corte y primera transición real a completado; verificación mantiene cumplimiento original. Reprogramaciones futuras quedan fuera. Cancelados excluidos.
- Asistencia usa historial disponible al corte; corrección posterior no altera estado previo. Solo actividades realizadas/cerradas y rangos semiabiertos.
- Evolución usa última revisión final al corte, categorías atribuidas a profesional/especialidad. No se agrega texto libre como intensidad de participación: se muestra cobertura documental.
- Ingresos/reincorporaciones son eventos de episodio; egreso/abandono son transiciones efectivas, sin duplicar cambios de fase. Pausa excluye stock activo; suspender portal no produce egreso.
- Las aperturas de alerta derivan del caso creado, aunque aún no haya recepción/historial. Gestiones suman acciones; casos suman fuentes únicas.
- Desde ingreso usa último episodio propio por paciente. Comparación deshabilitada en ventanas de distinta duración. Comparación 7/30/90 desplaza fechas civiles y conserva hora local a través de DST; población elegible y datos faltantes se declaran.

Pruebas: comando, resultado real y evidencia segura:

- `node scripts/care-local.mjs db-test`: PASS, 400 SQL/RLS acumuladas, 61 nuevas, rol authenticated/anon y rollback. Fixtures de egreso/reincorporación, pausa, límites, DST, correcciones, exenciones, ponderación, alcance y aperturas.
- Build local PASS, rutas nuevas compiladas y TypeScript incluido. `npm run typecheck`: PASS tras regenerar tipos QA inconsistentes. `npm run lint`: PASS; `npm run test`: 95 PASS.
- Advisors local: sin ERROR; 5 WARN de rendimiento existentes (3 auth_rls_initplan, 2 multiple_permissive_policies), asociados a políticas de módulos previos. No nuevas tablas ni políticas en esta migración; revisión de volumen pendiente Paso 11.
- `node scripts/care-local.mjs dashboard-e2e` con `CARE_UX_AUDIT=true`: PASS final, 48 controles (29 regresión Paso 5 + 19 nuevos Paso 6). Totales/filtros/corte, revisión categórica, fuentes 25+6, aperturas sin recepción y revocación con JWT existente. `metrics-e2e-results.json` cuenta los 19 nuevos por separado.
- Regresiones nuevas ejecutadas secuencialmente con auditor visual: planificación `e2e` 32 PASS, `reports-e2e` 19 PASS, `records-e2e` 24 PASS. Total atención 123 controles funcionales.
- `node scripts/care-local.mjs ux-report`: PASS, 170 controles en 34 rutas/estados, 14 contextos; 0 hallazgos. Incluye 34 nuevos controles en 7 rutas/estados de métricas, además de los 136 de los pasos previos reejecutados. Capturas 320/375/768/1440 y navegación 320×568; muestras desktop/móvil inspeccionadas visualmente.
- `node scripts/patient-local.mjs db-test`: 76 PASS/rollback. `node scripts/patient-local.mjs test`: 30 PASS biblioteca/Auth; correo exclusivamente Mailpit y protección del último superadmin restaurada.
- Limpieza final en transacción de lectura: 0 Auth QA, 0 patient_profiles, 0 care_alerts, 0 followup_reviews y trigger `protect_last_active_superadmin` habilitado (`O`). `pending-auth-cleanup.json`: completed=true, ids=[]; archivo `step-06-cleanup-verification.txt`.
- Lint y TypeScript finales PASS tras todas las suites; `git diff --check` PASS. No se agregaron pruebas unitarias que duplicaran fórmulas SQL: los 61 fixtures reales y 19 recorridos nuevos validan el cambio.
- Evidencias ignoradas por Git: `tmp/care-qa/db-results.json`, `metrics-e2e-results.json`, `dashboard-e2e-results.json`, `ux/*.json`/PNG, `step-06-advisors.json`. Solo identidades/datos sintéticos, sin correos externos ni claves.

Fallos detectados y correcciones:

Ayudante SQL inicialmente apuntó a un nombre inexistente de autorización; corregido a la función actual. Ventana de calidad ambigua entre variable/columna; corregida a rango por paciente. Tipos generados del servidor QA anterior estaban corruptos/inconsistentes: se retiraron solo artefactos generados comprobados y se regeneraron. Primer navegador utilizó build previo sin rutas nuevas: recompilado. Prueba de paginación leía el DOM anterior: ahora espera URL/página y filas esperadas. Auditor visual recibió URLs completas donde exige rutas locales: normalizadas. Fixture histórico inicialmente se registraba al corte actual: fechas explícitas para comprobar conocimiento histórico. Revisión final detectó que una alerta nueva carece de historial manual: se incluye apertura desde creación del caso y se añadió prueba SQL/REST. Cada fallo de fixtures limpió sus datos antes de repetir. Una ejecución fue detenida por límite de uso del revisor automático; el comando no se ejecutó y se retomó después de la indicación del usuario.

Pendientes/bloqueos y su impacto:

Autonomía/familia dependen del Paso 7; decisiones y ejecución del Paso 8; informes/PDF del 9; scheduler/rules del 10; QA de volumen, paginación de historiales extensos y aceptación profesional del 11. No hay rúbrica aprobada de participación/autonomía ni plazo profesional universal: no se inventan scores ni atraso clínico. No se usa la diferencia con primer ingreso como duración de tratamiento. El portal conserva solo sus fuentes compartidas; esta etapa no publica categorías clínicas al paciente.

Qué está local, qué está desplegado y qué no se probó:

Código, SQL y UI locales. Ningún push, commit, db push remoto, deploy, correo real o modificación de producción. Sin aceptación con personas reales, dispositivos físicos, scheduler real, volumen productivo o validación normativa institucional. Los conteos de fixtures no son resultados del programa Castelao.

Próximo paso recomendado:

Paso 6 cerrado localmente; continuar con Paso 7 (autonomía y familia), con instrumentos/visibilidad explícitos y sin score de recuperación.
