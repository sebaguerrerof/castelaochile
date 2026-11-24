# Aceptación y decisiones con el cliente

> **Modelo vigente — publicado en producción, Dirección y perfiles, 2026-10-11:** por decisión explícita del usuario, `superadmin` representa a la Dirección del centro y tiene acceso completo a sus pacientes, equipo, biblioteca y seguimiento, sin asignación individual ni configuración adicional. Psicólogo, Psiquiatra y Coach Recovery son perfiles reales con permisos iniciales automáticos y alcance por asignación vigente. El correo no se usa como excepción de autorización. Ver [reporte de la mejora](reportes/seguimiento/UX_DIRECCION_PERFILES_2026_10_11.md). Esta decisión sustituye el modelo histórico de «superadmin técnico sin lectura clínica» descrito más abajo.

> **Pendiente institucional:** Recovery sigue sin rúbrica aprobada; no se activó piloto ni cron care. La aceptación humana corresponde a Dirección/superadmin desde la PWA por navegador. Las pruebas técnicas de Chromium/WebKit no acreditan uso en teléfonos físicos. No se aprobaron políticas de urgencias ni custodia.

## Antecedentes y evidencia histórica

Fecha: 2026-10-10. Estado: responsable y plataforma definidos por el usuario; ejecución y firma de aceptación pendientes. Este documento prepara la conversación; no acredita aprobación clínica, jurídica ni autorización para producción.

Dirección siempre valida y acepta todos los recorridos, con su cuenta/correo actual o el superadministrador, según la aclaración del usuario. No volver a preguntar quién acepta. No se necesita codificar un correo ni crear otra cuenta: se reutiliza Auth y el panel existentes. La responsabilidad de aceptación no concede acceso clínico, notas reservadas ni capacidades adicionales a una cuenta técnica.

La plataforma objetivo es PWA y navegador en Android e iPhone de distintos tamaños y modelos, en vertical y horizontal. No volver a preguntar si se utilizarán móviles/PWA. Todavía falta ejecutar y registrar los recorridos en teléfonos físicos representativos y obtener la aceptación explícita de dirección. El usuario confirmó que aún no existen protocolo de urgencias ni política aprobada de retención/respaldo; esos puntos siguen pendientes. No programar recordatorios ni contactar al cliente automáticamente.

## Preguntas para la próxima reunión

| Decisión | Pregunta al cliente | Estado / referencia |
| --- | --- | --- |
| Aceptación | Registrar resultado, incidencias y firma de dirección para todos los perfiles, usando la cuenta actual o superadministrador autorizado. | Responsable definido por el usuario; aceptación aún no ejecutada |
| Dispositivos | Registrar modelos y versiones de Android/iOS y navegador usados en la prueba física; incluir instalación PWA, ampliación y teclado virtual. | Android/iPhone y PWA/navegador definidos; pruebas físicas pendientes |
| Urgencias | ¿Cuál es el protocolo institucional aprobado, sus canales, horarios y responsable? ¿Qué aviso recibe el paciente sobre lectura de reportes? | No aprobado; no inventar contactos |
| Retención y recuperación | ¿Qué datos constituyen ficha clínica? ¿Quién custodia y autoriza acceso, conservación y eliminación? ¿Qué pérdida de datos y tiempo de recuperación se aceptan? | No aprobado; sin purga clínica automática |
| Respaldo operativo | ¿Cuál es el entorno/plan contratado, región, protección de copias, responsable, frecuencia y ejercicio de restauración? ¿Cómo se respaldan también los objetos privados? | Pendiente; prueba técnica local documentada por separado |
| Información y derechos | ¿Quién aprueba finalidades, bases de tratamiento, información al paciente, confidencialidad del equipo y procedimiento de acceso/rectificación? | Revisión institucional/jurídica pendiente |
| Recovery | ¿Qué dimensiones, evidencia, niveles y aprobación tiene la rúbrica oficial? | Usuario confirmó que no hay rúbrica aprobada; registro cualitativo |
| Reportes y seguimiento | ¿Qué ventanas, campos, exenciones y vigencia de valoraciones están aprobados? ¿Cuál es el criterio de inasistencias reiteradas y hay reglas específicas de pendientes por agenda? | Configuración institucional pendiente; alertas reiteradas/atraso profesional no implementadas sin ese criterio; no asumir plazo universal de registros |
| Capacidad | ¿Cuántos pacientes, profesionales, eventos diarios e informes simultáneos se esperan? | Pendiente; volumen sintético local no define SLA |
| Autenticación del equipo | ¿Se requiere MFA para profesionales y dirección? ¿Quién gestiona altas, revocaciones y recuperación de acceso? | Evaluación pendiente; conservar Auth existente |

