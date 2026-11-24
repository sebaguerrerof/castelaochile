# Portal de pacientes y biblioteca terapéutica

> **Actualización vigente — 2026-10-12:** Biblioteca con creación en modal, archivo opcional y lectores privados dentro de la aplicación. Dirección/superadmin activo tiene acceso completo automático. [Publicación y pruebas](reportes/seguimiento/PANEL_WORKSPACE_BIBLIOTECA_2026_10_12.md).

Implementación del MVP, 8 de octubre de 2026; **producción activada el 9 de octubre de 2026 con autorización explícita del usuario**, en `https://www.castelaochile.cl`. Alcance: `CASTELAO_CHILE_PORTAL_PACIENTES_CODEX.md`. Estado y evidencia: `CASTELAO_PORTAL_PACIENTES_STATUS.md`.

## Activación inicial (histórico)

Vercel proyecto `castelaochile`, despliegue inicial de este rediseño `dpl_FkmoNgHHbkVM1YX9qNR84hH6BzWM`, promovido al dominio con www el 9 de octubre. Supabase `rybcqiuklmoxhcostmlf`, migración `20261008142003_patient_library.sql` aplicada en la activación inicial después de simulación y respaldo local de esquema/datos; ese rediseño no requería nuevas migraciones. `PATIENT_PORTAL_ENABLED=true`, `PATIENT_AUTH_EMAILS_ENABLED=true`, máximo de archivos 20 MB. El modo institucional `review`/noindex se conserva en este dominio de pruebas; `castelao.cl` no se modificó. La actualización y migraciones del 12 de octubre se detallan en el reporte vigente enlazado arriba.

Origen Next y Auth: `https://www.castelaochile.cl`. Redirect URLs exactas de activación de pacientes y administradores, plantillas compartidas instaladas, Email habilitado y registro público cerrado. SMTP Resend existente conservado, remitente `acceso@auth.castelaochile.cl`. El usuario realizará el primer envío externo desde el administrador: las pruebas del agente no ejecutaron SMTP externo ni invitaciones a pacientes reales.

Modelo vigente desde el 11 de octubre: **superadmin representa a Dirección y tiene gestión y lectura completas del centro automáticamente**, mientras la cuenta esté activa. Los roles se gestionan en **Equipo y usuarios**; las asignaciones clínicas en **Seguimiento → Equipo**. La antigua ruta de permisos dirige a usuarios. Crear un paciente con la casilla de correo marcada solicita su invitación; si la cuenta Auth ya existe, solicita recuperación. El equipo publica únicamente recursos reales para las audiencias previstas.

Pasaron lint, tipos, 80 tests, build local y build Vercel; 76 comprobaciones SQL en local y, durante la activación inicial, la matriz transaccional completa en remoto con rollback. El rediseño pasó 30 E2E locales con correo capturado y 9 comprobaciones reales sobre Vercel/Supabase. Estas últimas incluyen móvil, búsqueda, cancelar suspensión, alta sin correo, bloqueo de informe/archivo ajeno, PDF de 20 MB y activación mediante enlace generado sin entrega SMTP. Las cuentas, perfiles, materiales y archivos temporales se eliminaron; la limpieza se confirmó mediante consultas. El asesor de seguridad remoto no encontró problemas durante la activación inicial.

Los valores de ejemplo y flags cerrados que siguen en este documento describen preparación/rollback. No son el estado actual de las variables de producción. Registro completo de DNS/SMTP en `CASTELAO_DOMINIO_CORREOS.md`.

## Arquitectura y reutilización

Next App Router 16.3.6 y clientes Supabase SSR/servidor existentes. Todas las lecturas del portal verifican `auth.getUser()` y un perfil activo; las consultas usan sesiones normales y RLS. No hay datos ficticios de fallback. Se conservan el CMS, Auth, administrador, roles y tokens institucionales. El editor Tiptap tiene modo privado: no usa el uploader de imágenes públicas, ni incorpora medios externos. El HTML terapéutico usa una lista restringida de etiquetas sin atributos, imágenes, enlaces ni iframes, al guardar y al mostrar.

