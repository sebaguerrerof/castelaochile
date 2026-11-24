# Dominio de pruebas y correos del portal

Preparación y activación autorizada: 9 de octubre de 2026.

## Estado operativo actual

Portal publicado con autorización explícita en `https://www.castelaochile.cl`, despliegue Vercel `dpl_BcfyTSM33fuvu3WnNhRDEb7SnibY`. Migración terapéutica aplicada en Supabase `rybcqiuklmoxhcostmlf`, RLS/bucket privados verificados, flags de portal y envío habilitados. Auth/origen canónico corregidos al dominio con www y SMTP Resend existente conservado. Ocho pruebas públicas completas sin envío SMTP externo, incluidas activación/contraseña, acceso cruzado y PDF de 20 MB. El usuario realizará el primer envío real desde el administrador. Detalles y rollback en `CASTELAO_PORTAL_PACIENTES_STATUS.md`.

La zona Vercel confirmó DKIM, SPF y MX de envío. DMARC todavía no figuraba en la zona pese a la confirmación previa; se agregó `_dmarc.auth` TXT `v=DMARC1; p=none;` el 9 de octubre, registro `rec_c79c41c60a5c9a2c8ffb5091`. La consulta autoritativa final confirmó el TXT publicado. No se crearon buzones ni se modificó `castelao.cl`.

Las notas de preparación siguientes conservan las consultas iniciales anteriores a la autorización y despliegue.

## Dominios y estado comprobado

- El usuario confirmó **castelaochile.cl como dominio de pruebas** y **castelao.cl como dominio oficial** para la transición posterior.
- El checkout está vinculado al proyecto Vercel `castelaochile`, en `sebastian-guerreros-projects`.
- Existe un despliegue Ready del 5 de octubre, con alias `https://castelaochile.vercel.app`. No incluye automáticamente los cambios locales del portal realizados después.
- En la consulta inicial, `vercel domains inspect castelaochile.cl` informó que el dominio no existía en esa cuenta. Posteriormente el usuario agregó ambos dominios, configuró los nameservers en NIC y confirmó **Valid Configuration** en Vercel. Este último estado fue informado por el usuario; no equivale a una prueba externa del portal.
- Las consultas DNS iniciales devolvieron NXDOMAIN; quedan como evidencia histórica anterior a la confirmación de configuración válida.
- Las capturas muestran `castelaochile.cl` redirigiendo con 308 a **www.castelaochile.cl**, asignado al despliegue existente. Conservar ese origen canónico en Next y Auth mientras siga esa redirección.
- El usuario informó haber configurado Supabase y Resend. La captura de Resend muestra DKIM y ambos registros SPF/Return-Path como **Verified**. Consultas públicas posteriores confirmaron TXT en `resend._domainkey.auth.castelaochile.cl`, MX y TXT en `send.auth.castelaochile.cl`; la delegación NS corresponde a Vercel. No repetir estos registros. Esto verifica DNS de envío, no la entrega SMTP ni la configuración efectiva de Auth. Las consultas de `_dmarc` raíz y `_dmarc.auth` todavía no devuelven TXT; DMARC queda pendiente.
- En la fase inicial no se modificaron servicios externos. Posteriormente, con autorización explícita, se aplicó la migración, configuró Auth/Vercel, agregó DMARC y se publicó el portal. No se enviaron correos reales.

## Web: configuración a realizar

1. En Vercel, abrir proyecto **castelaochile → Settings → Domains** y agregar `castelaochile.cl` y `www.castelaochile.cl`. El usuario ya configuró **www** como principal y el dominio raíz redirige a él. Para probar el portal externo, asignar el dominio al entorno aislado autorizado; agregarlo al despliegue actual solo muestra la web ya publicada.
2. Para gestionar la zona DNS en Vercel, habilitar Vercel DNS para el dominio. En NIC Chile abrir **castelaochile.cl → Configuración técnica → Servidores de nombre (DNS)** e ingresar, uno por campo:

   | Servidor | Valor |
   | --- | --- |
   | DNS 1 | `ns1.vercel-dns.com` |
   | DNS 2 | `ns2.vercel-dns.com` |

   Usar únicamente los nombres: sin `https://`, barras ni rutas. Guardar/actualizar los datos. No se necesita transferir la inscripción desde NIC a Vercel.
