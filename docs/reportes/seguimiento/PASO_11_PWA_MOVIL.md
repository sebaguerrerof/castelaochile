# Paso 11 — suplemento PWA y adaptación móvil

Fecha / entorno / rama / commit: 2026-10-10, America/Santiago; QA local castelao-patient-qa, rama codex/seguimiento-terapeutico, base 4fbf785, sin commit.

Estado: Validado localmente, base PWA y alcance automatizado. Instalación y aceptación física/humana pendientes. Este suplemento actualiza la decisión posterior del usuario sobre quién acepta y qué plataforma se usará; no reabre ni convierte los resultados históricos de PASO_11 en pruebas nuevas.

Objetivo y requisitos: §5/14/18/19. Dirección siempre valida y acepta todos los recorridos con su cuenta/correo actual o superadministrador; Android e iPhone, PWA/navegador, son el objetivo definido. La firma y las pruebas físicas continúan pendientes. Se conserva Auth, permisos, panel y diseño institucional; no se concede acceso clínico por responsabilidad de aceptación.

## Implementación local

- Manifiesto `/manifest.webmanifest`, iconos `/icon/192`, `/icon/512` y `/apple-icon` (180). PNG derivados mediante Next ImageResponse del archivo institucional existente, completo y sin reconstruir la marca. Generación estática en build. Inicio `/`, alcance `/`, nombre Castelao Chile, modo standalone; sin orientación forzada.
- Metadatos móviles de Next 16, viewport con márgenes seguros y redimensionamiento progresivo por teclado en navegadores compatibles; ampliación habilitada. No se añade un segundo inicio de sesión ni datos de usuario al manifiesto.
- Panel y portal: márgenes seguros para notch/barra de inicio, campos de 16 px en móvil/táctil, alturas con fallback, nombre del paciente que puede envolver, barra lateral del paciente desplazable en pantallas horizontales cortas. Menú administrativo y capacidades existentes conservados.
- Inicio público y su menú: márgenes seguros, campos móviles y aviso de privacidad con límites de pantalla. Formularios care: columnas con mínimo cero y límites explícitos para controles nativos; se conserva el select HTML con flecha institucional visible y el selector de fecha nativo.
- No hay service worker, caché clínica offline, cola de escritura ni push. Se necesita conexión para obtener datos actuales y confirmar escrituras. Instalación manual y experiencia standalone en teléfonos físicos aún no verificadas.
- Auditor `qa-care-mobile.mjs`, invocado por las suites existentes y `care-local.mjs mobile-audit`. Chromium y WebKit, toque, sesiones Auth normales, casos con formularios y métricas reales del entorno neutral. Los propietarios de fixtures ejecutan su limpieza; sin migraciones ni cambios de Auth/RLS.

Rutas de usuario existentes: `/admin/login`, `/pacientes/login`, configuración/reportes de dirección, reportes/compromisos del paciente, panel/alertas, indicadores colectivos/individuales y fuentes, autonomía/familia. No se construyeron pantallas paralelas.

## Pruebas y evidencia

366 controles móviles Chromium/WebKit en 20 rutas/estados y seis contextos; 149 comprobaciones UX en diez contextos; 101 recorridos funcionales (33 Recovery/familia, 20 reportes y 48 dashboard/métricas), todos PASS y sin hallazgos. Build/tipos integrados, lint y 99 unitarias PASS (cuatro nuevas de CSP). No sumar esta regresión parcial a los 232/424 históricos como funciones nuevas. La compilación final terminó a las 18:32 UTC; las seis matrices móviles, diez contextos UX y tres suites funcionales tienen fecha posterior, comprobada por el resumen independiente con hashes. Chromium usa Chrome 155 instalado; WebKit 26.5 de la versión existente de Playwright. No son pruebas de versiones mínimas antiguas.

