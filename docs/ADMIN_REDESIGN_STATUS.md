# Admin Redesign Status

Última actualización:
29/09/2026

## Stack verificado

- Next.js `16.3.5`, App Router y Proxy de Next 16.
- React / React DOM `19.3.0`.
- TypeScript `5.9.3` en modo estricto.
- Tailwind CSS `4.3.3` mediante `@tailwindcss/postcss`.
- Supabase JS `2.117.1`, SSR `0.12.7` y CLI `2.117.0`.
- Contrato remoto verificado con PostgREST `14.5`; las tres migraciones locales figuran aplicadas en el proyecto enlazado.
- Supabase Auth, PostgreSQL, RLS, Storage privado y clientes separados de navegador, sesión SSR y servidor privilegiado.
- Infraestructura shadcn presente (`components.json`), con Button y Accordion ya implementados; no existe un catálogo completo instalado.
- Lucide React `1.47.0` como única familia de iconos del admin.
- Recharts, TanStack Table, Motion y Sonner no están instalados.
- Tokens institucionales centralizados en `src/app/globals.css`; el admin añade únicamente tokens semánticos locales en `admin.css`.
- Asset institucional reutilizado desde `public/brand/instituto-castelao-horizontal-manual-preview.png`; continúa siendo un preview derivado del manual, no un master aprobado para producción.

## Funcionalidad existente antes de esta iteración

- Sitio institucional multipágina y Design System inicial.
- Rutas administrativas protegidas con Supabase Auth, Proxy, comprobaciones server-side y RLS.
- Roles persistidos: `superadmin`, `editor` y `viewer`.
- CMS inicial, consultas, usuarios, analítica first-party agregada y auditoría administrativa.
- Gates de privacidad para recepción pública de consultas y captura analítica.
- Sidebar fijo básico, páginas con tablas simples, filtros como enlaces de texto y un loading textual.
- Flujo local previo de invitación/activación de cuentas pendiente de esta iteración; fue preservado sin sobrescribir sus cambios locales.

## Implementado

- [x] Admin Shell compartido, reutilizable y separado del shell público.
- [x] Sidebar institucional de 256 px, colapsable a 72 px, con persistencia local y tooltips en estado colapsado.
- [x] Drawer responsive para móvil/tablet con overlay y cierre accesible.
- [x] Navegación activa inequívoca mediante `usePathname()`, compatible con rutas anidadas y `aria-current`.
- [x] Topbar sticky con trigger, breadcrumbs, nombre de sección, avatar y menú de cuenta.
- [x] Ruta `/admin/perfil` con correo, rol, estado, último acceso e ID técnico secundario.
- [x] Cambio de contraseña mediante Supabase Auth, exigiendo contraseña actual, validación, pending, éxito y error; el rol no es editable desde el perfil.
- [x] Componentes reutilizables: `PageHeader`, `MetricCard`, `AdminPanel`, `FilterTabs`, `StatusBadge`, `StatePanel`, `AdminNotice`, botones de acción y skeletons.
- [x] Estados diferenciados para vacío, filtro sin resultados, feature desactivada, error y carga.
- [x] Skeletons representativos de dashboard, analítica, tablas y perfil mediante `loading.tsx` por segmento.
- [x] Dashboard con cinco indicadores reales o estado desactivado, evolución analítica real, contenido reciente, consultas recientes y acciones rápidas por rol.
- [x] Analítica con selector de 7/30/90 días, totales, comparación real con el periodo anterior, gráfico SVG responsive y accesible, y ranking de páginas.
- [x] El gráfico usa únicamente agregados reales de `analytics_daily`; no agrega métricas que el pipeline no capture.
- [x] Consultas con tabs en español, búsqueda server-side por nombre/correo, tabla responsive, badges, estados y detalle operativo.
- [x] CMS con filtros por tipo/estado, búsqueda server-side, CTA principal, tabla responsive y acciones válidas de edición/vista previa.
- [x] Usuarios con identidad humana obtenida server-side desde Supabase Auth, correo, rol, estado, último acceso e ID técnico secundario.
- [x] Invitación y gestión de roles en una interfaz compacta; los valores persistidos de rol no cambiaron.
- [x] Feedback pending para mutaciones y confirmación de éxito mediante redirects controlados.
- [x] Errores esperables de las seis Server Actions administrativas devueltos dentro de cada formulario mediante `useActionState`, con validación por campo, anuncios accesibles y mensajes internos de Supabase ocultos.
- [x] Densidad, tipografía, ancho máximo, focus-visible, navegación por teclado y `prefers-reduced-motion` alineados al Design System.
- [x] Acceso y activación administrativa con logotipo institucional, caja fluida y controles sin desbordamiento horizontal en móvil.
- [x] Tests específicos para navegación activa/responsive, cambio de contraseña seguro y estados/skeletons.
- [x] Contrato `src/types/database.ts` sincronizado en modo solo lectura desde el esquema público enlazado, conservando alias de dominio usados por la aplicación.
- [x] Suite pgTAP ampliada de 18 a 33 casos para cuentas inactivas, escalación lateral, autoría falsificada, borrado no autorizado, aislamiento del helper privado y protección del último superadministrador.
- [x] La cuenta de superadministración actual está protegida en la UI y en la Server Action contra auto-revocación o auto-degradación accidental.
- [x] Migración preparada, validada y aplicada para consolidar la lectura RLS de `content_posts` y proteger en base al último superadministrador, con advisory lock transaccional y función privada sin ejecución directa.
- [x] Volumen real validado mediante conteos agregados: 0 consultas, 0 contenidos, 1 usuario administrativo y 0 filas analíticas; no se justifica paginación avanzada todavía.
- [x] Documentación viva creada.

