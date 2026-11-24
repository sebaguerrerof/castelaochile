# Castelao Chile — Dirección y seguimiento terapéutico

Especificación de ejecución para Codex · 9 de octubre de 2026.
Fuente funcional: «Requerimientos para el desarrollo del Panel de Dirección y Seguimiento Terapéutico», solicitado por Marcelo Montiel, adjunto como `Texto pegado(1).txt`. Base técnica: estado del MVP comunicado por Sebastián en esta conversación; debe verificarse contra el repositorio actual.

## 1. Rol y mandato

Actúa como Tech Lead, Senior Full Stack Engineer y especialista en UX/UI de plataformas privadas de coordinación terapéutica. Extiende la aplicación existente de Castelao Chile, usando Next.js, TypeScript y Supabase según las versiones reales del repositorio.

Entrega una aplicación conectada a datos reales, con permisos comprobados, navegación clara, formularios breves, gráficos comprensibles y documentación de avance. No reemplaces implementación por una maqueta ni cierres una etapa solo porque funciona el backend: cada entrega debe tener un recorrido usable y verificado para su perfil de usuario.

Lee AGENTS.md, este archivo, la documentación actual del portal y el código antes de editar. Consulta las guías locales de Next y la documentación oficial de Supabase antes de usar APIs o alterar Auth/RLS/Storage. No actualices paquetes sin necesidad. Reutiliza componentes, repositorios, validaciones, auditoría y capacidades existentes.

## 2. Base existente y límites de lo confirmado

Según el estado entregado por Sebastián, ya existen:

- Web y portal publicados en `www.castelaochile.cl`, dominio de pruebas con HTTPS; `castelao.cl` sigue sin cambios.
- Administrador y autenticación Supabase compartidos; diseño institucional y gestión de pacientes con búsqueda, filtros, paginación y móvil.
- Alta por nombre/correo, «Crear y enviar acceso» o «Guardar sin enviar»; actualización del mismo perfil al repetir correo.
- Enlaces personales para definir/recuperar contraseña, suspensión y reactivación.
- Biblioteca privada por terapia grupal, psicológica y Coaching Recovery, con carpetas, materiales, búsqueda, filtros, favoritos y descargas.
- Audiencias general/grupo/individual; controles en servidor, DB y almacenamiento.
- Capacidades terapéuticas independientes de los roles CMS.
- Supabase Auth y Resend configurados; remitente `acceso@auth.castelaochile.cl`.
- Última validación comunicada: lint, tipos, build, 80 tests, 30 pruebas locales completas, 76 comprobaciones de permisos y 9 verificaciones productivas. Son evidencia histórica, no comprobaciones de este nuevo desarrollo.

Pendiente de puesta en marcha: recepción de correo real, organización de pacientes/grupos y materiales reales. No resolverlo creando datos ficticios ni enviando correos reales durante las pruebas.

El requerimiento de Marcelo menciona un sistema donde pacientes ya registran actividades. El estado técnico entregado confirma principalmente biblioteca y acceso. Verifica si planificación/reportes/asistencia existen; si faltan, implementarlos en esta ampliación. No dar por realizadas esas funciones.

Conservar Auth, onboarding, pacientes, permisos existentes, biblioteca, correos y CMS. No construir un segundo administrador ni una segunda identidad por persona. No cambiar dominio, DNS o remitente en este alcance.

## 3. Objetivo y principios del producto

Dirección debe comprender rápidamente qué pacientes requieren revisión, qué información falta y qué intervenciones están pendientes. Cada profesional registra información breve de su trabajo; cada paciente puede planificar, reportar y revisar sus compromisos sin acceder a evaluaciones internas.

Principios obligatorios:

1. Cumplimiento operativo y evolución clínica se muestran separados. Un porcentaje alto no significa recuperación.
2. Información ausente no significa incumplimiento ni estabilidad. Mostrar «Sin datos» o «No evaluable» cuando corresponda.
3. Distinguir hechos observados, relato del paciente e interpretación profesional.
4. No duplicar una sesión, paciente, compromiso o nota para alimentar pantallas distintas.
5. Toda cifra o alerta puede abrir los registros que la sustentan, dentro de los permisos del usuario.
6. Las notas reservadas no se vuelven compartidas por pertenecer al mismo equipo ni por ser director o administrador técnico.
7. La interfaz prioriza la siguiente acción útil y evita formularios largos, estadísticas decorativas y lenguaje punitivo.

## 4. Perfiles, asignaciones y matriz de acceso

Implementar perfiles funcionales combinables mediante capacidades. No asociar permisos por nombre o correo ni cambiar automáticamente roles CMS. Marcelo, Daniela y Gonzalo son referencias operativas, no credenciales hardcodeadas. El psiquiatra se configura como usuario profesional autorizado.

