# Paso 09 - Informes semanales/mensuales y PDF privado

Fecha / entorno / rama / commit si existe: ejecución 2026-10-09 y cierre documental 2026-10-10, America/Santiago. QA local castelao-patient-qa (API 54421, navegador 3450); rama codex/seguimiento-terapeutico, base 4fbf785; sin commit ni producción.
Estado: Validado localmente. Implementación, regresión, revisión visual y limpieza comprobadas; producción sin cambios.

Objetivo y requisitos cubiertos:

§13/§16: consolidación determinista semanal/mensual de fuentes autorizadas, periodo/corte, población, datos faltantes, avances/dificultades, cumplimiento, alertas, intervenciones y pendientes documentados; revisión, regeneración y PDF privado versionado. Reutiliza panel/diseño institucional, Auth/SSR, capacidades/asignaciones actuales, formularios/gráficos y fuentes anteriores. Scheduler y comparación de periodos pertenecen al Paso 10. Sin IA ni juicio clínico automatizado.

Cambios implementados y rutas disponibles:

- /admin/seguimiento/informes: buscador de alcance individual o colectivo (máximo 50), tres campos y periodos cerrados por defecto; lista de 25 informes autorizados.
- /admin/seguimiento/informes/[id]: estado generado/revisado, gráficos y tablas accesibles, calidad, pacientes con pendientes respaldados por fuentes, revisión/regeneración breves, historial y 25 fuentes por página. Clic de categoría filtra esa misma versión y abre origen autorizado.
- /admin/seguimiento/informes/[id]/pdf?revision=N: descarga autenticada, tamaño/hash/permisos revalidados. Original y cada revisión conservan snapshot/PDF. Revisión exige observación y confirmación, crea versión nueva; regeneración solo autor, con motivo y versión esperada.
- Contratos Zod, servicios de dominio, renderer PDFKit, acciones y proxy existentes extendidos. Nueva suite QA normal Auth/REST/navegador/exportación y verificador de texto/render PDF.

Migraciones / configuración requerida:

20261010013747_care_period_informs.sql: tres tablas privadas RLS sin grants directos, funciones invoker/definer con search_path vacío, helpers sin EXECUTE de aplicación, bucket care-informs privado (PDF/5 MB) y política restrictive que deniega acceso directo anon/authenticated. Actor real de Auth, bloqueo por alcance/periodo y versiones optimistas. Aplicada/refinada exclusivamente en contenedor QA marcado; archivo de migración/hash local actualizados. Nunca db push/reset/link remoto.

PDFKit 0.20.2 y @types/pdfkit 0.17.6 fijados con pnpm/pnpm-lock. serverExternalPackages y trace del logo institucional; no proveedor remoto. Exportar reserva un intento por diez minutos, sube con clave creada por DB/upsert=false, confirma metadata/bytes/SHA256, mantiene ready/failed y admite reintentos hasta cinco. Finalización solo service_role y revisa permisos actuales del actor; una reserva normal no concede acceso directo a Storage. Archivos sin confirmar quedan ligados a intento, recuperación administrativa pendiente de jobs.

UX/UI: recorridos probados, móvil, teclado y gráficos:

Formularios de generación/confirmación/regeneración, errores con foco y texto conservado, gráfico a origen y fuentes 25+25+9 probados en navegador. Revisión de permisos añadió autorización de cada tarea conservada para bloquear informes/PDF tras reasignación; nuevas series por contexto privado actual. La repetición final aprobó 25 controles funcionales, incluidas unidades participantes/obligaciones/sesiones, singular/plural, categorías traducidas y retorno a versión vigente después de regenerar desde una histórica.

Auditoría acumulada: 363 comprobaciones UX, 74 rutas/estados, 26 contextos y cero hallazgos; 59 comprobaciones nuevas respecto a Paso 8. Capturas 320/375/768/1440 y menú 320×568, detalles expandidos, teclado, contraste y foco. Inspección manual de muestras finales: panel revisado de escritorio, generación móvil vacía, revisión/regeneración expandida, informe mensual sin fuentes, profesional y menú móvil. Inspección visual completa de los cinco PDF exportados por la aplicación: original/revisado/regenerado de ocho páginas cada uno, mensual sin fuentes de dos y profesional de ocho; 34 páginas con logo, encabezado/estado, márgenes y numeración correctos, sin recortes, superposiciones ni páginas vacías. Las correcciones de footer y cabecera se verificaron en estos archivos finales.

Permisos: perfiles y casos positivos/negativos comprobados:

SQL con anon/authenticated/service_role y JWT reales: paciente/CMS/profesional sin export, dirección parcial, UUID/revisión ajena, acceso directo a tablas/helpers, actor falsificado y PDF finish no autorizado. Autor/dirección con todo el alcance vigente pueden abrir; solo autor regenera. Perder family.read/decisions.manage/asignación/actividad bloquea informes históricos enteros y PDFs, incluso con JWT anterior. Ganar capacidades exige otra serie/contexto, evita aumentar contenido al regenerar una anterior. Descarga autoriza antes/después de bytes con no-store/noindex/CSP sandbox; no URL firmada/pública ni proyección al paciente.

La revisión de seguridad detectó que una tarea reasignada podía permanecer en el snapshot de un profesional: corregido con autorización de las tareas conservadas en todas las versiones y fingerprint de contexto privado. SQL y navegador reales comprobaron bloqueo del informe/PDF listo con el JWT anterior, y nueva serie idempotente sin la instrucción.

Navegador comprobó creación normal, negativos antes de streaming, Storage directo/URL firmada/subida negados, hash real y conservación byte a byte del PDF original tras revisión. Revocación de capacidades, alcance y tarea reasignada bloquean informe y PDF ya preparado con el JWT anterior; controles finales PASS.

Datos/métricas: fuentes, reglas y casos límite verificados:

Semana lunes a lunes y mes primer día a primero siguiente, fin exclusivo, America/Santiago. Solo periodos cerrados del último año. Corte de conocimiento al generar, separado del periodo: corrección posterior puede entrar en regeneración, sin reconstrucción histórica al cierre. Población única 1–50, fuentes completas hasta 1000; exceder límites da error, no truncamiento silencioso. Snapshot v1 con autores/revisiones y subset autorizado; reserva/participantes/evaluación privada excluidos. Sin dato faltante interpretado como estabilidad ni obligación ausente interpretada como omisión.

Asistencia excluye cancelación/familia; registros esperados incluyen familia autorizada aun con paciente ausente, final propio cumple y borrador no; reportes requeridos ya generados, igualdad de cierre en plazo. Autodeclaración, compromisos, alertas, resúmenes, autonomía cualitativa, familia/acuerdos, decisiones/tareas/solicitudes y seguimiento conservan fuentes. Pendientes antiguos carried separados de barras. Lista de revisión proviene solo de pendientes operativos/valoración profesional registrados, no diagnóstico nuevo. N=0 no aplica. No rúbrica Recovery ni plazo universal de registros inventados. DST semanal/mensual verificado, incluido mes real generado 721h y semana real 167h mediante JWT normal.

Pruebas: comando, resultado real y evidencia segura:

- care-local.mjs db-test: PASS 662 SQL/RLS (70 nuevas respecto a Paso 8), rollback completo; incluidos tamaño incorrecto rechazado, fallo/reintento y revisión pendiente por paciente.
- node scripts/care-local.mjs build; pnpm exec tsc --noEmit --incremental false; pnpm lint; pnpm test: PASS, rutas dinámicas y renderer compilados, 95 unitarias sin fallos. Trazas de generación de índice/detalle incluyen logo y Helvetica.afm; descarga no necesita renderer.
- node scripts/care-local.mjs ux-audit: siete suites secuenciales PASS, retirando fixtures entre suites. Regresiones: 32 planificación, 19 reportes, 24 registros, 48 dashboard/métricas, 33 Recovery/familia y 28 decisiones/supervisión (184). Repetición final node scripts/care-local.mjs informs-e2e: 25 nuevas PASS; total 209 controles funcionales de atención, sin sumar repeticiones. node scripts/care-local.mjs ux-report: PASS 363 UX/74 rutas-estados/26 contextos, cero hallazgos.
- node scripts/patient-local.mjs db-test y test: PASS 76 SQL con rollback y 30 E2E biblioteca/Auth; Mailpit local exclusivamente, limpieza completa y guard restaurado.
- Python incluido, scripts/qa-care-inform-pdf.py: PASS cinco PDFs reales/34 páginas, 59/59/59/0/60 fuentes respectivamente; contenido y versiones esperados, ausencia de reservas/deliberación, márgenes, cabeceras y numeración de cada página. Poppler generó páginas PNG y hojas de contacto; todas las páginas finales inspeccionadas visualmente, PASS.
- Advisors/db lint finales PASS: cinco WARN de rendimiento y tres avisos de variables previos, sin ERROR/nuevo aviso del módulo.
- Consulta independiente read-only al contenedor QA marcado: 17 conteos a cero, incluidas identidades/perfiles, informes/versiones/intentos y objetos PDF; bucket privado con límite 5242880 bytes y MIME application/pdf; protect_last_active_superadmin habilitado (O). Biblioteca con ids=[]/completed=true. Evidencia tmp/care-qa/step-09-cleanup-verification.txt; resumen contrastado tmp/care-qa/step-09-final-validation.json.
- Evidencia ignorada exclusivamente neutral: tmp/care-qa/*results.json, logs locales, ux/PNG/JSON, step-09-*.pdf, pdf/validation.json y páginas renderizadas. Scripts reproducibles en scripts/qa-care-informs-e2e.mjs y qa-care-inform-pdf.py. Sin datos clínicos reales ni claves en Git.

Fallos detectados y correcciones:

CLI sin escalación falló en telemetría fuera del workspace; creación local con escalación autorizada funcionó. Primeras compilaciones SQL detectaron concatenación JSON sin paréntesis y campo patient_id ausente en summaries; corregidos usando record.patient_id. Fixture SQL refería start en vez de start_day y produjo fecha nula; corregido, no considerado PASS. TypeScript detectó .catch en builder thenable; cambiado a try/await/catch.

Primer npm install falló en Arborist matches e interfirió en node_modules con junctions pnpm: usado gestor del lockfile, versiones fijadas y pnpm install --force --offline --frozen-lockfile para restaurar enlaces. Build y tipos con acceso a enlaces de dependencias pasaron; ejecución tsc sin escalación produjo errores de resolución de dependencias, repetida en mismo entorno que build.

Selectores QA asumían textos sin prefijo CareField, «Presentes» en vez de «Presente», N=0 en vez de etiqueta compartida 0/0 y operación finalize sobre registro final. Corregidos según componentes/contratos actuales (amend); esos timeouts no equivalen a funciones aprobadas. Conteo de fuentes esperaba 31 e ignoraba 28 alertas operativas generadas al consultar; corregido a 59 y tres páginas, sin cambiar fuentes por conveniencia. Limpieza incorporó esas alertas y se retiraron solo fixtures de los intentos propios. Una ejecución SQL mientras el navegador tenía identidades QA alteró directorio esperado: repetida después de retirar fixtures, suites posteriores secuenciales.

Inspección PDF encontró footer que generaba páginas vacías y cabeceras ausentes en páginas de continuidad. Footer con margen temporal cero y encabezados dibujados tras paginar; nuevo render aprobado en las 34 páginas finales. Etiquetas de fuentes traducidas con catálogo existente; autor no identificado explícito en vez de atribuir autor profesional inexistente. Revisión de privacidad corrigió el acceso a snapshots de tareas reasignadas y verificó la denegación del PDF ya listo. Una escritura iniciada desde revisión histórica conservaba su query: acciones vuelven ahora a la versión vigente; recorrido real desde v1 a v3 aprobado.

Pendientes/bloqueos y su impacto:

Sin bloqueo local pendiente del Paso 9. Paso 10: scheduler privado real, reglas, fallos y comparación/reintentos operativos; intentos interrumpidos requieren recuperación administrativa hasta disponer de jobs. Paso 11: aceptación institucional, dispositivos físicos, volumen, retención/restauración y revisión normativa. Rúbrica Recovery no aprobada y sin plazo universal configurado conforme a respuestas del usuario. Límite 50 pacientes/1000 fuentes/100 páginas/5 MB/cinco intentos por versión explícito; no exportación masiva irrestricta. PDF con fuentes estándar españolas; caracteres fuera del repertorio se preservan como [U+XXXX], no se pierden silenciosamente. No tagged PDF/certificación de accesibilidad PDF. Interpretación de cohortes de responsables actuales y conocimiento al generar documentada.

Qué está local, qué está desplegado y qué no se probó:

Solo SQL/código/UI/Storage QA con identidades @example.test y fixtures retirados por suite; limpieza independiente aprobada. Sin commit, push, producción, despliegue, correos reales, publicación al paciente ni scheduler. No pruebas con pacientes reales, aceptación institucional, dispositivos físicos o carga productiva. Paso 9 validado exclusivamente localmente; no equivale a activación.

Siguiente paso concreto:

Paso 10: jobs y reglas locales, generación del lunes, supervisión de fallos, comparación de periodos y reintentos/idempotencia. Seis documentos actualizados con resultados efectivos del Paso 9. Activación y despliegue requieren autorización.