Tablas nuevas: perfiles mínimos, capacidades staff, áreas, grupos/membresías, carpetas, materiales, concesiones por audiencia, adjuntos, estado personal y auditoría. La migración solo incorpora las tres áreas institucionales; no crea pacientes ni materiales. Los tipos están en `src/types/patient-library.ts` y se integran en el contrato existente de Database.

Los RPC públicos de gestión son invoker y delegan a funciones privadas con `SECURITY DEFINER`, `search_path=''`, verificación de actor/capacidad y EXECUTE revocado a PUBLIC/anon. Los helpers privados de RLS evitan recursión. No hay INSERT/UPDATE/DELETE para clientes normales sobre las tablas; gestión y estado pasan por RPC con sus propias comprobaciones. La única finalización de archivo disponible para `service_role` recibe una referencia DB validada en servidor.

## Rutas

| Ruta | Uso |
| --- | --- |
| `/pacientes/login`, `/pacientes/activar` | Acceso, recuperación y creación de contraseña; sin registro público |
| `/pacientes` | Inicio y materiales recientes autorizados |
| `/pacientes/biblioteca` | Búsqueda, filtros y carpetas |
| `/pacientes/biblioteca/carpetas/[id]` | Carpeta y breadcrumbs autorizados |
| `/pacientes/materiales/[id]` | Texto, archivos, favoritos y primera apertura |
| `/pacientes/favoritos`, `/pacientes/perfil` | Favoritos accesibles, datos mínimos y cambio de contraseña |
| `/admin/pacientes` | Perfiles, invitaciones/recuperación y suspensión |
| `/admin/grupos-terapeuticos` | Grupos y membresías |
| `/admin/biblioteca`, `/nuevo`, `/[id]`, `/[id]/editar` | Nuevo material en modal, gestión de áreas/carpetas, edición y lectura staff; se conserva la ruta de alta independiente |
| `/admin/biblioteca/[id]/vista-previa?paciente=…` | Vista de paciente usando el resolver efectivo |
| `/api/pacientes/adjuntos` | POST: autorizar una nueva carga pendiente |
| `/api/pacientes/adjuntos/[id]` | GET: confirmar estado/versión staff; DELETE: retirar exclusivamente un intento pendiente/fallido con control de versión |
| `/api/pacientes/adjuntos/[id]/finalizar` | POST: verificar los bytes almacenados y finalizar |
| `/api/pacientes/archivos/[id]` | GET: descarga o preview autenticado |
| `/api/pacientes/estado` | POST: primera apertura por el paciente actual |

La ficha permite **Leer aquí** sin salir de la aplicación: PDF mediante PDF.js con páginas y texto accesible, imágenes mediante blob privado y Office mediante `?lectura=1` con texto escapado. Word conserva una vista de texto; Excel muestra valores guardados y PowerPoint texto de diapositivas, sin reproducir todo el diseño. Se mantiene la descarga del original. No hay visor externo ni Range: se verifica el objeto completo, acotado a 20 MB, y se transmite únicamente a la sesión autorizada. Los enlaces privados desactivan prefetch.

## Matriz de permisos

| Actor | Materiales | Gestión |
| --- | --- | --- |
| Anónimo | Ninguno | Ninguna |
| Paciente activo | Publicados para todos, sus grupos activos o concesión individual propia | Favoritos y primera apertura propios |
| Paciente suspendido | Ninguno, incluso con JWT anterior | Ninguna |
| CMS editor/viewer sin concesión | Ninguno | Ninguna terapéutica |
| Staff `manage_access` | No obtiene lectura de materiales | Perfiles, invitaciones, grupos y membresías |
| Staff `read_content` | Lectura terapéutica explícita | Lectura y vista de paciente |
| Staff `manage_content` | Lectura terapéutica y borradores | Áreas, carpetas, materiales, audiencias y archivos |
| Dirección / superadmin activo | Lectura completa de materiales, borradores y centro | Gestión automática de pacientes, biblioteca, equipo y seguimiento, sin permisos manuales adicionales |

Toda capacidad requiere además `admin_users.is_active`. Una misma cuenta puede tener perfil paciente y staff, pero el portal del paciente sigue restringido a su audiencia. La búsqueda, navegación y ficha tienen resolvers que no heredan el alcance de staff; la vista staff requiere rutas/capacidades explícitas. Un paciente por sí solo no accede al administrador.