| Perfil funcional | Alcance esperado |
| --- | --- |
| Director/terapeuta | Resumen de todos los pacientes autorizados del programa, coordinación compartida, decisiones, alertas y supervisión. |
| Psicología | Pacientes asignados, sesiones propias, evolución psicológica, compromisos y notas con visibilidad explícita. |
| Recovery Coach | Pacientes asignados, actividades, autonomía, responsabilidad y observaciones de Recovery. No habilitar modificación de indicaciones médicas. |
| Psiquiatría | Pacientes asignados, controles, información médica, indicaciones, adherencia referida y próximos controles. |
| Paciente | Su planificación, reportes, actividades, compromisos y métricas operativas; biblioteca actual. |
| Administrador técnico/CMS | Mantener capacidades actuales; gestionar cuentas no concede lectura clínica por defecto. |

Definir y documentar capacidades, por ejemplo: `care.directory.read`, `care.assignments.manage`, `care.patient.read`, `care.records.create`, `care.alerts.review`, `care.decisions.manage`, `care.reports.export`, con nombres adaptados al patrón actual. La autorización requiere capacidad, cuenta activa, asignación/alcance vigente y visibilidad del recurso.

Cuatro niveles de información, modelados explícitamente:

- **Visible al paciente:** planificación, compromisos compartidos e indicaciones expresamente publicadas para él.
- **Coordinación interdisciplinaria:** resumen seleccionado para profesionales autorizados; dirección lo consulta dentro de su alcance.
- **Reservado profesional:** nota clínica del autor/especialidad o lectores explícitos autorizados. Dirección no recibe acceso automático.
- **Terceros/familia:** información segregada y acceso específico; no incluirla accidentalmente en ficha o exportación del paciente.

Visibilidad restrictiva por defecto para notas clínicas; el profesional selecciona qué resumen comparte. Mantener físicamente separados campos reservados cuando eso facilite RLS y reduzca exposición. No enviar notas reservadas al navegador para ocultarlas después. Revocar asignación/perfil debe impedir nuevas lecturas incluso con sesión previa. El superadmin técnico no debe obtener lectura clínica automática por un helper heredado.

Decisiones: evaluación completa exclusiva de dirección autorizada. El responsable recibe una acción delegada con la información mínima necesaria, no acceso a toda la deliberación. Nada se muestra al paciente sin publicación explícita.

## 5. Navegación y UX/UI transversal

Integrar en los shells actuales, con menú por capacidades. Rutas orientativas, a ajustar al repo:

| Usuario | Destinos |
| --- | --- |
| Dirección | `/admin/seguimiento`, `/admin/seguimiento/pacientes/[id]`, `/admin/seguimiento/alertas`, `/admin/seguimiento/decisiones`, `/admin/seguimiento/equipo`, `/admin/seguimiento/informes`. |
| Profesional | Vista «Mi trabajo»: pacientes asignados, agenda, registros pendientes y nuevo registro desde la misma ficha. |
| Paciente | `/pacientes/hoy`, `/pacientes/planificacion`, `/pacientes/reportes`, `/pacientes/compromisos`, `/pacientes/progreso`; conservar rutas y enlaces de biblioteca actuales. |

Reutilizar azul/naranja/gris, tipografía y tokens institucionales comprobados en el repo. Sidebar con sección activa, topbar, breadcrumbs y selector de periodo coherente. En móvil usar navegación breve, tarjetas y acciones accesibles; tablas extensas deben tener alternativa legible y columnas prioritarias.

Dashboard de dirección: tarjetas de pacientes activos, casos pendientes de revisión, asistencia y reportes; debajo lista priorizada «Requieren atención» y tabla de pacientes. Mostrar psicología, Recovery, psiquiatría, familias y decisiones en bloques con detalle por clic. Evitar diez tarjetas idénticas sin jerarquía. Toda tarjeta enlaza al listado filtrado correspondiente.

Ficha: encabezado con estado, ingreso, fase, responsables y próxima acción; pestañas Resumen, Planificación/actividad, Reportes, Evolución, Familia y Seguimiento según permiso. Línea temporal con filtros por fuente y tipo. Biblioteca accesible desde ficha sin mezclar documentos compartidos con notas internas.

Paciente: pantalla «Hoy» con próxima actividad, reporte pendiente y compromiso prioritario. Formularios cortos y etiquetas simples. No mostrar el semáforo clínico interno ni notas del equipo en su dashboard. Gráficos propios describen cumplimiento sin notas de evaluación automática de recuperación.

