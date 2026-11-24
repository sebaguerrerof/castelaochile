# Paso 05 — Dashboard y alertas operativas

Fecha / entorno / rama / commit si existe: 2026-10-09; `castelao-patient-qa` / localhost:3450; `codex/seguimiento-terapeutico`, base `4fbf785`, sin nuevo commit.

Estado: Validado localmente. Salida básica de Etapa 1 verificada en QA aislado; producción sin cambios.

Objetivo y requisitos cubiertos: panel integrado §5, alertas/valoración manual §11, primeros gráficos §12 y pendientes profesionales básicos §9/13. La salida local de Etapa 1 se apoya en estos recorridos y sus regresiones.

Cambios implementados y rutas disponibles:

- `/admin/seguimiento`: tarjetas accionables, casos priorizados y tabla con tratamiento, acceso, valoración y próxima solicitud. Periodos 7/30/90; búsqueda y filtros afectan explícitamente la tabla, conservando indicadores de todo el alcance.
- `/admin/seguimiento/evidencia`: fuentes paginadas con enlace a actividad, día original del reporte o formulario del responsable.
- `/admin/seguimiento/alertas`: abiertas/recibidas/resueltas, deduplicación, motivo e historial. La última gestión guardada permanece visible si resolver retira la fila del filtro.
- Ficha `/seguimiento`: valoración manual con evidencia finalizada del mismo paciente y revisión exacta conservada, motivo, autor autenticado, hora del hecho y revisión prevista; historial conservado, sin color/evidencia/plazo clínico preseleccionados.
- Solicitudes existentes incorporan filtro por estado; la tarjeta abre exactamente pendientes de recepción. Shell, Auth, formularios y tokens institucionales reutilizados.

Migraciones / configuración requerida: `20261009220656_care_dashboard.sql`, creada con CLI instalada y aplicada solo al stack QA marcado. Cuatro tablas con RLS/grants explícitos; motivos/historial en `private`. Dieciocho funciones, wrappers públicos invoker y autorización actual dentro del servidor/DB. Iteración local conservando tablas/historia. No se activó scheduler ni se aplicó migración remota.

UX/UI: recorridos probados, móvil, teclado y gráficos: dos gráficos de barras reales con base cero, n/N, resumen, categorías, tabla accesible y enlaces. No había librería de gráficos instalada: React/CSS conserva diseño y evita una dependencia para estas barras. Se aplican criterios de visualización de Data al panel Next existente, sin construir ni publicar un dashboard externo. Dashboard, seguimiento y fuentes cargados a 320/375/768/1440 sin desbordamiento; navegación móvil y periodo por teclado, error con foco y campos retenidos. PNG neutrales revisados. No se afirma un tiempo de llenado clínico medido.

Permisos: perfiles y casos positivos/negativos comprobados: cuenta staff activa + directory/patient/records + asignación vigente para agregados; `care.alerts.review` adicional para gestionar. La valoración es coordinación interna explícita; nunca se copia una reserva al motivo ni se publica al paciente. Rutas se bloquean antes de streaming; RPC/RLS repiten alcance actual. Superadmin técnico sin capacidades/asignación no recibe excepción. Recepción/resolución no certifican intervención ejecutada. Auditoría de valoración, alertas, lectura de seguimiento/dashboard y sincronización sin texto clínico.

Datos/métricas: fuentes, reglas y casos límite verificados:

- Asistencia: participante-evento realizado/cerrado; presentes / participantes elegibles, justificadas y pendientes visibles. Canceladas/programadas excluidas. Colectivo suma n y N.
- Reportes: obligación requerida generada/cerrada; primer envío ≤ cierre en plazo, > cierre tardío; sin envío al corte omitido. Abiertas/exentas fuera. Ventanas no generadas son calidad incompleta, nunca nuevas omisiones.
- Registros pendientes: sesión realizada del responsable actualmente habilitado/asignado, sin finalización original; borrador sigue pendiente. No se marca atraso sin plazo aprobado.
- Activos: episodio vigente y última historia efectiva activa, independiente de acceso al portal.
- Regla operativa v1: obligación requerida cerrada sin envío al evaluar o compromiso pendiente con fecha vencida. Una alerta por paciente/tipo/fuente. Se conserva tras cambios del origen; resolver no recrea la misma fuente.
- Gris sin valoración vigente. Verde/amarillo requieren valoración manual y revisión prevista vigente. Rojo conserva visibilidad al vencer revisión, sin descenso automático. No hay plazo universal ni puntaje inventado.
- Corte/días civiles PostgreSQL/IANA Santiago; medianoche omitida comienza al primer instante real del día. Drilldown conserva corte al paginar y fecha de obligación aunque cierre al día siguiente.

Pruebas: comando, resultado real y evidencia segura:

