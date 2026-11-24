# Rediseño integral del panel de Castelao Chile

Fecha: 2026-10-11. Rama: `codex/seguimiento-terapeutico`.
Estado: implementación terminada, verificada y publicada en producción. Cierre: 2026-10-11, 12:49 America/Santiago.

## Objetivo y alcance

Renovar la presentación del panel completo manteniendo sus operaciones, datos y reglas. La capa visual compartida alcanza las 67 páginas administrativas existentes, incluidas las fichas clínicas y los editores. El acceso conserva el diseño institucional azul y la identificación de Castelao Chile.

No se cambian Server Actions, RPC, esquemas, migraciones, autenticación, roles, filtros de datos, publicaciones, audiencias ni reglas de Recovery. Dirección continúa representada por superadmin con acceso completo al centro; los tres perfiles profesionales conservan su alcance por asignación. Los formularios mantienen nombres, campos obligatorios, límites y acciones existentes.

## Etapas realizadas

| Etapa | Realizado | Pendiente |
| --- | --- | --- |
| Revisión | Componentes compartidos, rutas clínicas y CMS, formularios, navegación, estilos y guía instalada de Next.js 16.3.6 | — |
| Diseño | Sistema visual institucional: tipografía, superficies, espaciado, cards, chips, filtros, tablas, gráficos, estados vacíos y acceso; capturas locales inspeccionadas | Revisión humana en dispositivos físicos |
| Implementación | Equipo en cards; modales breves para pacientes, invitaciones, roles, asignaciones, fases, tratamiento, grupos, membresías, áreas, carpetas y consultas | — |
| Verificación | 57 controles funcionales, 192 pantallas adaptativas y 31 controles de regresión clínica PASS; guardados reales y navegación por teclado | No se verificaron individualmente las 67 páginas ni todos los modelos de teléfonos |
| Publicación | Build remoto y 8 HTTP del candidato PASS; promoción autorizada; 28 HTTP del dominio y 3 controles de entrega de estilos PASS | — |

Los registros clínicos y editores largos conservan una página completa para trabajar. Sus controles y superficies reciben el mismo diseño. En móvil, los accesos rápidos del inicio son compactos y los indicadores conservan sus valores y contexto.

## Comportamiento de los modales

- Diálogo nativo con nombre accesible, foco contenido y devolución al botón de origen.
- Escape y botón de cierre; los cambios pendientes muestran un aviso para seguir editando o cerrar conservando los campos en la pantalla actual.
- Bloqueo de cierre durante el guardado; errores visibles y conservación de campos ante validación fallida.
- Los guardados clínicos confirmados cierran el modal; las redirecciones existentes siguen funcionando.
- Scroll propio, altura dinámica, controles táctiles y animación breve. Se respeta `prefers-reduced-motion` y el área segura de la PWA.

## Hallazgos y correcciones

1. Filtros del CMS con desbordamiento a 768 px: distribución en columnas flexibles y una columna en móvil.
2. Búsqueda de asignaciones: permanece en la pantalla principal; únicamente el formulario de asignación se abre en modal.
3. Sombra lateral del menú móvil cerrado: la sombra se aplica solo al menú abierto.
4. Validación de formularios administrativos: React no vacía controles cuando la acción devuelve un error. No cambia la validación ni la escritura del servidor.
5. Prueba unitaria del aviso de auto-revocación: se conserva su texto original y la protección existente.
6. Foco de teclado en WebKit: recorrido explícito de Tab y Shift+Tab dentro del diálogo, independientemente de las preferencias del navegador.
7. Encabezado de modal móvil: se separa del cuerpo desplazable para que los controles enfocados no queden cubiertos.
8. Formularios de creación de grupos, áreas y carpetas: incluyen el identificador vacío que exige el esquema de la acción existente. No se modifica el esquema ni la operación del servidor.
9. Precarga de enlaces privados: se completa `prefetch={false}` en los enlaces del panel, como la navegación clínica existente. Se añaden 23 atributos en diez archivos del CMS/acceso, además de los enlaces compartidos y la cancelación del formulario de paciente. Se corrigen las precargas RSC canceladas de biblioteca y páginas detectadas en WebKit; las rutas y sus controles de autorización se mantienen.