Formularios profesionales: paciente preseleccionado, fecha contextual, campos condicionales, desplegables breves y una caja de observación estructurada. Guardar borrador y finalizar; avisar de cambios sin guardar. Evitar valores clínicos preseleccionados y copiar evaluaciones previas automáticamente. Objetivo inicial de UX a validar: registrar una sesión habitual en unos 2–3 minutos y completar un reporte breve en unos 2 minutos; no afirmar tiempos medidos sin pruebas.

Skeletons, vacíos explicativos, errores recuperables, estados de guardado y feedback de éxito en todas las rutas. Foco visible, teclado, labels, mensajes asociados a campos, contraste, motion reducido y textos/iconos además del color del semáforo. Verificar 320/375/768/1440 px y no bloquear funciones esenciales con hover.

Elegir una librería de gráficos solo tras revisar lo instalado; justificar y fijar versión/lockfile si hace falta. Crear componentes compartidos, sin introducir una nueva librería de tablas o animación para cada módulo. Cada gráfico tendrá resumen textual y tabla de datos accesible.

## 6. Ficha del paciente y trayectoria

Extender el perfil actual con ingreso al programa, fase, objetivos actuales, estado del tratamiento y responsables. Separar estado terapéutico (activo, pausado, egresado, abandono, etc.) de cuenta habilitada/suspendida. Los catálogos de fases y motivos se configuran; no inventar fases oficiales.

Registrar episodios de tratamiento para ingresos, egresos y reincorporaciones. Una reincorporación no debe sobrescribir el ingreso anterior. Historial de cambios de fase, estado y responsables con fecha efectiva y autor. Tiempo en tratamiento se calcula con una regla documentada para pausas/episodios; no usar siempre diferencia con primer ingreso.

La ficha reúne reportes, actividades, asistencia, sesiones, compromisos, observaciones compartidas, logros y dificultades, sin copiar registros. Periodos 7/30/90 días y desde ingreso; considerar episodios y etiquetar el rango efectivo. Separar hora del hecho de hora de registro y mostrar carga tardía.

## 7. Planificación, actividades y asistencia

Modelo de evento programado con participantes esperados, fecha/hora, zona horaria, tipo (grupal, individual, Recovery, deporte, familiar, psiquiatría), profesional, lugar/modalidad y estado. Permitir series recurrentes con instancias editables; no recalcular silenciosamente eventos pasados cuando cambia una recurrencia.

Una actividad grupal se registra una vez y vincula pacientes, con asistencia individual. Estados: programada, realizada, cancelada; asistencia por participante: presente, ausente, justificada, pendiente de registro. Registrar puntualidad/participación por separado y solo si se observa. No asumir ausencia antes de cierre del evento.

Plan semanal y próximas 24 horas del paciente: agregar, editar, completar y reprogramar actividades/responsabilidades. Lo autodeclarado se identifica como tal; no convierte automáticamente una sesión profesional en realizada. Ediciones de eventos institucionales requieren permisos distintos a los de planes personales. Horarios se presentan en `America/Santiago`, considerando cambio estacional de hora.

## 8. Reportes de mañana y noche

Dos tipos de reporte por paciente y día local, con unicidad e idempotencia. Configurar ventanas/deadlines del programa y excepciones por paciente, sin hardcodear horarios personales como norma universal. Distinguir pendiente, enviado en plazo, enviado tarde, omitido y no requerido; omitido solo después del cierre de una obligación esperada.

Mañana: estado referido, planificación y compromiso del día. Noche: actividades realizadas, dificultades, herramientas utilizadas y planificación siguiente cuando corresponda. Los campos definitivos deben configurarse con dirección; no inventar una escala diagnóstica ni exigir información clínica innecesaria. Identificar claramente todo como autorreporte.

Persistencia real, validación servidor, prevención de doble envío, borrador separado y confirmación. Permitir corrección con historial y marca de edición, preservando hora original del envío para el estado de puntualidad. Cambiar un deadline no debe alterar informes históricos ya cerrados sin recalculo explícito y auditado.

Obligaciones solo durante enrolamiento elegible y según agenda/pausas/exenciones. No marcar retroactivamente omitidos desde antes del lanzamiento o incorporación al sistema. Un fallo de scheduler no debe producir aparentes incumplimientos del paciente sin advertencia de calidad de datos.

## 9. Registros breves de profesionales

Formulario común con extensiones por especialidad:

1. Paciente y profesional autenticado (no suplantable desde el cliente).
2. Fecha/hora del hecho y actividad/sesión vinculada.
3. Asistencia, participación y objetivo trabajado.
4. Evolución observada: mejoría, estabilidad, deterioro o no evaluable; sin opción preseleccionada.
5. Dificultades y observación separadas en hechos, relato e interpretación.
6. Compromisos, próxima acción y solicitud de intervención de dirección.
7. Visibilidad de cada resumen y campos reservados.