Matriz ejecutada del auditor: 320×568, 360×800, 390×844, 430×932, 844×390, 932×430, ventana reducida 390×320, áreas seguras simuladas en horizontal y vertical. Verifica carga autorizada, desbordamiento, campos/fuente mínima, zoom habilitado, menú táctil y navegación alcanzable, texto conservado al reducir la ventana, manifiesto/iconos/metadatos. La ventana reducida no reproduce el teclado del sistema; las variables de área segura se inyectan solo en QA, no son un notch físico.

Inspección visual realizada: 24 capturas actuales, comprobadas posteriores al build final y registradas por hash en visual-manifest.json; formularios/login, gráficos con tablas, fuentes, alertas, autonomía/familia, compromisos a 320 px y menú público con áreas seguras. Campos, etiquetas, acciones y datos visibles dentro de sus contenedores en estas muestras. No es una revisión de todos los modelos de teléfono.

Limpieza independiente de solo lectura: 21 conteos de fixtures y cuatro recursos propios a cero, guard superadministrador O, cinco tablas de jobs con RLS, bucket care-informs privado/5 MB, cron propio inactivo y worker no ejecutable por authenticated/service_role.

Evidencia ignorada: `tmp/care-qa/mobile`, resultados y capturas neutrales; regresión de las suites propietarias en `tmp/care-qa`. Resultados de SQL, restauración, carga, PDFs y otras suites de PASO_11 son históricos y no se vuelven a contar como controles nuevos en este suplemento.

## Fallos intermedios

Docker apagado impidió el primer arranque: se inició Docker Desktop y se comprobó salud de los seis contenedores del stack QA. El primer intento de la pauta móvil esperaba el nombre antiguo apple-mobile-web-app-capable; la guía y código de Next 16 confirman mobile-web-app-capable. Se corrigió la prueba, sin cambiar la implementación. El siguiente intento encontró el menú sin activar en WebKit: se añadieron esperas de hidratación, diálogo abierto y cierre, pero la tercera ejecución confirmó que no era solo sincronización. El diagnóstico independiente del login registró SSL connect error: WebKit aplicaba upgrade-insecure-requests a los recursos del localhost HTTP y no cargaba JavaScript. next.config.ts excluye únicamente esa directiva cuando CARE_LOCAL_QA=true, sitio exacto http://localhost:3450 y Supabase local 127.0.0.1:54421 coinciden. Cuatro pruebas comprueban que las otras combinaciones conservan HTTPS y el resto de CSP. Los intentos fallidos retiraron sus fixtures; no se cuentan como suites aprobadas.

La captura completa de un indicador superó 32767 px y WebKit no pudo generarla: se pasó a capturar la zona visible del contenido, manteniendo los controles de ancho sobre toda la página. La medición del menú público tras girar coincidía con desplazamiento suave; la comprobación independiente de ambas geometrías pasó y el auditor espera layout estable y desplazamiento instantáneo. La retención de texto de una enmienda se prueba con primer toque/foco, escritura y luego reducción de ventana; el intento que introducía texto antes del primer toque falló. No se cambió la persistencia por ese fallo de secuencia.

Hallazgo real: nuevos registros de autonomía/familia en WebKit desbordaban a 320/360 px. Diagnóstico inicial: scrollWidth 364 con viewport 320; el campo de selección de sesión tenía 243 px de caja y 325 px de contenido. La cuadrícula con mínimo cero y los límites/apariencia de controles redujeron cuatro fallos a dos a 320 px, pero no resolvieron el texto nativo del select. La comparación aislada confirmó que overflow/text-overflow sobre el propio select evita que ese texto se dibuje fuera: se conserva el control HTML, sus opciones completas al abrirlo, etiquetas y selector de fecha. No se oculta el desbordamiento global ni se elimina contenido para aprobar el control. La repetición completa sobre el build final pasó sin esos desbordamientos. Los intentos fallidos y el diagnóstico parcial se conservan como tales, separados del agregado normal; el modo experimental de diagnóstico se retiró del auditor final.

## Migraciones, permisos y datos