## Parcial

- [~] Accesibilidad: semántica, labels, `aria-current`, foco y reduced motion están implementados; falta una auditoría manual con lector de pantalla sobre una sesión autorizada.
- [~] Responsive: las superficies públicas de acceso/activación se validaron visualmente y por métricas de layout en 375, 768, 1024, 1440 y 1920 px; falta validar las vistas protegidas con una sesión autorizada y en dispositivos/navegadores reales.
- [~] Tablas: filtros, búsqueda y adaptación móvil están implementados; no se añadió sorting/paginación porque el repositorio limita los listados a 25 registros y todavía no existe necesidad validada de una infraestructura avanzada.
- [x] Seguridad de base: migración aplicada en producción, políticas y trigger verificados, lint limpio y protección de Auth contra contraseñas filtradas habilitada mediante el campo específico de la Management API.
- [~] Identidad visual: usa el asset local oficial disponible, pero ese archivo continúa pendiente de reemplazo/aprobación de marca para producción.

## Pendiente

- [ ] Auditoría manual autenticada de teclado, lector de pantalla y responsive de las vistas protegidas en las cinco resoluciones objetivo.
- [x] Ejecutar las 33 pruebas pgTAP en un entorno Supabase aislado antes de considerar la migración para producción: aprobadas 33/33 en una preview branch temporal vacía, dentro de una transacción con `ROLLBACK`.
- [x] Protección de Supabase Auth contra contraseñas filtradas habilitada en producción mediante `password_hibp_enabled=true`, sin sobrescribir el resto de la configuración remota.
- [ ] Reemplazar el preview de logo por el master institucional aprobado cuando sea entregado.

## Bloqueado

- Captura pública de consultas: bloqueada por el gate de privacidad/configuración existente.
- Captura analítica: implementada, pero no configurada ni habilitada en este entorno; no se alteró el gate.
- Verificación visual con datos productivos: requiere una cuenta administrativa autorizada y no se fabricaron usuarios ni registros.
- pgTAP local mediante `supabase test db`: Docker no está instalado/disponible en este equipo. La cobertura equivalente se completó mediante una transacción remota con rollback en una preview branch aislada y vacía.

## Decisiones técnicas