## Audiencias, publicación y organización

Un material tiene exactamente un modo: todos, grupos o pacientes. Se guardan material y concesiones en una transacción. Un informe requiere exactamente un paciente; DB rechaza audiencia general/grupal y RPC rechaza múltiples destinatarios. Publicar exige confirmación de audiencia, cuerpo con texto o un adjunto listo, y ausencia de cargas pendientes/fallidas. Los estados borrador/archivado no son visibles a pacientes.

«Todos» incluye nuevos pacientes activos. La membresía vigente concede acceso al historial publicado de un grupo; la salida o desactivación del grupo elimina ese acceso. Cambiar audiencia/destinatarios requiere una confirmación explícita adicional. `version` bloquea guardados concurrentes y también se incrementa al completar/retirar adjuntos. Guardar un material publicado cambia inmediatamente lo visible; no existe un borrador paralelo.

Las carpetas no conceden permisos. Solo se muestran las que contienen recursos autorizados y sus ancestros. Se rechazan ciclos, profundidad superior a cuatro niveles y cambios de área incompatibles. Para trasladar un árbol se mueven primero sus hojas; para archivar una carpeta hay que trasladar sus materiales y resolver sus subcarpetas. No se archivan árboles con contenido de forma silenciosa.

Búsqueda española por título, descripción y etiquetas, nunca por cuerpos ni extracción PDF. Filtros de área, tipo y fecha de sesión; parámetros en URL, orden estable por updated_at/id y páginas de 24. Conteos y opciones del paciente se derivan de recursos autorizados. Favoritos inaccesibles dejan de mostrarse. «Nuevo» solo significa primera apertura todavía no registrada; no implica comprensión ni progreso clínico.

## Almacenamiento y carga

Bucket nuevo `patient-library`, privado, máximo 20 MB. `storage.objects` tiene una política restrictiva que bloquea lectura/listado y escrituras directas con roles anon/authenticated aunque exista otra política permisiva general. Las rutas públicas CMS solo trabajan con `content-images` y no reciben claves terapéuticas.

Flujo: el servidor comprueba staff/capacidad/origen/límite, crea registro pendiente con clave UUID aleatoria y emite un token de carga para esa clave con `upsert:false`. El navegador transfiere directamente a Supabase y solicita finalización. El servidor descarga el objeto, verifica tamaño real, extensión, firma/MIME y estructura ZIP/Office; solo entonces marca listo. El cliente no puede finalizar por RPC, elegir bucket/key arbitrarios ni sobrescribir un objeto validado. El token es de escritura, no de lectura; [Supabase lo mantiene válido dos horas](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl). Si se revoca el staff, podría terminar esa transferencia ya autorizada a un objeto pendiente, pero no finalizarla ni conceder lectura. No se persisten tokens ni URLs.

PDF, DOC, DOCX, XLSX, PPTX, JPEG, PNG y WebP; hasta cinco adjuntos activos por material. Se rechazan formatos ejecutables, HTML, SVG, macros, Office cifrado, rutas de extracción inseguras y relaciones Office externas. DOC requiere un contenedor Word válido sin streams de macros u objetos incrustados. La inspección ZIP limita cantidad, tamaños y expansión, sin escribir archivos extraídos al disco. Son comprobaciones de formato, no antivirus. La lectura PDF interna renderiza páginas y texto, sin ejecutar scripts del documento; la ruta inline alternativa conserva su CSP sandbox.

Nuevo material admite texto, un archivo opcional o ambos. Con archivo, primero guarda un borrador privado y valida la carga antes de aplicar la publicación elegida. Un fallo conserva el material para reintentar; el modal no duplica el borrador ni abandona la página de Biblioteca. La finalización del servidor reconoce a Dirección activa y conserva las autorizaciones explícitas anteriores; un paciente o cliente normal no puede invocar esa función directamente.

Reemplazar crea otra clave y conserva el archivo anterior mientras el nuevo está pendiente. Finalizar cambia la referencia efectiva al nuevo y retira el anterior en la misma transacción. Un reemplazo fallido conserva el original; retirar un intento fallido permite reintentar. Archivar conserva objetos. Retirar deja el objeto privado para limpieza controlada posterior; no hay borrado global ni automático.