Sin migración nueva ni cambio de Auth/RLS. La excepción HTTP del CSP está limitada al triple marcador de QA local; los destinos restantes conservan upgrade-insecure-requests. Ninguna cuenta recibe capacidades adicionales. Las suites propietarias verifican guardado real, concurrencia, revocación y suspensión con sesiones ordinarias; el auditor móvil reutiliza esas identidades y no envía sus textos de prueba.

Sin cambios a fórmulas, denominadores, exclusiones o rúbricas. Gráficos colectivos/individuales y trayectoria cualitativa conservan fuentes, n/N, versiones, tablas alternativas y enlaces autorizados. Los fixtures aprobados de rúbrica utilizados en QA no equivalen a una rúbrica institucional aprobada. El alcance del suplemento es presentación y base PWA.


## Comandos ejecutados y resultados de esta revisión

| Comando / comprobación | Resultado real |
| --- | --- |
| node scripts/care-local.mjs build | PASS, TypeScript integrado y rutas estáticas de manifiesto/iconos |
| pnpm lint / pnpm test | PASS; 99 unitarias, cuatro nuevas para las guardas de CSP |
| node scripts/care-local.mjs mobile-audit | PASS; tres suites secuenciales, 101 funcionales + 366 móviles + 149 UX, con limpieza propietaria |
| Python incluido: tmp/care-qa/mobile/close-proof.py | PASS; fechas posteriores al build, resultados sin duplicados y hashes de las seis matrices |
| node tmp/care-qa/mobile/cleanup-proof.mjs | PASS; consulta read-only al contenedor marcado, 21 conteos + cuatro recursos a cero, guard/RLS/bucket/cron/worker |
| Python incluido: contact-sheets.py e inspección de sus tres láminas | 24 capturas posteriores al build, inspeccionadas visualmente y con hashes |
| node --check de scripts modificados; git diff --check | PASS; sin errores de sintaxis/diff |

| Contexto móvil | Controles finales |
| --- | ---: |
| reports-staff, incluye accesos y manifiesto/iconos/menú público | 84 |
| reports-patient | 38 |
| metrics-direction | 72 |
| dashboard-direction | 38 |
| recovery-family-staff | 116 |
| recovery-family-patient | 18 |

Resumen verificable: tmp/care-qa/mobile/final-validation.json, results.json, cleanup-validation.json y cleanup-verification.txt. Las tres suites mantienen sus propios resultados E2E/cleanup. Diez contextos UX se contrastan individualmente: el agregado general de 33 contextos de PASO_11 conserva evidencia histórica y no se presenta como nueva ejecución completa. Capturas y diagnósticos neutrales permanecen ignorados, sin archivos clínicos en Git.

## Pendiente y siguiente paso

Dirección debe ejecutar y firmar la pauta ACEPTACION en Android/iPhone físicos, navegador y pantalla de inicio, incluidos modelos pequeños y de menor capacidad: instalación, teclado real, giro, notch, ampliación, sesión y conexión. WebKit automatizado en Windows no equivale a Safari en un iPhone. No puede certificarse cualquier modelo/SO mediante estos casos.

Compatibilidad antigua todavía pendiente: el stack existente Next 16/Tailwind 4 establece Chrome 111+ y Safari 16.4+. Se verificaron la guía local de instalación de Next y la [documentación oficial de Tailwind](https://tailwindcss.com/docs/compatibility). Estos mínimos del proveedor no son una aceptación del cliente de una exclusión de dispositivos. Si se usan versiones anteriores, hace falta resolver su compatibilidad antes de aceptar ese alcance; no se cambió de framework ni se certificaron versiones mínimas con un WebKit reciente.

Siguen pendientes protocolo de urgencias, política de retención/respaldo, Recovery aprobado y criterios de alertas reiteradas/atraso profesional. No se inventan reglas ni contactos. Lo construido permanece local; sin producción, deploy, push, correos reales o activación de cron. La responsabilidad y plataforma ya están definidas: no volver a preguntarlas, registrar únicamente la ejecución pendiente y versiones de equipos usadas.
