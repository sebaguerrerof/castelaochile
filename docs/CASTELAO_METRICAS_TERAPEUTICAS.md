# Contrato de métricas terapéuticas — versión inicial 1

Diseño previo a gráficos. Implementación de indicadores: pasos 5–6. Sin escala diagnóstica ni puntaje de recuperación. Toda cifra se calcula sobre registros autorizados en servidor y abre su evidencia. Corte UTC, presentación y días `America/Santiago`; semana lunes–domingo; intervalo [inicio, fin). Periodos 7/30/90/episodio y comparación equivalente, etiquetando semanas parciales/cambios de población.

| Indicador / grano | Fuente y fecha | Numerador / denominador | Exclusiones / límites |
| --- | --- | --- | --- |
| Activos / persona al corte | Episodios + historia efectiva | Personas únicas con estado activo / no aplica | Pausados/egresados; cuenta suspendida no equivale a egreso; alcance vigente |
| Ingresos/egresos/abandono/reingreso / evento | Episodio/historia, fecha efectiva | Eventos del periodo / no aplica | Separar eventos/personas; motivos registrados, sin inferir |
| Asistencia / participante-evento | Eventos realizados y cerrados | Presentes / esperados | Cancelados fuera; justificadas y pendientes visibles aparte, justificadas siguen en N en v1 hasta aprobación |
| Reportes / obligación cerrada | Obligaciones y primer envío | En plazo / requeridas cerradas | Abiertas/exentas/antes lanzamiento fuera; tardíos/omitidos separados; error scheduler muestra calidad incompleta |
| Compromisos / obligación al corte | Compromisos/historia | Realizados / exigibles vencidos | Cancelados fuera; propio/profesional y puntualidad separados |
| Participación / observación | Sesión, hora del hecho | Distribución de categorías / observados | No evaluados fuera; sin convertir categorías en porcentaje inventado |
| Autonomía / dimensión-version | Rúbrica aprobada y evidencias | Medición por dimensión / evaluables | No evaluable como hueco, versión distinta no comparable; aprobación pendiente |
| Alertas / situación única | Regla y evidencia, apertura/cierre | Abiertas por tipo/estado / no aplica | Sin duplicado por recarga; operación separada de clínica |
| Registros / responsabilidad sesión | Agenda y finalización original | En plazo / esperados con plazo cerrado | Sin exigir diario sin sesión; correcciones no alteran puntualidad original |
| Intervenciones / tarea | Decisión/tarea, vencimiento/ejecución | Pendientes/vencidas/realizadas / exigibles | Solo autorizado; delegado sin deliberación |
| Familia / sesión/acuerdo | Agenda/acuerdos, hecho/vencimiento | Realizados / esperados | Terceros autorizados; sin texto reservado en agregado general |

Cada implementación añadirá consulta/función, versión de regla, población, refresco y fixtures comprobados. Totales: suma de n / suma de N; nunca media de porcentajes. N=0 → «No aplica»; falta fuente → «Sin datos». Barras con etiquetas, resumen textual, tabla accesible y enlaces autorizados; sin nueva librería mientras basten componentes existentes.

Duración propuesta para episodios: días locales en estado activo hasta el corte, pausas excluidas y episodios sin solapamiento; fecha original de ingreso conservada. Es propuesta operativa v1, pendiente de validación institucional antes de publicar indicador. No confundir habilitación de cuenta con días terapéuticos activos.

## Fuentes comprobadas en Paso 2

`care_events` es la única actividad institucional; `care_event_participants` aporta el grano paciente-evento y mantiene `pending` hasta registro explícito. Cierre realizado con 2 participantes y solo 1 registro presente deja 1 presente + 1 pendiente, nunca 1 ausencia inferida. Cancelación excluye actividad de asistencia. Correcciones dejan `care_attendance_history` y versión. Puntualidad/participación opcionales son observaciones, no escala de recuperación.

`care_personal_plans` conserva la fuente paciente; completar un plan no suma una sesión ni asistencia. `care_commitments` separa origen, responsable, realización autodeclarada/profesional y verificación; vencido se deriva solo si pendiente y `due_at < corte`. Reprogramación conserva fecha previa en historia; verificación no altera `completed_at`. Aún no se publica porcentaje ni gráfico sobre estas fuentes (pasos 5–6).

Semana civil lunes–domingo resuelta mediante IANA Santiago: fixture 2026-08-31 a 2026-09-07 contiene 167 horas UTC; recurrencia semanal 09:00 conserva esa hora civil. Consultas de agenda por solapamiento con intervalo [inicio, fin), límites de 32 días y páginas de 25; pacientes reciben solo su asistencia. Fechas inexistentes/repetidas se rechazan. Fixtures PostgreSQL y prueba unitaria validan los cambios horarios, sin fijar un offset anual.

## Fuentes de reportes — Paso 3

Grano: `care_report_obligations`, único paciente/día civil/tipo mañana o noche. Dirección aprueba explícitamente campos, campos requeridos al enviar, días ISO, ventana civil y base `active_days` o `agenda_days`; sin seed clínico. Reglas y excepciones tienen revisión ordenable independiente de empates de timestamps. Cada obligación conserva regla, campos, ventana UTC resuelta con IANA Santiago y motivo de exigibilidad. Incorporación tiene fecha inicial inmutable e historia. No hay obligaciones retroactivas previas a incorporación ni reconstrucción de omisiones tras perder una ventana de generación.

