# Revisión UX/UI — Pasos 1–5, antes del Paso 6

Fecha / entorno / rama / commit: 2026-10-09; stack aislado `castelao-patient-qa`, localhost:3450; rama `codex/seguimiento-terapeutico`, base `4fbf785`, sin nuevo commit. Solicitud del usuario: evaluar los cinco pasos entregados y corregir el UX/UI antes de seguir.

Estado: Validado localmente. Puerta de revisión UX/UI de los pasos 1–5 cerrada en QA; no se inició el Paso 6.

Objetivo: verificar recorridos completos de paciente, dirección, psicología, Recovery, psiquiatría y configuración técnica. Separar funcionalidad comprobada de legibilidad, navegación, accesibilidad y jerarquía visual.

Método: reutilizar sesiones normales y fixtures neutros de las cuatro suites existentes, ejecutadas secuencialmente con limpieza propia. Nueva auditoría compartida `scripts/qa-care-ux.mjs` y comando `node scripts/care-local.mjs ux-audit`. Revisión DOM, contraste CSS sólido, enlaces reales, capturas y teclado a 320/375/768/1440 px. No se instala otra librería ni se envían pantallas/datos a servicios externos.

## Hallazgos iniciales y correcciones verificadas

| Hallazgo | Impacto | Corrección local |
| --- | --- | --- |
| Textareas de dos filas heredaban mínimo de 13rem del editor CMS | Registro breve requiere demasiado desplazamiento | Mínimo de 5rem y redimensionado vertical, limitado a formularios terapéuticos |
| Guardar borrador y finalizar/enviar con el mismo estilo | Jerarquía de acciones poco clara | Borrador secundario; finalización/envío primario |
| Menú móvil cerrado conservaba controles enfocables; abierto no aislaba foco ni cerraba con Escape | Navegación de teclado imprevisible | Inert, foco inicial, Tab/Shift+Tab, Escape, restauración de foco y bloqueo de scroll |
| Logo y cierre superpuestos; opciones/footer recortados en pantallas bajas | Cierre y acceso a las secciones difíciles | Espacio propio para cierre, logo adaptable y navegación con scroll independiente; prueba adicional 320×568 |
| Barra contraída ocultaba el texto sin nombre accesible equivalente; menú de cuenta móvil sin nombre visible | Lectores de pantalla no identifican los controles | Labels explícitos, foco visible en barra contraída y menú de cuenta nombrado con cierre/restauración de foco por Escape |
| Breadcrumbs a índices inexistentes de pacientes/agenda/reportes | Enlaces 404 | Pacientes vuelve al panel; categorías sin página son texto; enlaces privados sin prefetch |
| Texto secundario con contraste 4.32:1 sobre el canvas | Lectura insuficiente del texto normal | Token institucional de tinta secundaria más oscuro en seguimiento |
| Controles de formulario por debajo del objetivo de 44px | Dificultad táctil | Tamaño mínimo en controles del módulo; disparadores móviles de 44px |
| Referencias ARIA a errores inexistentes en configuración de reportes | Mensaje asociado sin destino | Mantener destino estable aun sin error |
| Fuentes de asistencia/reportes marcaban Pendientes profesionales como activo | Orientación incorrecta | Títulos específicos y estado activo «Fuentes del indicador» |
| Resúmenes del paciente solo accesibles desde Hoy | Descubribilidad irregular | Enlace «Mis resúmenes» según módulo habilitado, con selección activa |
| Inicio, carga y error del portal describían solo biblioteca | Contexto incorrecto al planificar/reportar | Textos coherentes con módulo habilitado y recuperación al inicio |
| Rol CMS «Solo lectura» en el registro de un profesional habilitado | Contradicción con acciones clínicas autorizadas | Identificación «Equipo de atención» en seguimiento; permisos y roles no cambian |
| Error de consulta ofrecía solo repetir la misma URL inválida | Sin salida de recuperación | Reintentar o volver al panel; encabezado principal claro |

Baseline real: cuatro suites funcionales PASS (32 planificación, 19 reportes, 24 registros, 29 dashboard), pero auditoría UX FAIL en 100 de 124 observaciones. 733 ocurrencias repetidas de 9 reglas, no 733 defectos independientes: 140 cajas demasiado altas, 11 breadcrumbs rotos, 36 problemas de menú, 16 referencias ARIA, 192 contrastes y 338 controles pequeños. Baseline seguro en `tmp/care-qa/ux/baseline-results.json`, excluido de Git. Los otros hallazgos provienen de inspección visual/código. Este resultado invalida cualquier interpretación de «todo el UX ya estaba correcto» a partir de las pruebas funcionales.

## Verificación final

Auditoría ampliada: secciones de formulario abiertas a 375px, jerarquía de borrador, navegación de resúmenes/fuentes y recuperación de un error real de RPC por corte futuro. Se sumó control de logo, footer y cada enlace del menú en 320×568, barra contraída con enlaces nombrados/foco visible y menú de cuenta con teclado/Escape. La iteración intermedia aprobó todos los recorridos funcionales y las pantallas, pero conservó dos observaciones de menú con superposición/recorte. No se declararon PASS; se corrigió CSS y se recompiló. Aviso lint de ref en cleanup corregido conservando el disparador original del menú.

| Paso | Recorridos revisados | Perfiles y estados |
| --- | --- | --- |
| 1 | Equipo/capacidades, asignar/revocar, ficha/trayectoria, ingreso/pausa | Dirección y administrador técnico sin lectura clínica heredada |
| 2 | Actividad nueva, actividad cerrada/asistencia, plan compartido, Hoy, semana y compromisos | Dirección y paciente; sin convertir autorreporte en verificación profesional |
| 3 | Configuración aprobada, listado profesional/paciente, borrador/envío/corrección/revisión | Errores reales de conexión/validación, historial y textos conservados |
| 4 | Lista/editor de psicología, Recovery, psiquiatría, resúmenes y solicitudes | Publicación explícita, reserva concedida/revocada, enmienda y permiso médico revocado |
| 5 | Dashboard, valoración interna, alertas, fuentes de asistencia/reportes y pendientes | Gris/rojo manuales, filtros, tablas/gráficos, evidencias exactas, vacío N=0, error recuperable |

