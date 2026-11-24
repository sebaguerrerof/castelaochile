# Paso 11 — QA integral y activación preparada

Fecha / entorno / rama / commit si existe: 2026-10-10, America/Santiago; QA local castelao-patient-qa; codex/seguimiento-terapeutico, base 4fbf785, sin commit.

Estado: Validado localmente: QA técnica de los mecanismos implementados. Aceptación institucional y dispositivos reales en espera por instrucción del usuario; no activar producción.

Objetivo y requisitos cubiertos: §2/5/11/12/14/15/17/18/19. Ejecutar regresión e aislamiento efectivos, rendimiento sintético, recuperación aislada y preparación concreta de activación; conservar Auth/panel/diseño. La aceptación humana se documenta separadamente.

Cambios implementados y rutas disponibles:

- Nuevas herramientas locales care-local.mjs release-db/release-web: migraciones/recuperación/volumen y regresión de sitio/CMS/blog con datos neutrales.
- Reportes del paciente, índice y editor: aviso común de que el envío no garantiza lectura inmediata y el espacio no es un canal de urgencias. No inventa protocolo/contactos aprobados.
- Nuevas pautas CASTELAO_SEGUIMIENTO_ACEPTACION.md, ACTIVACION.md y DATOS_PRIVACIDAD.md. Sin nuevas rutas o módulos duplicados.

Migraciones / configuración requerida: ninguna migración nueva. DDL de 24 archivos aplicado en orden en una base vacía aislada, con exclusión explícita del registro cron de analítica por la limitación de base única del clúster; diez migraciones care completas, sin refresh. Manifiesto y recuperación final PASS en 18 escenarios. Nunca restaurar sobre la DB de la aplicación ni trasladar scripts QA a producción.

UX/UI: recorridos probados, móvil, teclado y gráficos: regresión completa de atención PASS después del aviso nuevo: 424 controles/84 rutas-estados/33 contextos, cero hallazgos. Inspección de muestras finales de reportes, dashboard/gráficos, Recovery, decisiones y comparación en móvil/escritorio. Seis PDFs actuales, 36 páginas con contenido, márgenes, fuentes, cabeceras/numeración e inspección visual completa. Sitio/CMS/blog: 36 controles locales PASS, 26 capturas finales a 320/375/768/1440; inspeccionadas muestras de inicio, blog vacío, artículo, contacto, equipo, editor y listado CMS. Navegación por teclado y motion reducido, búsqueda/paginación y editor real comprobados. Dispositivos físicos/aceptación humana no realizados.

Permisos: perfiles y casos positivos/negativos comprobados: 747 SQL actuales PASS; reinstalación limpia 823 SQL atención+biblioteca con rollback. Recuperación conserva grants/RLS y compara schema USAGE, columnas/índices/FK/funciones/políticas, originales y reservas; 18 escenarios finales PASS con limpieza propia. CMS normal denegado clínicamente, borrador oculto a anon y suspensión con sesión previa comprobados en web local.

Datos/métricas: fuentes, reglas y casos límite verificados: fixture aislado de 500 pacientes adicionales y 10000 eventos/participantes, conteos esperados manualmente 7500 presentes/2500 ausentes más una asistencia original; primer corte de fuentes y límites sin truncación silenciosa; no se recorre todo el historial de volumen. Las suites menores verifican navegación entre páginas. Quince muestras de consultas SQL autenticadas, EXPLAIN ANALYZE y tiempos locales, sin SLA/concurrencia productiva. Medianas/p95 de muestra: metrics 932/1674 ms, dashboard 687/905 ms y sources 891/1585 ms, incluyendo Docker/SQL/JSON. Backup y recuperación de esta muestra: 16235 ms; no compromiso institucional de recuperación.

Pruebas: comando, resultado real y evidencia segura: db-test actual 747 PASS; release-web 36 PASS con limpieza propia; release-db 18 escenarios PASS, limpieza completa. Cierre efectivo: 232 controles funcionales de atención en ocho suites; 424 UX/84 rutas-estados/33 contextos, cero hallazgos. Biblioteca 76 SQL/30 E2E (Mailpit local), 95 unitarias y lint/tipos/build PASS. 747 SQL actuales y 823 controles existentes repetidos en migraciones limpias, sin contarlos como nuevos. Recuperación aislada 18 escenarios y web/CMS/blog 36 controles (26 capturas + 10 escenarios) PASS. Seis PDFs actuales/36 páginas comprobadas e inspeccionadas. Limpieza independiente: 21 conteos más cuatro recursos propios a cero; guard habilitado, bucket privado y cron detenido. Evidencia ignorada tmp/care-qa/step-11. No copiar resultados históricos como pruebas nuevas.

Fallos detectados y correcciones: recuperación adaptada a --no-owner sin alterar roles administrados, registro de cron de analítica explícitamente excluido en bases aisladas, ACL nulo normalizado a privilegios efectivos y schema USAGE capturado/restaurado. Fixtures de volumen incluyeron fecha/autor de asistencia y especialidad concordante; un total exacto de 1000 fuentes era válido, se ajustó el escenario a más de 1000 manteniendo el límite real. No se cambió el cálculo para aprobar. Comparación de restricciones usa deparser PostgreSQL con formato canónico, sin eliminar condiciones. Web: selector Tipo por nombre accesible; prueba de blog esperaba inicialmente antes de retirar skeletons del stream (6+12), ahora espera contenido visible y mantiene 12+1 reales. El aviso nuevo falló inicialmente al consultarse antes de terminar el stream; esperar su visibilidad comprobó ambas páginas sin cambiar el comportamiento del producto. Ningún intento fallido se cuenta PASS. La revisión encontró y corrigió la falta del aviso de lectura inmediata para paciente.