Elegibilidad: incorporación vigente, día configurado, episodio activo **al abrir la ventana**, y agenda institucional no cancelada si la regla exige agenda. Pausado al abrir o exención expresa → no requerido. Cambio horario con instante inexistente/repetido → datos incompletos, sin obligación inventada. Ventana excepcional solo afecta obligaciones aún no generadas; exención retira exigencia de pendientes abiertos sin envío, conservando cambio previo. No modifica enviados ni periodos cerrados.

Borradores privados en `private.care_report_drafts`: no cuentan como envío, revisión ni numerador. `care_daily_reports.first_submitted_at` conserva primer envío; correcciones en `care_report_revisions` no cambian puntualidad. En plazo si primer envío ≤ deadline; tardío si > deadline; omitido solo si obligación requerida **realmente generada** y cerrada sin envío. Abierta sigue pendiente. `closed_at` se materializa al consultar; scheduler real pendiente del Paso 10. No usar ausencia de fila como omisión: después de plazo sin fila → calidad incompleta. Fixtures verifican fallo real transaccional y ausencia de generación sin culpar al paciente; esto no demuestra scheduler ejecutado.

Fórmula prevista pasos 5–6: n = envíos en plazo de obligaciones requeridas cerradas; N = obligaciones requeridas realmente generadas y cerradas. Tardíos/omitidos separados; abiertas/exentas/preincorporación fuera de N. Informar además ventanas elegibles con generación ausente, evitando presentar porcentaje fiable de periodo incompleto; no rellenar N con filas fabricadas. N=0 → No aplica. Aún no se calcula ni publica porcentaje/gráfico.

`care_report_reviews` acredita profesional, momento y versión revisada. Una revisión de versión 1 no acredita la versión 2. Paciente recibe acuse, nunca comentario interno; revisión no acredita veracidad clínica del autorreporte. Textos referidos por paciente no se convierten en puntaje, semáforo ni diagnóstico.

## Fuentes de registros — Paso 4

Grano: `care_session_records`, único paciente/evento/profesional/especialidad. `occurred_at` es hora del hecho; `first_finalized_at` conserva la finalización original incluso tras enmiendas. Borrador no acredita registro finalizado ni evaluación. Las versiones finales conservan categoría deliberada `improved`, `stable`, `worsened` o `not_evaluable`, sin valor inicial ni transformación en escala. La ficha abre el último registro final autorizado por hora del hecho e identifica especialidad y fecha; ausencia de registros no significa estabilidad. Esta observación no asigna semáforo ni vigencia clínica.

La fuente de sesiones propias filtra profesional y participante antes de limitar 25 resultados; no pierde una sesión del paciente por existir eventos recientes de otros pacientes. Un registro final exige sesión realizada y asistencia ya registrada; no la autocertifica ni altera su porcentaje. Participación, hechos, relato e interpretación siguen siendo fuentes separadas. Recovery permanece cualitativo hasta rúbrica aprobada; adherencia referida no acredita toma farmacológica observada.

Puntualidad profesional todavía no se calcula: requiere plazo institucional versionado y responsabilidad real de agenda (Paso 5/10). No existe plazo universal de 24 horas ni registro diario exigido sin sesión. Solicitud recibida acredita solo recepción; no se suma a intervenciones ejecutadas. Listados y resúmenes se paginan a 25; historia clínica de cada registro se devuelve completa dentro de su RPC autorizado, pendiente de evaluar paginación/rendimiento con historiales extensos en QA final.

## Dashboard operativo v1 — Paso 5

RPC `care_dashboard`: alcance actual DISTINCT por paciente; cuenta staff activa y capacidades directory/patient/records. Corte DB al consultar. Ventana de 7/30/90 días civiles desde el inicio del primer día hasta corte; America/Santiago, sin multiplicar días por 86.400 segundos. La medianoche omitida de primavera empieza al primer instante real del día. Canceladas, programadas y hechos aún no cerrados quedan fuera de asistencia.

Asistencia n/N: presentes / participantes de eventos realizados, con inicio dentro de ventana y cierre/fin hasta corte. N conserva ausentes, justificadas y pendientes; se muestran cuatro categorías. Fixture A: 1 presente, 1 ausente, 1 justificada, 1 pendiente = 1/4; B: 1/1. Colectivo correcto 2/5 = 40 %, no media 62,5 %. N=0: No aplica · 0/0; observado 0/4: 0 %. No son resultados de recuperación.

Reportes n/N: en plazo / obligaciones requeridas generadas y cerradas, con deadline dentro de ventana. Primer envío <= cierre en plazo; > cierre tarde; sin envío al corte omitido. Borrador no participa, corrección no altera primer envío, abiertas/exentas fuera. Fixture: una igualdad exacta, una tardía y una omitida = 1/3. Las ventanas elegibles sin obligación y reglas incompletas se declaran como calidad; no fabrican omisiones. Scheduler sin verificar.

Fuentes `care_dashboard_sources` paginan 25 y conservan total completo/corte. Cada barra abre categoría autorizada; reporte enlaza día de obligación, distinto del día de cierre cuando cruza medianoche. Listas de pacientes/alertas también paginan 25; filtro de nombre/estado de pacientes cambia solo la tabla, no la población del gráfico, explícito en UI. Filtros globales de cohorte/tipo/profesional y periodo desde ingreso quedan en Paso 6.