Psicología: motivación/disposición, avances/dificultades, recomendaciones. Recovery: puntualidad, responsabilidades, autonomía, organización, iniciativa y conducta observada. Psiquiatría: control, evolución relevante, adherencia referida/observada, indicaciones, cambios, próxima fecha y alerta compartible.

No confundir adherencia referida con toma farmacológica verificada. Solo profesionales habilitados registran indicaciones médicas. Si se estructura medicación, validar unidades, dosis, vía y vigencia, conservar cambios y evitar transformarla en recomendación automática. No inventar medicamentos ni automatizar cambios de tratamiento.

Estados: borrador y finalizado; finalizados requieren enmienda con motivo e historial, sin sobrescritura destructiva. Evitar duplicados por misma sesión/profesional/tipo cuando no corresponda. Los pendientes profesionales se derivan de sesiones y responsabilidades asignadas, no de exigir un registro diario a todos sin agenda.

## 10. Compromisos, autonomía y familia

Compromisos: objetivo concreto, responsable, vencimiento, origen, visibilidad, estado pendiente/realizado/vencido/cancelado, resultado y autor de confirmación. Distinguir completado por paciente de verificado por profesional. Vincular sesión o decisión sin duplicar. Mantener historial al reprogramar para no borrar atrasos previos.

Autonomía Recovery: organización del día, horarios, obligaciones, ejecución sin supervisión, iniciativa, coherencia declarada/observada, apoyo familiar y hábitos. Usar rúbrica versionada aprobada por el equipo; antes de aprobación permitir registro cualitativo, no puntaje inventado. Cada dimensión tiene evidencia, fecha, evaluador y opción no evaluable. Cambiar rúbrica no hace comparables automáticamente mediciones anteriores. No promediar ausencia de valoración como cero.

Familia: participantes, vínculo mínimo necesario, sesiones, acuerdos, comunicación, límites, responsabilidades, rescate/sobreprotección, avances y observaciones. Registrar autores/fuentes y controlar permisos de terceros. Separar notas reservadas de acuerdos expresamente compartidos al paciente. No crear cuentas ni enviar invitaciones a familiares en este alcance.

## 11. Alertas y decisiones

Alertas operativas automáticas: reportes omitidos, inasistencias reiteradas, compromisos vencidos y registros profesionales atrasados, calculadas con datos esperados, plazos, exclusiones y reglas versionadas. Guardar origen/regla, evidencia, fecha, responsable, estado y seguimiento. Deduplicar la misma situación; no crear una alerta por cada recarga.

Semáforo de seguimiento:

| Estado | Interpretación y control |
| --- | --- |
| Verde | Seguimiento habitual, con valoración profesional vigente; no asignarlo solo porque no hay alertas. |
| Amarillo | Requiere atención; distinguir sugerencia operativa de valoración validada. |
| Rojo | Intervención prioritaria validada por profesional autorizado; nunca derivar de un puntaje automático. |
| Gris | Datos insuficientes o evaluación vencida; mostrar qué información falta. |

Separar clasificación clínica, estado de alertas operativas y frescura de datos. Una evaluación roja vigente no desaparece porque luego falten registros. La vigencia de valoración la define el equipo, no un número inventado. Registrar valoración, autor, motivo, evidencia, fecha de revisión y resolución. Resolver una alerta no elimina su historial.

Urgencias se atienden mediante protocolo institucional independiente. La interfaz debe mostrar canales/protocolo aprobado y aviso de que un reporte no garantiza lectura inmediata; no inventar contactos ni convertir el panel en canal de emergencia monitorizado.

Decisiones de dirección: situación, fuentes autorizadas, evaluación, decisión, responsable, fecha prevista, estado, ejecución, resultado y siguiente revisión. Vincular tareas y alertas; cerrar exige resultado o motivo. Delegación comparte solo campos necesarios. Conservar trazabilidad y cambios de responsables.

## 12. Indicadores y gráficos: contrato de cálculo

Implementar cálculos reproducibles en servidor y documentarlos en `docs/CASTELAO_METRICAS_TERAPEUTICAS.md`. Cada indicador especifica fuente, unidad/grano, población, rango, fecha usada, numerador, denominador, exclusiones, permisos, actualización y versión. Mostrar `n/N` además de porcentaje; si N=0, mostrar no aplica. No promediar porcentajes de pacientes para calcular el total del programa: sumar numeradores/denominadores elegibles.

