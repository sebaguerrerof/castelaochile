# Complemento de Recovery Coach

> **Modelo vigente — publicado en producción, Dirección y perfiles, 2026-10-11:** por decisión explícita del usuario, `superadmin` representa a la Dirección del centro y tiene acceso completo a sus pacientes, equipo, biblioteca y seguimiento, sin asignación individual ni configuración adicional. Psicólogo, Psiquiatra y Coach Recovery son perfiles reales con permisos iniciales automáticos y alcance por asignación vigente. El correo no se usa como excepción de autorización. Ver [reporte de la mejora](reportes/seguimiento/UX_DIRECCION_PERFILES_2026_10_11.md). Esta decisión sustituye el modelo histórico de «superadmin técnico sin lectura clínica» descrito más abajo.

> **Pendiente institucional:** Recovery sigue sin rúbrica aprobada; no se activó piloto ni cron care. La aceptación humana corresponde a Dirección/superadmin desde la PWA por navegador. Las pruebas técnicas de Chromium/WebKit no acreditan uso en teléfonos físicos. No se aprobaron políticas de urgencias ni custodia.

## Antecedentes y evidencia histórica

Fuente: CASTELAO_RECOVERY_COACH_COMPLEMENTO_CODEX.md y Panel_Recovery_Coach_para_Sebastian.docx, versión 1.0, 10-10-2026. DOCX encontrado en Descargas y leído en sus nueve secciones; extracción/hash de QA bajo tmp/recovery-qa, sin modificar el original. Reutiliza seguimiento, Auth, permisos y diseño existentes.

ICC-REC-AUT-001 v1.0 es una **propuesta pendiente de aprobación**. Ocho dimensiones exactas y niveles ordinales manuales 1–4; SE no es cero. Registro cualitativo siempre disponible. Piloto, aprobación del instrumento, activación del criterio y validación de una persona son decisiones distintas. Codex no ejecuta decisiones institucionales reales.

## Diferencias auditadas RC-00

| Fuente | Existente / estado inicial | Diferencia e integración prevista | Verificación |
| --- | --- | --- | --- |
| DOCX §1/8, objetivo y guardado | Parcial: care_session_records, drafts/versions/operations; /registros; feedback real | Añadir campos Recovery sin sustituir el editor/servidor; flujo cualitativo completo | RC-01 DB/REST/UI, reintento y concurrencia |
| §2, actividad/participación/apoyo | Parcial: evento común, participantes, asistencia e historia; evento/paciente/autor/especialidad único | Tipo de actividad Recovery, cuatro etiquetas mapeadas a asistencia y apoyo observado nullable, registro individual | Grupo único, desempeño distinto, ausencia no equivale a sin apoyo |
| §3, campos y próximo compromiso | Parcial: hechos/relato/dificultades; compromiso textual y compromiso real en planificación | Avances/evidencia/apoyo obligatorios aplicables; compromiso real transaccional con plazo/revisión/verificación o excepción explícita motivada | Borrador incompleto permitido; finalizar exige campos; sin tarea ficticia |
| §4/5, dimensiones y propuesta | Parcial: care_recovery_rubrics y observaciones por registro; dimensiones anteriores diferentes | Contenido nuevo exacto/versionado, gobernanza/piloto y revisión semanal separada; conservar histórico anterior | Propuesta sin aprobador/activación; permisos/versiones |
| §5, criterio cuatro semanas | Pendiente | Configuración desactivada; ventana común cerrada para ocho dimensiones, candidatura y decisión humana separadas | Huecos/SE/versiones/piloto no satisfacen ventana; enmiendas exigen revisión |
| §6, frecuencias y resumen mensual | Parcial: Mi trabajo/supervisión e informes mensuales privados/PDF/jobs | Pendientes Recovery por agenda y semanas elegibles; contenido mensual editado, entrega y revisión separadas | No obligaciones retroactivas; enlaces semanales y estados reales |
| §7, dirección y gráficos | Parcial: fuentes, autonomía por dimensión, tablas accesibles y gráficos operativos | Apoyo por categoría/cobertura, resultados de compromiso, matriz semanal/mensual y filtros | n/N, fuentes, huecos y escala compatible; sin promedios |
| §8, resultados y reiteración | Parcial: compromiso pendiente/completado/cancelado con historia; motor de reglas versionado | Resultado profesional pendiente/cumplido/incumplido/no verificable independiente de vencimiento; reiteración desactivada sin criterio | No convertir vencido/no verificable en incumplido; deduplicación |
| §9, límites/comunicación | Parcial: solicitud de intervención con autor/fecha y reserva separada | Constancia de comunicación realizada con canal/destinatario/fecha, sin enviar mensajes | Alerta/solicitud no acreditan contacto; autorización vigente |

## Decisiones abiertas conservadas

Dirección debe autorizar formalmente piloto, aprobar contenido y criterios de evidencia, y decidir interpretación de la ventana global común de cuatro semanas cerradas. No se asume equivalencia de versiones ni aceptación de datos piloto. La excepción de no acordar un compromiso exige constancia y motivo; debe validarse operativamente con Dirección. Ningún nivel acredita alta, ausencia de riesgo ni finalización del tratamiento.