Las descargas verifican perfil/capacidad y estado al iniciar y de nuevo antes de enviar. El navegador suministra únicamente el UUID de adjunto. El servidor obtiene la clave desde la fila autorizada y transmite el archivo con `private, no-store`, nosniff, noindex, nombre seguro y sin URL firmada de lectura. Suspender impide nuevas lecturas; no puede recuperar una copia ya descargada ni detener bytes de una respuesta ya iniciada.

## Identidad e invitaciones

En el administrador existente, **Pacientes → Nuevo paciente**, se ingresan nombre y correo. La opción **Enviar acceso por correo ahora** aparece marcada cuando el envío está habilitado; el botón indica **Crear y enviar acceso** o **Guardar sin enviar**, según la elección. El alta guarda primero el perfil y después solicita la invitación a Supabase Auth. Si falla el proveedor, el paciente queda guardado y puede reintentarse desde la lista. Si el envío está desactivado, se indica en el formulario y solo se guarda el perfil; el servidor rechaza también una solicitud de envío manipulada.

La pantalla **Pacientes** muestra indicadores reales, búsqueda literal por nombre/correo, filtros Todos/Por invitar/Habilitados/Suspendidos y páginas de 25 pacientes consultadas en Supabase con la sesión del administrador y RLS. El formulario de alta está en `/admin/pacientes/nuevo`, separado de la lista. En móvil, las filas se presentan como fichas y las acciones se mantienen visibles.

**Enviar acceso** invita a un paciente sin cuenta vinculada; **Enviar nuevo enlace** solicita creación/restablecimiento para una cuenta existente. Antes del envío, un diálogo muestra nombre, correo y efecto de la operación. **Suspender acceso** y **Habilitar acceso** reemplazan la casilla ambigua de estado y también requieren confirmación. Cancelar no modifica datos. Estas acciones conservan las validaciones de origen, sesión, capacidad y RPC existentes; no conceden acceso a materiales ajenos.

El estado de acceso y el de invitación son independientes: **Habilitado** permite entrar, **Enlace enviado** registra que el proveedor aceptó la solicitud, y ninguno demuestra que el paciente haya elegido contraseña o ingresado. Una solicitud en curso conserva el bloqueo de cinco minutos en servidor, con reintento disponible después; no se impone un bloqueo permanente en la interfaz.

El runner local de QA retira sus cuentas incluso cuando la última es superadministradora: el guard del CMS impide borrar esa cuenta vía Auth. La excepción de limpieza opera únicamente contra el contenedor dedicado `castelao-patient-qa`, valida el origen local, marcador del proyecto, UUID creados y correo del run, y restaura el trigger en la misma transacción. No cambia la seguridad ni el esquema de producción. La matriz SQL y las pruebas E2E se ejecutan secuencialmente para no mezclar sus fixtures.

**Permisos del equipo** (`/admin/pacientes/permisos`) está reservado a superadministradores. Reutiliza las identidades reales del módulo Usuarios para mostrar nombre/correo y tres permisos explicados: gestionar pacientes/grupos, gestionar biblioteca (incluye lectura) y ver materiales sin editarlos. Guardar permanece en esta pantalla con confirmación del resultado; los roles del CMS y los permisos terapéuticos siguen separados. No requiere nuevas migraciones ni cambios en Auth o Storage.

El alta normaliza email, conserva un perfil único y vincula Auth existente sin modificar roles CMS. Solo staff de acceso puede crear pacientes e invitar. Una invitación en curso se bloquea durante cinco minutos; los fallos quedan recuperables y el reintento reconoce una cuenta Auth creada previamente. Para cuentas existentes se envía recuperación, sin duplicar ni cambiar el rol. Se registra el resultado también ante una excepción de transporte; si el proveedor acepta el envío pero falla su registro, se pide revisar el proveedor antes de reintentar. La aceptación del envío no garantiza entrega en bandeja de entrada.