Pendientes de registro: paciente-evento-especialidad del responsable actual habilitado con patient.read/records.create; realizada y cerrada, sin finalización original hasta corte. Borrador no completa. Solo el responsable recibe enlace directo para registrar; equipo abre ficha autorizada. Sin plazo profesional aprobado, pendiente no se etiqueta atrasado. Solicitudes cuentan solo open, con decisions.manage; tarjeta/lista filtran ese mismo estado.

Alertas v1: obligación requerida cerrada sin envío al evaluar o compromiso pendiente con due_at < ahora. Idempotencia por paciente/tipo/fuente. Recepción mantiene pendiente; resolución conserva origen/historial y no recrea alerta aunque vuelva a consultarse. Un envío tardío o reprogramación posterior no borra alerta ya registrada; requiere cierre explícito. No hay regla de ausencias reiteradas ni gravedad clínica automática en este paso.

Valoración: coordinación interna, manual, con evidencia finalizada del mismo paciente, actor autenticado, motivo, hora del hecho y revisión prevista elegida. Sin valoración o verde/amarillo con revisión vencida: gris. Rojo permanece rojo si vence revisión, exigiendo nueva valoración; solo una valoración posterior cambia el color. No hay plazo universal de vigencia ni verde por ausencia de alertas. Historial conserva versiones. Cuenta suspendida del portal no elimina al paciente del alcance del equipo ni altera estado del episodio.

Cada valoración conserva también record_revision, tomada del registro finalizado bajo bloqueo de lectura al guardar. Una enmienda posterior no cambia esa referencia; el enlace abre #revision-N y muestra esa revisión histórica autorizada. Una valoración nueva toma la revisión actual de su evidencia, sin aceptar revisión o autor suplantados desde cliente.


## Paso 6 — Contrato operativo implementado v1 (2026-10-09)

RPC `care_metrics(p,cutoff)` y `care_metric_sources(p,metric,category,page,cutoff)` comparten filas y alcance. Permiso actual, no alcance histórico: cuenta staff activa + directory/patient/records + asignaciones vigentes DISTINCT. Opciones de grupo/profesional contienen solo sujetos dentro de ese alcance. Filtro grupo usa membresía actual; profesional filtra población asignada y autor/responsable efectivo de actividad/registro/compromiso. Los reportes usan la población del profesional, pues no tienen autor profesional responsable. Tipo solo aplica a fuentes vinculadas con actividad; reportes/flujos/alertas se excluyen al seleccionar tipo. Actualización al consultar, corte UTC DB y calendario Santiago.

| Indicador | Grano/fuente y fecha | Numerador / denominador o distribución | Exclusiones y corte |
| --- | --- | --- | --- |
| Asistencia | Participante–evento, inicio efectivo / historial al corte | presentes / participantes elegibles | Canceladas, programadas, fuera de rango o no cerradas; justificadas y pendientes permanecen en N |
| Reportes | Obligación generada/cerrada, cierre comprometido | primer envío en plazo / requeridas elegibles | Requerimiento reconstruido de cambios; borradores, exentas y abiertas fuera; tardía/omitida aparte |
| Compromisos | Compromiso, vencimiento del último historial al corte | realizados con confirmación propia/profesional / vencidos exigibles | Cancelados fuera; primera transición completado determina cumplimiento en plazo, sin moverlo con verificación |
| Participación | Asistencia presente, inicio de actividad | con observación / presentes; distribución de cobertura | Texto libre no es rúbrica ni intensidad; no se expone su contenido en agregado |
| Registros | Participante–sesión del responsable vigente, fin real | con primera finalización al corte / esperados de agenda cerrada | Group/individual→psychology; recovery/psychiatry con especialidad correspondiente. Sin plazo aprobado no se mide atraso |
| Evolución | Última revisión final conocida de registro, hora del hecho | mejoría/estabilidad/deterioro/no evaluable; cantidades | Autor/especialidad y revisión exacta, nunca score ni promedio; drafts/reservas/texto libre excluidos |
| Ingresos/salidas | Evento efectivo de episodio/historia | ingreso, nuevo episodio de reincorporación, egreso, abandono | Cambios de fase con mismo estado no duplican transición; eventos ≠ personas únicas |
| Activos | Persona única con episodio activo al corte de stock | Cantidad de personas, no tasa | Pausas/egresos/abandono fuera; cuenta portal suspendida no cambia estado terapéutico |
| Alertas | Caso único por origen, fecha desencadenante | tipo + estado conocido al corte | Existencia del caso al corte; primer estado open existe sin historial de recepción; fuentes previas fuera del rango siguen en listado operativo |
| Gestiones | Apertura de caso + historial de acciones, fecha registrada | aperturas/recepciones/resoluciones | Acciones ≠ casos; no contienen motivo/reserva en agregado |

Ventanas 7/30/90: inicio del primer día civil hasta corte, [inicio,corte). Desde ingreso: último episodio registrado iniciado antes del corte, una ventana por persona; quienes no tienen episodio no aportan observaciones. El rango colectivo empieza en el más antiguo de esos episodios, sin aplicar ese inicio a los demás pacientes. No calcula duración clínica propuesta ni mezcla reincorporaciones anteriores.

