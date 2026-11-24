# Paso 01 — Permisos y modelo de atención

Fecha / entorno / rama / commit si existe: 2026-10-09, Supabase QA local PostgreSQL 17 y build Next 16.3.6 en localhost:3450, `codex/seguimiento-terapeutico`, sin commit nuevo.

Estado: Validado localmente (base del Paso 1). Sin activación remota.

Objetivo y requisitos cubiertos: §4/6/14/15: capacidades combinables, asignaciones vigentes, episodios/fases, historia, visibilidad paciente/coordinación/reserva/terceros y auditoría sin contenido.

Cambios implementados y rutas disponibles: `/admin/seguimiento` listado con búsqueda y páginas; `/admin/seguimiento/equipo` capacidades explícitas, asignación/revocación y catálogo oficial vacío; `/admin/seguimiento/pacientes/[id]` ficha, responsables con nombres autorizados, ingreso/pausa/egreso/abandono y reincorporación por nuevo episodio. Shell/Auth/CMS/biblioteca conservados. Bases de notas por RPC no equivalen a formularios clínicos finalizados (Paso 4 pendiente).

Migraciones / configuración requerida: `20261009172648_care_foundation.sql`, solo aplicada al contenedor marcado `castelao-patient-qa`; funciones/políticas iteradas sin borrar datos. `CARE_PORTAL_ENABLED=true` únicamente en runner QA; ejemplo false. Sin fases, pacientes ni materiales clínicos seed en migración. Requiere concesiones expresas por superadmin técnico y asignaciones por coordinador; roles CMS no cambian.

UX/UI: recorridos probados, móvil, teclado y gráficos: ingreso y pausa en formulario, reflejo real e historial, configuración de capacidades desde panel existente. Anchos 320/375/768/1440 sin desbordamiento, capturas inspeccionadas; foco entre campos etiquetados y avisos de guardado. Gráficos corresponden a pasos 5–6, aún no construidos. No se afirma tiempo de registro medido ni aceptación de equipo real.

Permisos: perfiles y casos positivos/negativos comprobados: anon, dos pacientes, psicología asignada, Recovery, psiquiatría con asignación futura, dirección asignada, CMS sin capacidad, superadmin técnico, staff suspendido. REST normal comprueba reserva vedada a dirección, publicación propia del paciente y no lectura de otro. Revocación de asignación y lector impide lectura con sesión previa. FK/grants/RLS rechazan escritura directa, autoasignación, autoconcesión de reserva y borrado de historia. El paciente no lee motivos internos. Cuenta suspendida mantiene episodio y atención profesional autorizada.

Datos/métricas: fuentes, reglas y casos límite verificados: episodio nuevo no solapa previos ni sobrescribe ingreso; pausas conservan estado/historia y no modifican habilitación Auth; versión concurrente rechazada, fechas efectivas ordenadas. IANA Santiago valida horario estacional y rechaza horas inexistentes/repetidas. Ningún porcentaje/semáforo inferido de ausencia de datos.

Pruebas: comando, resultado real y evidencia segura:

- `node scripts/care-local.mjs db-test`: PASS, 78 comprobaciones, authenticated/anon, rollback completo.
- `node scripts/care-local.mjs e2e`: PASS, 18 comprobaciones REST y navegador sobre build en modo producción local; fixtures retirados, cero emails reales. `tmp/care-qa/e2e-results.json`.
- `node scripts/patient-local.mjs db-test`: PASS, 76 comprobaciones de regresión de biblioteca, rollback.
- `npm run lint`: PASS; `npm run typecheck` con acceso a dependencias: PASS; `npm test`: 84/84 PASS.
- `node scripts/care-local.mjs build`: PASS con variables locales, rutas nuevas dinámicas, sin publicación.
- `supabase db advisors --local --workdir tmp/patient-supabase-local --type security --fail-on error`: PASS, sin incidencias.

Fallos detectados y correcciones: ambigüedad SQL en revocación, segundo intento de cualificación erróneo corregido por variable distinta; QA usó inicialmente nombre de botón incorrecto y foco sin punto de inicio; dev sobreescribe headers, por lo que QA usa build de producción local; denegación tardía podía emitir 200, corregida en proxy previo a streaming; actualización de select y nombres de responsables y headers móviles ajustados. Todos documentados en CHANGELOG. Primer typecheck en sandbox falló por resolución de dependencias; repetición con acceso normal pasó.

Pendientes/bloqueos y su impacto: catálogo de fases/motivos y criterios clínicos requieren equipo. Alta de fases y cierre utilizan texto aportado por responsable, sin inventar categorías oficiales. Casos de medicamentos/formularios/enmiendas/decisiones/exportaciones aún pendientes de sus pasos. Auditoría registra cambios y lecturas sensibles exitosas por RPC; no registra todos los accesos REST a tablas ni fallos que abortan transacción, ni copias descargadas. Validación jurídica/retención/respaldos y aceptación institucional pendientes.

Qué está local, qué está desplegado y qué no se probó: implementación y migración locales; feature flag remoto intacto. No se prueba nuevo desarrollo en producción, no se enviaron mensajes/correos reales. No hay push, despliegue, migración remota ni scheduler nuevo. No se declara completada Etapa 1.

Siguiente paso concreto: Paso 2, ampliar ficha con agenda/asistencia, planificación personal y compromisos, manteniendo fuentes únicas y permisos distintos.


## Revisión UX/UI posterior — 2026-10-09

Se revisaron configuración técnica, asignaciones y ficha/trayectoria. Se corrigieron breadcrumbs, contraste, controles táctiles y navegación/foco del shell; administración técnica sigue sin lectura clínica automática.

Estado de esta revisión: Validado localmente. La evidencia histórica de arriba conserva su fecha/alcance; la revisión transversal nueva detectó problemas que los recorridos funcionales anteriores no capturaban y los corrigió antes del Paso 6.

Evidencia nueva conjunta de los pasos 1–5: auditoría 136 comprobaciones / 27 rutas-estados / 12 contextos, cero hallazgos abiertos; 32 planificación + 19 reportes + 24 registros + 29 dashboard; 339 SQL/RLS acumuladas; regresión biblioteca 76 SQL + 30 E2E/Auth con Mailpit; 95 unitarias y lint/tipos/build finales PASS. Limpieza independiente a cero y guard de superadmin habilitado. Estos conteos son del conjunto, no de este paso aislado.

Detalle, fallos, capturas y límites: [Revisión UX/UI 1–5](REVISION_UX_UI_01_05.md). Sin producción, migraciones remotas, paquetes nuevos, push ni deploy. Paso 6 pendiente; aceptación con equipo/dispositivos reales y tiempos de llenado todavía pendientes.