## Pauta de recorridos

Usar un entorno aislado y personas neutrales. Dirección valida todas las filas; los perfiles describen los recorridos y permisos a comprobar, no distintos aprobadores. Registrar para cada fila: cuenta autorizada de dirección, dispositivo/SO/navegador, modo navegador o PWA instalada, fecha, resultado, incidencia y aprobación explícita. Todas las filas están pendientes de validación humana. Para simular otro perfil se utilizan cuentas de prueba con sus permisos normales; no conceder reservas para facilitar la aceptación.

| Perfil | Recorrido | Resultado esperado |
| --- | --- | --- |
| Dirección | Panel → paciente → indicadores → fuente → alerta/valoración → decisión → acción delegada | Entender población, datos faltantes y siguiente acción; acceder a evidencia autorizada; no recibir notas reservadas sin concesión |
| Dirección | Informe semanal/mensual → revisión → PDF → comparación → programación/fallo/reintento | Reconocer corte/versiones, n/N y N=0, revisión pendiente y procedencia del cron; conservar originales |
| Psicología | Mi trabajo → sesión asignada → borrador → finalizar → enmendar → resumen compartido | Autor real, fecha del hecho, visibilidad explícita; medir tiempo real sin atribuir el tiempo de automatización a una persona |
| Recovery | Paciente asignado → evidencia cualitativa → compromisos → resultado | Sin puntaje ni juicio automatizado; no editar indicaciones médicas |
| Psiquiatría | Sesión asignada → registro → indicaciones → resumen explícito | Identificar información referida/observada, preservar cambios, confirmar destinatario |
| Familia | Sesión → acuerdos → publicación seleccionada | Terceros/reservas separados; paciente recibe solo lo expresamente publicado |
| Paciente | Hoy → plan/reporte → guardar borrador/enviar → compromiso → progreso → biblioteca | Solo información propia compartida, estados claros y próximos pasos; no colores clínicos internos |
| Administración técnica | Pacientes/grupos/capacidades → CMS → blog | Gestionar cuentas sin lectura clínica automática; conservar los flujos editoriales |
| Revocación | Quitar asignación o suspender cuenta con sesión abierta → repetir lectura/descarga/escritura | Bloquear nuevas operaciones incluso con sesión previa; documentar que una copia ya descargada no puede retirarse del dispositivo |
| Móvil/accesibilidad | Repetir formularios, filtros, gráficos/tablas y errores con teclado y dispositivo real | Sin pérdida de acciones o datos; foco visible, mensajes comprensibles y navegación legible |

Objetivos de 2–3 minutos por registro y unos 2 minutos por reporte siguen siendo objetivos de diseño, no tiempos humanos medidos. Una aprobación técnica local no sustituye la aceptación de estas filas.

## Cobertura móvil que dirección debe aceptar

Probar Android con Chrome y iPhone con Safari, tanto en navegador como desde la pantalla de inicio. Registrar las versiones efectivas, incluidos teléfonos pequeños y de menor capacidad. La compatibilidad con todos los modelos es un objetivo de adaptación continua, no una certificación que pueda obtenerse con emulación.