Comparación: misma cohorte vigente y reglas v1, desplazamiento de días civiles 7/30/90 y hora local conservada (no segundos constantes). Se reconstruyen revisiones disponibles hasta cada corte; un hecho ingresado después no existe en la lectura anterior. Se declaran personas con ingreso a cada corte. Semanas lunes–domingo; extremos parciales señalados. Sin comparación desde ingreso. No se promedian porcentajes; N=0 indica No aplica. Calidad informa ventanas sin generar, ventanas inválidas, falta de reglas, ausencia de inscripción y obligaciones vencidas abiertas; no convierte faltantes en omisiones ni acredita scheduler.

Fuentes: paginación 25, total completo y corte preservado. Barras categóricas abren el conjunto filtrado de esa categoría. Barras semanales abren categoría de todo el periodo (etiquetado); tabla semanal proporciona cantidades por semana. Stock tiene tabla por fecha separada de flujos. Metadatos y rutas originales, sin copiar reservas o respuestas.

Fixtures verificadas en `care_metrics_test.sql`: ponderación 2/5, primera entrega exacta, confirmación antes/después de verificar, corrección futura, egreso sin duplicar cambio de fase, reincorporación, pausa, portal suspendido, corte histórico conocido, fronteras de microsegundo y horario chileno al pasar de septiembre UTC−4 a UTC−3, exención futura, alcance/grupos ajenos y revocación. El reporte PASO_06 contiene conteos ejecutados; autonomía/familia (7), decisiones (8), exportaciones (9), jobs (10) y aceptación/volumen (11) siguen pendientes.


## Paso 7 — Contrato Recovery/familia v1 (2026-10-09)

RPC care_autonomy_list y care_family_list usan permisos actuales, paciente explícito y periodos 7/30/90 del calendario Santiago, incluyendo hoy parcial, o inicio del último episodio registrado <= corte actual. Sin episodio: start_at null, ventana no evaluable y ninguna fecha sintética. Listas/fuentes paginan 25; totales son del conjunto completo. Consultas actuales, sin comparación histórica ni inferencia de causalidad. Estos indicadores individuales requieren sus permisos; agregados generales del Paso 6 conservan fuentes operativas sin datos de terceros.

| Indicador | Grano y fuente | Cálculo / exclusiones | Visualización |
| --- | --- | --- | --- |
| Autonomía | Observación–dimensión vinculada a revisión de sesión Recovery; fecha del hecho/evaluador | Última versión final en rango; borradores fuera; evaluated/not_evaluable explícitos. Cualitativo sin niveles hasta aprobación | Timeline cualitativo; serie ordinal solo si equipo define orden; categorías sin orden como cantidades. Click abre evidencia. Grupos separados por dimensión y versión; sin promedios/score, huecos para no evaluable |
| Familia prevista/realizada | Paciente–evento familiar, inicio en rango y término <= corte | N no cancelados; n completed con cierre <= corte. Una ausencia del paciente no niega que la familia sesionó | n/N, barra solo con N>0 y agenda paginada original |
| Registro familiar | Mismo evento realizado | n con al menos una sesión familiar finalizada / eventos realizados; borrador no completa ni autores duplican evento | n/N + registros originales y revisiones |
| Acuerdos familiares | Acuerdo explícito, vencimiento dentro de rango y anterior al corte | n completed verificado / N no cancelados exigibles; resultado y actor profesional. Retirar publicación no cambia cumplimiento | n/N, estado/resultado en sesión autorizada; portal solo texto publicado/fecha/estado |

Un nuevo instrumento aprobado reemplaza la selección disponible de su familia. Retirar la última versión no reactiva automáticamente versiones anteriores. Observaciones existentes conservan sus niveles/evidencia/versiones; enmiendas permanecen en el mismo instrumento, incluso retirado. Letras del eje son claves de leyenda de niveles aprobados, no valores clínicos. Ausencia de evidencia no equivale a cero ni estabilidad. Si N=0: No aplica, sin barra artificial.

Fixtures SQL: cualitativo, no evaluable, versiones/retirada/inmutabilidad, reservados y lectores por revisión, tiempos futuros, publicación/retiro, cancelación y verificación, fuente/rol/asignación/especialidad actual, paciente ajeno/suspendido y denominador familiar 29 con fuentes 25+4. Navegador verifica gráfico, hueco intermedio, separación v1/v2, clic/evidencia, persistencia, errores/foco y proyección del portal. Salida final PASS: 95 SQL nuevas (495 acumuladas), 33 recorridos nuevos y 57 controles UX nuevos (227 acumulados, cero hallazgos). Evidencia y límites en PASO_07. No hay rúbrica institucional aprobada; los niveles/actas QA son sintéticos y eliminados.


## Paso 8 — Supervisión y acciones v1 (2026-10-09)

Contrato care_supervision: permisos/asignaciones vigentes, ventana civil Santiago 7/30/90 hasta corte actual; profesionales propios o equipo de dirección dentro de alcance. Agenda añade próximos siete días; tareas/alertas abiertas anteriores permanecen accionables. Sin reconstrucción histórica ni comparación de productividad. Estado filtra fuentes; resumen/gráfico conserva el conjunto completo del periodo/profesional. Páginas de 25 con totales completos y fuente original.