El correo contiene **Crear mi contraseña**. La confirmación valida el token de Supabase, dirige a `/pacientes/activar` y comprueba el perfil activo. El paciente define y confirma su contraseña (mínimo doce caracteres) y puede pulsar **Entrar a mi portal**. El administrador no define ni conoce esa contraseña. Para accesos posteriores se usa `/pacientes/login` con correo y contraseña. No existe registro público.

`PATIENT_AUTH_EMAILS_ENABLED=false` bloquea los envíos desde esta funcionalidad. Activarlo fuera de QA local requiere decisión operativa explícita. `/auth/confirm` intercambia token_hash en servidor y solo elige rutas fijas de activación admin/paciente: nunca usa una URL externa como destino. Los templates nuevos son compartidos y usan RedirectTo para conservar ambos flujos. Un enlace inválido/reutilizado muestra una explicación y abre Recuperar acceso. La cuenta activa se vuelve a comprobar al cambiar contraseña. El perfil reutiliza el formulario existente con contraseña actual.

Mantener **el proveedor Email habilitado** y desactivar **el registro público** son configuraciones distintas. En CLI 2.117, `[auth.email].enable_signup=true` habilita `GOTRUE_EXTERNAL_EMAIL_ENABLED` y permite login de las cuentas invitadas; `[auth].enable_signup=false` conserva `GOTRUE_DISABLE_SIGNUP=true`. Desactivar ambos impide también el login. La prueba local verifica inicio de sesión y rechazo de `signUp` por separado. En un proyecto alojado, mantener Email activo y desactivar «Allow new users to sign up».

## Privacidad y configuración

Portal/API/Auth noindex y sin caché compartida. Se excluyen de analítica tanto en cliente como en la validación del receptor, incluidas variantes de mayúsculas; sitemap filtra rutas reservadas aunque el CMS proponga una. No hay tracker en el layout privado. No se envían textos/archivos a IA, visores externos ni telemetría nueva. Auditoría guarda actor, acción, UUID y fecha, sin cuerpos, correos, tokens ni URLs.

Next 16.3 registra por defecto argumentos de Server Functions en desarrollo: se desactiva esa captura y el reenvío de consola del navegador, y se excluyen peticiones privadas/Auth/admin del log local de URLs. En el hosting externo debe configurarse además la exclusión/redacción de query strings y cuerpos en logs, APM y grabaciones de sesión; la configuración de logs de Next para desarrollo no administra logs de infraestructura en producción.

Variables: clientes Supabase existentes, `SUPABASE_SECRET_KEY` solo servidor, `NEXT_PUBLIC_SITE_URL` origen canónico exacto, Upstash existente para producción, `PATIENT_PORTAL_ENABLED=false`, `PATIENT_AUTH_EMAILS_ENABLED=false`, `PATIENT_LIBRARY_MAX_FILE_MB=20` (máximo 20). En producción los accesos sensibles fallan de forma cerrada si falta el limitador compartido. El modo review/noindex institucional se conserva.

## Activación en entorno autorizado

1. Revisar/aprobar `20261008142003_patient_library.sql`; no ejecutarla en producción por defecto. Hacer backup y confirmar las migraciones anteriores y las claves del entorno elegido.
2. En local: iniciar Docker Desktop y ejecutar `pnpm patient:local:start`. Este runner prepara `tmp/patient-supabase-local`, proyecto `castelao-patient-qa`, puertos 544xx, sin seed, y copia las migraciones y templates reales. No copia claves ni enlaces remotos y no ejecuta reset. Para detenerlo conservando la base: `pnpm patient:local:stop`.
3. Ejecutar `pnpm patient:local:status`, `pnpm patient:local:db-test` y `pnpm patient:local:test`. El runner obtiene las claves solo del stack QA y las pasa en memoria, sin mostrarlas. El E2E inicia Next en 3441, crea/limpia fixtures locales y captura invitación/recuperación exclusivamente en Mailpit (`http://127.0.0.1:54424`). No se entrega correo a destinatarios reales. No reutiliza `.env.local` para seleccionar el backend. El comando independiente `pnpm test:library:e2e` conserva el modo sin correo por defecto y requiere variables locales explícitas.
4. En el entorno externo aprobado, aplicar la migración aditiva y verificar bucket privado, RLS, grants y asesores de seguridad. La tabla de capacidades comienza vacía. Habilitar portal y conceder desde `/admin/pacientes` las capacidades necesarias como superadmin; no concederlas a todos los editores.
5. Configurar Auth Site URL/allowlist con `/pacientes/activar` y `/admin/activar`, templates compartidos nuevos, proveedor Email activo, SMTP probado, registro público desactivado y recuperación. Desactivar seguimiento/reemplazo de enlaces en el proveedor de correo. `supabase/config.toml` deja preparada esta configuración **local**; no modifica Auth remoto.
6. Configurar Upstash y origen canónico. Comprobar CORS/CSP de Storage y la carga/descarga de 20 MB y PDF en el hosting elegido. Ejecutar E2E con cuentas aisladas antes de abrir acceso real.
7. Solo con autorización de envío, activar `PATIENT_AUTH_EMAILS_ENABLED` y probar invitación/recuperación con destinatarios expresamente autorizados. Solo con autorización de despliegue, publicar el frontend.