- `node scripts/care-local.mjs db-test`: PASS final, 339 SQL/RLS acumuladas (58 nuevas); rol authenticated, rollback completo. N=0, ponderación colectiva, deadline exacto, calidad, páginas, fuente/versiones, semáforo, permisos y revocación.
- `node scripts/care-local.mjs dashboard-e2e`: PASS final, 29 controles REST/navegador; incluidas enmienda de evidencia, revisión exacta, autor no suplantable, dos escrituras concurrentes (una aprobada/una conflicto), conservación de campos tras error y resolución directa fuera del filtro. Limpieza comprobada antes de PASS.
- Regresiones nuevas: `records-e2e` 24 PASS (repetida tras anclas de revisión), `reports-e2e` 19 PASS, `e2e` de planificación 32 PASS.
- `node scripts/patient-local.mjs db-test`: 76 PASS/rollback; `node scripts/patient-local.mjs test`: 30 PASS con código actual en dev local, biblioteca, acceso/invitación/recuperación/suspensión y correo capturado exclusivamente en Mailpit. Guard del último superadmin restaurado en la misma transacción.
- `npm run test`: 95 PASS finales, 3 nuevas. `npm run lint`: PASS final. `npm run typecheck`: PASS final con runtime local completo (escalación por limitación de resolución conocida del sandbox en pasos previos; no cambios de paquetes).
- `node scripts/care-local.mjs build`: PASS final, compilación y TypeScript incluidos, nuevas rutas presentes.
- `node node_modules/supabase/dist/supabase.js db advisors --local --workdir tmp/patient-supabase-local --type security --fail-on error`: PASS final, sin incidencias. `git diff --check`: sin errores; advertencias habituales LF/CRLF.
- Comprobación SQL independiente final: 0 usuarios/0 perfiles de todos los namespaces QA; 0 alertas/0 valoraciones en el contenedor aislado; trigger `protect_last_active_superadmin` habilitado (`O`).
- Evidencia: `tmp/care-qa/db-results.json`, `dashboard-e2e-results.json`, regresiones JSON/logs/PNG y `tmp/patient-library-qa`. Ignorados por Git, solo fixtures neutrales. Ninguna clave, token o enlace de recuperación se copia al reporte. Privilegios de setup usados solo para crear/retirar fixtures; JWT normales para probar autorización.

Fallos detectados y correcciones:

- Variables SQL categoría/estado calificadas para evitar colisiones con columnas; funciones realmente consultadas en SQL/REST.
- Prueba contó filas antes de completar navegación: espera contenido cargado. Verificación de limpieza usa bloque SQL, sin división constante evaluable por el planner.
- Selector sin etiqueta inequívoca: asociación explícita, etiquetas de filtros y estilo corregidos.
- Prueba localizaba por “Recibida” después de resolver: selector estable por UUID y nuevo estado comprobado.
- Acceso directo a fuentes falló con corte generado por reloj de aplicación: DB fija el corte por defecto, gráficos preservan el suyo. No se relaja rechazo de corte futuro.
- Confirmación persistida al retirar fila del filtro y botón coherente con recepción/resolución elegida.
- Lint rechazó `Date.now` en render: vigencia usa corte de la lectura DB.
- React reiniciaba controles no controlados al resolver una acción que devolvía error: el formulario compartido permite reset solo después de resultado guardado. QA comprobó texto, selecciones, checkbox y foco retenidos.
- Una valoración referenciaba solo el registro: ahora captura también su revisión exacta bajo bloqueo de lectura. Enmienda real posterior preservó el enlace histórico y la reserva permaneció inaccesible.
- Un intento SQL se superpuso con fixtures activos de navegador y falló el conteo global del equipo de la suite base. No fue resultado aprobado; se retiraron fixtures y se repitió SQL en exclusiva: 339 PASS/rollback. Las suites se ejecutan de una en una.

Pendientes/bloqueos y su impacto: indicadores completos/filtros de cohorte/desde ingreso (6); rúbrica y familia (7); decisiones/supervisión/plazos profesionales (8); informes/PDF (9); scheduler/reglas configurables/reintentos (10); volumen, paginación de historiales extensos, restauración y aceptación institucional (11). Revisar criterios clínicos y próxima revisión antes de datos reales, sin defaults inventados.

Qué está local, qué está desplegado y qué no se probó: solo workspace y stack aislado. Sin push/deploy/migración remota ni cambios de producción/dominio/correo. No se probaron pacientes reales, aceptación clínica, informes ni ejecución programada. Historial individual todavía se devuelve completo; listas globales/fuentes/evidencia de selección paginan a 25.

Siguiente paso concreto: Paso 6, indicadores individuales/colectivos completos, filtros coherentes por grupo/profesional/tipo, desde ingreso y fuentes detalladas, conservando este contrato de permisos/cortes.

Referencias: guías instaladas Next 16.3.6 `forms.md` / `use-server.md`; [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) y [funciones de Supabase](https://supabase.com/docs/guides/database/functions). CLI 2.117.0, sin actualizar paquetes. La herramienta web rechazó el índice Markdown de changelog; documentación específica y comandos instalados sí consultados.


## Revisión UX/UI posterior — 2026-10-09

Se revisaron dashboard, valoración, alertas, fuentes, N=0 y error recuperable. Fuentes identifican asistencia/reportes; Pendientes profesionales solo señala registros. Se corrigieron contraste, tamaño de acciones, menús y recuperación. Cálculos/corte/evidencia exacta y valoración manual no cambian.

Estado de esta revisión: Validado localmente. La evidencia histórica de arriba conserva su fecha/alcance; la revisión transversal nueva detectó problemas que los recorridos funcionales anteriores no capturaban y los corrigió antes del Paso 6.

Evidencia nueva conjunta de los pasos 1–5: auditoría 136 comprobaciones / 27 rutas-estados / 12 contextos, cero hallazgos abiertos; 32 planificación + 19 reportes + 24 registros + 29 dashboard; 339 SQL/RLS acumuladas; regresión biblioteca 76 SQL + 30 E2E/Auth con Mailpit; 95 unitarias y lint/tipos/build finales PASS. Limpieza independiente a cero y guard de superadmin habilitado. Estos conteos son del conjunto, no de este paso aislado.

Detalle, fallos, capturas y límites: [Revisión UX/UI 1–5](REVISION_UX_UI_01_05.md). Sin producción, migraciones remotas, paquetes nuevos, push ni deploy. Paso 6 pendiente; aceptación con equipo/dispositivos reales y tiempos de llenado todavía pendientes.