| Indicador | Definición inicial y visualización |
| --- | --- |
| Pacientes activos | Personas únicas con episodio activo en fecha de corte; tarjeta y serie de stock separada de flujos. |
| Ingresos/egresos/abandono/reincorporación | Eventos por periodo, con razón registrada; barras por semana/mes. Aclarar eventos vs personas únicas. |
| Asistencia | Presentes / participantes esperados de eventos realizados ya cerrados. Cancelados excluidos. Mostrar justificadas y pendientes aparte; regla sobre justificadas documentada. |
| Reportes | En plazo / obligaciones cerradas requeridas; tardíos y omitidos por separado. Pendientes abiertos no entran al denominador. Barras apiladas/calendario accesible. |
| Compromisos | Realizados al corte / compromisos exigibles vencidos al corte, excluyendo cancelados; diferenciar confirmación propia/profesional y cumplimiento en plazo. |
| Participación | Distribución de categorías observadas entre actividades evaluadas; no inventar porcentaje de participación sin rúbrica. |
| Autonomía | Serie por dimensión sobre rúbrica aprobada; huecos para no evaluable y marcas de cambio de versión. Sin score de recuperación. |
| Alertas | Abiertas por tipo/estado y línea temporal de validaciones, revisiones y cierres. Conteo operativo separado de semáforo clínico. |
| Registros profesionales | Registros finalizados en plazo / registros esperados con plazo cerrado; pendientes/atrasados separados. Vincular a agenda real. |
| Intervenciones | Pendientes, vencidas y realizadas según decisiones/tareas asignadas; barras y tabla accionable. |
| Familia | Sesiones y acuerdos esperados/realizados autorizados; sin exponer terceros en agregados generales. |

Periodos 7/30/90 días e ingreso, semana lunes–domingo local. Definir ventanas cerradas y cortes actuales; comparación contra periodo anterior equivalente con misma población/regla, mostrando cambios de población y datos faltantes. Una semana incompleta no se compara silenciosamente con otra completa.

Gráficos recomendados: barras para cumplimiento/categorías, líneas para mediciones realmente ordenables, timeline para alertas y decisiones. Evolución «mejoría/estabilidad/deterioro/no evaluable» es categórica y atribuida a profesional/especialidad, no una escala numérica ni un promedio automático. No usar radares, donuts o gráficos 3D sin una necesidad concreta.

Filtros compartidos por periodo/grupo/profesional/tipo según autorización; clic en gráfico abre tabla respaldatoria. Ejes, unidades, leyenda, tooltip, etiquetas y tabla alternativa. Mostrar rango, última actualización y advertencia de datos incompletos. Datos pequeños o nulos deben renderizar sin curvas ficticias ni divisiones por cero.

## 13. Supervisión e informes semanales/mensuales

Supervisión: agenda de profesionales, sesiones realizadas, registros esperados/completados/atrasados, actividades, tareas, alertas comunicadas e intervenciones pendientes. No medir productividad por número de caracteres ni utilizar telemetría de movimientos. Listado de pendientes con acción directa para completar registro.

Informe semanal disponible cada lunes con semana anterior lunes 00:00 a lunes 00:00 en `America/Santiago`, usando instantes correctos ante cambio estacional. Informe mensual al cierre del mes con mismo contrato de fuentes. MVP de automatización sin IA: consolidación determinista de registros autorizados, resúmenes compartidos, cifras, alertas, decisiones y compromisos. No generar diagnósticos, causalidad ni conclusiones nuevas.

Cada informe incluye periodo/corte, población, datos faltantes, avances/dificultades registrados, cumplimiento, alertas, intervenciones, pendientes y pacientes que requieren revisión. Vincular fuentes internamente sin exponer notas reservadas. Guardar versión del informe, generador, fecha, corte y estado generado/revisado. Etiquetar «Generado a partir de registros; pendiente de revisión» cuando corresponda.

Generación idempotente por alcance/periodo/versión, job con autenticación privada, bloqueo/reintentos y registro de fallos. Regenerar crea revisión trazable; no sobrescribe PDF anterior ni inventa datos ausentes. Comprobar permisos actuales al abrir o descargar: una exportación no elude una revocación. Guardar PDFs en Storage privado y no enviar enlaces sensibles por correo automáticamente.

Descarga PDF con encabezado institucional, fecha, páginas, rangos, leyendas, tablas legibles y gráficos; renderizar e inspeccionar antes de dar por terminado. Dirección recibe únicamente información que puede leer; acceso al informe exige capacidad específica. No añadir exportación masiva irrestricta. El paciente solo puede ver/exportar su información compartida si se habilita expresamente esa función.

## 14. Arquitectura y datos