3. Los A/CNAME de la web se gestionan en Vercel al asociar los dominios y usar sus nameservers. No añadir IP/CNAME genéricos por memoria: si se elige otro proveedor DNS, copiar los valores exactos que indique **Settings → Domains** o `vercel domains inspect castelaochile.cl`.
4. Esperar la propagación y comprobar **Valid Configuration**, HTTPS y la redirección www. NIC actualiza la zona aproximadamente cada treinta minutos; las cachés pueden demorar hasta un par de días.
5. Antes del despliegue autorizado, configurar `NEXT_PUBLIC_SITE_URL=https://www.castelaochile.cl` en el entorno elegido y conservar `NEXT_PUBLIC_SITE_MODE=review`/noindex durante las pruebas. Un cambio de variables necesita un nuevo despliegue para incorporarse al build.

Si se descubre un servicio previo de correo/DNS, copiar y comprobar sus registros antes de cambiar la delegación. Cambiar nameservers afecta toda la zona, incluidos los correos.

No usar el servicio **Redireccionamiento web de NIC** para alojar esta web: su documentación indica que elimina la delegación DNS previa, el dominio de origen funciona solamente por HTTP y no redirige correos. La asociación de dominios y redirecciones con HTTPS se hará en Vercel.

## Invitaciones y recuperación de contraseña

La funcionalidad ya existe en el administrador, con Auth real probado localmente. La entrega externa requiere un proveedor SMTP. La cuenta de correo personal del paciente puede ser Gmail, Outlook u otro proveedor: no necesita un buzón institucional.

Propuesta compatible con el código existente: **Resend como SMTP de Supabase Auth**. Registrar y verificar un subdominio de envío, por ejemplo `auth.castelaochile.cl`, con remitente `acceso@auth.castelaochile.cl`. Separa la reputación del envío automático de los buzones del equipo. Es una propuesta; todavía no se creó ni verificó en el proveedor.

1. En Resend → Domains agregar `auth.castelaochile.cl`.
2. Copiar en **Vercel → Domains → castelaochile.cl → DNS** los registros exactos de envío que Resend muestre: DKIM, SPF y MX del Return-Path, con nombres, valores y prioridades. No inventar la clave DKIM ni la región del MX. El MX de envío pertenece al nombre indicado por Resend; no sustituye los MX del dominio raíz para los buzones humanos.
3. Verificar el dominio. Añadir DMARC en `_dmarc.auth`, inicialmente `v=DMARC1; p=none;` si no existe otra política. Para recibir informes, agregar `rua` únicamente con una dirección real habilitada. Endurecer la política tras comprobar todos los remitentes legítimos.
4. Crear una API key de envío y guardarla únicamente como secreto. En el proyecto Supabase del entorno autorizado, configurar **Authentication → SMTP Settings**:

   | Campo | Configuración propuesta |
   | --- | --- |
   | Sender email | `acceso@auth.castelaochile.cl` |
   | Sender name | `Instituto Castelao Chile` |
   | Host | `smtp.resend.com` |
   | Port | `465` (TLS) |
   | Username | `resend` |
   | Password | API key de Resend; nunca publicar en documentación o navegador |

5. En **Authentication → URL Configuration**, Site URL `https://www.castelaochile.cl`; Redirect URLs exactas `https://www.castelaochile.cl/pacientes/activar` y `https://www.castelaochile.cl/admin/activar`. Instalar los templates compartidos `supabase/templates/portal-invite.html` y `portal-recovery.html`. Estos apuntan a `/auth/confirm`, que verifica el token en servidor.
6. Mantener proveedor Email habilitado y registro público deshabilitado. Desactivar seguimiento de clics y aperturas para los mensajes Auth. Revisar los límites de envío en Supabase y Resend.
7. Completar la activación externa según `CASTELAO_PORTAL_PACIENTES.md`: backend remoto aislado, migraciones autorizadas, bucket privado/RLS, claves del entorno solo en servidor cuando corresponda, Upstash y permisos staff. El Supabase Docker local no es accesible desde Vercel usando localhost.
8. Con autorización explícita para envío y despliegue, activar los flags del portal y probar una invitación y recuperación con un destinatario autorizado. Confirmar entrega, SPF/DKIM/DMARC, contraseña, entrada al portal y bloqueo de informes ajenos.

