# Castelao Chile — Complemento del panel Recovery Coach

Fecha: 10 de octubre de 2026.
Fuente funcional: `Panel_Recovery_Coach_para_Sebastian.docx`, versión 1.0 del 10/10/2026, remitido por Marcelo Montiel, Director y Terapeuta. Responsable de registro indicado: Gonzalo, Recovery Coach.
Complementa `CASTELAO_DIRECCION_SEGUIMIENTO_TERAPEUTICO_CODEX.md`; no sustituye sus módulos, permisos ni documentación.

## 1. Rol y objetivo de Codex

Actúa como Tech Lead y Senior Full Stack Engineer de Castelao Chile, con responsabilidad sobre integración, autorización por recurso, datos trazables y UX/UI de seguimiento terapéutico.

El desarrollo del brief anterior está casi completo según Sebastián. Verifica su estado en el repositorio, documentos STATUS, migraciones y pruebas. Implementa solamente las diferencias de este documento sobre lo existente. No reconstruyas autenticación, pacientes, fichas, agenda, compromisos, dashboard, informes ni administrador si ya funcionan. Reutiliza design system, componentes de gráficos, validaciones, repositorios y permisos.

La nueva información concreta el módulo Recovery: registro después de cada actividad, revisión semanal de ocho dimensiones, compromisos verificables, resumen mensual y supervisión de Dirección. Las afirmaciones de implementación requieren evidencia nueva; no reutilizar conteos históricos como comprobación.

## 2. Respuesta a la pregunta sobre la rúbrica

**No existe una rúbrica aprobada en el documento entregado. Existe una propuesta identificada como `ICC-REC-AUT-001`, versión `1.0`, pendiente de aprobación de Dirección.**

Contiene ocho dimensiones, niveles ordinales 1–4 y la categoría «SE — Sin evaluar». Propone nivel 3 o superior durante cuatro semanas consecutivas con evidencia suficiente por dimensión, y cumplimiento de las ocho dimensiones más validación de Dirección para el objetivo global. También propone un piloto de cuatro semanas antes de activar los criterios.

Esto permite implementar el contenido de la propuesta y su configuración versionada. No permite marcarla como aprobada, activarla por defecto ni convertirla en un puntaje de recuperación. Los niveles son categorías manuales; sus códigos numéricos no autorizan promedios, sumas, rankings ni aprobaciones automáticas.

El registro cualitativo debe funcionar desde el inicio, sin niveles obligatorios. Mientras no haya autorización formal para usar niveles en un piloto, mostrar la propuesta en configuración y registrar evaluaciones cualitativas con «Sin evaluar» cuando corresponda. Si Dirección habilita explícitamente un piloto, permitir niveles manuales con evidencia y una etiqueta visible «Piloto — rúbrica no aprobada». La aprobación de la rúbrica y la validación de logros individuales son acciones diferentes.

Esta separación de estados es una decisión técnica para ejecutar fielmente la propuesta; no representa una aprobación clínica nueva.

## 3. Mapa de integración con la implementación actual

Antes de editar, completar una tabla de diferencias:

| Área existente | Cambio requerido |
| --- | --- |
| Registros profesionales Recovery | Campos cualitativos obligatorios, participación y apoyo real observado. |
| Agenda/actividades grupales | Una actividad común, desempeño y registro individual por participante. |
| Compromisos | Plazo, revisión, resultado verificable y los cuatro estados definidos en la fuente. |
| Configuración de autonomía | Propuesta ICC-REC-AUT-001 v1.0, dimensiones/niveles exactos, gobernanza y piloto. |
| Evaluaciones | Revisión semanal por dimensión con evidencia, apoyo y siguiente compromiso. |
| Dirección/ficha | Supervisión de compromisos, necesidades de apoyo y coherencia declarada/realizada. |
| Gráficos | Evolución semanal/mensual por dimensión, sin promedios y con periodos sin evaluar. |
| Informes | Resumen mensual Recovery con fuentes semanales y revisión profesional. |
| Alertas | Reiteración configurable y validada; reglas nuevas desactivadas por defecto. |
| Auditoría/STATUS/reportes | Correcciones, permisos, versiones y evidencia de cada paso. |