Primera revisión completa corregida: `ux-audit` PASS, 118 observaciones / 27 rutas-estados / 12 contextos, cero hallazgos; también 32/19/24/29 controles funcionales y limpieza. Después se agregó cobertura de barra contraída y menú de cuenta: las pruebas finales deben incluir esa corrección adicional, no reutilizar este PASS como resultado del cambio posterior.

Resultado final de seguimiento: `node scripts/care-local.mjs ux-audit` PASS, **136 comprobaciones** en **27 rutas/estados**, **12 contextos autenticados**, **0 hallazgos abiertos**. Desglose: 108 inspecciones de interfaz (27×4 anchos), 9 menús móviles, 9 barras contraídas, 9 menús de cuenta y 1 recuperación de error real. No son 136 pantallas diferentes ni una certificación de accesibilidad.

| Verificación nueva en esta revisión | Resultado real |
| --- | --- |
| `node scripts/care-local.mjs ux-audit` | PASS 136; navegador con build final, Chrome real y sesiones normales; todas las suites limpian fixtures antes de continuar |
| Recorridos incluidos en ese comando | PASS 32 planificación/permisos + 19 reportes + 24 registros + 29 dashboard = 104 controles funcionales adicionales a la inspección UX |
| `node scripts/care-local.mjs db-test` | PASS 339 SQL/RLS acumuladas, rol authenticated, rollback completo; sin suites de navegador concurrentes |
| `node scripts/patient-local.mjs db-test` | PASS 76 SQL/RLS de biblioteca, rollback completo |
| `npm run lint` | PASS final sin errores ni avisos |
| `npm run typecheck` | PASS final |
| `npm run test` | PASS final 95/95, sin tests añadidos que repitan solo el código visual |
| `node scripts/care-local.mjs build` | PASS final, Next 16.3.6 con TypeScript y rutas actuales |
| `node scripts/patient-local.mjs test` | PASS 30 E2E, código actual con Next dev, modo biblioteca conservado, invitación/recuperación/suspensión y Mailpit; limpieza propia completada |
| Limpieza independiente tras todas las suites | PASS: 0 cuentas Auth QA, 0 perfiles QA, 0 alertas/valoraciones en stack dedicado y guard `protect_last_active_superadmin` habilitado (`O`); consulta read-only y rollback. Auth cleanup adicional: `ids: []`, `completed: true` |

Las pruebas funcionales incluyen validación con foco, conservar texto/selecciones/casillas ante errores, reintento de conexión, borrador y corrección, escritura concurrente, publicación explícita, revisión exacta de evidencia, acciones que retiran una fila de su filtro, filtros por periodo y fuentes, revocación/suspensión con sesión previa y rechazo de paciente ajeno/CMS/reserva no concedida. No se recalcularon métricas ni se cambiaron denominadores/reglas clínicos.

Inspección visual realizada con capturas neutras: ficha 375, planificación/evento 1440, menú móvil 320×568 de profesional y técnico, Hoy y reporte del paciente 375, configuración de reportes 1440, reportes profesionales 320, editor de psicología 1440, dashboard/gráficos 1440, error recuperable 375 y barra contraída 1440. Las restantes combinaciones tienen capturas y comprobaciones DOM. Las capturas no reemplazan aceptación de usuarios reales.

Evidencia segura ignorada: `tmp/care-qa/ux/results.json` y JSON por contexto; PNG completos y vista inicial a 375/1440, menú móvil y barra contraída. Baseline e iteración intermedia conservados aparte. Resultados funcionales en `tmp/care-qa/{e2e,reports-e2e,records-e2e,dashboard-e2e}-results.json`, DB en `db-results.json`; biblioteca en `tmp/patient-library-qa`. Todo usa fixtures; no se incorporan esas capturas/logs ni secretos a Git.

## Alcance y límites

Cambios locales de interfaz y QA; no hay migración nueva ni cambio de Auth/RLS, roles, publicaciones o datos clínicos. Producción no se consultó ni modificó. Pruebas de recuperación/correos siguen usando Mailpit y fixtures, sin envíos reales.

44px es el objetivo táctil del producto para sus controles, no una declaración del mínimo AA universal: [W3C, tamaño mínimo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html). Contraste normal 4.5:1 y grande 3:1 según [W3C, contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); teclado/modal según [patrón de diálogo W3C](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). Guías locales Next 16.3.6 de accesibilidad y navegación leídas antes de editar.

No constituye certificación WCAG ni aceptación clínica institucional. Quedan para aceptación/QA final: lectores de pantalla y dispositivos físicos, medición con profesionales reales de los objetivos de 2–3 minutos, volumen/paginación de historiales individuales, módulos 6–11 y configuración institucional de campos/plazos/rúbricas/protocolo. No se inventan criterios para cerrar esa parte.

Conclusión: todos los hallazgos identificados en esta revisión están corregidos y verificados localmente. La base de los pasos 1–5 queda preparada para continuar el desarrollo del Paso 6. Esa conclusión se limita a los recorridos, estados y comprobaciones descritos; la aceptación institucional y el QA de volumen/dispositivos del Paso 11 permanecen pendientes.

Siguiente paso: comunicar la revisión y conservar el Paso 6 pendiente; esta solicitud no ejecuta nuevas funcionalidades del Paso 6 ni despliega cambios.