- Server Components continúan siendo el valor por defecto; los Client Components se limitan al shell interactivo, carga de portadas y cambio de contraseña.
- Las comprobaciones de rol continúan junto al acceso a datos y dentro de cada Server Action. Ocultar botones no se usa como autorización.
- Los emails de Auth se consultan exclusivamente con el cliente privilegiado `server-only`, después de `requireAdmin(["superadmin"])`; la secret key nunca llega al cliente.
- `user_metadata.full_name` se usa solo como etiqueta visual opcional. Nunca participa en autorización; el rol efectivo sigue en `admin_users` y RLS.
- No se añadió Recharts: el volumen y la única serie disponible se resuelven con un gráfico SVG accesible, responsive y sin aumentar el bundle. Si aparecen series o interacciones complejas, se reevaluará Recharts v3.
- No se añadió TanStack Table: con listados limitados a 25 registros, filtros server-side y estrategia móvil, su complejidad no está justificada todavía.
- No se añadió Sonner: los estados pending, éxito, error y redirects existentes cubren las mutaciones sin otro runtime cliente.
- Se eliminó el repositorio duplicado de métricas de dashboard y se consolidaron las lecturas administrativas.
- Los gates distinguen siempre implementación, configuración y habilitación.

## Paquetes agregados

Ninguno. Se reutilizaron React 19, Next.js 16, Lucide, Supabase y la infraestructura CSS ya instalada.

## Migraciones

- Se creó `20260929131909_harden_admin_role_and_content_read_policies.sql` mediante `supabase migration new`, con autorización explícita.
- La migración `20260929131909_harden_admin_role_and_content_read_policies.sql` fue aplicada al proyecto principal el 29/09/2026 después de aprobar 33/33 pruebas en preview.
- La migración preexistente `20260929120317_grant_authenticated_rls_helper_access.sql` y la migración fundacional aparecen aplicadas remotamente; no fueron reaplicadas ni alteradas.

## Riesgos

- `auth.admin.listUsers()` pagina hasta 1.000 identidades; si el equipo creciera por encima de ese límite se deberá implementar paginación server-side explícita.
- Solo existe una cuenta administrativa en producción. La UI, la Server Action y el trigger de base impiden que se desactive o degrade al último superadministrador activo.
- El cambio de contraseña depende de la configuración de seguridad de Supabase Auth; la UI exige la contraseña actual usando la API soportada por la versión instalada.
- La fecha de consultas se construye con el offset actual de Chile como lo hacía la implementación previa; revisar cambios históricos de horario de verano si se amplía la analítica.
- La UI fue validada por compilación y pruebas, pero una sesión administrativa real es necesaria para QA visual completo del contenido protegido.
- La CSP permite `'unsafe-eval'` únicamente cuando `NODE_ENV=development`, como requiere React para reconstruir trazas de depuración. La directiva permanece ausente en producción y está cubierta por una prueba para ambos entornos.

## QA