Identificar para cada fila: existente completo, parcial o pendiente; tablas/rutas reales, cambio aditivo y prueba prevista. No cambiar el módulo familiar ni otras especialidades salvo integración común justificada.

## 4. Registro después de cada actividad

Registrar por paciente al finalizar una actividad, vinculando al evento existente y conservando fecha del hecho distinta de fecha de carga. Tipos de actividad de la fuente: seguimiento individual, deporte, planificación semanal, revisión de compromisos y actividad grupal.

| Campo | Requisito funcional |
| --- | --- |
| Paciente | Selección de la nómina vigente y autorizada para el profesional. |
| Fecha y actividad | Fecha de realización, tipo y evento vinculado si existe. |
| Participación | Asistió y participó; participación parcial; no asistió; ausencia justificada. Motivo cuando corresponda. |
| Apoyo necesario | Supervisión constante; recordatorios frecuentes; apoyo ocasional; sin apoyo. Describir lo prestado realmente. |
| Autor y fecha de carga | Identidad autenticada y timestamp generados por servidor; no aceptar autor suplantable desde cliente. |

No asignar apoyo o participación por defecto. Para ausencia/no observación, permitir «No observable» como estado técnico nullable, claramente separado de «Sin apoyo». Una persona ausente no recibió automáticamente apoyo nulo ni autonomía alta. Mantener asistencia y participación separadas en la base existente si ya tienen contratos distintos, con mapeo explícito de las cuatro etiquetas del documento.

Actividad grupal: reutilizar identificador, fecha y metadatos del evento común; guardar desempeño, observaciones y compromisos por paciente. Flujo secuencial por participante con estados pendiente/borrador/finalizado. No copiar el mismo texto ni el nivel de apoyo a todos por defecto. Idempotencia y unicidad sobre evento/paciente/tipo de registro, permitiendo seguimientos adicionales explícitos sin duplicación accidental.

## 5. Campos cualitativos obligatorios

Conservar las preguntas y finalidad del documento:

| Campo | Pregunta orientadora |
| --- | --- |
| Hechos observados | ¿Qué hizo efectivamente el paciente durante la actividad? Indicar tarea y resultado. |
| Avances | ¿Qué logró hacer por sí mismo? ¿Qué responsabilidad sostuvo o mejoró? |
| Dificultades e incumplimientos | ¿Qué no cumplió? ¿Qué obstáculos informó y qué apoyo necesitó? Separar observado de informado. |
| Evidencia | ¿Cómo se verificó? Observación directa, planificación entregada, tarea finalizada o información declarada con su fuente. |
| Nuevo compromiso | Tarea concreta, responsable, plazo y forma de verificar cumplimiento. |
| Próxima revisión | Fecha en que se revisará el compromiso con el paciente. |

Textos breves con ejemplos neutros; no exigir informes extensos. El formulario debe registrar explícitamente que no hubo avances/dificultades observables cuando sea el caso. No precargar esos textos como hechos ni inferirlos de campos vacíos. Borradores pueden estar incompletos; finalizar exige los campos aplicables.

Si no se estableció nuevo compromiso, permitir constancia expresa con motivo en lugar de crear una tarea ficticia. Cuando existe, guardar un compromiso real vinculado y fecha de revisión obligatoria; no dejarlo únicamente dentro del texto de la nota. Esta excepción operativa debe documentarse y validarse con Dirección, sin cambiar el requisito original silenciosamente.

Separar hechos, relato con fuente e interpretación autorizada, manteniendo la fuente de evidencia aun cuando sea autorreporte. Un autorreporte no equivale a verificación directa. Reutilizar el repositorio seguro de adjuntos si existe; evidencia textual y vínculo a registro/tarea son suficientes, sin forzar nuevas cargas de documentos personales.

Mostrar ayuda de redacción basada en hechos; evitar etiquetas personales como «es irresponsable». Guardar en DB con confirmación real y errores recuperables; «Copiar» es secundario y no sustituye guardado. Mantener borradores, finalización, enmiendas con motivo, autor/fecha y control de concurrencia existentes.

## 6. Compromisos con resultado verificable

Reutilizar compromisos/tareas del sistema. Un compromiso debe tener paciente, descripción concreta, responsable, fecha límite, fecha de revisión, método de verificación, registro origen y estado. Al revisar, añadir resultado, evidencia, apoyo recibido, dificultades, revisor y siguiente compromiso cuando se acuerde.

