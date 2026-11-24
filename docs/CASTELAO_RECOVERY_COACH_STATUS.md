# Estado del complemento Recovery Coach

> **Autonomía personal — desarrollo local, 2026-10-17:** instrumento independiente transcrito desde cinco páginas, evaluación por pasos, acuerdos enlazados, revisiones y constancias con historial. Dos migraciones solo en QA; sin despliegue. [Estado y pruebas](CASTELAO_AUTONOMIA_PERSONAL_STATUS.md). No modifica la gobernanza pendiente de ICC-REC-AUT-001.

> **Agenda del centro publicada — 2026-10-12:** acceso directo para Dirección, tarjetas por día con horarios, filtros y apertura de actividades; enlace DEMO corregido y agenda personal conservada. 118 unitarias, build/TypeScript/lint, 32 controles funcionales y 176 responsive Chrome/WebKit PASS; candidato 15 HTTP y dominio 31 HTTP PASS. Sin cambios de usuarios, datos ni migraciones. Despliegue `dpl_BeoiQAoJoQNS33F2fpP6v4EZgXUG`. [Reporte y pendientes](reportes/seguimiento/AGENDA_CENTRO_2026_10_12.md).

> **Demostración publicada y cargada — 2026-10-12:** recorrido `/admin/demostracion`, aviso DEMO y retirada completa desde modal. 3 pacientes y 5 profesionales nuevos, 42 actividades, 12 semanas Recovery cualitativas, Biblioteca con PDF privado y 7 borradores del sitio. Las 3 cuentas anteriores y sus roles se conservaron; sin correos, publicación de borradores, niveles Recovery ni cron care. 118 unitarias, build/TypeScript/lint, 21 controles funcionales/176 responsive, candidato 13 HTTP, dominio 30 HTTP y 7 controles de privacidad PASS. Dos migraciones aplicadas (43 totales). Despliegue `dpl_7muajFUVLu5wSd6dR4RxRzjpmRmS`. [Reporte y pendientes](reportes/seguimiento/DEMO_CLIENTE_2026_10_12.md); [guía para el cliente](CASTELAO_DEMO_CLIENTE.md).

> **Modelo vigente — publicado en producción, Dirección y perfiles, 2026-10-11:** por decisión explícita del usuario, `superadmin` representa a la Dirección del centro y tiene acceso completo a sus pacientes, equipo, biblioteca y seguimiento, sin asignación individual ni configuración adicional. Psicólogo, Psiquiatra y Coach Recovery son perfiles reales con permisos iniciales automáticos y alcance por asignación vigente. El correo no se usa como excepción de autorización. Ver [reporte de la mejora](reportes/seguimiento/UX_DIRECCION_PERFILES_2026_10_11.md). Esta decisión sustituye el modelo histórico de «superadmin técnico sin lectura clínica» descrito más abajo.

> **Pendiente institucional:** Recovery sigue sin rúbrica aprobada; no se activó piloto ni cron care. La aceptación humana corresponde a Dirección/superadmin desde la PWA por navegador. Las pruebas técnicas de Chromium/WebKit no acreditan uso en teléfonos físicos. No se aprobaron políticas de urgencias ni custodia.

## Antecedentes y evidencia histórica

> **Estado vigente — producción, 2026-10-10:** puesta en producción autorizada y ejecutada en www.castelaochile.cl. 22 migraciones care aplicadas (36 totales), bandera activa, build remoto/TypeScript, 8 HTTP del candidato, 27 HTTP del dominio y 5 controles de autorización DB PASS. Reporte: [PRODUCCION_2026_10_10](reportes/seguimiento/PRODUCCION_2026_10_10.md). Las secciones fechadas anteriores conservan evidencia histórica; sus restricciones de despliegue quedaron sustituidas por la autorización del usuario.

> **Pendiente institucional:** capacidades/asignaciones reales se configuran en `/admin/seguimiento/equipo`; no se otorgó lectura clínica automática. Recovery v1.0 continúa como propuesta, sin piloto/criterios ni validaciones. Sin jobs/cron care. Dirección acepta y registra las decisiones operativas desde la PWA en navegador; conformidad humana general, dispositivos físicos y políticas de urgencias/custodia siguen pendientes. No se acredita escritura clínica ni PDF con sesión real en producción.

Actualizado 2026-10-10, America/Santiago. Rama codex/seguimiento-terapeutico, base 4fbf785; cambios locales sin commit.

| Paso | Estado | Evidencia / pendiente |
| --- | --- | --- |
| RC-00 | Validado localmente | Nueve secciones del DOCX y complemento leídos; tabla de diferencias en CASTELAO_RECOVERY_COACH y RC_00 |
| RC-01 | Validado localmente | RC_01: 23 SQL nuevos + 66 regresión, 102 unitarias, lint/build, 28 funcionales, 116 móviles/43 UX; fixtures retiradas |
| RC-02 | Validado localmente | RC_02: 48 SQL semanales + 95 regresión, 107 unitarias, lint/build/TypeScript; 14 funcionales, 40 móviles/14 UX sin hallazgos; limpieza independiente PASS |
| RC-03 | Validado localmente | RC_03: 47 SQL, 110 unitarias, lint/build; 16 funcionales, 76 móviles/25 UX sin hallazgos y limpieza PASS |
| RC-04 | Validado localmente | RC_04: mensual/entrega/revisión, comunicación y reglas; 27 funcionales/156 móviles/50 UX PASS; PDF privado corregido, cuatro páginas inspeccionadas; fixtures retiradas |
| RC-05 | Validado localmente | RC_05: nueve suites/266 funcionales; 1.032 móviles/492 UX, cero hallazgos; 930 SQL + 76 biblioteca, 30 Auth/biblioteca y 36 web/CMS; siete PDF/40 páginas inspeccionadas; instalación/recuperación y limpieza independiente PASS |

Rúbrica institucional pendiente; ningún piloto/criterio activado ni persona validada. Aceptación Dirección/superadmin PWA abierta en el navegador o instalada según el usuario. Pruebas históricas de seguimiento conservan su fecha y no prueban este complemento. Complemento publicado según PRODUCCION_2026_10_10; no implica aprobación institucional.

RC-00 a RC-05 técnicamente terminados. Informe de entrega: reportes/recovery/RC_05.md; consolidación local ignorada tmp/recovery-qa/release-summary.json. Lint, 113 unitarias, build/TypeScript PASS. Las cifras de instalación fresca (1.006 SQL) y pruebas sobre restauración (136 Recovery) son cortes separados, no controles adicionales del entorno base. Activación técnica autorizada y ejecutada; decisiones institucionales abiertas documentadas en el reporte de producción.

## Aclaración de aceptación: PWA en navegador

Dirección/superadmin autorizado debe poder revisar y aceptar desde la PWA abierta en el navegador, sin instalación obligatoria ni requisito de modo standalone. La PWA instalada ofrece los mismos recorridos. No se exige una aceptación separada para cada modo. Las comprobaciones en teléfonos reales son evidencia de compatibilidad; no obligan a instalar la PWA para registrar una aprobación.

«Aceptación pendiente» describe que todavía no consta la conformidad humana de Dirección sobre el sistema, no una función deshabilitada ni una limitación del navegador. La pauta de aceptación del sistema es documentación para esa validación humana; no se ha implementado una firma global del sistema dentro de la aplicación. Las decisiones operativas ya implementadas —aprobar la rúbrica, autorizar piloto y revisar el mensual— sí tienen formularios web con confirmación y guardado real, sujetos a Auth y permisos actuales. No se ejecuta ni presume aprobación institucional por esta aclaración.