Pendientes/bloqueos y su impacto: usuario confirmó «No aun» sobre protocolo/política y solicitó dejar aceptación/validadores/dispositivos en espera para preguntar al cliente después. Pauta lista; sin contacto, automatización o aprobación implícita. Recovery sin rúbrica; sin plazo universal de registros. Inasistencias reiteradas y alerta de atraso profesional condicionadas a criterio aprobado, aún no implementadas como alertas automáticas: no borrar ese requisito de la matriz. Fuentes oficiales chilenas revisadas y mapa preparado, sin certificación jurídica. Retención/MFA/capacidad real/recuperación remota pendientes.

Qué está local, qué está desplegado y qué no se probó: exclusivamente QA local marcado y bases desechables propias, identidades @example.test y Mailpit. Sin push/deploy/producción/correos reales. No aceptación clínica, dispositivos físicos, MFA nuevo, carga productiva o recuperación de servicios/plataforma remota. Scheduler de atención ejecutado temporalmente por la suite QA, con bitácora nativa/heartbeat/fallo/reintento/idempotencia comprobados; quedó detenido al cierre.

Siguiente paso concreto: retomar con el cliente la pauta de aceptación/decisiones cuando el usuario lo solicite. Seis documentos obligatorios actualizados; matriz conserva requisitos clínicos no implementados por falta de criterios. No se declara el Paso 11 completo institucionalmente ni se autoriza activación del destino por esta QA.


## Comandos ejecutados y evidencia final

| Comando desde la raíz del repositorio | Resultado real |
| --- | --- |
| node scripts/care-local.mjs db-test | 747 SQL/RLS PASS, rollback |
| node scripts/care-local.mjs release-db | 18 escenarios PASS; 823 SQL existentes sobre migraciones limpias, backup DB + bytes Storage/restauración/volumen/limpieza |
| node scripts/care-local.mjs release-web | 36 controles PASS, 26 capturas neutrales, CMS/blog/banderas/privacidad y limpieza |
| node scripts/care-local.mjs ux-audit | Ocho suites secuenciales: 32/20/24/48/33/28/25/22 = 232 funcionales; 424 UX, cero hallazgos |
| node scripts/patient-local.mjs db-test y test | 76 SQL + 30 E2E PASS; correos solamente Mailpit; limpieza dedicada completada |
| pnpm lint, pnpm test, node scripts/care-local.mjs build, pnpm exec tsc --noEmit | PASS; 95 unitarias, sin fallos/omitidas; lint repetido sobre la espera final del test de reportes |
| Python incluido: scripts/qa-care-inform-pdf.py y --scheduled-only | Cinco PDFs manuales/34 páginas + cron/2 páginas; seis archivos actuales inspeccionados por completo |
| Supabase CLI db advisors/db lint --local, workdir QA | Cinco WARN y tres avisos idénticos al paso previo, sin ERROR nuevo |
| Consulta read-only step-11-cleanup.sql; git diff --check y node --check scripts nuevos | Limpieza/guard/cron/bucket/worker comprobados; sin errores de diff/sintaxis |

Resumen contrastado: tmp/care-qa/step-11-final-validation.json. Artefactos ignorados: step-11/db-release-results.json y migration-manifest.json, web/results.json, ocho resultados E2E y ux/results.json; library e2e.json/limpieza; pdf/validation.json y validation-scheduled.json, hashes de inspección; logs de build/lint/tipos/SQL/asesores y step-11-cleanup-verification.txt. Los nombres step-09/step-10 de PDFs pertenecen al verificador existente; los seis fueron exportados nuevamente en esta regresión y comprobados por hash, no copiados como evidencia histórica. No subir backups/capturas neutrales a producción.


## Aclaración y suplemento posterior (2026-10-10)

El usuario definió posteriormente que dirección siempre valida/acepta mediante cuenta actual o superadministrador y que se usará Android/iPhone con PWA/navegador. Responsable y plataforma ya no están por definir; ejecución física y firma siguen pendientes. La implementación y verificación móvil adicional está en [PASO_11_PWA_MOVIL](PASO_11_PWA_MOVIL.md): 366 móviles, 149 UX y 101 funcionales de tres suites, sin sumarlos a los conteos históricos de este reporte. Conserva pendientes clínicos/jurídicos y no autoriza producción.


### Suplemento de recorridos móviles profesionales (2026-10-10)

Revisión posterior en [PASO_11_PWA_PROFESIONALES](PASO_11_PWA_PROFESIONALES.md): 452 móviles/275 UX/131 funcionales, dos hallazgos corregidos y repetición afectada 126/42/32 PASS; 36 capturas y seis PDF/36 páginas inspeccionados. Mantiene aceptación física e institucional pendiente; distingue evidencia por build sin sumar repeticiones a los resultados históricos.