| Vista | Grano / fuente | Regla / límites |
| --- | --- | --- |
| Tareas | Acción delegada independiente desde decisión final | Pendiente/en ejecución; vencida solo con fecha explícita o término vigente de agenda < corte; resultado informado aún no completado; completada requiere verificación de dirección; canceladas aparte |
| Agenda | Paciente–evento del profesional actual | Programada/completada/cancelada; próxima semana visible. Sesión realizada solo estado completed y cierre real; no acredita asistencia por estar programada |
| Registros | Paciente–sesión realizada–especialidad esperada | Psychology para group/individual, Recovery/psiquiatría según agenda y asignación; familia separada con family.read. Final propio completa, borrador no. Sin plazo aprobado/configurado no se inventa atraso |
| Alertas | Caso operativo autorizado | Estado open/received/resolved y fuente; no conteo de mensajes enviados ni promesa de lectura inmediata |

Gráficos de cantidades por estado, base cero, enlaces y tabla accesible; N=0 sin porcentaje ni barra ficticia. No score clínico ni suma de caracteres. Reprogramación de agenda cambia el plazo derivado; cancelación deja ese plazo null, exige revisión de dirección y no completa tarea. Fecha explícita permanece independiente. Historia de agenda conserva el cambio de fuente; tareas conservan responsables, instrucción/resultados y verificaciones. No copiar deliberación a agregados ni portal. Solicitud recibida no equivale a decisión ejecutada. Las métricas generales del Paso 6 conservan sus fuentes; supervisión agrega las nuevas tareas con permisos propios.

El usuario aclaró «No necesariamente» sobre la existencia de un plazo aprobado: no se configura un SLA universal para finalizar registros. Mi trabajo muestra únicamente el profesional actual, incluso dirección; Supervisión muestra equipo autorizado. Tareas sin fecha son pendientes, sin vencimiento inferido. Conjunto por periodo/profesional completo en gráfico; lista filtrada por estado y paginada aparte, con aviso visible.

Fixtures actuales PASS del Paso 8: 34 tareas con fuentes 25+9, pendientes anteriores al periodo, resultado informado separado de verificación, igualdad/cambio/cancelación de fecha de agenda, registros esperados según especialidad y sesiones familiares aunque paciente ausente, retiro de permiso familiar y alcance/profesional ajeno. 97 SQL nuevas/592 acumuladas, 28 recorridos nuevos con clic de gráfico a tarea original y de pendiente a formulario real, 77 UX nuevos/304 acumulados sin hallazgos. Unidades acciones/registros de sesión, singular/plural y tablas inspeccionadas en móvil. Evidencia en PASO_08; no comparación histórica de supervisión ni medición de productividad.

## Paso 9 — Contrato de consolidación v1

Fixtures locales finales: 70 SQL nuevas/662 acumuladas y 25 recorridos REST/navegador/PDF aprobados. Tres gráficos de asistencia, reportes en plazo y sesiones con registro final muestran n/N, ausencia de denominador y origen autorizado. Original/revisado/regenerado conservan 59 fuentes completas, mensual vacío cero y profesional 60 (incluye instrucción mínima propia); cinco PDFs reales/34 páginas verificadas e inspeccionadas. DST civil, corte de conocimiento, corrección posterior y pendientes antiguos comprobados. Evidencia efectiva en PASO_09; sin rúbrica Recovery ni plazo universal inventados.

Semana civil lunes a lunes; mes primer día a primer día siguiente, fin exclusivo en America/Santiago, solo periodos cerrados del último año. Población única congelada (1–50 pacientes autorizados). Corte de conocimiento es la fecha de generación, separado del periodo: una corrección registrada después del periodo puede incorporarse a una nueva versión. No es reconstrucción del estado conocido al cierre del periodo. Fuentes ordenadas y congeladas completas (máximo 1000, error explícito si se excede); pantalla pagina 25, PDF incluye todas.

| Fuente / grano | Contenido / regla |
| --- | --- |
| Paciente–evento realizado | Asistencia existente; cancelados/familia excluidos del denominador ordinario. Sin registro es pending, no absent. |
| Paciente–sesión–especialidad esperada | Final propio con autor elegible actual cumple; borrador no. Familia exige permisos y puede estar pendiente aunque paciente ausente. Sin SLA no inferir atraso. |
| Obligación requerida ya generada | Primer envío <= cierre es on_time; ausente es omitted; ausencia de obligación es calidad faltante, no omisión inventada. |
| Reporte autodeclarado / registro final | Campos autorizados literales y autor, fecha, fuente/revisión; avances/dificultades sin nueva interpretación. Psicología/Recovery/psiquiatría conservan categoría original; omitir campos médicos/reservas fuera de la proyección. |
| Compromiso / alerta / resumen / autonomía | Estado registrado, confirmación propia o profesional distinguida, resumen compartido y evidencia cualitativa, sin score nuevo. |
| Familia / acuerdo / decisión / tarea / solicitud / seguimiento | Campos mínimos autorizados; excluir participantes, reservas y deliberación. Pendientes o valoración anteriores se marcan carried y se excluyen de barras del periodo. Seguimiento vencido es gris, no inferencia clínica. |

