# Castelao Chile — Portal de pacientes y biblioteca terapéutica

Fecha: 8 de octubre de 2026. Brief de implementación para Codex.

## 1. Rol y misión

Actúa como Tech Lead y Senior Full Stack Engineer especializado en Next.js, TypeScript, Supabase, autorización por recurso y UX/UI de portales privados. Implementa una biblioteca de materiales terapéuticos para pacientes dentro del proyecto existente de Instituto Castelao Chile. Trabaja con código real, migraciones versionadas, pruebas de aislamiento y documentación operativa. Avanza por etapas hasta completar el MVP; no te detengas en una propuesta o en una interfaz sin backend.

Antes de editar, lee AGENTS.md, el resumen de continuidad del 08/10/2026, la documentación del repositorio y el código pertinente. El resumen es una referencia histórica: confirma el estado actual y las versiones instaladas. Consulta la documentación local de Next en `node_modules/next/dist/docs/` y la documentación oficial actual de Supabase antes de implementar sus APIs. No afirmes que un requisito está realizado sin evidencia.

## 2. Contexto que debes conservar

El proyecto tiene web institucional, CMS, blog/noticias, profesionales, consultas, usuarios y analítica. Según el resumen, utiliza Next.js App Router, React, TypeScript estricto, Tailwind, Supabase Auth/PostgreSQL/Storage, Tiptap, Zod, saneamiento HTML y Upstash. Verifica las versiones en package.json y lockfile; no actualices dependencias por defecto.

Reutiliza clientes Supabase, componentes, validaciones y design system. Inspecciona `src/lib/auth/admin.ts`, `src/proxy.ts`, los componentes admin, repositorios CMS, acciones, migraciones y tests. Hay roles administrativos `superadmin`, `editor` y `viewer`, basados en `admin_users` activo. Actualmente no se documenta registro público de pacientes.

Los medios institucionales utilizan `content-images` y endpoints capaces de emitir URLs para contenido público. Los archivos terapéuticos deben tener un bucket privado separado y autorización propia: jamás circular por esos endpoints públicos.

La analítica pública excluye admin/api, pero debes añadir explícitamente todas las rutas del portal, sus variantes y las pantallas de acceso. Preserva el modo review/noindex y el comportamiento de la web pública.

## 3. Resultado esperado y alcance MVP

Crear un área privada estilo Drive: el paciente inicia sesión, entra a su biblioteca, navega carpetas y encuentra actividades, guías, ejercicios, resúmenes e informes que el equipo haya publicado para él. No requiere cuenta ni integración de Google Drive.

Áreas iniciales:

1. Terapia grupal.
2. Terapia psicológica.
3. Coaching Recovery.

Cada área puede contener subcarpetas por tema, sesión o fecha. Los nombres son editables. El equipo puede agregar otras áreas sin modificar código. Una carpeta de ejemplo puede ser «Terapia grupal / Octubre / Ejercicio espejo»; no cargues materiales terapéuticos inventados en producción.

El MVP incluye acceso por invitación, usuarios pacientes, grupos, carpetas, materiales con archivos o texto, publicación, asignación de destinatarios, búsqueda, filtros, lectura y descarga autorizada. Incluye favoritos personales y un indicador «nuevo» basado en la primera apertura por usuario, sin equipararlo a comprensión, cumplimiento o progreso clínico.

Fuera del MVP: expediente clínico completo, diagnósticos estructurados, notas internas de profesionales, chat, videollamadas, IA sobre documentos, pagos, entrega de tareas por pacientes, notificaciones externas y acceso de familiares. No habilites cargas ni edición de contenido por pacientes. Los informes solo entran cuando han sido preparados explícitamente para compartir con su destinatario.

## 4. Experiencia del paciente

Propón y adapta a las convenciones existentes:

| Ruta | Función |
| --- | --- |
| `/pacientes/login` | Inicio de sesión y recuperación de acceso. |
| `/pacientes` | Inicio con acceso a biblioteca y materiales recientes autorizados. |
| `/pacientes/biblioteca` | Carpetas raíz, búsqueda y filtros. |
| `/pacientes/biblioteca/carpetas/[id]` | Contenido accesible de una carpeta y breadcrumbs. |
| `/pacientes/materiales/[id]` | Ficha, texto saneado, archivos y descarga. |
| `/pacientes/favoritos` | Favoritos propios todavía accesibles. |
| `/pacientes/perfil` | Datos básicos, cambio/recuperación de contraseña y cierre de sesión. |

Diseña sidebar, topbar, ruta activa, breadcrumbs, buscador y cambio entre cuadrícula/lista. Muestra icono de tipo de archivo, título, descripción, área y fecha de sesión cuando exista. Mantén la navegación sencilla en móvil, con tarjetas legibles y filtros accesibles.

Filtros: área terapéutica, tipo de material y fecha de sesión. Búsqueda MVP por título, descripción y etiquetas; no indexar cuerpos de informes personales ni extraer texto de PDFs por defecto. Paginar en servidor con orden estable; preservar filtros en URL sin enviar estos parámetros a analítica. Buscar solo entre recursos autorizados, incluidos resultados, conteos y facetas.

Debe haber skeletons, estado vacío, error recuperable y feedback al guardar favoritos. Una apertura revocada debe mostrar un mensaje neutro que no confirme la existencia de documentos ajenos. No mostrar listado de compañeros, pacientes ni destinatarios de un material compartido. Evitar el botón «Compartir enlace»; copiar una URL nunca concede acceso.

## 5. Gestión desde el administrador

Agregar módulos al shell existente, visibles según permisos:

| Módulo propuesto | Funciones |
| --- | --- |
| `/admin/pacientes` | Crear/invitar, vincular cuenta, activar/suspender acceso y gestionar grupos. |
| `/admin/grupos-terapeuticos` | Crear grupos y mantener membresías activas. |
| `/admin/biblioteca` | Carpetas, listado, búsqueda y filtros de materiales. |
| `/admin/biblioteca/nuevo` | Crear texto y adjuntos con audiencia explícita. |
| `/admin/biblioteca/[id]/editar` | Editar, revisar destinatarios, publicar y archivar. |

El formulario incluye título, descripción, área, carpeta, tipo (actividad, guía, resumen, informe, ejercicio u otro), fecha de sesión opcional, etiquetas, cuerpo enriquecido opcional, adjuntos, audiencia y estado. Reutiliza Tiptap y saneamiento si resultan adecuados.

Estados: borrador, publicado, archivado. Fecha de sesión es descriptiva, no una programación de publicación. Solo publicados son visibles a pacientes. Exige al menos cuerpo o un adjunto listo. No heredar inadvertidamente permisos al mover materiales de carpeta. Mostrar audiencia efectiva antes de publicar; toda ampliación posterior exige una acción explícita en el editor.

Informe personal: exige destinatario individual; impide asignarlo a «todos» o grupos. No habilitar preview pública. La vista previa del personal debe indicar «vista de paciente» y comprobar el mismo resolver de permisos que usa el portal.

El staff puede guardar borradores, publicar, archivar y reemplazar adjuntos mediante un flujo consistente. Usa `updated_at` o versión para evitar sobrescrituras concurrentes. Documenta claramente si guardar una edición publicada modifica inmediatamente lo visible; no simules un borrador separado si no existe.

## 6. Identidad, cuentas y permisos

Reutilizar el proyecto Supabase Auth. Separar perfil de paciente, privilegios de staff y roles CMS. Una cuenta paciente no debe entrar a `/admin`; un editor CMS no obtiene acceso terapéutico por su rol editorial. Admitir coexistencia de perfiles solo con concesiones explícitas.