Implementación aditiva con repositorios de dominio, contratos Zod, servicios servidor, componentes reutilizables y acciones autenticadas. No construir un único componente gigante ni consultas por paciente dentro de un bucle del dashboard. Paginar, indexar y agregar consultas autorizadas de manera eficiente; verificar planes cuando el volumen lo justifique.

Entidades orientativas, a reutilizar o adaptar:

- Perfiles actuales, episodios de tratamiento, historial de fases/estado y asignaciones profesionales.
- Eventos/instancias, participantes y asistencia.
- Planes personales, actividades y obligaciones de reporte.
- Reportes diarios y revisiones.
- Registros profesionales, revisiones y resúmenes compartidos separados de notas reservadas.
- Compromisos y cambios de estado.
- Rúbricas/versiones, valoraciones por dimensión y evidencias.
- Participantes familiares, sesiones/acuerdos y notas restringidas.
- Reglas, alertas operativas, valoraciones clínicas y seguimiento.
- Decisiones, acciones delegadas y resultados.
- Informes/cortes/versiones y ejecuciones de jobs.
- Auditoría de accesos y modificaciones, separada de la analítica pública.

FK, unicidad, fechas válidas, estados, índices por paciente/asignación/fecha y transacciones. Usar timestamps UTC para hechos e instantes, fechas locales para obligaciones diarias con timezone explícita. Control de concurrencia y claves de idempotencia en envíos, asistencia masiva, alertas y jobs.

Los registros clínicos finalizados preservan versión original y enmiendas. Auditoría no debe contener textos clínicos; el historial restringido mantiene el contenido y permisos. Borrado/retención no equivale a archivo lógico: documentar políticas sin inventar plazos institucionales.

## 15. Seguridad y operación

RLS y grants específicos en tablas nuevas, con `USING` y `WITH CHECK` para escrituras; no confiar solo en `authenticated`. Helpers, vistas, RPC, agregados y búsquedas deben respetar el mismo alcance; revisar privilegios y evitar bypass RLS no justificado. Secretos solo servidor, autorización antes de operaciones privilegiadas, sin permisos por metadata editable.

Noindex, exclusión de sitemap y analítica pública, respuestas privadas/no-store, control de origen y protección contra mutaciones indebidas en los patrones existentes. No filtrar notas o nombres a través de conteos, tooltips, errores, logs, URLs, prefetch o caché compartida. No enviar datos a IA/visores externos ni grabación de sesiones.

Auditar accesos a ficha reservada, lecturas sensibles, cambios, exportaciones y asignaciones con actor/recurso/acción/hora/resultado, sin contenido clínico ni tokens. Logs append-only y acceso restringido; documentar qué acciones se auditan realmente, sin prometer rastreo absoluto de copias descargadas.

Configurar recuperación y respaldos según capacidades reales del entorno; verificar restauración en entorno aislado antes de afirmar respaldo probado. Plan para fallos de jobs, pérdida de conexión, reintentos y datos incompletos. Evaluar autenticación reforzada para staff reutilizando Supabase, sin sustituir el flujo de pacientes.

El requerimiento pide normativa chilena aplicable. Preparar mapa de datos/finalidades/accesos, acuerdos de confidencialidad, información al paciente, conservación, ejercicio de derechos y requisitos de ficha clínica para revisión institucional/jurídica. Antes de activar datos clínicos reales, verificar fuentes oficiales vigentes y el encuadre de la plataforma; no declarar cumplimiento legal certificado ni inventar consentimiento o plazos. La revisión pendiente no impide construir y probar localmente con fixtures neutros.

## 16. Plan de ejecución y puertas de salida

### Paso 0 — Auditoría, trazabilidad y diseño de recorridos

Verificar rama, estado Git, arquitectura, permisos, tablas y rutas reales. Crear inventario «existente / parcial / nuevo» y matriz requisito→paso→prueba. Registrar divergencias entre documento de Marcelo y código, sin modificar producción. Diseñar navegación/estados y contrato de métricas antes de formularios/gráficos.

**Salida:** mapa de módulos, permisos, propuesta aditiva y lista de decisiones pendientes. No es el final del trabajo: continuar con el Paso 1.

### Etapa 1 — Base operativa y ficha usable

**Paso 1. Permisos y modelo de atención.** Capacidades profesionales, asignaciones, episodios/fases y visibilidad reservada/compartida. Migraciones y pruebas de aislamiento antes de exponer datos.

**Paso 2. Ficha y planificación.** Ficha individual, agenda/eventos, asistencia, plan semanal y compromisos básicos. Unificar vista paciente/profesional con permisos distintos.

**Paso 3. Reportes diarios.** Mañana/noche, obligaciones, borrador/envío/revisión, plazos configurables y estados fiables.

