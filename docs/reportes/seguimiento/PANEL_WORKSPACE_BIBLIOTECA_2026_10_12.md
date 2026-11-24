# Espacio de trabajo del panel y lectura de Biblioteca

Fecha: 2026-10-12, America/Santiago. Estado: implementación, QA y publicación completados.

## Realizado

- Barra superior a todo el ancho con marca institucional, búsqueda real de secciones, accesos rápidos y cuenta. Atajo Ctrl/Cmd K, cierre por Escape y retorno del foco. El buscador reutiliza las mismas secciones autorizadas del menú y no consulta registros clínicos.
- Menú lateral claro, selección en azul, iconos coherentes, separación entre centro y sitio web, plegado persistente y navegación móvil con bloqueo del fondo y recorrido de teclado compatible con WebKit.
- Superficie de trabajo blanca, títulos más compactos, tarjetas, filtros y estados unificados con los colores institucionales. Tablas con encabezados claros, filas con estado de interacción y acciones visibles; listados administrativos y Biblioteca adaptados a tarjetas en pantallas pequeñas.
- Nuevo material se abre en modal sin abandonar Biblioteca ni perder sus filtros. Adjunto opcional de hasta 20 MB; conserva texto, destinatarios, borrador/publicación y confirmación explícita. Validación fallida conserva el borrador y permite reintentar sobre el mismo material.
- Lectura privada dentro del portal: PDF paginado con canvas y texto accesible, imágenes mediante blob privado, DOC/DOCX como texto, XLSX como valores guardados y PPTX como texto de diapositivas. Se conserva la descarga del original. No se envían documentos a un visor externo.
- Los archivos se cargan mediante autorización de escritura a Storage privado, se validan en el servidor y después se publican. El archivo se elimina de FormData antes de enviar la acción de guardado: la transferencia no atraviesa el límite de Server Actions.
- La carga de Dirección detectó un control antiguo que requería una fila manual de permisos. Se corrigió la finalización para reconocer al superadmin activo, tal como el panel y RLS ya lo reconocían. La función sigue disponible únicamente para el servidor y comprueba el estado vigente del usuario.

Se mantienen rutas, autenticación, audiencias, alcance clínico, confirmaciones de publicación, límite de cinco adjuntos y revocación del paciente. La actualización visual no altera registros ni reglas clínicas.

## Migraciones y dependencias

1. `20261011174209_care_library_document_reading.sql`: añade `application/msword` al constraint y a los formatos del bucket privado existente, sin cambiar políticas ni grants.
2. `20261012151839_care_library_upload_roles.sql`: alinea la validación de finalización con Dirección activa; conserva compatibilidad con autorizaciones explícitas existentes y deniega cuentas inactivas.

Dependencias fijadas en lockfile: `pdfjs-dist@6.4.299`, `word-extractor@1.0.4`, `cfb@1.2.2` y `saxes@6.0.0`. El postinstall copia worker, mapas, fuentes y WASM de PDF.js al mismo origen. Vercel incluye únicamente ese script auxiliar, sin herramientas ni fixtures de QA.

## Verificación

| Comprobación | Resultado |
| --- | --- |
| Build local y TypeScript sobre código final | PASS |
| Unitarias | 118/118 PASS, incluidas cinco nuevas de lectura/validación |
| ESLint focalizado | Sin errores; un aviso de imagen nativa para la vista privada con blob |
| `git diff --check` | PASS |
| Finalización / roles en PostgreSQL real | 10 comprobaciones PASS; rollback completo |
| Biblioteca y espacio de trabajo en Chromium/WebKit | 34 funcionales y 64 pantallas PASS; cero errores de aplicación |
| Regresión integral de Dirección/profesionales | 69 funcionales y 208 pantallas PASS; cero errores, fixtures retiradas |
| Tamaños | 320, 375, 768 y 1440 px; incluye modal y lector PDF del paciente |
| Publicación sin archivo | Guardado real, modal cerrado, misma ruta, texto visible para paciente autorizado PASS |
| Publicación de archivo | Storage real y validación previa; borrador y archivo pendientes inaccesibles para pacientes PASS |
| Lectores | PDF, DOC, DOCX, XLSX, PPTX y PNG abiertos sin cambiar de página; Office escapado y sin scripts PASS |
| Fallo de carga / revocación | Reintento sin duplicar material, intento fallido retirado y suspensión efectiva con sesión existente PASS |
| Teclado | Búsqueda, Escape, foco de modal y menú móvil en ambos motores PASS |
| Fixtures | Usuarios, pacientes, materiales y objetos propios retirados; bucket privado y protección del último superadmin habilitada |
| Candidato Vercel | Build remoto y 13 HTTP PASS, incluidos worker/fuente/WASM y denegaciones privadas |
| Dominio principal | 28 HTTP de web/portal/PWA y 6 adicionales del lector/privacidad PASS; despliegue exacto Ready |