Estados del documento:

| Estado | Significado |
| --- | --- |
| Pendiente | Todavía no existe resultado confirmado. |
| Cumplido | Resultado registrado con evidencia/fuente suficiente para la conclusión del revisor. |
| Incumplido | Incumplimiento observado o verificado; conserva evidencia y autor de la revisión. |
| No verificable | Información insuficiente para confirmar cumplimiento o incumplimiento. |

«Vencido» y «pendiente de revisión» son indicadores temporales independientes: superar el plazo no transforma automáticamente el estado en incumplido. La autodeclaración del paciente puede quedar «declarado realizado, pendiente de verificación» sin cambiar silenciosamente el resultado profesional.

Si el módulo anterior usa realizado/vencido/cancelado, introducir un resultado de revisión separado o un mapeo aditivo. Conservar cancelación como estado administrativo y todos los históricos; no migrar vencidos a incumplidos. Reprogramar conserva plazo original, motivo y versiones. Incumplido no se borra por crear un compromiso nuevo.

## 7. Dimensiones exactas de la propuesta

Código de rúbrica: `ICC-REC-AUT-001`. Versión documental: `1.0`. Estado inicial: propuesta pendiente de aprobación.

| Clave estable sugerida | Dimensión | Conducta observable de la fuente |
| --- | --- | --- |
| `planificacion_personal` | Planificación personal | Organiza y ejecuta una planificación semanal realista. |
| `cumplimiento` | Cumplimiento | Cumple compromisos dentro de los plazos acordados. |
| `autonomia_cotidiana` | Autonomía cotidiana | Resuelve obligaciones sin depender permanentemente de terceros. |
| `responsabilidad` | Responsabilidad | Reconoce incumplimientos y realiza acciones correctivas. |
| `iniciativa` | Iniciativa | Actúa sin esperar instrucciones para cada tarea. |
| `habitos_constancia` | Hábitos y constancia | Sostiene orden, puntualidad y autocuidado. |
| `organizacion_ocupacional` | Organización ocupacional | Administra obligaciones laborales, académicas o personales. |
| `coherencia_conductual` | Coherencia conductual | Existe correspondencia verificable entre lo acordado y lo realizado. |

Las claves son una propuesta técnica. Preservar nombres/descripciones de la fuente y mapear dimensiones previas sin alterar históricos. No incorporar ni eliminar dimensiones en v1.0; una modificación genera nueva versión explícita.

## 8. Niveles exactos y reglas de selección

| Código | Nivel | Descripción de la fuente |
| --- | --- | --- |
| `1` | Dependencia alta | No sostiene sus responsabilidades sin supervisión constante. |
| `2` | Autonomía inicial | Cumple parcialmente y requiere recordatorios o apoyo frecuente. |
| `3` | Autonomía funcional | Cumple habitualmente sus responsabilidades con apoyo ocasional. |
| `4` | Autonomía consolidada | Actúa de manera autónoma, constante y responsable, incluso frente a dificultades habituales. |
| `SE` | Sin evaluar | No existe evidencia suficiente. No equivale a incumplimiento ni debe convertirse en cero. |

Ninguna dimensión precalificada. SE se almacena como categoría/nullable con motivo, no como 0. El apoyo de una actividad no determina automáticamente nivel semanal. Gonzalo selecciona manualmente un nivel por dimensión/periodo cuando el uso esté autorizado y haya evidencia suficiente; el servidor exige referencia a evidencia y autor.

No crear puntuación global, promedio por paciente, porcentaje de recuperación, ranking ni aprobación basada en una suma. La suficiencia de evidencia es un juicio profesional registrado, no un umbral automático inventado de número de tareas.

## 9. Configuración versionada y aprobación

Reutilizar tablas/configuración versionada implementadas. Estados orientativos: propuesta, piloto autorizado, aprobada, retirada, adaptados al modelo real. Separar estos estados de la habilitación del criterio de logro. Solo Dirección con capacidad específica puede aprobar, autorizar piloto o activar criterios; no concederlo a todo superadmin CMS por defecto ni codificar nombre/correo de Marcelo.

