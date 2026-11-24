# Paso 02 — Ficha, agenda y planificación

Fecha / entorno / rama / commit si existe: 2026-10-09, PostgreSQL 17 Supabase QA `castelao-patient-qa` y Next 16.3.6 en localhost:3450, `codex/seguimiento-terapeutico`, sin commit nuevo.

Estado: Validado localmente. Sin activación remota.

Objetivo y requisitos cubiertos: §5/6/7/10/14/15; ficha con objetivos, actividades institucionales, asistencia observada, planificación personal y compromisos con fuentes distintas y permisos compartidos actuales.

Cambios implementados y rutas disponibles: ficha `/admin/seguimiento/pacientes/[id]` añade objetivos compartidos versionados y acceso a Planificación; `/admin/seguimiento/pacientes/[id]/planificacion` presenta semana, asistencia, planes referidos, compromisos y sus cambios; `/admin/seguimiento/agenda/nuevo` programa actividad contextual/grupal y `/admin/seguimiento/agenda/[id]` permite cierre, reprogramación de instancia, asistencia/corrección y acuerdo vinculado. Portal existente integra `/pacientes/hoy`, `/pacientes/planificacion`, `/pacientes/compromisos` y conserva biblioteca/favoritos/perfil.

Migraciones / configuración requerida: `20261009175355_care_planning.sql`, solo aplicada a QA local. Series privadas, eventos/participantes/historia, planes/historia, compromisos/historia y objetivos/historia. RPC con grants restringidos, RLS y autores derivados de sesión. Foundation amplía el resolver de responsables con ID profesional autorizado para selector, sin exponer directorio fuera de alcance. Feature flag remoto intacto. Runner acota memoria/concurrencia de QA; limitador en memoria de 15 solicitudes/5 minutos solo con opt-in y URLs exactas de este stack local. Producción conserva exigencia de limitador compartido.

UX/UI: recorridos probados, móvil, teclado y gráficos: formularios breves contextuales, búsqueda autorizada de participantes que conserva selecciones, estado de guardado, campos/errores asociados, aviso de cambios sin guardar y paginación de 25. Etiquetas separadas de opciones para accesibilidad. 32 controles REST/navegador aprobados: objetivos → grupo → cierre/asistencia → compromiso publicado → login/Hoy → plan personal realizado → compromiso realizado → verificación profesional y responsable asignado. Teclado entre campos y 320/375/768/1440 sin desbordamiento; capturas neutrales inspeccionadas. Gráficos corresponden a pasos 5–6, aún no construidos; Etapa 1 no completada.

Permisos: perfiles y casos positivos/negativos comprobados: dos pacientes, psicología con alcance parcial, dirección con ambos pacientes, Recovery, CMS y superadmin técnico. SQL confirma agenda y asistencia propias, nombres solo de asignados, cierre grupal solo con alcance completo, prohibición de autocertificar asistencia/suplantar plan, ID paciente derivado de sesión, coordinación privada por defecto, publicación expresa, lector revocado y paciente suspendido con JWT previo. Próxima actividad del portal no acepta ID ajeno. Historia inmutable y versiones concurrentes protegidas.

Datos/métricas: fuentes, reglas y casos límite verificados: actividad grupal única con participantes individuales; cierre deja pendientes como pendientes; cancelación no produce ausencia, actividad futura no se finaliza, puntualidad no se inventa para ausente. Recurrencia semanal conserva 09:00 Santiago a través de cambio estacional (167 horas UTC); horas civiles repetidas/inexistentes se rechazan. Plan personal completado no modifica asistencia institucional. Compromiso vencido se deriva al corte; realización autodeclarada y verificación son distintas; reprogramación conserva fecha anterior. Hoy busca estado requerido antes de limitar resultados, evitando vacío falso tras más de 25 cancelaciones/responsabilidades del equipo.

Pruebas: comando, resultado real y evidencia segura:

- `node scripts/care-local.mjs db-test`: PASS, 145 comprobaciones acumuladas, PostgreSQL real authenticated/anon, rollback; `tmp/care-qa/db-results.json`.
- `node scripts/patient-local.mjs db-test`: PASS, 76 regresiones SQL de biblioteca, rollback.
- `node scripts/patient-local.mjs test`: PASS, 30 regresiones E2E de biblioteca/Auth con seguimiento desactivado, invitación/recuperación capturadas únicamente en Mailpit local y fixtures retirados; `tmp/patient-library-qa/e2e.json` y registro de limpieza con IDs vacíos.
- `node --experimental-strip-types --test --test-concurrency=1 tests/*.test.ts`: PASS, 86/86.
- `npm run lint`: PASS; `node scripts/care-local.mjs build`: PASS, incluye TypeScript, dos workers locales, rutas dinámicas.
- `supabase db advisors --local --workdir tmp/patient-supabase-local --type security --fail-on error`: PASS, sin incidencias en esquema final.
- `node scripts/care-local.mjs e2e`: PASS, 32 controles REST/navegador, capturas neutrales en cuatro anchos, fixtures retirados; `tmp/care-qa/e2e-results.json`. Intentos previos incompletos no se contabilizan como aprobados.

Fallos detectados y correcciones: colisión de nombre de índice/tabla de historial en primera aplicación transaccional, corregida sin aplicación parcial; compilación/lint paralelos agotaron memoria y unitarias concurrentes fallaron al crear procesos, comprobaciones seriadas y dos workers aprobados; selectores de QA ambiguos (objetivo en párrafo/textarea, login/recuperación, filtro relativo del formulario) corregidos; nombre accesible de select incluía sus opciones, corregido en componente; caída local del servidor durante pruebas concurrentes, ejecución aislada; login del paciente en build de producción local rechazó la ausencia del limitador compartido, alternativa en memoria exclusivamente para endpoints QA exactos y prueba que rechaza origen remoto. Última consulta Hoy evita falsa ausencia por paginación previa al filtro.

Pendientes/bloqueos y su impacto: catálogo/criterios de fases siguen pendientes de aprobación institucional. Reportes diarios, registros clínicos, dashboard/gráficos, Recovery/familia, decisiones, PDF y jobs permanecen pendientes de sus pasos. No se mide aún duración de formulario con equipo real, ni aceptación institucional/accesibilidad completa; no se afirma prueba UI de cada combinación de reprogramación/cancelación cubierta en SQL. Historia conserva actor/fechas/versiones; no se afirma auditoría absoluta de lecturas REST ordinarias ni de copias descargadas.

Qué está local, qué está desplegado y qué no se probó: solo implementación/migración/fixtures QA locales; ninguna conexión a datos clínicos reales, push, correo real, scheduler remoto ni despliegue. No se declara aceptación institucional ni activación productiva.

Siguiente paso concreto: Paso 3 con campos/plazos configurables, sin inventar obligaciones anteriores al lanzamiento. Mantener revisión incremental de regresión de biblioteca/Auth.


## Revisión UX/UI posterior — 2026-10-09

Se revisaron ficha, actividad nueva/cierre/asistencia, planificación, Hoy, semana y compromisos. Navegación móvil con foco/scroll fiable, formularios compactos y controles táctiles; tratamiento, acceso y autorreporte siguen separados.

Estado de esta revisión: Validado localmente. La evidencia histórica de arriba conserva su fecha/alcance; la revisión transversal nueva detectó problemas que los recorridos funcionales anteriores no capturaban y los corrigió antes del Paso 6.

Evidencia nueva conjunta de los pasos 1–5: auditoría 136 comprobaciones / 27 rutas-estados / 12 contextos, cero hallazgos abiertos; 32 planificación + 19 reportes + 24 registros + 29 dashboard; 339 SQL/RLS acumuladas; regresión biblioteca 76 SQL + 30 E2E/Auth con Mailpit; 95 unitarias y lint/tipos/build finales PASS. Limpieza independiente a cero y guard de superadmin habilitado. Estos conteos son del conjunto, no de este paso aislado.

Detalle, fallos, capturas y límites: [Revisión UX/UI 1–5](REVISION_UX_UI_01_05.md). Sin producción, migraciones remotas, paquetes nuevos, push ni deploy. Paso 6 pendiente; aceptación con equipo/dispositivos reales y tiempos de llenado todavía pendientes.