La lista de pacientes con revisión pendiente es única por paciente, con motivos derivados solo de registro de sesión pendiente, reporte omitido/tardío, alerta sin resolver, solicitud abierta, tarea pendiente de verificación, acuerdo familiar pendiente o valoración red/yellow/gray ya registrada. No calcula necesidad clínica nueva. Se conserva en el snapshot completo independientemente de la página/filtro de fuentes.

Tres gráficos operativos en pantalla/PDF: asistencia, reportes y registros esperados, base cero, n/N y categorías explícitas, unidades participantes/obligaciones/sesiones y singular/plural; N=0 no aplica. Clic filtra las fuentes congeladas de esa misma versión, excluye carried y conserva revisión/paginación. Tabla y texto de calidad acompañan gráfico. Revisión crea otra versión del mismo snapshot; regeneración captura fuentes actuales y vuelve a pendiente de revisión. PDFs anteriores inmutables, con versión/estado/corte/población en documento. Sin scheduler verificado ni rúbrica Recovery institucional. Evidencia efectiva y límites en PASO_09.

Revisión de privacidad Paso 9: las instrucciones mínimas de tareas también conservan su autorización de recurso. Para un profesional sin dirección, todas las tareas presentes en cualquier versión deben seguir asignadas a ese usuario y este debe seguir habilitado para ejecutarlas. Reasignación/retiro de permiso bloquean la serie histórica y sus PDFs. El contexto de idempotencia incorpora el conjunto actual de tareas propias; si cambia, generar otra serie, sin regenerar una anterior con contenido privado adicional. Dirección con alcance completo conserva lectura autorizada. Se verifican SQL y navegación con JWT anterior; resultados exactos en PASO_09. Revisión o regeneración vuelve al informe vigente para no dejar una versión histórica como resultado de una escritura.

## Paso 10 — Registro de avance inicial (2026-10-10; cierre actualizado abajo)

Ambos periodos se congelan juntos al generar/regenerar: misma población única, contexto, contrato operativo y corte de conocimiento; las correcciones posteriores no alteran versiones previas. Semana anterior contigua o mes civil anterior en America/Santiago, siempre cerrado. Máximo 1000 fuentes por periodo; falla explícita si excede, sin truncar. Cada razón muestra n/N propios, N=0 como no aplica, cantidades con eje compartido y tabla alternativa; no causalidad ni mejora clínica inferida. Versiones anteriores al Paso 10 requieren nueva regeneración para disponer de comparación; se preserva el original. Reglas versionadas solo para reporte omitido/compromiso vencido: espera 0–168 horas explícitamente aprobada por paciente; no SLA universal de registros ni rúbrica Recovery inventada. Operaciones genera obligaciones solo dentro de ventanas configuradas abiertas y alcance congelado; ausencia histórica de fila no equivale a omisión.

## Paso 10 — Cierre validado localmente (2026-10-10)

Validación Paso 10: misma población de dos pacientes, corte y contexto en ambas partes congeladas; asistencia actual 1/1 frente a anterior 0/0 (no aplica), registro actual 0/1 sin atribuir atraso. Corrección posterior no altera ninguna parte guardada; original legacy no recibe reconstrucción retrospectiva, regeneración conserva versiones. Ingresos son pacientes únicos de la población fija con episodio iniciado en cada ventana y conocido al corte, no cantidad de episodios ni altas externas. Reglas gracia 4 h suprimen compromiso vencido 2 h; desactivar conserva historia y evita nuevas alertas; habilitar sin espera crea una alerta con versión/FK exactas y deduplicación. Operación tras downtime registra día civil actual y un único slot de minuto, sin backlog histórico ficticio. Cron real crea solo obligación abierta configurada de A, ninguna omisión retrospectiva ni alerta de B fuera de su alcance, ningún color clínico. Procedencia programada solo en par nuevo creado por pg_cron; reutilizar informe manual/histórico no reescribe su procedencia ni revisión. Resultados efectivos en PASO_10; rúbrica y plazo universal de registros siguen sin configuración institucional.

## Paso 11 — Volumen y límites verificados (2026-10-10)

Base desechable: 500 pacientes adicionales, 10000 eventos/participantes; 7500 asistencias presentes y 2500 ausentes, más una asistencia de la muestra original. Fechas/autor y especialidad congruentes con las fuentes reales; no diagnósticos ficticios. Cinco llamadas por RPC autenticada: metrics mediana 932 ms/p95 de muestra 1674 ms, dashboard 687/905 ms, sources 891/1585 ms. Incluyen proceso Docker, SQL y transferencia JSON, un cliente secuencial, solo cinco muestras; no SLA o capacidad/concurrencia de producción. EXPLAIN ANALYZE almacenado en evidencia local ignorada.

Se verifican conteos exactos y tamaño del primer corte de fuentes; no se recorre todo el historial de volumen. La paginación entre páginas se prueba en las suites funcionales con fixtures menores. Informes rechazan población mayor de 50 y más de 1000 fuentes por periodo sin resultado parcial, conservando el original. Exactamente 1000 fuentes sí es válido. No se ajustaron métricas ni límites para aprobar fixtures.

Rúbrica Recovery no aprobada: continúa cualitativo/no evaluable. Registros profesionales pendientes sin plazo universal. Alertas automáticas de inasistencias reiteradas/atraso profesional todavía no implementadas, condicionadas a criterios del cliente; pauta en ACEPTACION. No inferir mejoras clínicas del rendimiento técnico.