Guardar versión, contenido exacto, referencia documental, estado, autor, fecha y registro de decisión. El estado inicial no tiene aprobador, fecha de aprobación ni fecha de activación. El seed local/de configuración puede registrar la propuesta; no inventar aprobación.

El documento propone pilotear cuatro semanas. Permitir configurar comienzo/fin y participantes del piloto, registrando quién autorizó su uso. Terminar el periodo no aprueba la rúbrica automáticamente. Durante piloto cualquier resultado se etiqueta experimental y sin validación definitiva del objetivo global.

Una versión utilizada es inmutable. Cambios generan nueva versión y fecha efectiva, sin recalcular ni actualizar evaluaciones anteriores. Evaluación vincula versión real; gráficos y reportes indican cambios y no mezclan escalas incompatibles. Registros cualitativos históricos sin rúbrica conservan esa condición; no asignar v1.0 ni niveles retrospectivos a ciegas.

## 10. Revisión semanal y criterio de logro propuesto

Una vez por semana revisar compromisos y las ocho dimensiones. Por dimensión guardar periodo, versión si aplica, compromiso(s), resultado, evidencia, apoyo, dificultades y siguiente compromiso con fecha de revisión. Registrar SE con motivo cuando no hay evidencia; mostrar también «sin revisión registrada», diferente de una revisión explícita SE.

Semana local lunes–domingo en `America/Santiago`, reutilizando el contrato temporal del proyecto. Fecha del hecho, fecha de evaluación y fecha de carga son distintas. Evitar duplicación paciente/semana/versión; enmiendas conservan original. No permitir dos evaluaciones vigentes contradictorias para la misma dimensión y periodo.

**Criterio propuesto, desactivado por defecto:** nivel 3 o superior durante cuatro semanas consecutivas con evidencia suficiente para cada dimensión. Objetivo global: criterio en las ocho dimensiones y validación de Dirección. No compensar una dimensión insuficiente con otra alta.

Implementar configuración del criterio y, si Dirección lo activa tras aprobación, un cálculo que muestre «Evidencia candidata para revisión». Nunca produce aprobación automática. Dirección puede solicitar corrección, rechazar candidatura con motivo o validar definitivamente con autor/fecha y evidencia.

Reglas técnicas conservadoras del cálculo, documentadas para revisión de Dirección:

- Usar semanas cerradas y consecutivas, sin saltar semanas faltantes/SE. Nivel 1–2, evidencia insuficiente o huecos no satisfacen esa ventana.
- Para candidatura global inicial, exigir las ocho dimensiones en la misma ventana de cuatro semanas, sin combinar logros de meses distintos. La fuente no detalla sincronía de ventanas; registrar esta interpretación en configuración/documentación para aprobación.
- No mezclar versiones ni piloto con mediciones aprobadas por defecto. Si Dirección autoriza equivalencia o aceptación del piloto, registrar una decisión explícita con alcance; nunca inferirla.
- Una enmienda que invalida evidencia marca la candidatura/validación «requiere revisión», preservando la decisión original; no eliminarla ni mantener una aprobación aparentemente vigente sin advertencia.

No bloquear registros cualitativos por criterios aún pendientes. Alcanzar autonomía funcional no implica alta clínica, ausencia de riesgo de recaída ni finalización del tratamiento; mostrar esta aclaración en la validación y documentación.

## 11. UX/UI de Gonzalo y Dirección

Integrar rutas reales; preferir pestaña Recovery dentro de ficha y vista «Mi trabajo» profesional existentes. Rutas nuevas solo si ayudan a navegar, sin otro shell.

Gonzalo: pacientes/actividades asignados, «Registrar actividad», pendientes de revisión semanal y resumen mensual. Formulario en secciones breves: actividad/participación, hechos/apoyo, evidencia/compromiso. Paciente/evento preseleccionados al entrar desde ficha. Guardado visible, aviso de cambios sin guardar y retorno a lista pendiente. No mezclar las ocho dimensiones con cada registro de actividad: se evalúan semanalmente en una pantalla específica.

Revisión semanal: ocho tarjetas o filas, mostrando última evidencia y compromisos relevantes. Seleccionar nivel manualmente cuando esté habilitado; exigir evidencia sin copiar evaluaciones anteriores. Botón «Sin evaluar» accesible y explicación del motivo. Estado de la rúbrica siempre visible: pendiente, piloto o aprobada.