## Evidencia y límites

### Pruebas ejecutadas

| Comprobación | Resultado y alcance |
| --- | --- |
| Build local y TypeScript | PASS sobre el código final |
| Unitarias | 113/113 PASS |
| ESLint focalizado | PASS en los componentes y páginas TSX modificados |
| `git diff --check` | PASS |
| Dirección y profesionales | 57 controles funcionales PASS en Chromium/WebKit; cero errores de aplicación |
| Adaptación | 192 pantallas PASS: 21 rutas de Dirección × 320/375/768/1440 px × dos motores, más inicio/agenda de tres perfiles profesionales × 375/1440 px × dos motores |
| Modales y persistencia | Foco, Tab/Shift+Tab, controles visibles, Escape, retorno de foco, campos ante error, cierre al guardar, guardado repetido a la misma URL, bloqueo durante escritura y movimiento reducido PASS |
| Acciones existentes | Guardados reales locales de paciente, rol y asignación; creación de grupo/membresía y área/carpeta PASS, con verificación en DB y sin correos |
| Regresión clínica | 31 controles PASS: borradores, finalización, reserva, publicación explícita, concurrencia, desconexión, revocación, Recovery cualitativo y navegación móvil; fixtures retiradas |
| Candidato productivo | Build remoto/TypeScript y 8 HTTP PASS |
| Dominio publicado | 28 HTTP y 3 controles de entrega del diseño de acceso PASS |

Se inspeccionaron capturas locales del inicio, equipo, CMS, grupos y modales. La revisión final incluyó inicio WebKit a 1440 px, equipo a 320 px y modal de paciente a 375 px. Las pruebas de teclado verificaron además que el control enfocado quedara visible dentro del cuerpo desplazable.

Resultados locales: `tmp/care-qa/redesign-build.log`, `redesign-unit.log`, `redesign-lint.log`, `redesign-e2e.log`, `redesign-diff-check.log`, `records-e2e-results.json` y resultados/capturas en `tmp/care-qa/director/`. Ejecución final integral: `director/results.json`, `status=PASS`, `2026-10-11T15:45:56.454Z`, `pageErrors=[]`, `cleaned=true`. Regresión clínica: `2026-10-11T15:25:17.693Z`, 31 controles, limpieza completa, sin correos.

### Publicación

- Panel: https://www.castelaochile.cl/admin.
- Despliegue: `dpl_CaQjKhDtuSFAMfNhM5VQQ5WzkuhR`, estado `Ready`, dominio comprobado después de promover.
- Candidato: https://castelaochile-h66rpxelp-sebastian-guerreros-projects.vercel.app.
- Referencia anterior para reversión: `dpl_8HyHgQthqJZbdHmwHuWNsDJb7RNs`.
- Evidencia: `tmp/care-production/redesign-final-deploy.log`, `redesign-candidate-inspect.log`, `redesign-candidate-http.json`, `redesign-promote.log`, `redesign-production-inspect.log`, `redesign-production-http.json`, `redesign-production-smoke.log` y `redesign-assets.json`.

La publicación utiliza la autorización de producción ya otorgada por el usuario. No se ejecutaron migraciones, cambios de variables, cambios de cron ni escrituras de datos clínicos en producción. Sin commit ni push. La comprobación productiva es HTTP y entrega de assets; las operaciones autenticadas se comprobaron con cuentas sintéticas locales, sin afirmar aceptación clínica con cuentas reales de producción.

Las cuentas y pacientes de QA son ficticios y locales. Los recorridos no envían correos. Se retiran al finalizar y se comprueba la protección del último superadmin. La aceptación de Dirección/superadmin sigue disponible por PWA/navegador. La emulación de tamaños y WebKit no sustituye la comprobación humana en teléfonos Android/iPhone físicos.

La rúbrica Recovery y las políticas institucionales continúan en su estado anterior; este rediseño no las aprueba ni activa cron care. Pendientes: recorrido humano de Dirección/superadmin en Android/iPhone físicos, aprobación de rúbrica, criterios institucionales y políticas de urgencias/custodia. La PWA por navegador ya permite el recorrido; no se requiere una plataforma adicional para aceptar.