Para la biblioteca, definir permisos nuevos independientes: gestión de acceso/grupos, gestión de contenido y lectura staff autorizada. `superadmin` puede concederlos; cualquier acceso transversal que reciba debe ser explícito en código y documentado. `editor` y `viewer` no reciben acceso por defecto. Si el modelo actual necesita capacidades adicionales, extiéndelo conservando sus garantías.

Alta por invitación, sin registro público. El flujo debe ser idempotente y recuperar invitaciones fallidas. Resolver cuentas existentes sin alterar sus roles; normalizar correo y garantizar vínculo único con Auth. Crear/revocar membresías solo en servidor y con autorización. No usar `user_metadata` editable para decidir acceso.

Verificar cuenta y perfil activo en rutas, acciones, APIs y RLS. Suspender un paciente o quitarlo de un grupo impide nuevas lecturas y descargas aun con JWT previo. No confiar solo en claims que puedan quedar obsoletos ni en ocultar botones. Redirecciones de login/recuperación deben admitir únicamente destinos internos válidos.

## 7. Audiencias y reglas de carpetas

Cada material tiene exactamente un modo de audiencia:

- Todos los pacientes activos.
- Uno o varios grupos terapéuticos activos.
- Uno o varios pacientes específicos activos.

La visibilidad depende de publicación, perfil activo y audiencia efectiva. La membresía vigente concede acceso al historial publicado del grupo; al salir del grupo se pierde ese acceso salvo concesión individual independiente. Documenta esta regla para operación. La audiencia «todos» incluye nuevos pacientes activos; debe indicarse al publicar.

Las carpetas organizan; no conceden permisos. Mostrar una carpeta y sus ancestros solo si contienen algún recurso autorizado para el paciente. No filtrar nombres de carpetas vacías ajenas, conteos, IDs o breadcrumbs. No admitir ciclos; límite inicial de profundidad: cuatro niveles. Archivar una carpeta con contenido exige un flujo explícito de traslado o archivo de descendientes, sin recursos publicados inaccesibles por accidente.

## 8. Modelo de datos propuesto

Los nombres son orientativos: ajustar al esquema real sin duplicar tablas equivalentes.

| Entidad | Información y restricciones principales |
| --- | --- |
| `patient_profiles` | ID, `auth_user_id` único, nombre de presentación, estado y timestamps; mínimos datos personales. |
| `therapy_groups` | Nombre, descripción no clínica, estado. |
| `therapy_group_memberships` | Grupo/paciente, estado; combinación única. |
| `therapeutic_staff_permissions` | Cuenta staff y capacidades concedidas; escritura privilegiada. |
| `therapy_areas` | Nombre, orden, estado; tres áreas iniciales. |
| `patient_library_folders` | Área, padre nullable, nombre, orden, estado. Validar árbol y coherencia de área. |
| `patient_library_materials` | Carpeta/área, título, descripción, tipo, cuerpo saneado, etiquetas, fecha de sesión, audiencia, estado, autor y versión. |
| `patient_library_group_grants` | Material/grupo; único, válido solo para audiencia grupos. |
| `patient_library_patient_grants` | Material/paciente; único, válido solo para audiencia individual. |
| `patient_library_attachments` | Material, objeto privado único, nombre original saneado, MIME detectado, bytes, estado de carga y timestamps. |
| `patient_library_user_state` | Paciente/material único, favorito y primera apertura; modificaciones propias. |
| Auditoría existente o específica | Actor, acción, recurso y timestamp; sin cuerpo, diagnósticos, tokens o URLs firmadas. |

Índices sobre vínculos de usuario, membresías, destinatarios, estados y paginación. FK y constraints para integridad. Guardar material y audiencia en una transacción. El resolver de acceso debe ser consistente entre consultas, RLS, archivos y vista previa. No introducir tablas que queden expuestas antes de tener grants y RLS correctos.

## 9. Archivos, vistas y descargas