`RESEND_API_KEY` en Next se utiliza para el formulario de contacto existente. **No configura por sí sola el SMTP de Supabase Auth**: son integraciones distintas. El SMTP predeterminado de Supabase restringe destinatarios y no sirve para entregar invitaciones a pacientes externos.

## Buzones institucionales del equipo

Enviar invitaciones no crea una bandeja de entrada para `contacto@...` o `administracion@...`. Si el equipo necesita leer y responder correos, definir un proveedor de buzones, por ejemplo Google Workspace o Microsoft 365, y los usuarios/alias requeridos.

- Agregar en Vercel DNS el TXT de verificación y los MX exactos del proveedor de buzones.
- Configurar sus registros SPF/DKIM/DMARC sin duplicar políticas SPF en un mismo nombre ni reemplazar registros de otros servicios sin revisarlos.
- Conservar Resend para mensajes automáticos en el subdominio Auth. Los MX raíz del proveedor de buzones y los MX del Return-Path pueden coexistir en nombres distintos.
- Queda pendiente confirmar si se necesitan buzones ahora y cuál será su proveedor. No se compraron planes ni se crearon cuentas.

## Transición al dominio oficial

Cuando se autorice la transición, inventariar primero web, correo y DNS existentes de `castelao.cl`. Asociar ese dominio al mismo proyecto/entorno elegido, dejarlo como principal y definir la redirección del dominio de pruebas en Vercel. Actualizar origen canónico, Site URL/allowlist de Auth, remitentes y verificación del dominio de correo. Probar nuevamente invitación/recuperación; los enlaces emitidos antes de cambiar el dominio requieren atención y no se debe asumir que una redirección conserva todos los tokens y parámetros.

## Verificaciones ejecutadas y pendientes

Ejecutadas: sesión/proyecto/despliegue Vercel y alias consultados mediante CLI; inspección de dominio; DNS públicos; revisión de variables, templates y documentación local; fuentes oficiales consultadas. `vercel.json` ya fuerza framework Next.js y build `pnpm build`, aunque la configuración base del panel muestra Other. No se cambiaron archivos de aplicación; no se repitieron tests/build para esta preparación documental. Los resultados anteriores del MVP constan en `CASTELAO_PORTAL_PACIENTES_STATUS.md`.

HTTPS, backend, migración, permisos, portal público, DMARC y enlace de activación quedaron comprobados en el despliegue autorizado. Pendientes: entrega SMTP externa a cargo del usuario, elección de buzones si se necesitan y transición futura a `castelao.cl`.

## Fuentes oficiales

- [Vercel: nameservers](https://vercel.com/docs/domains/working-with-nameservers)
- [Vercel: dominio personalizado y registros exactos](https://vercel.com/docs/domains/set-up-custom-domain)
- [Vercel: administrar DNS](https://vercel.com/docs/domains/managing-dns-records)
- [NIC: tiempos de actualización](https://www.nic.cl/ayuda/faq/tec-02.html)
- [NIC: límites del redireccionamiento web](https://www.nic.cl/ayuda/tutoriales/redireccionamiento-web.html)
- [Resend: SMTP](https://resend.com/docs/send-with-smtp)
- [Resend: dominios verificados](https://resend.com/docs/dashboard/domains/introduction)
- [Resend: DMARC](https://resend.com/docs/dashboard/domains/dmarc)
- [Supabase: SMTP personalizado](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase: redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Google Workspace: buzones con dominio propio](https://workspace.google.com/products/gmail/)
- [Microsoft: Exchange empresarial](https://www.microsoft.com/es-cl/microsoft-365/exchange/email)
