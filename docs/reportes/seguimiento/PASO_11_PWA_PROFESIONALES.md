# Paso 11 — ampliación móvil de los recorridos profesionales

Fecha / entorno / rama / commit: 2026-10-10, America/Santiago; QA local castelao-patient-qa; codex/seguimiento-terapeutico, base 4fbf785, sin commit.

Estado: Validado localmente en el alcance técnico descrito. Dos hallazgos corregidos y repetición afectada PASS. Sin aceptación humana ni activación productiva.

Objetivo y requisitos: §5/14/18/19. Ampliar la matriz Chromium/WebKit del suplemento PWA anterior a planificación, registros de psicología/Recovery/psiquiatría, decisiones/supervisión, informes y programaciones. La aclaración de dirección como aceptante y Android/iPhone PWA/navegador permanece vigente; la ejecución física sigue pendiente.

## Implementación y rutas

Catálogo compartido care-mobile-coverage.mjs para seleccionar rutas reales de las suites existentes, sin pantallas ni autenticación paralelas. Auditor con nueve geometrías por motor, toque, áreas seguras simuladas y controles de ancho/fuentes/zoom/retención de texto. care-local.mjs mobile-extended-audit ejecuta cinco suites secuenciales; mobile-extended-report consolida dieciséis contextos en extended-results.json, separado del agregado anterior. La consolidación de una ejecución exige matrices posteriores a su inicio, sin grupos vacíos ni rutas seleccionadas ausentes.

Planificación: ficha/planificación, agenda nueva/detalle, Hoy/semana/compromisos del paciente y capacidades técnicas. Registros: editor de cada especialidad, solicitudes de dirección y resúmenes explícitos del paciente. Decisiones: nuevo/detalle, supervisión, Mi trabajo y tarea delegada. Informes: índice y detalle revisado, informe autorizado del profesional. Programaciones: configuración, fallo, supervisión del equipo y comparación.

La auditoría de psiquiatría se ejecuta antes de retirar la capacidad médica de su fixture: así revisa el formulario editable autorizado. La misma suite conserva después su prueba de revocación y bloqueo con sesión previa; no se añaden permisos al producto ni cuentas reales.

Migraciones / configuración: ninguna migración ni actualización de paquetes. La ampliación reutilizó el build del suplemento PWA; después se recompiló para las correcciones descritas abajo. Solo proyecto QA marcado, loopback, navegador instalado y WebKit existente; fixtures con identidades neutrales. La suite de jobs activa y retira temporalmente únicamente su cron QA propio para sus escenarios existentes.

## Pruebas y evidencia

La primera ampliación terminó PASS: **452 controles móviles, 24 rutas/estados y 16 contextos**, **275 controles UX en 23 contextos**, **131 funcionales en cinco suites**. Repetición de registros después de mejorar las capturas médicas: 24 funcionales/96 móviles/36 UX PASS; son los mismos casos, sin sumarlos.

| Suite | Funcionales | Móviles | Resultado de ampliación |
| --- | ---: | ---: | --- |
| Planificación y capacidades | 32 | 126 | PASS en ampliación y repetición final tras las correcciones |
| Registros por especialidad | 24 | 96 | PASS, incluido formulario médico editable antes de revocación |
| Decisiones y supervisión | 28 | 94 | PASS |
| Informes | 25 | 58 | PASS |
| Programaciones | 22 | 78 | PASS |
| Total de ampliación | 131 | 452 | PASS en la primera ejecución |

La revisión previa de 366 móviles/149 UX/101 funcionales conserva su fecha. La suma de cobertura fue **818 móviles/44 rutas-estados/22 contextos, 424 UX/33 contextos y 232 funcionales/ocho suites** sobre el build de **2026-10-10 18:32:00 UTC**. Evidencia: tmp/care-qa/mobile/extended-final-validation.json, consolidada a las 19:08:25 UTC. No afirmar que todas las suites se repitieron después de los cambios finales; no sumar repeticiones ni los conteos históricos de Paso 11. SQL, restauración y volumen conservan su evidencia previa.

Tras corregir el texto y el selector: build/tipos **19:19:06 UTC**, repetición final **126 móviles/42 UX/32 funcionales PASS** en planificación/capacidades, cero hallazgos; captura explícita de participantes en ambos motores y nueva inspección de las ocho capturas de planificación/capacidades. La comprobación final de **19:22:15 UTC** verifica resultados posteriores al build, código de producto sin cambios posteriores y hashes de las 36 capturas seleccionadas. Los demás archivos visuales conservan los hashes previamente inspeccionados. Evidencia: tmp/care-qa/mobile/copy-fix-validation.json. Se preservan por separado los agregados de la ejecución previa; no ejecutar extended-proof.py como si sus 818 controles pertenecieran al último build.

Comandos: `node scripts/care-local.mjs mobile-extended-audit`, `mobile-extended-report` y `ux-report`. Para repeticiones individuales: `CARE_MOBILE_AUDIT=true`, `CARE_UX_AUDIT=true`, `PLAYWRIGHT_BROWSERS_PATH=C:/Git/castelaochile/tmp/playwright-mobile` y `node scripts/care-local.mjs records-e2e` o `e2e`; ejecutar secuencialmente porque comparten fixtures/puerto. `node --check` de los cuatro scripts modificados y ESLint focalizado PASS. `node scripts/care-local.mjs build` incluye TypeScript y pasó después de cada corrección. Las 99 unitarias y el lint general del suplemento anterior son evidencia previa, sin recontarlos como ejecución nueva.