- Despliegue productivo, migración remota y push de la rama `feature/admin-supabase-cms`: autorizados explícitamente el 29/09/2026. Supabase y Vercel completados; commit/push Git en curso.
- Supabase producción: migración `20260929131909` aplicada; historial local/remoto alineado, dos políticas SELECT de `content_posts` verificadas, trigger del último superadministrador activo, 1 superadministrador activo y lint sin errores.
- Supabase Auth producción: protección contra contraseñas filtradas cambió de desactivada a activada mediante una actualización puntual; no se ejecutó `config push` para preservar URLs, MFA, SMTP y demás ajustes remotos.
- Vercel producción: build remoto aprobado con Next.js `16.3.5`, 18 páginas estáticas y todas las rutas administrativas compiladas; el deployment quedó asociado a `https://castelaochile.vercel.app`.
- Smoke tests productivos: `/`, `/admin/login` y `/admin/activar` respondieron `200`; `/admin` respondió `307` hacia `/admin/login`; la CSP productiva no contiene `'unsafe-eval'` y `X-Robots-Tag` conserva `noindex, nofollow, noarchive`.
- Preview branch temporal `codex-admin-rls-qa-20260929` creada sin datos de producción y sin persistencia para validar primero la migración; fue eliminada antes del despliegue al proyecto principal.
- pgTAP en preview: aprobado, 33/33. Se ejecutó mediante la API de administración en una única transacción con `ROLLBACK`, porque `supabase test db` requiere Docker aun cuando se apunta a una base remota.
- `supabase db lint` en preview: aprobado, sin errores de esquema.
- `supabase db advisors` en preview: aprobado, sin advertencias después de aplicar la migración.
- `supabase migration list` en preview: las tres versiones locales/remotas quedaron alineadas.
- Limpieza de preview: la rama temporal fue eliminada y `supabase branches list` confirmó que solo permanece `main`; no quedó ningún recurso de QA activo.
- `npm run lint`: aprobado.
- `npm run typecheck`: aprobado.
- CSP de desarrollo: corregida para admitir el diagnóstico de React sin permitir `'unsafe-eval'` en producción.
- QA CSP en ejecución: `/admin/login` respondió `200`; la cabecera de `next dev` incluye `'unsafe-eval'` y la de `next start` no la incluye. Ambos servidores temporales se detuvieron después de la comprobación.
- `npm test`: aprobado, 26/26, incluidas las pruebas específicas de CSP y feedback local de Server Actions.
- Feedback de mutaciones: typecheck, lint y build confirman la integración de `useActionState` en contenidos, consultas, invitaciones y gestión de roles; la autorización continúa verificándose dentro de cada Server Action.
- `npm run build`: aprobado con Next.js `16.3.5`; 18 páginas estáticas generadas y todas las rutas admin compiladas.
- `git diff --check`: aprobado; solo avisos de normalización LF/CRLF del entorno Windows.
- QA visual de acceso: aprobado a 375, 768, 1024, 1440 y 1920 px; el viewport exacto de 375 px reportó `documentScrollWidth = innerWidth = 375`.
- QA visual de producción: aprobado sobre `next start` a 375 px, sin el indicador de diagnóstico exclusivo de desarrollo.
- QA visual de activación: aprobado a 375 px, incluido su estado de enlace inválido, sin desbordamiento horizontal.
- El navegador integrado de Codex no pudo inicializarse por un error del helper de Windows; se usó Edge headless aislado con emulación por DevTools Protocol, sin omitir las comprobaciones visuales ni tocar datos reales.
- `supabase db lint --linked --schema public`: aprobado, sin errores de esquema.
- `supabase db advisors --linked`: las dos advertencias iniciales de Auth y políticas RLS fueron resueltas; la verificación posterior al despliegue devuelve cero issues.
- `supabase migration list --linked`: las versiones `20260924140610`, `20260929120317` y `20260929131909` coinciden local/remoto.
- `supabase db push --linked --dry-run --skip-vault`: antes del despliegue confirmó que solo se aplicaría `20260929131909_harden_admin_role_and_content_read_policies.sql`; el push posterior no incluyó migraciones adicionales, seeds, roles ni secretos.
- Se ejecutó una prueba remota autorizada dentro de una única transacción con `ROLLBACK`. Detectó y permitió corregir dos defectos históricos de la suite: la expectativa de permiso `anon` y tres CTE de mutación inválidos.
- La última ejecución remota informó 5/33 fallos porque la base enlazada ya contiene un superadministrador real: el conteo global difería y el trigger, correctamente, no consideró al usuario ficticio como el último activo. No se desactivó ni bloqueó la cuenta real.
- Antes de la autorización productiva se verificó el rollback de cada ensayo sobre la base principal. La aplicación final ocurrió posteriormente mediante el historial formal de migraciones.

## Próximo paso recomendado

Completar el commit y push Git de la rama `feature/admin-supabase-cms`. Después queda como siguiente iteración la auditoría autenticada de accesibilidad y responsive con una sesión administrativa autorizada.