**Paso 4. Formularios profesionales.** Psicología, Recovery y psiquiatría, borradores, finalización, enmiendas y resumen compartido. Solicitud de intervención a dirección.

**Paso 5. Dashboard y alertas operativas.** Panel de dirección, tabla con próxima intervención, pendientes profesionales básicos, tarjetas accionables y primeros gráficos de asistencia/reportes. Semáforo manual validado y gris por ausencia de valoración.

**Salida de Etapa 1:** recorrido completo desde programar actividad y reportar hasta registrar sesión y consultar ficha/dashboard. Los pacientes acceden solo a su información compartida; no existe una pantalla de «gráficos futuros» sustituyendo los gráficos básicos.

### Etapa 2 — Seguimiento y coordinación

**Paso 6. Indicadores y gráficos completos.** Periodos, fuentes detalladas, filtros coherentes, métricas individuales/colectivas, alertas e ingresos/egresos. Casos de datos vacíos/parciales y accesibilidad.

**Paso 7. Recovery y familia.** Rúbrica versionada aprobada, autonomía por dimensión y seguimiento familiar con confidencialidad de terceros.

**Paso 8. Decisiones y supervisión.** Registro de dirección, tareas delegadas, ejecución/resultados y pendientes profesionales con plazos derivados de agenda.

**Salida de Etapa 2:** dirección comprende estado y siguientes acciones sin leer todas las notas; gráficos abren evidencia autorizada; el equipo completa registros sin duplicar trabajo.

### Etapa 3 — Informes y automatización

**Paso 9. Informes.** Consolidación semanal y mensual en pantalla, revisión y PDF privado comprobado visualmente.

**Paso 10. Jobs y reglas.** Generación semanal del lunes, alertas operativas configurables, reintentos/idempotencia, supervisión de fallos y comparación de periodos. No automatizar juicios clínicos.

**Paso 11. QA integral y activación preparada.** Pruebas de regresión/aislamiento, móvil/accesibilidad, rendimiento, respaldo/restauración según entorno y aceptación de recorridos por dirección/profesionales/paciente.

**Salida de Etapa 3:** scheduler verificado en entorno autorizado, informe sin información inventada y documentación exacta de lo activado y lo que requiere configuración externa.

Avanzar en orden y completar cada entrega vertical. Si falta una decisión clínica (rúbrica, campos o plazos), registrar bloqueo específico, usar opciones no evaluables/configuración pendiente y seguir con módulos independientes. No fabricar criterios clínicos para cerrar una etapa.

## 17. Reportes obligatorios durante el desarrollo

Esta sección es un requisito de ejecución: Codex debe mantenerla durante cada paso, no solo entregar un resumen al final.

Crear y mantener en el repo:

| Archivo | Propósito |
| --- | --- |
| `docs/CASTELAO_SEGUIMIENTO_PLAN.md` | Pasos, dependencias, alcance y criterios de aceptación. |
| `docs/CASTELAO_SEGUIMIENTO_STATUS.md` | Estado actual y próxima acción; separa local, validado y productivo. |
| `docs/CASTELAO_SEGUIMIENTO_CHANGELOG.md` | Registro acumulativo de cambios y evidencia. |
| `docs/CASTELAO_SEGUIMIENTO_PERMISOS.md` | Matriz rol/capacidad/asignación/recurso/visibilidad. |
| `docs/CASTELAO_METRICAS_TERAPEUTICAS.md` | Definiciones, fórmulas, exclusiones, versiones y fixtures esperados. |
| `docs/CASTELAO_SEGUIMIENTO_OPERACION.md` | Alta/configuración, registros, correcciones, informes, jobs y recuperación. |
| `docs/reportes/seguimiento/PASO_XX.md` | Informe de cada paso, con revisiones fechadas si hay cambios posteriores. |

Estados permitidos: Pendiente, En curso, Implementado localmente, Validado localmente, Bloqueado, Preparado para activación, Activado y verificado. «Activado» requiere evidencia real, no build aprobado. Inicializar nuevos pasos como pendientes; no copiar conteos históricos como resultados nuevos.

Después de cada paso: actualizar STATUS y CHANGELOG, emitir reporte y comunicar síntesis. Registrar fallos y correcciones aunque el resultado final pase. No guardar datos reales de pacientes ni capturas con información sensible en Git.

Plantilla obligatoria:

```markdown
# Paso XX — Nombre
Fecha / entorno / rama / commit si existe:
Estado:
Objetivo y requisitos cubiertos:
Cambios implementados y rutas disponibles:
Migraciones / configuración requerida:
UX/UI: recorridos probados, móvil, teclado y gráficos:
Permisos: perfiles y casos positivos/negativos comprobados:
Datos/métricas: fuentes, reglas y casos límite verificados:
Pruebas: comando, resultado real y evidencia segura:
Fallos detectados y correcciones:
Pendientes/bloqueos y su impacto:
Qué está local, qué está desplegado y qué no se probó:
Siguiente paso concreto:
```

En STATUS incluir tabla requisito del documento original→implementación→ruta→prueba→estado. Un requisito faltante no desaparece por estar fuera del paso actual; queda pendiente con dependencia explícita. Si cambia el alcance, registrar motivo y autorización, sin borrar el requerimiento original.

## 18. QA y aceptación

Pruebas con fixtures sintéticos neutrales en local/preview aislado: dos pacientes de grupos distintos, asignaciones diferenciadas, profesional de cada perfil, dirección, editor CMS sin capacidades clínicas y cuenta suspendida. Probar sesiones normales y REST/Storage/RPC directos; no usar service role para demostrar aislamiento.

- Un paciente no ve datos del otro ni notas internas propias. Dirección no ve notas reservadas sin concesión. Recovery no modifica indicaciones médicas. Roles CMS no heredan acceso clínico.
- Revocar asignación/suspender cuenta bloquea nuevas lecturas, exportaciones y escrituras con sesión previa. Conteos y búsquedas no filtran nombres, notas ni existencia de recursos ajenos.
- Reportes idempotentes, duplicados prevenidos, edición trazable, deadline exacto, día local, cambio horario, pausa/exención y entrada tardía.
- Asistencia en evento cancelado, pendiente de registro y justificada; actividad grupal con participantes individuales sin duplicación.
- Métricas con N=0, datos incompletos, población cambiante, ingresos/reincorporaciones, periodos parciales y límites de ventana; fixtures de cálculos con resultados esperados manualmente.
- Alertas deduplicadas, sugerencia operativa distinta de valoración clínica; no crear rojo automáticamente ni verde por falta de datos.
- Correcciones preservan original; acceso a versiones tiene los mismos permisos. Compromisos reprogramados conservan historia.
- Informes privados sin notas reservadas ni textos inventados, generación concurrente, reintento, regeneración y descarga tras revocación.
- Recorridos desktop/móvil/teclado, formularios breves, skeleton/error/vacío, gráficos con tabla, filtros y drilldown.
- Regresión en biblioteca, invitación/recuperación, suspensión, gestión de pacientes/grupos, capacidades existentes, CMS, blog, correos y analítica pública.

Ejecutar lint, typecheck, tests y build según scripts reales; ampliar pruebas DB/RLS y E2E necesarias. Registrar pruebas bloqueadas por entorno y nunca declararlas aprobadas. Capturas solo con fixtures y sin secretos. No depender de los conteos históricos para afirmar cobertura.

## 19. Trabajo autónomo, publicación y entrega

Usar rama nueva según convención del repo, preservando trabajo previo. Completar implementación local y documentación sin pedir permiso para cada paso reversible. Este brief no autoriza envíos reales, pacientes ficticios en producción, migraciones remotas, push, despliegue ni cambios de dominio. Preparar de forma concreta migraciones, configuración y checklist de activación antes de solicitar la autorización que corresponda a esas operaciones.

No eliminar datos existentes ni rehacer Auth. No modificar `castelao.cl`. No cambiar SMTP/Resend como efecto lateral. Si se habilita un scheduler real, documentar entorno, secreto, frecuencia, timezone y verificación; un archivo de configuración no demuestra que esté corriendo.

Entrega final: pasos completados, rutas usables por cada perfil, gráficos presentes y definiciones, pruebas nuevas con evidencia, reportes generados, riesgos/bloqueos concretos y siguiente paso de activación. Diferenciar lo construido, lo validado y lo publicado. La meta es una herramienta fácil de usar y orientada a decisiones, no una colección de tablas con formularios tediosos.

## 20. Prompt de inicio para Codex

Actúa con el rol definido en este archivo. Lee `CASTELAO_DIRECCION_SEGUIMIENTO_TERAPEUTICO_CODEX.md`, AGENTS.md y la documentación actual. Audita lo existente y ejecuta el Paso 0; luego avanza secuencialmente por las etapas con implementación real, pruebas y reportes obligatorios después de cada paso. Reutiliza autenticación, administrador, portal y design system. Prioriza permisos clínicos, formularios breves, navegación clara y gráficos verificables. Mantén STATUS/CHANGELOG y matriz de requisitos actualizados; no declares funciones terminadas sin evidencia ni publiques cambios productivos sin autorización para esas operaciones.