Dirección: lista general filtrable por paciente, periodo, grupo autorizado, apoyo requerido y pendientes. Indicadores accionables de compromisos cumplidos/verificados, vencidos, no verificables y registros pendientes; próxima revisión. Mostrar origen y cobertura de cada cifra. La necesidad de supervisión se deriva de registros observados y distribución de apoyo, sin etiquetas clínicas ni umbral de «dependencia» inventado.

Ficha: actividad observada, acuerdo declarado, resultado verificado, apoyo prestado, siguiente acción y evolución por dimensión. Las diferencias entre declarado/realizado deben abrir evidencia y explicar «No verificable» cuando falta, en lugar de acusar incoherencia automáticamente.

Mantener tokens, contraste, navegación activa, breadcrumbs, skeletons, vacíos, feedback y diseño móvil del proyecto. Teclado, foco visible, labels y errores por campo. Objetivo de usabilidad: registro habitual breve, sin duplicar datos ya disponibles; medir antes de afirmar tiempos. Capturas de QA únicamente con fixtures neutros.

## 12. Gráficos e indicadores específicos

Reutilizar componentes de gráficos y filtros actuales, con tabla accesible y enlace a registros respaldatorios. No añadir librerías si ya hay solución.

- Evolución semanal por dimensión: niveles ordinales 1–4 con etiquetas, marcadores observados y huecos para SE/sin revisión; no interpolar, suavizar ni unir a través de huecos/versiones.
- Vista mensual: matriz semanas × dimensiones, con etiquetas además del color. No promediar niveles para obtener nivel mensual; el resumen explica cambios mediante registros concretos.
- Apoyo recibido: barras por categoría entre actividades donde fue observado, mostrando n/N y cobertura. «No observado» separado de «sin apoyo».
- Compromisos: distribución pendiente/cumplido/incumplido/no verificable; vencidos y pendientes de revisión como filtros separados para evitar doble conteo de resultados.
- Registros Recovery: esperados según agenda real por paciente/actividad, finalizados, borradores y pendientes; revisión semanal esperada solo en semanas elegibles de atención. No crear incumplimientos retroactivos anteriores al inicio del módulo.

Valores faltantes nunca son cero ni incumplimiento. Denominadores, rango, fecha de actualización y datos ausentes visibles. Comparaciones semanales/mensuales mantienen misma versión/regla/población o advierten diferencia. Autonomía no se mezcla con asistencia ni se convierte en evolución clínica.

## 13. Resumen mensual y comunicación

Gonzalo entrega una vez al mes a Dirección un resumen de avances, estancamientos, apoyos necesarios y compromisos pendientes. Integrar con generador de informes ya implementado, con fuente Recovery y referencias a revisiones semanales.

Resumen editado/revisado por profesional: periodo, cobertura, cambios observados por dimensión, dificultades, apoyos que continúan y próximos objetivos. Consolidación automática determinista puede precargar datos verificados; no inventa conclusiones ni declara estancamiento cuando falta información. Debe abrir evidencias semanales autorizadas y distinguir borrador/generado de entregado/revisado.

Conservar versiones y permisos del informe, PDF privado si ya existe esa capacidad, y exclusión de notas reservadas. No agregar IA ni correo automático. Entregar dentro de plataforma mediante confirmación real y tarea de revisión para Dirección; registrar autor/fecha de entrega.

Si Gonzalo observa una situación que requiere intervención, registrar hecho y solicitar intervención por el mecanismo existente. Dejar constancia de comunicación realizada, canal, fecha y destinatario profesional autorizado, sin presentar creación de alerta como contacto humano efectivo. Facilitar comunicación directa cuando corresponda, usando canales institucionales confirmados. El panel no reemplaza contacto urgente ni protocolo clínico.

Recovery no diagnostica, decide altas, modifica tratamientos ni interpreta clínicamente conductas. Conservar límites de autorización existentes.

## 14. Alertas de incumplimiento reiterado

Reutilizar motor de alertas. Nuevas reglas de reiteración inicialmente desactivadas; Dirección define y valida condición, ventana, umbral, exclusiones, destinatario y revisión. No sembrar «dos incumplimientos» o «tres días» como norma aprobada.