Límite existente que debe revisar dirección: Next 16 requiere Chrome 111+ y Safari 16.4+; Tailwind 4 también fija esos mínimos para sus funciones principales. Es una restricción del stack actual, no una aprobación del usuario para excluir equipos. Si los teléfonos reales quedan por debajo, la compatibilidad solicitada con ellos sigue pendiente y requiere trabajo adicional antes de aceptar ese alcance. No asumir que todos los iPhone pueden actualizarse ni que probar WebKit reciente acredita versiones antiguas. Referencias: guía local node_modules/next/dist/docs/01-app/01-getting-started/01-installation.md y [compatibilidad oficial de Tailwind](https://tailwindcss.com/docs/compatibility).

- Vertical y horizontal: acceso, menú completo, filtros, formularios abiertos, gráficos y tablas/fuentes. Comprobar que las acciones siguen accesibles al girar el dispositivo.
- Teléfonos con notch y barra de inicio: ningún control queda cubierto por los márgenes del sistema.
- Teclado virtual y ampliación: foco visible, campos y acción de guardar alcanzables mediante desplazamiento, texto conservado y zoom habilitado.
- Instalación: icono institucional, nombre, apertura independiente, inicio de sesión y cierre/reapertura. Verificar sesión/reautenticación según Auth existente, sin exigir conservarla indefinidamente.
- Conexión interrumpida: error comprensible y reintento; nunca interpretar una pantalla sin conexión como dato clínico actualizado o envío confirmado.

Las pruebas técnicas locales y sus limitaciones se registran en reportes/seguimiento/PASO_11_PWA_MOVIL.md. WebKit automatizado no equivale a Safari en un iPhone físico; reducir la ventana no reproduce el teclado del sistema. La aceptación permanece en espera hasta que dirección ejecute y firme los recorridos.

## Reanudar la aceptación

Cuando el usuario retome la conversación con el cliente, revisar primero esta lista y registrar respuestas con su referencia y aprobador. No habilitar datos clínicos reales ni publicar por haber completado pruebas locales. La preparación operativa está en CASTELAO_SEGUIMIENTO_ACTIVACION.md y los resultados efectivos en reportes/seguimiento/PASO_11.md.


## Ampliación móvil profesional verificada (2026-10-10)

PASO_11_PWA_PROFESIONALES amplía la revisión técnica a agenda/capacidades, registros de cada especialidad, decisiones/tareas/supervisión, informes y programaciones: 452 móviles/275 UX/131 funcionales, 36 capturas y seis PDF/36 páginas inspeccionados. Texto y selector corregidos con repetición afectada 126 móviles/42 UX/32 funcionales PASS. Los conteos por build y las repeticiones se distinguen en el reporte. Dirección conserva la aceptación; ejecutar y firmar los recorridos en Android/iPhone físicos y registrar modelo/SO/navegador, instalación, teclado, giro, zoom y áreas seguras. Esta ampliación no cambia las puertas institucionales pendientes ni autoriza producción.

## Aclaración vigente del usuario (2026-10-10)

La aceptación de Dirección/superadmin se hará mediante PWA abierta en el navegador o instalada. No exigir un recorrido separado de navegador ni tratar dispositivos/aceptación como bloqueo de la implementación local. La firma de aceptación no se presume; tampoco equivale a aprobar la rúbrica Recovery. Mantener pruebas PWA y criterios institucionales documentados, sin volver a preguntar la modalidad definida.

## Complemento Recovery — RC-05, cierre local 2026-10-10

Recorridos Recovery preparados y técnicamente verificados: evento grupal individual, compromiso/revisión, semana cualitativa, fuentes ordinales, mensual/entrega/revisión y comunicación/regla. La aceptación vigente permanece PWA abierta en el navegador o instalada a cargo de Dirección/superadmin. Emulación móvil/safe area/teclado no acredita aceptación humana ni todos los teléfonos; no se vuelve a exigir otra modalidad.

RC-00 a RC-05 validados técnicamente en castelao-patient-qa. RC_05 registra nueve suites/266 funcionales, 1.032 controles móviles Chromium/WebKit en 30 contextos y 492 UX en 41, cero hallazgos. 930 SQL seguimiento + 76 biblioteca; 113 unitarias, lint y build/TypeScript PASS. Biblioteca/Auth 30 y web/CMS 36 controles PASS; siete PDF privados/40 páginas renderizadas e inspeccionadas. Instalación fresca 36 migraciones/1.006 SQL y restauración 136 Recovery, sin sumarlos a la regresión base. Consolidación y limpieza independiente: tmp/recovery-qa/release-summary.json.

Pendiente institucional: aprobar propuesta/piloto/criterio de evidencia, ventana global común y equivalencias; excepción motivada sin compromiso; parámetros/exclusiones/revisión de reiteración; protocolo/canales de urgencias y retención/respaldo. Dirección/superadmin acepta PWA abierta en el navegador o instalada según el usuario; aceptación humana pendiente, no bloqueo de programación local. ICC-REC-AUT-001 v1.0 sigue propuesta sin aprobador y criterio apagado; ningún paciente validado. Sin producción, migraciones remotas, push, despliegue ni mensajes externos.

## Aclaración de aceptación: PWA en navegador

Dirección/superadmin autorizado debe poder revisar y aceptar desde la PWA abierta en el navegador, sin instalación obligatoria ni requisito de modo standalone. La PWA instalada ofrece los mismos recorridos. No se exige una aceptación separada para cada modo. Las comprobaciones en teléfonos reales son evidencia de compatibilidad; no obligan a instalar la PWA para registrar una aprobación.

«Aceptación pendiente» describe que todavía no consta la conformidad humana de Dirección sobre el sistema, no una función deshabilitada ni una limitación del navegador. La pauta de aceptación del sistema es documentación para esa validación humana; no se ha implementado una firma global del sistema dentro de la aplicación. Las decisiones operativas ya implementadas —aprobar la rúbrica, autorizar piloto y revisar el mensual— sí tienen formularios web con confirmación y guardado real, sujetos a Auth y permisos actuales. No se ejecuta ni presume aprobación institucional por esta aclaración.