### Cierre técnico del Paso 11 (2026-10-10)

232 controles funcionales de atención en ocho suites; 424 UX/84 rutas-estados/33 contextos, cero hallazgos. Biblioteca 76 SQL/30 E2E (Mailpit local), 95 unitarias y lint/tipos/build PASS. 747 SQL actuales y 823 controles existentes repetidos en migraciones limpias, sin contarlos como nuevos. Recuperación aislada 18 escenarios y web/CMS/blog 36 controles (26 capturas + 10 escenarios) PASS. Seis PDFs actuales/36 páginas comprobadas e inspeccionadas. Limpieza independiente: 21 conteos más cuatro recursos propios a cero; guard habilitado, bucket privado y cron detenido. Estado/evidencia y fallos intermedios en PASO_11; resumen contrastado tmp/care-qa/step-11-final-validation.json. Aceptación institucional/dispositivos y decisiones con el cliente en espera por instrucción del usuario. Sin producción, commit/push/deploy o correos reales.


## Suplemento PWA y presentación móvil (2026-10-10)

La adaptación para Android/iPhone conserva las fórmulas, unidades, n/N, exclusiones y versiones existentes. La revisión abarca gráficos colectivos/individuales, fuentes y trayectoria de autonomía, junto con sus alternativas accesibles y enlaces. Una matriz de presentación aprobada no equivale a mejoría clínica ni aprobación de la rúbrica sintética usada en QA. Dirección siempre acepta los recorridos; la ejecución física y firma siguen pendientes. Resultados nuevos separados de los conteos históricos en PASO_11_PWA_MOVIL.


### Cierre técnico del suplemento PWA/móvil (2026-10-10)

366 controles móviles Chromium/WebKit en 20 rutas/estados y seis contextos; 149 comprobaciones UX en diez contextos; 101 recorridos funcionales (33 Recovery/familia, 20 reportes y 48 dashboard/métricas), todos PASS y sin hallazgos. Build/tipos integrados, lint y 99 unitarias PASS (cuatro nuevas de CSP). No sumar esta regresión parcial a los 232/424 históricos como funciones nuevas. Inspección visual de 24 capturas actuales; limpieza independiente: 21 conteos y cuatro recursos a cero, guard/RLS/bucket preservados y cron detenido. Evidencia: tmp/care-qa/mobile/final-validation.json y cleanup-validation.json; reporte PASO_11_PWA_MOVIL. Responsable y plataforma definidos: dirección acepta con cuenta actual o superadministrador; Android/iPhone en PWA/navegador. Instalación, teclado/notch reales, modelos/versiones y firma pendientes. Sin producción ni activación.


## Paso 11 — Ampliación móvil de recorridos profesionales (2026-10-10)

Validado localmente en el alcance técnico: 452 controles móviles Chromium/WebKit en 24 rutas-estados/16 contextos, 275 UX/23 contextos y 131 funcionales/cinco suites. Inspección de 36 capturas seleccionadas y seis PDF actuales/36 páginas. Detectados y corregidos texto desactualizado de capacidades y desborde del selector de participantes en WebKit al reducir 390→320; el ajuste de ancho inicial fue insuficiente. Repetición final afectada: 126 móviles/42 UX/32 funcionales PASS tras el nuevo build/tipos, sin sumar duplicados. ESLint focalizado y sintaxis PASS. Limpieza independiente: 47 conteos y cuatro recursos a cero; guard/RLS/bucket/cron/worker preservados.

La cobertura anterior más la ampliación suma 818 móviles/44 rutas-estados/22 contextos, 424 UX/33 contextos y 232 funcionales/ocho suites sobre el build de 18:32 UTC. Tras las correcciones se repitió planificación/capacidades; las otras suites y las 99 unitarias conservan su fecha anterior. Evidencia por build y repeticiones en PASO_11_PWA_PROFESIONALES y tmp/care-qa/mobile/{extended-final-validation,copy-fix-validation,extended-cleanup-validation}.json. No nueva migración, Auth, capacidad o fórmula clínica. Dirección acepta con cuenta actual/superadministrador; Android/iPhone PWA/navegador definidos. Instalación, teclado/notch físicos, modelos/versiones, firma y criterios institucionales pendientes. Sin producción ni activación.

La ampliación revisa fuentes, estados de acciones, pendientes profesionales, períodos comparados congelados, n/N y exportaciones por revisión. No cambia fórmulas, escalas o denominadores. Rúbrica Recovery, umbral de inasistencias y plazo universal profesional continúan sin aprobación. Un gráfico correcto en QA no acredita evolución clínica.

## Complemento Recovery RC-00 (2026-10-10)

Auditoría validada localmente: nueve secciones del DOCX fuente y complemento contrastados con código/esquema. Diferencias y dependencias en CASTELAO_RECOVERY_COACH y reportes/recovery/RC_00; estado por paso en CASTELAO_RECOVERY_COACH_STATUS. RC-01 en implementación. No hay rúbrica aprobada: ICC-REC-AUT-001 v1.0 es propuesta. Registro cualitativo independiente de niveles, sin score global ni criterios activados. Históricos y permisos conservados; pruebas previas no prueban cambios nuevos. Aclaración del usuario: Dirección/superadmin acepta solo por PWA; no bloquear programación por un recorrido independiente de navegador/dispositivo. Nada desplegado.
# Complemento Recovery — RC-01, 2026-10-10

