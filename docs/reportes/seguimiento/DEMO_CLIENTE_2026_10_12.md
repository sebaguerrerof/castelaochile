# Datos de demostración para presentar al cliente · 2026-10-12

## Resultado

> **Corrección posterior de la agenda — 2026-10-12:** el enlace original de demostración apuntaba a la agenda personal con un profesional ajeno y podía mostrar Forbidden. La prueba anterior solo esperaba un h1 genérico, por lo que no verificó correctamente esa ruta. Se corrige el enlace hacia la nueva Agenda del centro y se exigen HTTP 200, título exacto, filas reales, filtros, detalle y paginación. Ver [reporte de la corrección](AGENDA_CENTRO_2026_10_12.md). Esta nota sustituye la afirmación anterior de verificación de ese enlace de agenda.

Implementado y cargado un conjunto removible de ejemplos en el panel privado y borradores del sitio, según el alcance confirmado por el usuario. Disponible en `/admin/demostracion`, con navegación por módulos, aviso DEMO y eliminación mediante modal breve con confirmación escrita. Se reutilizan autenticación, roles, componentes, acciones y diseño institucional.

La carga productiva está activa y se conserva para el cliente. No se alteraron las tres identidades anteriores ni sus roles. No se enviaron correos ni se publicaron borradores. El acceso de las ocho identidades nuevas está bloqueado en Auth; Dirección presenta el recorrido desde su cuenta habitual.

## Datos verificados en producción

| Módulo | Ejemplos creados |
| --- | --- |
| Pacientes y equipo | 3 pacientes, 5 miembros de personal, 10 asignaciones nuevas |
| Trayectoria y planificación | 3 episodios, objetivos, planes personales y valoraciones de seguimiento |
| Agenda | 42 actividades: 36 sesiones pasadas, 3 actividades próximas Recovery y 3 familiares |
| Registros profesionales | 26 finalizados y 2 borradores; autores ficticios y payloads compatibles con los formularios reales |
| Reportes diarios | 42 obligaciones históricas, 33 autorreportes, 3 alertas de muestra |
| Recovery | 12 revisiones semanales, 3 observaciones de autonomía cualitativa, 10 compromisos; cero niveles numéricos |
| Familia y Dirección | 3 registros familiares, 1 decisión y 1 tarea delegada |
| Informes y programaciones | 2 informes, 1 programación desactivada con ejecución de muestra, 3 reglas operativas desactivadas |
| Grupos y Biblioteca | 2 grupos, 1 área, 1 carpeta, 3 materiales para grupos DEMO y 1 PDF privado verificado |
| Sitio web | 3 borradores de contenido, 3 de profesionales y 1 página sin publicar ni añadir a navegación |
| Consultas | 3 consultas ficticias en distintos estados; sin comunicaciones |
| Analítica | Serie privada de siete días, rotulada ficticia; sin insertar eventos ni totales en la medición real |

La regla DEMO de autorreportes tiene vigencia futura `9999-12-31`; ningún paciente real queda enrolado ni se cambia la regla actualmente efectiva. La rúbrica `ICC-REC-AUT-001` sigue en propuesta, sin piloto, criterio de logro ni aprobación.

## Protección y limpieza

Un registro privado identifica las ocho cuentas nuevas y las claves primarias de sus datos. La carga guarda referencias de filas anteriores y comprueba internamente la preservación de identidades y roles. No se exportan hashes ni fichas de personas reales.

La eliminación recorre solo descendientes del conjunto y bloquea vínculos con filas anteriores o pacientes ajenos. Primero retira los datos en una transacción que conserva triggers y RLS; después retira únicamente los archivos y cuentas identificados en el recibo privado. La operación puede reanudarse tras interrupciones de Storage/Auth y es idempotente una vez completada. La constancia de retirada permanece en auditoría. Las identidades huérfanas de una interrupción entre crear y registrar se recuperan por email exacto y marcador app_metadata controlado por el servidor. La prueba adicional detectó que la comparación de identidades debía ejecutarse después de esa captura y antes de retirar datos; se corrigió mediante la migración aditiva `20261012235815_care_demo_cleanup_recovery.sql`, conservando la primera migración aplicada.