Considerar resultados incumplidos verificados; no verificable, ausencia de registro y vencido no equivalen a incumplido. Distinguir recordatorio de revisión de alerta de reiteración. Versionar regla, preservar evidencia y deduplicar. No activar rojo clínico ni validar autonomía automáticamente desde alertas operativas.

## 15. Datos, seguridad y migración

Adaptar esquema real, no imponer nuevas tablas si ya hay equivalentes. Campos/relaciones necesarios: participación/apoyo cualitativo, evidencias/fuentes, resultado de revisión de compromiso, fecha de revisión, rúbrica/versiones/decisiones de aprobación, revisiones semanales/dimensiones y resumen mensual/entrega.

Migraciones aditivas, backfill solo de datos demostrables, constraints/FK, índices por paciente/periodo/autor, guardados transaccionales e idempotencia. Evitar convertir niveles anteriores o cambiar su significado. Preservar rollback funcional y datos nuevos; no borrar tabla antigua antes de validar mapeo.

Autor/fechas en servidor, cuenta/asignación activa y capacidades por recurso. Gonzalo puede registrar/proponer en sus pacientes asignados; Dirección autorizada revisa resúmenes compartidos y valida; CMS técnico no hereda lectura clínica. Paciente solo ve compromisos/materiales explícitamente compartidos, nunca la evaluación profesional reservada o el borrador de rúbrica como diagnóstico propio.

Aplicar controles actuales de servidor, RLS, Storage, vistas/RPC/exportaciones, grants y concurrencia. Revisar documentación oficial de las versiones instaladas antes de modificar APIs. No confiar en ocultar botones, metadata editable o service role para probar permisos. Excluir de analítica pública, logs con contenido, cache compartida y sitemap. Datos reales no entran a fixtures/capturas/reportes de desarrollo.

## 16. Pasos de ejecución complementaria

### RC-00 Auditoría y mapeo
Leer AGENTS.md, brief previo y STATUS actual. Mapear requisitos de las nueve secciones/tablas del DOCX al código. Documentar divergencias y la condición pendiente de aprobación. Continuar implementación, sin cerrar solo con propuesta.

### RC-01 Registro cualitativo y compromisos
Completar campos, participación/apoyo, desempeño grupal individual, guardado real, revisión verificable y correcciones. Entregar recorrido completo sin depender de aprobación de niveles.

### RC-02 Propuesta versionada y revisión semanal
Cargar contenido exacto ICC-REC-AUT-001 v1.0 en estado propuesta; implementar configuración, aprobación/piloto y evaluación semanal sin selección por defecto. Mantener criterios desactivados. Acciones de aprobación son funcionalidades, no decisiones a ejecutar por Codex.

### RC-03 Supervisión y gráficos
Integrar ficha/dirección, compromisos, apoyo, matriz semanal y meses, filtros y drilldown; asegurar SE/huecos/versiones visibles. Reutilizar gráficos existentes.

### RC-04 Resumen mensual, alertas y comunicación
Extender informes actuales, entrega/revisión, referencias, comunicación documentada y reglas sin umbrales arbitrarios. No duplicar jobs ni generar envíos externos.

### RC-05 Validación integral y entrega
Probar permisos, cálculos ordinales, criterios desactivados, enmiendas/versiones, piloto, actividad grupal, móvil y regresión. Documentar pendiente de aprobación institucional y activación, separado de implementación técnica terminada.

Después de cada paso generar reporte y actualizar estado antes de continuar. Si hay decisión clínica pendiente, completar lo independiente y registrar bloqueo preciso; no paralizar registro cualitativo ni inventar aprobación para avanzar.

## 17. Reportes obligatorios y criterios de aceptación

Mantener los documentos STATUS/CHANGELOG/PLAN y permisos/métricas del brief anterior, sin reiniciarlos ni eliminar lo ya realizado. Añadir `docs/CASTELAO_RECOVERY_COACH.md`, `docs/CASTELAO_RECOVERY_COACH_STATUS.md` y reportes `docs/reportes/recovery/RC_XX.md`.