## Operación, retención y rollback

Suspender en Pacientes y retirar membresías en Grupos. Archivar un material revoca nuevas lecturas sin borrar evidencia/archivos. Para correcciones de destinatario, archivar primero si hay duda, editar la audiencia, comprobar vista de paciente y publicar explícitamente.

La institución debe definir responsables, conservación, borrado, recuperación de backups y manejo de incidentes. No se inventan plazos legales. Una purga física debe listar únicamente objetos retirados/fallidos de este bucket, esperar la expiración de autorizaciones de carga, comprobar ausencia de referencias activas y registrar la operación. No eliminar objetos ajenos ni perfiles Auth que puedan compartir privilegios CMS.

Rollback seguro: desactivar los dos flags, revocar capacidades, conservar tablas/bucket privados y backups. No borrar tablas/objetos ni convertir el bucket en público. Volver al frontend anterior no requiere eliminar la migración aditiva. La suspensión DB sigue siendo necesaria para impedir lecturas directas autorizadas previamente; un flag del frontend no sustituye revocación RLS.

## Validación reproducible

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y `git diff --check`.

Sin Docker, instalar herramienta de QA aislada: `npm install --prefix tmp/portal-tools --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.8`; después `pnpm test:library:db`. El runner ejecuta once migraciones previas reales y la nueva sobre PostgreSQL PGlite con tablas auth/storage de prueba. Las dos migraciones de analítica con pg_cron se excluyen de este runner; no hay servicio HTTP Auth/PostgREST/Storage simulado en la aplicación.

`pnpm test:library:browser` requiere preview local en 3400 y Playwright/Chrome; valida login/HTTP reales y renderiza los mismos componentes autenticados con fixtures visuales aislados en 3401. No sustituye E2E. `CODEX_NODE_MODULES` y `PATIENT_QA_CHROME` permiten indicar runtimes. Evidencia y capturas: `tmp/patient-library-qa` (ignorado).

`pnpm patient:local:db-test` ejecuta el SQL transaccional mediante psql dentro del contenedor QA y comprueba rollback. `pnpm patient:local:test` verifica además Auth/PostgREST/Storage y el alta, creación/recuperación de contraseña mediante correos realmente capturados en Mailpit. El stack local mantiene todas las catorce migraciones, incluidas las de pg_cron. Los informes de QA no contienen claves, contraseñas ni tokens. El buzón local conserva los mensajes neutros para inspección; no habilitar reenvío/relay.

Para repetir el QA del build sin usar el backend de `.env.local`: `pnpm patient:local:build`, después `pnpm patient:local:preview` y, en otra terminal, `pnpm test:library:browser`. El preview escucha en 3400 y mantiene correo/analítica/intake desactivados. Finalizar el preview con Ctrl+C. Detener Supabase con `pnpm patient:local:stop` cuando no se necesite; conserva la base local. Los tests E2E crean y eliminan sus cuentas locales; no dejan credenciales de acceso administrativo permanente.

Documentación consultada: guías instaladas Next de autenticación, seguridad, cookies, proxy y rutas; [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/nextjs), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage](https://supabase.com/docs/guides/storage/security/access-control), [cargas autorizadas](https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl) y changelog. No se actualizaron dependencias de la aplicación.