El usuario precisó aceptación de Dirección/superadmin **mediante PWA abierta en el navegador o instalada**. Esta modalidad no bloquea el desarrollo local ni cambia la aprobación pendiente de la rúbrica. No volver a exigir un recorrido de navegador separado o aceptación física como condición de programación. Aceptar UX no concede acceso clínico por rol CMS; exige las capacidades/asignaciones vigentes.

## Ejecución

RC-01 validado localmente según reportes/recovery/RC_01.md: actividad cualitativa y compromiso/revisión reales, sin niveles. 23 SQL nuevos y 66 de registros; 102 unitarias, lint/build, 28 funcionales, 116 móviles/43 UX. Cero fixtures Recovery/usuarios de la suite tras limpieza. RC-02 validado localmente según RC_02: propuesta y gobierno/revisión semanal implementados; 48 SQL + 95 regresión, 107 unitarias, lint/build, 14 funcionales, 40 móviles/14 UX, limpieza independiente PASS. Ninguna aprobación/piloto/criterio institucional ejecutado. RC-03 validado según RC_03: supervisión, apoyo/compromisos, cobertura desde agenda y gráficos/matriz por dimensión; 47 SQL, 110 unitarias, lint/build, 16 funcionales, 76 móviles/25 UX y limpieza PASS. RC-04 validado localmente; RC-05 cerrado según su reporte final.

RC-00 inventario; RC-01 registro/compromisos; RC-02 propuesta/revisión semanal; RC-03 supervisión/gráficos; RC-04 resumen/alertas/comunicación; RC-05 regresión y entrega. Reportes fechados bajo docs/reportes/recovery; mantener los seis documentos de seguimiento y distinguir evidencia nueva de resultados históricos. Sin producción, migraciones remotas, correos, push o deploy.


RC-04 validado localmente (RC_04): informes actuales con fuente semanal/edición profesional/entrega/revisión, constancia de comunicación real y reiteración versionada desactivada inicialmente. Repetición funcional 27 PASS, 156 móviles/50 UX y PDF de cuatro páginas inspeccionado; sin sumar repeticiones. RC-05 en curso, incluyendo alcance de mensual, estados individuales desde agenda grupal y regresión completa. Las semanas de un mensual se asignan por su lunes de inicio y conservan el periodo semanal completo; no se promedia un nivel mensual.


## Complemento Recovery — RC-05, cierre local 2026-10-10

RC-00 a RC-05 validados técnicamente en castelao-patient-qa. RC_05 registra nueve suites/266 funcionales, 1.032 controles móviles Chromium/WebKit en 30 contextos y 492 UX en 41, cero hallazgos. 930 SQL seguimiento + 76 biblioteca; 113 unitarias, lint y build/TypeScript PASS. Biblioteca/Auth 30 y web/CMS 36 controles PASS; siete PDF privados/40 páginas renderizadas e inspeccionadas. Instalación fresca 36 migraciones/1.006 SQL y restauración 136 Recovery, sin sumarlos a la regresión base. Consolidación y limpieza independiente: tmp/recovery-qa/release-summary.json.

Matriz final fuente → implementación → prueba → estado y rutas verificadas en reportes/recovery/RC_05.md. La tabla RC-00 conserva expresamente el estado inicial auditado.

Pendiente institucional: aprobar propuesta/piloto/criterio de evidencia, ventana global común y equivalencias; excepción motivada sin compromiso; parámetros/exclusiones/revisión de reiteración; protocolo/canales de urgencias y retención/respaldo. Dirección/superadmin acepta PWA abierta en el navegador o instalada según el usuario; aceptación humana pendiente, no bloqueo de programación local. ICC-REC-AUT-001 v1.0 sigue propuesta sin aprobador y criterio apagado; ningún paciente validado. Sin producción, migraciones remotas, push, despliegue ni mensajes externos.

## Aclaración de aceptación: PWA en navegador

Dirección/superadmin autorizado debe poder revisar y aceptar desde la PWA abierta en el navegador, sin instalación obligatoria ni requisito de modo standalone. La PWA instalada ofrece los mismos recorridos. No se exige una aceptación separada para cada modo. Las comprobaciones en teléfonos reales son evidencia de compatibilidad; no obligan a instalar la PWA para registrar una aprobación.

«Aceptación pendiente» describe que todavía no consta la conformidad humana de Dirección sobre el sistema, no una función deshabilitada ni una limitación del navegador. La pauta de aceptación del sistema es documentación para esa validación humana; no se ha implementado una firma global del sistema dentro de la aplicación. Las decisiones operativas ya implementadas —aprobar la rúbrica, autorizar piloto y revisar el mensual— sí tienen formularios web con confirmación y guardado real, sujetos a Auth y permisos actuales. No se ejecuta ni presume aprobación institucional por esta aclaración.

## Instrumento de autonomía personal — incorporación local 2026-10-17

Se integra un autorreporte independiente de 41 ítems A–H, escala 0–4 en A–F y Sí/No/A veces en G–H, con preguntas abiertas, acuerdos, revisiones y conversación versionada. Reutiliza permisos, planificación e informes. No equivale a ICC-REC-AUT-001 ni modifica su aprobación o criterios pendientes. [Transcripción](CASTELAO_AUTONOMIA_PERSONAL_TRANSCRIPCION.md), [estado y reportes A–E](CASTELAO_AUTONOMIA_PERSONAL_STATUS.md). Solo local.