Cada reporte: fecha/entorno/rama, requisitos cubiertos, cambios/rutas, migraciones, UX/UI y gráficos verificados, permisos, comandos y resultados reales, fallos/correcciones, pendientes, diferencia local/desplegado y siguiente paso. Matriz fuente→implementación→prueba→estado. Añadir decisión abierta para interpretación de ventanas globales, autorización de piloto y criterios de evidencia, sin tratar propuestas técnicas como aprobación formal.

Pruebas mínimas:

- Registro cualitativo sin niveles guarda; sin avances/dificultades quedan constancias explícitas. Copiar no guarda. Borrador/fallo de red no simula finalización.
- No hay dimensión preseleccionada, score global, promedio ni SE convertido en 0. Ausencia no se traduce a sin apoyo.
- Gonzalo no aprueba rúbrica ni objetivo global; el paciente/CMS/otro profesional no accede a datos fuera de alcance. Revocación impide nuevas lecturas/exportaciones.
- Actividad grupal comparte evento, con registros y compromisos individuales, sin duplicación ni copia de desempeño.
- Compromiso vencido sigue siendo temporalmente vencido sin asumir incumplimiento; no verificable no se usa como incumplido. Correcciones conservan evidencia/autor/fecha.
- Versiones usadas inmutables y cualitativos históricos sin backfill de niveles. Propuesta no activa criterios, piloto no se aprueba al terminar y aprobación de rúbrica no valida pacientes.
- Cuando el criterio está explícitamente habilitado: cuatro semanas consecutivas suficientes producen candidatura, no aprobación; nivel 1–2, SE, hueco o versión distinta impiden ventana válida por defecto. Ocho dimensiones necesarias sin compensación.
- Enmienda de evidencia invalida candidatura o exige revisión de validación previa, preservando historial.
- Gráficos muestran huecos/categorías/cobertura y fuentes. Informe mensual no inventa avances/estancamientos; entrega y revisión son estados distintos.
- Reglas de reiteración desactivadas hasta decisión válida y deduplicadas cuando se habilitan; una alerta no acredita contacto directo.
- Lint, typecheck, tests y build según repo, tests DB/RLS y E2E necesarios. Verificar regresión en demás especialidades, dashboard, reportes, biblioteca y Auth. No declarar aprobadas pruebas que no se ejecutaron.

Aceptación: Gonzalo registra actividad y apoyo, revisa compromiso, prepara revisión semanal cualitativa y resumen mensual; Dirección abre evidencia y revisa, mientras la propuesta mantiene estado pendiente sin calificar pacientes automáticamente. La interfaz debe permitir estos recorridos en móvil y escritorio con feedback real.

## 18. Autonomía de desarrollo y entrega

Avanzar con cambios locales reversibles y pruebas sobre fixtures aislados, respetando trabajo previo. Este archivo no autoriza aprobar la rúbrica, activar criterios clínicos/reglas en producción, enviar correos reales, aplicar migraciones remotas, push, deploy ni cambios de dominio. Preparar implementación y pasos concretos de activación; conservar autorizaciones explícitas que el usuario ya haya dado para operaciones concretas en su sesión de desarrollo.

Entrega: diferencias implementadas sobre módulo actual, rutas disponibles, reportes nuevos, pruebas reales, contenido versionado y estado exacto de aprobación/piloto. Separar «configuración implementada» de «criterio institucional aprobado». No anunciar autonomía lograda ni alta a partir de completar el desarrollo.

## 19. Prompt de inicio

Actúa como Tech Lead de Castelao Chile. Lee `CASTELAO_RECOVERY_COACH_COMPLEMENTO_CODEX.md`, el documento fuente `Panel_Recovery_Coach_para_Sebastian.docx` y el estado actual de la implementación de `CASTELAO_DIRECCION_SEGUIMIENTO_TERAPEUTICO_CODEX.md`. Implementa este complemento sobre lo existente, empezando por RC-00 y avanzando con pruebas/reportes tras cada paso. La rúbrica ICC-REC-AUT-001 v1.0 es una propuesta pendiente de aprobación: integra sus ocho dimensiones y niveles exactos en configuración versionada, conserva registro cualitativo sin niveles obligatorios y no actives puntajes, logros ni umbrales automáticos. Reutiliza Auth, permisos, fichas, compromisos, informes y gráficos; mantén UX/UI clara y documentación actualizada.