Resultado profesional de compromiso separado en pendiente/cumplido/incumplido/no verificable. Vencido es condición temporal independiente, no resultado ni cero; autodeclaración tampoco acredita verificación. Apoyo sin observar se distingue de sin apoyo. No se calcula nivel de actividad ni score de Recovery. Rúbrica, matriz semanal y cobertura complementaria se implementarán en RC-02/03; pruebas actuales en RC_01 no prueban esos gráficos.


## Complemento Recovery — RC-02, 2026-10-10

SE nullable con motivo, cualitativa sin nivel y semanas sin revisión son categorías distintas. Criterio desactivado por defecto; aprobación no lo activa. Solo ventana común de cuatro semanas cerradas, ocho dimensiones ≥3 con evidencia suficiente y misma versión/uso aprobado produce candidatura humana. SE/nivel 2/hueco/versiones/piloto bloquean; cambios de fuente o enmienda exigen revisar decisión conservada. Sin sumas, promedios ni score. Gráficos nuevos pendientes RC-03.


## Complemento Recovery — RC-03, 2026-10-10

Apoyo: denominador solo actividades con categoría observada; no observable/histórico sin categoría separado con cobertura. Compromisos: cuatro resultados vigentes, cancelación excluida, vencimiento/revisión pendientes superpuestos y no sumables. Expectativas desde fecha técnica de importación, por agenda Recovery real; semanal solo atención elegible/cerrada, sin retroactividad. SE final es revisión documentada, no cero. Series por versión/modo; matriz mensual atribuida al lunes de la semana, sin nivel mensual; grupos actuales no comparados retrospectivamente.


## Recovery RC-04 — 2026-10-10

Monthly snapshots integran revisiones semanales reales con versión, categoría SE y autor; texto profesional y entrega no generan promedios o aprobación. Reiteración cuenta compromisos únicos con resultado profesional vigente incumplido, en ventana explícita desde registro de revisión; excluye cancelados/IDs definidos/no verificables/vencidos sin resultado. Umbral y ventana vacíos inicialmente; regla apagada salvo decisión expresa. Alertas conservan versión, evidencia y destinatario; corrección de fuente requiere revisión sin borrado. Regresión 928 SQL PASS; RC_04/RC_05 distinguen evidencia y pendientes, sin aprobación clínica.

## Complemento Recovery — RC-05, cierre local 2026-10-10

Corte final de indicadores Recovery verificado en SQL y navegador: ocho dimensiones/versión/modo, SE y huecos sin cero ni interpolación; n/N y fuente bajo mismo filtro/corte. Mensual asigna semana por lunes y conserva semana completa, sin nivel promedio. Vencido/autodeclarado/no verificable no se convierte en incumplido; reiteración usa última revisión profesional vigente, fecha de carga, ventana/exclusiones autorizadas y requiere revisión tras cambio de fuente. 48 controles dashboard incluyen métricas; no contar el subconjunto dos veces.

RC-00 a RC-05 validados técnicamente en castelao-patient-qa. RC_05 registra nueve suites/266 funcionales, 1.032 controles móviles Chromium/WebKit en 30 contextos y 492 UX en 41, cero hallazgos. 930 SQL seguimiento + 76 biblioteca; 113 unitarias, lint y build/TypeScript PASS. Biblioteca/Auth 30 y web/CMS 36 controles PASS; siete PDF privados/40 páginas renderizadas e inspeccionadas. Instalación fresca 36 migraciones/1.006 SQL y restauración 136 Recovery, sin sumarlos a la regresión base. Consolidación y limpieza independiente: tmp/recovery-qa/release-summary.json.

Pendiente institucional: aprobar propuesta/piloto/criterio de evidencia, ventana global común y equivalencias; excepción motivada sin compromiso; parámetros/exclusiones/revisión de reiteración; protocolo/canales de urgencias y retención/respaldo. Dirección/superadmin acepta PWA abierta en el navegador o instalada según el usuario; aceptación humana pendiente, no bloqueo de programación local. ICC-REC-AUT-001 v1.0 sigue propuesta sin aprobador y criterio apagado; ningún paciente validado. Sin producción, migraciones remotas, push, despliegue ni mensajes externos.

## Aclaración de aceptación: PWA en navegador

Dirección/superadmin autorizado debe poder revisar y aceptar desde la PWA abierta en el navegador, sin instalación obligatoria ni requisito de modo standalone. La PWA instalada ofrece los mismos recorridos. No se exige una aceptación separada para cada modo. Las comprobaciones en teléfonos reales son evidencia de compatibilidad; no obligan a instalar la PWA para registrar una aprobación.

«Aceptación pendiente» describe que todavía no consta la conformidad humana de Dirección sobre el sistema, no una función deshabilitada ni una limitación del navegador. La pauta de aceptación del sistema es documentación para esa validación humana; no se ha implementado una firma global del sistema dentro de la aplicación. Las decisiones operativas ya implementadas —aprobar la rúbrica, autorizar piloto y revisar el mensual— sí tienen formularios web con confirmación y guardado real, sujetos a Auth y permisos actuales. No se ejecuta ni presume aprobación institucional por esta aclaración.
