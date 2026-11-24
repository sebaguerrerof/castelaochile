# Puesta en producción — seguimiento terapéutico y Recovery

Fecha: 2026-10-10, America/Santiago. Autorización explícita del usuario: «sigamos con lo que falta, dale con produccion». Esta autorización sustituye la restricción previa de despliegue; no registra aprobación clínica ni conformidad humana del sistema.

## Resultado

Seguimiento (pasos 0–11) y complemento Recovery (RC-00–RC-05) publicados en https://www.castelaochile.cl. `CARE_PORTAL_ENABLED=true` agregado al entorno Production de Vercel. PWA accesible desde navegador, sin instalación obligatoria. Se reutilizan Auth, panel, portal, biblioteca, permisos e identidad institucional existentes.

Destino Supabase verificado: proyecto `castelao`, `rybcqiuklmoxhcostmlf`, ACTIVE_HEALTHY, Postgres 17.6.1.166, región ca-central-1. Vercel: proyecto `castelaochile`, `prj_bVwshDT8NIg4NuG2Ydk6VKl91O2X`, scope `sebastian-guerreros-projects`.

Despliegue efectivo Ready: `dpl_5CJHCbbLzMwpV2PcXz6VSHcb5j5J`, https://castelaochile-ioiro5fn4-sebastian-guerreros-projects.vercel.app. Candidato compilado con las variables ya almacenadas en Vercel, `--prod --skip-domain`, comprobado y después promovido. `vercel inspect https://www.castelaochile.cl` confirmó este despliegue tras la promoción. No se cambió DNS ni se trasladó el dominio.

## Migraciones y respaldo previo

Historial inicial: 14 migraciones, cero tablas care. Dry-run revisado: exactamente 22 archivos faltantes. Aplicación por CLI vinculada con `--skip-vault --yes`, sin seeds ni roles adicionales. Historial final: 36 migraciones; última `20261011002000`. Las 14 existentes no se reaplicaron.

Archivos locales de respaldo, ignorados por Git y excluidos del upload Vercel:

| Archivo | Alcance | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `tmp/care-production/pre-care-schema.sql` | Esquema public/private, funciones y permisos | 109955 | `0EA148B60729098ECF5B62144E102A16EC6249014AE3737EFC4478951C1157B8` |
| `tmp/care-production/pre-care-data.sql` | Datos public/private/auth/storage | 11300664 | `229A65A30BC9898F82FB28152D0580BCB21E4559AEE16A3EF1A25BA23736CBC6` |

Manifiesto de los 22 archivos y sus hashes: `tmp/care-production/activation-manifest.json`. No incluir dumps en commits, reportes públicos, fixtures o capturas.

Los dos dumps son exportaciones separadas, no un snapshot atómico con escritores detenidos. pg_dump advirtió FK circulares de carpetas/adjuntos de biblioteca: una restauración necesita el procedimiento validado de infraestructura y tratamiento explícito de triggers/constraints. No se restauraron datos reales en QA ni se ejecutó restauración remota; la recuperación demostrada en RC-05 sigue siendo evidencia local con datos neutrales.

El dump contiene metadatos de Storage, no los bytes de objetos. Antes y después hay 709 objetos en content-images, 73.061.969 bytes en el corte inicial; cero objetos en patient-library y care-informs. Esta activación no modifica ni elimina los objetos existentes; no se declara respaldo integral de esos bytes. Custodia, cifrado, copia externa y retención institucional siguen por definir.

## Verificación en producción

| Comprobación | Resultado |
| --- | --- |
| Compilación remota Next 16.3.6 + TypeScript | PASS; nuevas rutas incluidas, PDFKit instalado |
| Candidato HTTP | 8 PASS: home, logins, manifiesto, seguimiento/equipo, Hoy y PDF protegido |
| Dominio publicado HTTP | 27 PASS: páginas públicas/CMS/blog, logins, manifiesto/iconos, rutas privadas, PDF, adjunto, robots/sitemap |
| Bandera activa | Login paciente muestra «Bienvenido a tu espacio» y «Entrar a mi espacio» |
| Privacidad web | Sin sesión, páginas privadas/PDF redirigen al login; adjunto devuelve 404 genérico/no-store; logins no-store/noindex; sitemap no contiene rutas privadas |
| CSP productiva | `upgrade-insecure-requests` presente; escape HTTP de QA no activo |
| Tablas care | 34 públicas + 42 privadas; 76 con RLS, cero sin RLS |
| Acceso directo | Cero tablas care públicas accesibles a anon; cero privadas accesibles a anon/authenticated/service_role |
| Autorización DB | 5 controles PASS en transacción revertida: superadmin técnico reconocido, sin lectura clínica heredada, directorio y catálogo Recovery denegados sin capacidad, tabla privada denegada |
| Continuidad de datos | 1 perfil de paciente y 2 superadmins activos conservados; 709 objetos existentes conservados en inventario |
| Buckets | content-images, patient-library y care-informs privados; nuevo bucket PDF con límite 5 MB |
| Recovery | ICC-REC-AUT-001 v1.0 en proposal, sin aprobador; criteria_enabled=false; 0 participantes de piloto y 0 validaciones |
| Operación inicial | 0 capacidades clínicas, 0 asignaciones, 0 reglas operativas, 0 jobs care; no scheduler care instalado |
| Cron previo | castelao-analytics-retention sigue activo |
| Presentación real | Login paciente cargado e inspeccionado visualmente en navegador, con identidad/formulario correctos |