## Pruebas ejecutadas

- Build local final y TypeScript PASS. Lint de los archivos modificados PASS. 118 pruebas unitarias existentes PASS.
- QA DEMO: **21 controles funcionales y 176 comprobaciones responsive** en Chromium y WebKit, a 320, 375, 768 y 1440 px. Incluye 22 rutas reales, PDF interno, modal de retirada, acción autenticada, limpieza reanudable, idempotencia, cuentas bloqueadas, rechazo de editor/anónimo, schemas clínicos estrictos, vínculo con paciente ajeno y preservación de configuración/rúbrica/analítica/cron. Cero errores de página. También PASS la prueba de cuenta creada con registro interrumpido: captura y eliminación de la identidad huérfana, sin deshabilitar triggers. Fixtures retiradas y protección del último superadmin habilitada al finalizar.
- Durante QA se corrigieron dos defectos visuales comprobados: encabezado accesible de tabla que escapaba de su contenedor al cambiar a tableta y selector semanal nativo de WebKit que desbordaba a 320 px. Los valores, filtros y acciones se mantienen.
- Supabase productivo: 43 migraciones, dos nuevas aplicadas tras dry-runs de alcance único. Verificados 3 usuarios originales intactos, 1 paciente anterior conservado, 8 identidades DEMO bloqueadas, PDF listo en bucket privado, cero materiales DEMO para audiencia global, cero publicaciones DEMO y ausencia de cron care. El sitio mantiene 232 contenidos publicados y 1 profesional publicado.
- Privacidad productiva: 7 controles PASS de registro privado, borradores ocultos, bucket, archivo y material sin acceso anónimo.
- Seguridad: antes 42 INFO; después 47 INFO. Cinco INFO nuevos esperados por RLS sin políticas en tablas privadas DEMO con acceso directo revocado. Sin WARN/ERROR.
- Candidato: 13 comprobaciones HTTP PASS mediante protección de Vercel y sesión anónima de aplicación. Dominio principal: 30 comprobaciones HTTP PASS tras promoción. Para rutas inexistentes/borradores se comprueba not-found y noindex; Next.js puede conservar HTTP 200 cuando ya inició streaming, según su documentación instalada. La consulta anónima de borradores devuelve cero filas.

## Producción y evidencia

Despliegue promovido Ready: `dpl_7muajFUVLu5wSd6dR4RxRzjpmRmS`, https://castelaochile-ge8mmylia-sebastian-guerreros-projects.vercel.app. Dominio: https://www.castelaochile.cl/admin/demostracion. Referencia previa: `dpl_8GZJXU5Qjmosopr4aZYyhmthsuyg`. La base contiene ejemplos activos; volver al despliegue anterior no retira datos ni revierte la migración aditiva.

Conjunto productivo: `f34f9ab0-649b-41b0-838a-5487a3a092bf`. Evidencia local: `tmp/care-qa/demo/results.json` y capturas del recorrido, PDF y modal. Evidencia productiva: `tmp/care-production/demo-*.json` y logs de despliegue, dry-run, migración, carga, inspección y promoción. Los archivos de evidencia no se suben al despliegue.

La revisión automática rechazó una exportación de huellas individuales y filas del personal. Se sustituyó por comprobaciones internas de preservación con resultados booleanos y conteos; la alternativa fue autorizada y ejecutada. No se exportaron identidades completas ni configuraciones sensibles.

## Pendientes

- Dirección/superadmin presenta el recorrido y decide cuándo retirar los ejemplos desde navegador/PWA.
- La aceptación humana, pruebas en teléfonos físicos Android/iPhone y las políticas institucionales de urgencias/custodia siguen pendientes según el estado anterior. Las pruebas Chromium/WebKit no acreditan dispositivos físicos.
- No se concede aprobación de la rúbrica ni se activan automatizaciones del centro por crear ejemplos.

[Guía de presentación y retirada](../../CASTELAO_DEMO_CLIENTE.md). Sin cambios de configuración Auth/SMTP/Vault/cron, sin commit/push y sin modificar la configuración del sitio.