Usar un bucket terapéutico privado nuevo. Guardar claves de objeto en DB, nunca URLs firmadas persistidas. Nombres de objeto aleatorios, sin nombres/correos de pacientes ni títulos clínicos. No reutilizar imágenes o archivos publicados en el CMS.

MVP: PDF, DOCX, XLSX, PPTX, JPEG, PNG y WebP; límite inicial configurable de 20 MB por archivo y cinco adjuntos por material. Preview inline para PDF e imágenes; Office se descarga. Si el navegador no permite preview, ofrecer descarga autorizada y mensaje claro. No convertir documentos ni integrar visores externos que reciban archivos privados.

Validar extensión, MIME detectado, tamaño real, firma del formato y nombres en servidor; no confiar en `Content-Type`. Rechazar HTML, SVG, ejecutables, macros y archivos no soportados. Para formatos ZIP/Office limitar inspección y evitar descompresión insegura. Mostrar fallo de carga/reintento y bloquear publicación de adjuntos pendientes o inválidos. No presentar estos controles como antivirus; documentar el estado real de cualquier escaneo adicional.

Para recursos personales, preferir un endpoint autenticado que compruebe permisos actuales y transmita el objeto desde el servidor, con `Cache-Control: private, no-store`, nombre seguro y cabeceras de tipo. Si preview PDF requiere Range, implementarlo de forma autorizada o utilizar una alternativa controlada con tamaño acotado.

Si se opta por URLs firmadas, explicar el acceso residual hasta expiración, usar TTL corto y comprobar permisos antes de emitirlas. No prometer revocación inmediata de una URL previamente firmada ni recuperación de una copia descargada. Ninguna ruta puede firmar por recibir solo un bucket/key del cliente. Proteger también `storage.objects` contra lectura/listado directo que eluda el portal.

Carga: crear autorización/registro pendiente, subir a una ruta controlada, verificar el objeto y finalizar. Una carga fallida no debe producir material aparentemente disponible. Reemplazar con un objeto nuevo, conmutar referencia y limpiar después; no sobrescribir silenciosamente una URL previa. Archivar conserva adjuntos; borrar físicamente requiere comprobar referencias y registrar la operación. No hacer limpieza global de medios ajenos.

## 10. Privacidad técnica

Todas las rutas del portal, incluidos previews y archivos, son privadas, noindex y excluidas de sitemap, analítica pública y prefetch/cache compartidos. Revisa que el consentimiento o eventos públicos no capturen acceso, búsquedas, favoritos ni materiales; protege también el HTML de login y redirecciones contra cache indebida.

No enviar contenido terapéutico a IA, telemetría, grabación de sesiones ni servicios externos. No incluir PII en logs, URLs, errores o auditoría. La búsqueda privada no debe aparecer en métricas públicas. Usar HTTPS, controles de origen en mutaciones, rate limit de accesos sensibles y secretos solo servidor.

Definir operación de suspensión, revocación, retención, borrado y recuperación; si faltan decisiones institucionales, documentarlas sin inventar plazos legales ni afirmar cumplimiento normativo. El MVP es distribución privada de material, no historia clínica certificada.

## 11. Diseño y accesibilidad

Reutilizar tokens institucionales: azul `#0079be`, naranja `#da8a1b`, gris `#868685`, PT Sans para títulos y configuración existente de lectura. Verificar contraste real; naranja no debe usarse como texto pequeño sin validación. Utilizar componentes existentes antes de instalar paquetes.

Drive sirve como referencia funcional: carpetas, lista/cuadrícula, breadcrumbs, filtros y ficha; la identidad visual es Castelao. Estados activos, foco visible, navegación por teclado, labels, diálogos accesibles, avisos de resultado y respeto por movimiento reducido. Verificar móvil desde 320 px y escritorio. Usar ejemplos neutros solo en entorno de prueba.

## 12. Etapas de ejecución