Evidencia local: `tmp/care-qa/library-workspace/results.json`, `library-workspace-build.log`, `library-workspace-unit.log`, `library-workspace-lint.log`, `library-upload-roles-db.log` y capturas en `library-workspace/`. Regresión integral: `tmp/care-qa/workspace-regression/results.json`, finalizada a las 12:39:54 de Chile. El último cambio posterior fue exclusivamente el margen de los filtros de pacientes; la matriz completa de Biblioteca/espacio de trabajo se repitió sobre el código final, con 34/64 PASS. La suite espera que desaparezcan los esqueletos de carga antes de comprobar y capturar cada página. Inspección visual de inicio 1440 px, pacientes 375 px, modal 1440/320 px y lectura PDF en WebKit 320 px.

La lectura de Office prioriza el texto y no reproduce todas las imágenes ni la maquetación. Word muestra hasta 100.000 caracteres; PowerPoint hasta 50 diapositivas; Excel hasta 10 hojas, 1.000 filas y 50 columnas, sin recalcular fórmulas. Los documentos que superen los límites del lector conservan la descarga del original para usuarios autorizados. Los ZIP se inspeccionan con límites y se rechazan formatos activos, cifrados, macros y relaciones externas.

La auditoría de dependencias conserva ocho avisos preexistentes en Next/sharp/source-map-js; no incorpora avisos de las dependencias del lector. La actualización de ese stack queda como mantenimiento separado, sin declarar la auditoría completamente limpia.

## Publicación

Publicado en https://www.castelaochile.cl/admin. Candidato final verificado y promovido: `dpl_8GZJXU5Qjmosopr4aZYyhmthsuyg`, https://castelaochile-b183zi8c4-sebastian-guerreros-projects.vercel.app. Identidad exacta confirmada en el dominio principal, estado Ready. El candidato inicial `dpl_GBUezY9hMyAboS3X1wcnEGsDEWYL` fue sustituido antes de la promoción para incluir el último margen visual. Referencia anterior del dominio: `dpl_BXHGeNjFCdQ8QpQ6JrU9iMCLopbY`.

Se aplicaron exclusivamente las dos migraciones revisadas mediante CLI al proyecto Castelao vinculado, con `--skip-vault`, sin seed ni roles adicionales. El historial pasó de 39 a 41. El bucket sigue privado con límite 20 MB y RLS de materiales/adjuntos habilitada. La publicación utiliza la autorización de producción vigente de la conversación.

Postflight confirmó las dos versiones, el control vigente de Dirección y ACL de finalización limitada al servidor. El asesor conserva exactamente los mismos 42 avisos informativos, sin warnings/errores nuevos; comparación por nombre, nivel y metadata. Se mantiene el acceso cerrado de las tablas privadas a través de RPC autorizadas. [Aviso informativo de RLS sin políticas permisivas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Evidencia de producción en `tmp/care-production/`: `library-workspace-final-deploy.log`, `library-workspace-candidate-http.json`, `library-workspace-promote.log`, `library-workspace-production-inspect.log`, `library-workspace-production-http.json`, `library-reader-http.json`, `library-workspace-migration-push.log`, `library-reading-postflight.json` y `library-workspace-security-before/after.json`. Las verificaciones autenticadas se realizaron con cuentas sintéticas locales; producción se comprobó por metadata, esquema y HTTP, sin usar pacientes reales ni enviar correos. Sin cambios de configuración Auth/SMTP/Vault/cron ni commit/push.

## Pendiente

- No quedan tareas abiertas dentro del alcance técnico verificado del rediseño y Biblioteca.
- Revisión humana de Dirección/superadmin desde navegador/PWA y dispositivos físicos según la pauta existente. Las pruebas emuladas no acreditan todos los modelos Android/iPhone; la función está disponible por navegador/PWA.
- Decisiones institucionales pendientes ya documentadas, sin alterar su estado por esta mejora visual.
