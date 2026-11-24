# Datos y privacidad — base para revisión institucional

> **Modelo vigente — publicado en producción, Dirección y perfiles, 2026-10-11:** por decisión explícita del usuario, `superadmin` representa a la Dirección del centro y tiene acceso completo a sus pacientes, equipo, biblioteca y seguimiento, sin asignación individual ni configuración adicional. Psicólogo, Psiquiatra y Coach Recovery son perfiles reales con permisos iniciales automáticos y alcance por asignación vigente. El correo no se usa como excepción de autorización. Ver [reporte de la mejora](reportes/seguimiento/UX_DIRECCION_PERFILES_2026_10_11.md). Esta decisión sustituye el modelo histórico de «superadmin técnico sin lectura clínica» descrito más abajo.

> **Pendiente institucional:** Recovery sigue sin rúbrica aprobada; no se activó piloto ni cron care. La aceptación humana corresponde a Dirección/superadmin desde la PWA por navegador. Las pruebas técnicas de Chromium/WebKit no acreditan uso en teléfonos físicos. No se aprobaron políticas de urgencias ni custodia.

## Antecedentes y evidencia histórica

Fecha de consulta: 2026-10-10. Estado: preparado para revisión, sin certificación de cumplimiento. El usuario confirmó que protocolo y retención/respaldo aún no están aprobados y dejó la aceptación con el cliente en espera.

## Mapa de datos, finalidades y acceso construido

| Datos / fuentes | Finalidad implementada | Acceso y separación |
| --- | --- | --- |
| Auth, perfil, cuenta, grupos y asignaciones | Identificación y autorización; acceso al portal/biblioteca | Auth existente; cuenta activa, capacidad y alcance vigentes; rol CMS no concede lectura clínica |
| Episodios, fases e historial | Trayectoria y contexto de seguimiento | Equipo asignado; estado terapéutico separado de suspensión del portal |
| Agenda, asistencia, planes, compromisos y reportes | Coordinación y cumplimiento operativo | Paciente propio y equipo autorizado; observación frente a autorreporte; historia conservada |
| Registros y enmiendas profesionales | Documentar atención y evidencia atribuida | Autor/especialidad/lectores explícitos; reservas físicamente privadas; dirección no hereda acceso reservado |
| Resúmenes e indicaciones publicadas | Compartir información seleccionada | Publicación explícita y lectura por destinatario autorizado; Recovery no crea indicaciones médicas |
| Autonomía y familia | Evidencia cualitativa y coordinación específica | Sin puntaje mientras no haya rúbrica aprobada; terceros y reservas segregados, sin nuevas cuentas familiares |
| Alertas, valoraciones y decisiones | Siguientes acciones y revisión humana | Alertas operativas distintas de clasificación clínica; decisiones restringidas y tareas mínimas delegadas |
| Informes, comparación y PDF | Consolidación de fuentes con corte, versiones y trazabilidad | Snapshot congelado, permisos actuales al abrir/exportar; sin reservas ni contenido inventado; Storage privado |
| Jobs, reglas, heartbeat y fallos | Ejecución recurrente autorizada y recuperación | Alcance fijo y revalidado, fallos codificados sin cuerpo clínico; heartbeat sin datos de paciente |
| Auditoría clínica y editorial | Atribución de lecturas/mutaciones comprobadas | Actor/recurso/acción/hora; sin texto clínico/tokens en auditoría técnica; no rastrea copias ya descargadas |
| Analítica pública / contacto | Funciones independientes del sitio existente | Rutas privadas excluidas; no usar analítica pública para observar atención; no captura QA externa |

Registros finalizados, enmiendas y exports confirmados se preservan. Archivado lógico no es borrado ni anonimización. No hay política clínica automática de purga. Datos, capturas y respaldos del paso 11 son neutrales, locales e ignorados en Git.

## Fuentes oficiales y encuadre pendiente

- La [Ley 19.628, versión previa a la reforma](https://www.bcn.cl/leychile/Navegar?idNorma=141599&idVersion=2023-05-09) considera sensibles los datos de salud. Revisar bases de tratamiento, finalidad, información, confidencialidad y ejercicio de derechos con la institución; no sustituirlo por un checkbox técnico.
- Los artículos 12–13 de la [Ley 20.584, versión consultada de 2026](https://www.bcn.cl/leychile/navegar?idNorma=1039348&idVersion=2026-02-16) regulan ficha clínica, integridad/confidencialidad y acceso; el art. 13 exige a prestadores conservarla por al menos quince años. Determinar jurídicamente qué datos de esta plataforma integran ficha clínica, custodia y acceso del titular. No se convirtió ese mínimo legal en un plazo uniforme de borrado ni se implementó purga.
- El [Decreto 41 sobre fichas clínicas](https://www.bcn.cl/leychile/navegar?idNorma=1046753) regula elaboración, almacenamiento, administración, protección y eliminación. Verificar su aplicación y las exigencias de interoperabilidad/estándares vigentes al momento de activar.
- La [Ley 21.719 y su artículo primero transitorio](https://www.bcn.cl/leychile/navegar?idNorma=1209272&idVersion=2026-12-01) establece la entrada en vigor de la reforma el primer día del mes vigésimo cuarto posterior a su publicación: 2026-12-01. Al 2026-10-10 esa reforma aún no rige. La próxima activación debe verificar nuevamente vigencia, reglamentos y obligaciones aplicables; no presentar ambas versiones como simultáneamente vigentes.

Esta documentación es un mapa técnico para revisión, no una autorización para tratamiento clínico real. No hay consentimiento o avisos institucionales nuevos aprobados ni un procedimiento de derechos implementado por esta entrega. Las facultades internas de visibilidad deben revisarse junto con el acceso legal a la ficha y el encuadre del servicio.

## Decisiones que el cliente debe resolver

Identificar responsable de tratamiento y custodio; delimitar ficha clínica frente a coordinación/terceros; acordar finalidades y bases aplicables; revisar aviso al paciente y confidencialidad del equipo; verificar encargados/proveedores, región y transferencias; definir procedimiento de derechos y exportación autorizada; aprobar conservación y eliminación conforme al encuadre; proteger copias y gestionar incidentes; decidir MFA y recuperación de cuentas; aprobar protocolo de urgencias y aceptación de perfiles/dispositivos. Lista para la reunión en CASTELAO_SEGUIMIENTO_ACEPTACION.md, en espera por instrucción del usuario.

## Autonomía personal — local, 2026-10-17

Catálogo e historial privados, RLS y RPC con grants explícitos; sin tablas nuevas de acceso directo ni nuevos buckets. Conserva versión, respondent_patient_id y entered_by separados. Las respuestas quedan fuera de analítica pública por la exclusión vigente de rutas privadas. La auditoría técnica solo guarda acción, actor e ID. Fotografías fuera de `public` y excluidas por la lista permitida de despliegue; informes usan el bucket privado ya existente y revalidan permisos. Las constancias conservan la evaluación y el snapshot de acuerdos conversados, sin firma certificada ni consentimiento general. Las políticas institucionales de retención pendientes no se presumen aprobadas.