1. Auditar repo y registrar hallazgos, archivos a modificar, esquema y matriz de permisos. Confirmar límites de cliente/servidor y comportamiento de proxy/Auth.
2. Implementar migraciones aditivas, perfiles, invitaciones, grupos y capacidades staff. Probar RLS antes de construir sobre permisos inseguros.
3. Implementar carpetas, materiales, audiencias, almacenamiento privado y acciones admin, con publicación transaccional.
4. Construir portal conectado a datos reales, búsqueda autorizada, filtros, vista/descarga, favoritos y perfil.
5. Ejecutar pruebas de aislamiento, regresión, build y revisión visual. Corregir fallos y actualizar documentación.

Trabaja en una rama nueva siguiendo la convención del repo; no asumas que la rama histórica es la actual. Continúa autónomamente con cambios locales reversibles. Preparar migraciones no equivale a aplicarlas remotamente. No enviar invitaciones reales, modificar pacientes/grupos productivos, aplicar migraciones remotas, hacer push o desplegar salvo autorización explícita para esas operaciones. Completa primero la implementación y validación local para que cualquier paso productivo pendiente sea concreto.

## 13. Pruebas y criterios de aceptación

Preparar fixtures exclusivamente en local/entorno aislado: paciente A en grupo 1, paciente B en grupo 2, cuenta suspendida, staff terapéutico y editor CMS sin permiso terapéutico. Probar por UI, endpoints y consultas directas con sesiones normales, sin usar service role para demostrar RLS.

- A y B ven material general y el de sus grupos; un informe individual de A es inaccesible para B.
- Cambiar UUID, consultar DB/Storage directamente, buscar, contar, paginar, abrir breadcrumbs o favoritos no filtra recursos ajenos.
- Borradores, archivados, cargas pendientes y contenido de usuarios suspendidos no son accesibles; la suspensión y salida del grupo surten efecto con sesión previa.
- Editor/viewer CMS no gestionan ni leen biblioteca por defecto; paciente no accede a admin ni concede roles/membresías a sí mismo.
- Reasignar audiencia, publicar informe individual, mover carpetas y editar concurrentemente preservan integridad y permisos.
- Carga inválida, archivo grande, extensión falsa, recuperación fallida y reemplazo interrumpido tienen estados claros y no exponen adjuntos.
- Recuperación de contraseña, invitación y cuenta existente funcionan sin escalada de permisos ni open redirect.
- No hay captura de analítica pública en portal, API privada, login ni flujo autenticado.
- Web pública, CMS, blog, imágenes y analítica existente mantienen su funcionamiento.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` pasan; ejecutar tests DB/RLS apropiados y documentar cualquier prueba bloqueada por entorno.
- Verificar grid/lista, búsqueda, PDF, descarga, teclado y móvil. No afirmar QA remoto ni pruebas manuales que no se hayan ejecutado.

El MVP está listo cuando un staff autorizado puede invitar un paciente, publicar un material para su grupo y un informe individual, y el paciente puede encontrarlos y abrirlos mientras otra cuenta no autorizada no puede acceder ni descubrirlos.

## 14. Documentación y entrega

Crear `docs/CASTELAO_PORTAL_PACIENTES.md` (arquitectura, rutas, permisos, almacenamiento y operación) y `docs/CASTELAO_PORTAL_PACIENTES_STATUS.md` (realizado, pendiente, pruebas y bloqueos). Añadir variables al ejemplo de entorno sin valores secretos y documentar migraciones, configuración Auth, bucket y rollback seguro. No inventar credenciales ni IDs de proyecto.

Mantener este brief como alcance; separar requisitos de estado implementado. Al terminar, informar cambios, evidencia de tests, riesgos reales y pasos exactos que quedan para activación. Si falta configuración externa, completa lo que pueda verificarse localmente y deja instrucciones precisas, sin simular producción ni introducir fallback con datos ficticios.