Evidencia local ignorada: `tmp/care-production/candidate-http.json`, `production-http.json`, `database-verification.json`, `security-advisors.json`, `activation-manifest.json`; herramientas de verificación en la misma carpeta. Las pruebas SQL usan contexto de rol/JWT dentro de una transacción y no acreditan un login de Dirección en navegador. No se generaron registros clínicos de prueba en producción.

Asesor de seguridad: cero WARN/ERROR; 42 avisos INFO «RLS enabled, no policy» corresponden a las 42 tablas private de denegación total y acceso solo mediante funciones autorizadas. Grants y denegación directa comprobados; no se añadieron políticas permisivas para silenciar los avisos. Referencia: [Supabase — RLS enabled no policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Dos expectativas del smoke se corrigieron contra el código existente: PDF sin sesión responde 307 desde proxy, no 401; adjunto privado responde 404 genérico, no 401. Repetición final PASS; no se cambiaron controles de acceso para ajustar la prueba.

## Pendiente y uso por Dirección

1. Entrar con cuenta superadmin existente a `/admin/seguimiento/equipo`. Configurar capacidades reales y, con `care.assignments.manage`, asignaciones por paciente y función. La publicación no otorga capacidades clínicas automáticamente ni cambia permisos de biblioteca/CMS.
2. Dirección configura sus capacidades necesarias de lectura/registros/decisiones; desde `/admin/seguimiento/rubricas` registra expresamente aprobación, referencia y vigencia, o piloto con alcance definido. Activar criterios es una decisión separada. No hay puntuaciones ni aprobación automática por desplegar.
3. Los formularios de rúbrica/piloto y revisión mensual funcionan en la PWA abierta en el navegador. La aceptación humana general del sistema sigue pendiente según la pauta; no existe una firma global de aceptación implementada en la aplicación.
4. Definir fases oficiales, campos/ventanas/exenciones de reportes, reglas de reiteración y cualquier programación real. No se inventaron plazos universales de registro ni parámetros clínicos.
5. Scheduler care queda sin registrar: no existen jobs/reglas aprobadas ni responsable operativo definido. Activarlo requiere una decisión concreta sobre alcance, frecuencia y monitoreo; preservar cron ajeno. Ver CASTELAO_SEGUIMIENTO_ACTIVACION.md.
6. Protocolo/canales de urgencias, política de retención/respaldo, custodia y RPO/RTO institucionales siguen abiertos. Compatibilidad física Android/iPhone y aceptación humana se documentan posteriormente con Dirección, conforme a lo acordado.

La batería previa local sigue en RC_05: 266 funcionales, 1.032 móviles, 492 UX, 930 SQL seguimiento + 76 biblioteca, 113 unitarias, Auth/biblioteca 30 y web/CMS 36, siete PDF/40 páginas, instalación y recuperación. Esas cifras no se presentan como pruebas ejecutadas en producción. En destino no se verificó con sesión real la escritura clínica, generación/descarga de PDF ni aprobación de Dirección; no se solicitaron ni extrajeron contraseñas para hacerlo.

## Reversión preparada

Anterior despliegue Ready: `dpl_FkmoNgHHbkVM1YX9qNR84hH6BzWM`, https://castelaochile-13w18hbxu-sebastian-guerreros-projects.vercel.app. Reversión de aplicación disponible mediante Vercel rollback al despliegue anterior, previa decisión ante incidente; no ejecutada. Deshabilitar CARE_PORTAL_ENABLED para un build futuro y revertir aplicación no revierte datos ni migraciones. No ejecutar down destructivos ni restaurar encima de escrituras nuevas. Conservar historia y aplicar correcciones aditivas; cualquier restauración real necesita corte, reconciliación y autorización de ese alcance.

La revisión automática rechazó `vercel env pull` porque habría copiado secretos productivos a un archivo local. No se realizó esa extracción ni un mecanismo alternativo equivalente. El build utilizó los secretos ya almacenados en Vercel y las conexiones CLI/MCP existentes. No hubo envío de correo externo, modificación de SMTP ni cambios de credenciales.