PDF: `C:/Users/sebag/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe scripts/qa-care-inform-pdf.py` y el mismo comando con `--scheduled-only`: seis exportaciones actuales, **36 páginas**, análisis de texto/márgenes/cabeceras/pies PASS e inspección de todas las páginas mediante diez hojas de contacto. Original, revisado, regenerado y profesional privado: ocho páginas cada uno; mensual vacío y programado: dos cada uno. Se verificaron versión, ausencia de reservas, tarea mínima e integridad del original. Evidencia ignorada: tmp/care-qa/pdf/validation.json, validation-scheduled.json y extended-visual-validation.json, con hashes actuales.

Limpieza independiente tras las cinco suites, la repetición de registros y nuevamente tras la repetición final de planificación: **47 conteos y cuatro recursos propios a cero**, guard de último superadministrador habilitado, cinco tablas de jobs con RLS, bucket privado, cron QA propio detenido y worker no ejecutable por authenticated/service_role. Evidencia: tmp/care-qa/mobile/extended-cleanup-validation.json, extended-cleanup-verification.txt y extended-cleanup-proof.mjs, comprobación de solo lectura. Fixtures retirados por cada suite propietaria; no reutilizar sesiones reales ni deshabilitar controles productivos.

UX/UI: formularios, fuentes/gráficos, tablas y menús en ambos motores, incluido horizontal corto y ventana reducida. Inspeccionadas **36 capturas seleccionadas**: 32 de contenido, dos médicas y dos del selector; reinspeccionadas las ocho de planificación/capacidades renovadas. Una ventana reducida y márgenes CSS simulados no acreditan teclado/notch físicos ni instalación. No se midieron tiempos reales de registro por usuarios.

Permisos: sesiones ordinarias de las suites; propiedad/asignación, capacidad médica, reservas, publicación y revocación se mantienen. Auditor sin enviar sus textos de prueba ni modificar grants. Datos/métricas: conservar fórmulas, denominadores, fuentes, categorías y versiones; no aprobar una rúbrica clínica por utilizar fixtures sintéticos.

## Fallos detectados y correcciones

La inspección visual encontró en /admin/seguimiento/equipo una descripción antigua que presentaba decisiones e informes como pendientes de implementación. Se corrigió para describir sus controles propios y autorización vigente. No cambia capacidades ni concede lectura clínica por ser superadministrador.

La primera repetición tras corregir el texto falló: WebKit/new-event/small, viewport 320 px y scrollWidth 351 px. El legend de participantes medía 313 px en un formulario de 243 px. Se conserva el fallo en tmp/care-qa/mobile/planning-staff-failure-before-legend-fix.json. El primer ajuste de ancho/máximo 100%, mínimo cero y salto de línea no resolvió el fallo; la segunda repetición también falló y se conserva en planning-staff-failure-width-only-fix.json.

Diagnóstico aislado con el mismo cambio 390→320: WebKit conserva el ancho anterior del legend dentro de fieldset/grid; ni el ancho explícito ni una columna minmax lo corrigen. Block/flex recalculan correctamente. Corrección final específica `.care-form .care-participant-options { display: flex; flex-direction: column; }`, conservando gap, legend semántico y salto de línea completo. Evidencia reproducible: tmp/care-qa/mobile/legend-diagnostic.mjs y legend-diagnostic-results.jsonl. ParticipantPicker se usa únicamente al programar actividades nuevas en EventForm; la repetición de planificación cubre ese alcance. Se añaden capturas explícitas del selector en ambos motores. No se oculta el desborde global ni se relaja la comprobación.

El índice Markdown del changelog Supabase rechazó su tipo de contenido; se consultaron [changelog HTML](https://supabase.com/changelog) y [guía SSR oficial](https://supabase.com/docs/guides/auth/server-side/creating-a-client), sin actualizar dependencias ni asumir cambios de APIs. Guías de Next instaladas: layouts/pages y CSS. Se aplicó la guía PDF del entorno para analizar/renderizar e inspeccionar las exportaciones actuales.

## Pendientes y siguiente paso

Repetición, inspección y limpieza final completadas; seis documentos obligatorios actualizados, junto con referencias en Paso 11, ACEPTACION y ACTIVACION. No quedan hallazgos técnicos abiertos de esta revisión. Protocolo de urgencias, rúbrica Recovery, retención/respaldo y criterios de alertas reiteradas/atraso profesional siguen sin aprobación; no se inventan. Dirección debe ejecutar/firmar la pauta física en Android/iPhone y revisar versiones antiguas del stack.

Siguiente paso concreto: al retomar la aceptación con Dirección, ejecutar la pauta en dispositivos físicos y registrar modelo/SO/navegador, instalación, giro, zoom, teclado, áreas seguras, guardado/reintento y cierre de sesión. Responsable y plataforma ya definidos por el usuario; la ejecución y firma permanecen en espera. Conservada la lista de criterios institucionales para consultar al cliente cuando se retome, sin contacto ni recordatorios automáticos.

Solo trabajo local, sin producción, push/deploy, correos reales, contacto al cliente o recordatorios. No declarar todo modelo/SO compatible mediante emulación.
