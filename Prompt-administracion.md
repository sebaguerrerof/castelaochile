# CASTELAO CHILE — REDISEÑO PROFESIONAL DEL PANEL DE ADMINISTRACIÓN
## Auditoría UX/UI + Design System + Admin Shell + Dashboard + Analítica + Perfil

### FECHA DE REFERENCIA
29/09/2026

---

# ROL

Actúa simultáneamente como:

- Principal Frontend Engineer
- Senior Product Designer especializado en SaaS / Backoffice / Admin Panels
- UX Engineer
- Design Systems Engineer
- Tech Lead del proyecto Instituto Castelao Chile
- Especialista en Next.js App Router, React, TypeScript, Tailwind CSS y Supabase

No quiero una modificación cosmética.

Tu responsabilidad es convertir el panel administrativo actual en una aplicación de administración moderna, profesional, coherente, accesible, rápida y mantenible.

Debes analizar primero la implementación existente y posteriormente ejecutar el rediseño de forma estructural.

El resultado debe sentirse como un producto SaaS / Backoffice moderno de 2026, pero manteniendo claramente la identidad institucional de Instituto Castelao Chile.

---

# CONTEXTO DEL PROYECTO

Repositorio/proyecto:

Instituto Castelao Chile.

Stack existente que debes respetar y verificar antes de modificar:

- Next.js App Router
- React
- TypeScript estricto
- Tailwind CSS
- Supabase
- @supabase/supabase-js
- @supabase/ssr
- Supabase Auth
- Supabase PostgreSQL
- RLS
- Design System centralizado
- sitio público ya existente y funcional

NO convertir este proyecto a otro framework.

NO reemplazar Supabase.

NO crear mocks o datos falsos.

NO generar estadísticas falsas.

NO crear usuarios ficticios.

NO romper el sitio público.

NO saltarse RLS.

NO exponer service role keys al cliente.

NO desplegar a producción.

NO hacer merge a main.

NO ejecutar migraciones remotas peligrosas sin autorización explícita.

---

# OBJETIVO

Rediseñar completamente la experiencia visual y operativa de:

/admin

y todas sus secciones relacionadas.

Actualmente existen, al menos:

- Resumen
- Analítica
- Consultas
- Contenidos
- Usuarios

Debes auditar las rutas reales y respetar la arquitectura actual.

También necesitamos incorporar correctamente:

- Topbar
- Navegación activa
- Breadcrumbs
- Perfil del usuario
- Gestión de contraseña
- Estados de carga profesionales
- Skeletons
- Empty states
- Error states
- Disabled states
- Responsive design
- Feedback visual
- tablas profesionales
- charts
- filtros
- búsqueda cuando corresponda
- mejor jerarquía de información

---

# PROBLEMAS OBSERVADOS EN LA IMPLEMENTACIÓN ACTUAL

Estas observaciones son requisitos del rediseño, no sugerencias.

## 1. El sidebar no comunica dónde estoy

Actualmente todos los enlaces visualmente parecen iguales.

Debe existir un estado activo inequívoco.

Ejemplo:

Resumen
Analítica
Consultas
Contenidos
Usuarios

El usuario debe poder saber en menos de un segundo qué sección está viendo.

Implementar:

- icono
- label
- estado hover
- estado focus
- estado active
- indicador visual de sección activa
- soporte de rutas anidadas
- tooltips cuando el sidebar esté colapsado

Usar `usePathname()` o solución equivalente apropiada para App Router.

No hardcodear manualmente estados por página.

---

# 2. El sidebar actual ocupa demasiado espacio y está visualmente anticuado

Crear un sidebar moderno.

Desktop:

- aproximadamente 240–260 px expandido
- modo colapsable a ~64–72 px
- persistencia razonable del estado
- header con identidad institucional
- navegación principal
- footer opcional de cuenta

Mobile/tablet:

- drawer/sheet
- no sidebar fijo invasivo
- apertura desde topbar

Debe existir botón para expandir/contraer.

Si shadcn/ui ya está instalado, reutilizar su infraestructura.

Si NO está instalado, evaluar técnicamente incorporarlo únicamente si mejora la arquitectura.

No instalar bibliotecas de UI innecesariamente.

---

# 3. Falta una TOPBAR real

Crear una barra superior sticky.

Debe contener, según contexto:

IZQUIERDA:

- trigger sidebar
- breadcrumb
- nombre de la sección actual

DERECHA:

- acciones contextuales cuando corresponda
- avatar del usuario
- nombre/email resumido
- menú de cuenta

Ejemplo de menú:

Mi perfil
Configuración de cuenta
Cambiar contraseña
Cerrar sesión

No poner elementos decorativos sin función.

La topbar debe permanecer visible al hacer scroll.

---

# 4. PERFIL DEL USUARIO

Crear una experiencia real de perfil.

Ruta sugerida:

/admin/perfil

o adaptar arquitectura existente si ya existe una equivalente.

Debe permitir como mínimo:

- visualizar información de la cuenta
- email
- rol
- estado
- cambiar contraseña de forma segura
- feedback éxito/error
- estado submitting
- validaciones
- no permitir escalamiento de privilegios

Usar exclusivamente APIs seguras de Supabase Auth.

No exponer claves administrativas al browser.

Si el cambio de contraseña requiere una estrategia adicional de reautenticación o seguridad según la implementación actual de Supabase, implementarla correctamente.

El usuario jamás debe editar su propio rol desde esta vista.

---

# 5. IDENTIDAD VISUAL INSTITUCIONAL

El admin NO debe parecer una plantilla genérica.

Pero tampoco debe parecer una página de marketing.

Debe utilizar el Design System de Instituto Castelao Chile.

Revisar primero los tokens existentes.

Valores institucionales conocidos:

Primary blue:
#0079BE

Orange:
#DA8A1B

Gray:
#868685

El manual de marca y los tokens existentes tienen prioridad sobre estos valores si existieran definiciones más específicas en el repositorio.

Tipografías institucionales conocidas:

- District Thin: exclusivamente cuando corresponda al logo/marca
- Arial: navegación / UI
- PT Sans: headings
- Volkhov: citas si realmente se utilizan
- Droid Serif: contextos definidos por el sistema actual

PARA EL PANEL ADMIN:

No utilizar tipografías editoriales grandes como si fuese el sitio público.

Preferencia:

UI:
Arial / fallback correspondiente definido en Design System.

Headings:
PT Sans.

Los títulos actuales son excesivamente grandes para un panel administrativo.

Utilizar una escala de producto aproximadamente equivalente a:

Page title:
28–32 px

Section title:
20–24 px

Card title:
14–16 px

Metric:
28–36 px

Body:
14–16 px

Siempre usar tokens, no valores dispersos si existe infraestructura para centralizarlos.

---

# 6. LOGO

Actualmente la navegación parece depender demasiado de texto plano.

Buscar los assets institucionales YA existentes en el repositorio.

Utilizar el logo oficial disponible.

NO:

- inventar un logo
- utilizar uno de España si no corresponde
- descargar imágenes aleatorias
- recrearlo manualmente si ya existe asset local

Debe tener una variante visual adecuada para el sidebar.

---

# 7. ADMIN SHELL

Crear una estructura reutilizable.

Ejemplo conceptual:

AdminLayout
 ├── AdminSidebar
 ├── AdminTopbar
 └── AdminContent
      ├── PageHeader
      └── PageContent

No duplicar estructuras entre páginas.

Crear componentes reutilizables cuando tenga sentido:

- PageHeader
- MetricCard
- EmptyState
- ErrorState
- AdminTable
- FilterBar
- StatusBadge
- SkeletonCard
- TableSkeleton
- ChartSkeleton
- UserMenu
- Breadcrumbs

Mantener responsabilidades claras.

No construir un mega componente AdminDashboard.tsx de cientos de líneas.

---

# 8. LAYOUT

El contenido actual deja cantidades excesivas de espacio vacío.

Corregir el ancho de contenido.

Queremos una interfaz de administración que utilice correctamente pantallas grandes.

Ejemplo:

- ancho máximo amplio: ~1440–1600 px
- padding adaptable
- grid responsive
- cards que aprovechen el ancho
- tablas full-width
- charts grandes cuando aporten información

No dejar toda la información agrupada en el 50% izquierdo del viewport.

---

# 9. RESUMEN / DASHBOARD

Rediseñar `/admin`.

Debe funcionar como verdadero resumen operativo.

No quiero solamente tres cards.

Diseñar algo equivalente a:

HEADER

Resumen
Una pequeña descripción contextual.

Luego:

METRICS

- Vistas hoy
- Vistas últimos 7 días
- Consultas nuevas
- Borradores
- Contenido publicado

ÚNICAMENTE si existe información real.

No inventar datos.

Debajo:

Analytics overview
Chart real si analytics está activo.

Últimas consultas
Listado corto.

Contenido reciente
Listado corto.

Acciones rápidas, únicamente si aportan utilidad:

- Nueva entrada
- Ver consultas
- Gestionar usuarios

No llenar el dashboard de elementos decorativos.

---

# 10. ANALÍTICA

Actualmente visualmente aparece algo equivalente a:

7 días
30 días
90 días

como texto suelto.

Eso es inaceptable.

Convertirlo en un segmented control / tabs profesional.

Ejemplo:

[ 7 días ] [ 30 días ] [ 90 días ]

La sección debe contemplar cuando existan datos reales:

- total pageviews
- variación respecto periodo anterior si puede calcularse realmente
- gráfico temporal
- páginas más vistas
- distribución útil si ya existe información suficiente

No agregar métricas que la arquitectura actual NO captura.

IMPORTANTE:

Existe una implementación de analítica first-party y un gate de privacidad.

NO deshabilitar ni saltarse ese gate.

NO activar tracking simplemente para hacer aparecer gráficos.

Primero auditar:

- pipeline existente
- tablas
- policies
- feature flags/env
- privacy gate
- eventos capturados

Si analytics está desactivado por privacidad:

mostrar un estado profesional.

NO mostrar:

"No habilitada"

como un bloque visual pobre.

Diseñar un DisabledState coherente explicando:

"Analítica aún no habilitada"

con icono, contexto y estado de configuración.

No fabricar números.

Cuando analytics se encuentre habilitada, mostrar automáticamente la información real.

---

# 11. CHARTS

Evaluar stack existente.

A fecha 29/09/2026, una solución razonable es:

Recharts v3

especialmente si usamos componentes Chart de shadcn/ui.

NO instalar otra librería de gráficos si Recharts ya existe.

Los gráficos deben:

- usar tokens institucionales
- responder al container
- tener tooltip
- estados empty
- estados loading
- accesibilidad razonable
- no usar 10 colores sin necesidad
- no utilizar gradients exagerados
- mantener visual profesional

Azul Castelao como serie principal.

Naranja institucional como serie secundaria/acento cuando tenga sentido.

---

# 12. SKELETONS Y LOADING

Actualmente al cambiar de rutas no existe feedback de carga apropiado.

Implementar correctamente el mecanismo de App Router.

Usar:

- `loading.tsx`
- React Suspense cuando corresponda
- skeletons representativos de cada contenido

NO utilizar un spinner gigante en el centro de la pantalla.

Ejemplos:

Dashboard:
skeleton de KPI cards + chart.

Consultas:
skeleton de filtros + filas de tabla.

Contenido:
skeleton de toolbar + cards/rows.

Usuarios:
skeleton del formulario correspondiente + tabla.

La estructura general:

Sidebar
Topbar

debe permanecer estable mientras carga el contenido.

La navegación debe sentirse inmediata.

---

# 13. TRANSICIONES

Las animaciones deben ser sutiles.

No quiero una web animada estilo landing page.

Utilizar preferentemente:

CSS transitions

para:

- hover
- focus
- menus
- sidebar
- cards pequeñas

Si el proyecto usa React >= 19.3, evaluar `ViewTransition` para transiciones apropiadas.

Si necesitamos animaciones más complejas y Motion aporta valor real, se puede instalar:

`motion`

pero NO incorporarlo si unas pocas transiciones CSS resuelven lo mismo.

Siempre respetar:

`prefers-reduced-motion`

---

# 14. CONSULTAS

Actualmente los filtros:

Todas
new
in_progress
closed
spam

parecen enlaces/texto.

Rediseñar completamente esta pantalla.

Traducir UI al español.

Estados visuales:

Todas
Nuevas
En progreso
Cerradas
Spam

Usar tabs/segmented control/badges.

Tabla/listado debe contemplar:

- nombre/contacto si legalmente y técnicamente disponible
- asunto
- fecha
- estado
- acción

No mostrar información que no existe.

Añadir búsqueda solamente si puede realizarse correctamente sobre información real.

Estado vacío:

"No hay consultas"

con EmptyState profesional.

No usar una card gigante con una frase como única interfaz.

IMPORTANTE:

La recepción pública de consultas se encuentra sujeta al gate existente de privacidad/configuración.

NO habilitarla automáticamente.

---

# 15. CONTENIDOS / CMS

Actualmente:

Todo
Blog
Noticias

también parecen texto suelto.

Rediseñar.

HEADER:

Blog y noticias

CTA:
Nueva entrada

Luego filtros/tabs:

Todo
Blog
Noticias
Borradores
Publicados

si esos estados realmente existen en el dominio.

Listado profesional.

Cada elemento debería mostrar cuando exista:

- título
- tipo
- estado
- autor
- última modificación
- publicación
- acciones

Acciones contextuales:

Editar
Vista previa
Publicar
Despublicar

solo si actualmente son válidas en el modelo.

El botón "Nueva entrada" debe usar icono y jerarquía primaria adecuada.

---

# 16. USUARIOS Y ROLES

La interfaz actual muestra UUID como si fuese el nombre del usuario.

Eso es una mala experiencia.

Auditar cómo se relacionan:

Supabase Auth
profiles
roles
admin_users
o las tablas realmente existentes.

No inventar tablas.

Cuando sea posible mostrar:

Nombre
Email
Rol
Estado
Último acceso si se dispone realmente
Acciones

El UUID puede existir como información técnica secundaria, pero jamás ser el identificador principal visual salvo que no haya ninguna alternativa real.

IMPORTANTE:

Si para obtener emails de Auth se necesita una llamada administrativa:

- hacerla server-side
- jamás enviar service role al cliente
- respetar autorización superadmin

Rediseñar el formulario de invitación.

Actualmente ocupa demasiado espacio.

Debe sentirse como una herramienta administrativa moderna.

Puede utilizar modal/dialog o card compacta según arquitectura.

Roles siempre en español visualmente aunque internamente permanezcan:

superadmin
admin
editor
viewer

No romper los valores de DB.

---

# 17. DATATABLES

Antes de instalar nada comprobar dependencias existentes.

Si se necesita una infraestructura avanzada de tablas y NO existe una adecuada, evaluar:

`@tanstack/react-table`

A fecha de referencia, usar la versión estable actual compatible con el proyecto.

Preferir TanStack Table v9 para una implementación nueva si no hay restricciones de compatibilidad.

NO migrar desde una implementación existente únicamente "porque es más nueva" si no aporta valor.

La tabla debería permitir según pantalla:

- sorting
- filtering
- pagination
- responsive
- loading
- empty states

No implementar features innecesarias.

---

# 18. COMPONENTES UI

Auditar si existe shadcn/ui actualmente.

Si ya existe:

utilizarlo consistentemente.

Si no existe:

evaluar incorporar únicamente los componentes necesarios.

Componentes potencialmente útiles:

- Sidebar
- Button
- Card
- Avatar
- DropdownMenu
- Breadcrumb
- Tabs
- Badge
- Skeleton
- Sheet
- Dialog
- AlertDialog
- Tooltip
- Select
- Input
- Table
- Pagination
- Sonner
- Chart

NO instalar veinte componentes que no usaremos.

Los componentes deben adaptarse al Design System Castelao.

No dejar el tema default de shadcn.

---

# 19. ICONOGRAFÍA

Usar una familia consistente.

Si Lucide ya está instalado, usar Lucide.

Si shadcn está presente probablemente esta sea la opción apropiada.

No mezclar:

Lucide
Heroicons
FontAwesome
SVG manuales

en la misma interfaz sin necesidad.

Iconos sugeridos conceptualmente:

Resumen → LayoutDashboard
Analítica → ChartNoAxesCombined / ChartColumn
Consultas → Inbox
Contenidos → FileText / Newspaper
Usuarios → Users
Configuración → Settings
Perfil → User
Salir → LogOut

Seleccionar los iconos actuales disponibles en la versión instalada.

---

# 20. FEEDBACK

Toda mutación debe tener feedback.

Por ejemplo:

Guardar usuario
Enviar invitación
Cambiar contraseña
Guardar contenido
Publicar
Cambiar estado

Debe contemplar:

idle
pending
success
error

Evaluar Sonner si el proyecto no tiene sistema de toast.

No utilizar `alert()`.

---

# 21. EMPTY STATES

Crear un componente reutilizable.

Debe existir diferencia entre:

EMPTY:
no existen registros.

FILTER EMPTY:
existen registros pero el filtro no devuelve resultados.

DISABLED:
feature desactivada.

ERROR:
la consulta falló.

LOADING:
información aún cargando.

No mezclar estos estados.

---

# 22. RESPONSIVE

Validar como mínimo:

375 px
768 px
1024 px
1440 px
1920 px

Desktop:
sidebar + topbar.

Tablet:
sidebar colapsable.

Mobile:
drawer.

Las tablas deben tener estrategia responsive.

No simplemente overflow horizontal para absolutamente todo si puede evitarse.

---

# 23. ACCESIBILIDAD

Mantener al menos:

- semantic HTML
- focus-visible
- navegación por teclado
- aria-label cuando corresponda
- labels reales
- contraste WCAG razonable
- botones con nombre accesible
- no depender solo de color
- prefers-reduced-motion

El indicador activo del menú no puede depender únicamente del color.

---

# 24. DENSIDAD VISUAL

El panel actual tiene demasiado espacio vacío.

Un admin debe tener una densidad de información mayor que el sitio público.

No significa saturarlo.

Objetivo:

limpio + operacional.

Cards:
padding aproximadamente 20–24 px.

Grid:
gaps coherentes.

Content:
usar correctamente todo el ancho disponible.

No utilizar hero sections.

No utilizar headings gigantes.

No utilizar bloques editoriales típicos del sitio público.

---

# 25. DESIGN TOKENS

Antes de crear estilos:

LOCALIZAR el sistema actual de tokens.

Auditar:

- globals.css
- tailwind config si corresponde
- CSS variables
- font definitions
- design-system
- components
- theme
- branding/assets

No duplicar tokens.

Crear tokens administrativos adicionales solamente si realmente se necesitan.

Ejemplo conceptual:

--admin-sidebar
--admin-sidebar-foreground
--admin-sidebar-active
--admin-surface
--admin-border
--admin-muted

pero reutilizar tokens semánticos existentes siempre que sea posible.

Nunca llenar componentes con:

bg-[#0079BE]
text-[#...]

si podemos usar variables/tokens.

---

# 26. ESTRATEGIA DE DATOS

Mantener Server Components por defecto.

Usar Client Components únicamente cuando hagan falta:

- interacción
- dropdowns
- filters
- charts
- forms
- sidebar state

No convertir todas las páginas admin en `"use client"`.

Obtener datos sensibles server-side.

Mantener separación:

UI
services/actions
repositories/data access
Supabase

según la arquitectura existente.

No introducir una arquitectura paralela.

---

# 27. ANALYTICS FIRST-PARTY

Auditar implementación existente antes de tocarla.

No asumir que está rota simplemente porque la UI dice "No habilitada".

Revisar:

schema
queries
events
privacy gate
environment
capture logic
RLS

Determinar:

IMPLEMENTADO
CONFIGURADO
HABILITADO

Son tres estados diferentes.

Documentarlo.

Si falta únicamente UI:
conectarla.

Si falta configuración:
documentarla.

Si está deliberadamente bloqueada por privacidad:
NO saltarse el bloqueo.

---

# 28. SECURITY

Preservar y verificar:

Supabase Auth
middleware
server guards
roles
RLS

Usuarios sin permisos:

no deben acceder a /admin.

Viewer/editor/admin/superadmin:

deben respetar capacidades existentes.

No conceder acceso en base a:

email hardcodeado
metadata insegura
estado client-side

No confiar en ocultar botones como mecanismo de autorización.

Autorización real debe ocurrir server-side / database según corresponda.

---

# 29. ESTADO DEL PROYECTO

Necesito que desde esta iteración exista un documento vivo:

`docs/ADMIN_REDESIGN_STATUS.md`

Si `/docs` no existe, utilizar una ubicación coherente con el repositorio.

Este documento debe actualizarse EN CADA ITERACIÓN.

Formato obligatorio:

# Admin Redesign Status

Última actualización:
29/09/2026

## Stack verificado

...

## Funcionalidad existente antes de esta iteración

...

## Implementado

- [x] ...

## Parcial

- [~] ...

## Pendiente

- [ ] ...

## Bloqueado

...

## Decisiones técnicas

...

## Paquetes agregados

...

## Migraciones

...

## Riesgos

...

## Próximo paso recomendado

...

No marcar algo como completado si solamente existe UI.

Diferenciar siempre:

UI implementada
backend implementado
integración funcionando
producción habilitada

---

# ESTADO CONOCIDO ANTES DE ESTA ITERACIÓN

Verificarlo contra el repositorio y corregir el documento si algo cambió.

Actualmente tenemos:

[x] sitio institucional multipágina
[x] Next.js App Router
[x] TypeScript
[x] Tailwind
[x] Design System inicial
[x] Supabase conectado
[x] Supabase Auth administrativo
[x] acceso admin protegido
[x] panel `/admin`
[x] Resumen básico
[x] sección Analítica básica
[x] sección Consultas básica
[x] sección Contenidos básica
[x] sección Usuarios/Roles básica
[x] roles persistidos de forma segura
[x] CMS con estructura inicial
[x] infraestructura inicial de analytics first-party
[x] consultas preparadas para persistencia real
[x] sin datos ficticios
[x] sin mocks para producción

PARCIAL / A REVISAR:

[~] Dashboard profesional
[~] Analytics visual
[~] CMS UX
[~] Usuarios UX
[~] Consultas UX
[~] Design System aplicado al admin

PENDIENTE:

[ ] Admin Shell profesional
[ ] Topbar
[ ] Sidebar moderno
[ ] active navigation
[ ] sidebar responsive
[ ] sidebar colapsable
[ ] breadcrumbs
[ ] perfil
[ ] cambio de contraseña
[ ] skeletons
[ ] loading states
[ ] polished empty states
[ ] error states
[ ] filtros profesionales
[ ] charts analytics
[ ] tablas administrativas modernas
[ ] mobile UX
[ ] feedback visual mutations
[ ] visualización correcta de usuarios
[ ] auditoría completa de accesibilidad
[ ] auditoría responsive
[ ] documentación de estado permanente

BLOQUEADO / NO ACTIVAR SIN AUTORIZACIÓN:

- captura pública de información si privacy gate continúa cerrado
- cualquier analytics que vulnere el gate existente
- producción
- merge main
- migraciones remotas destructivas

---

# FASE DE TRABAJO 0 — AUDITORÍA OBLIGATORIA

ANTES DE MODIFICAR CÓDIGO:

Inspeccionar:

package.json
package lock correspondiente
app/admin
components
design-system
styles
globals.css
fonts
assets
Supabase clients
middleware
auth
roles
queries
analytics implementation
CMS
consultations
users

Identificar:

1. qué existe
2. qué funciona
3. qué está duplicado
4. qué está desactualizado
5. qué componentes podemos reutilizar
6. qué dependencias faltan
7. qué dependencias NO debemos agregar

También comprobar versiones reales de:

Next.js
React
React DOM
Tailwind
Supabase
shadcn
Recharts
TanStack
Motion
Lucide

No asumir versiones.

---

# INVESTIGACIÓN DE LIBRERÍAS

Como estamos a 29/09/2026:

si es necesario agregar o actualizar una dependencia:

CONSULTA documentación oficial actual.

No utilices un paquete simplemente porque lo conocías de versiones antiguas.

Prioriza:

- proyectos mantenidos
- versiones estables
- React actual
- Next.js actual
- TypeScript
- tree-shaking
- accesibilidad
- poca complejidad

Referencias válidas a evaluar:

Next.js App Router
React
shadcn/ui
Recharts v3
TanStack Table v9
Motion
Lucide

NO actualices automáticamente dependencias major del proyecto simplemente porque existe una versión nueva.

Primero analizar impacto.

---

# FASE 1 — FOUNDATION

Implementar primero:

AdminShell
Sidebar
Topbar
Breadcrumb
UserMenu
responsive structure
active state
tokens admin

Sin esto no avanzar a maquillajes individuales por página.

---

# FASE 2 — LOADING UX

Implementar:

loading.tsx
Suspense
route-level skeletons
component-level skeletons donde tenga sentido

La navegación debe sentirse inmediata.

---

# FASE 3 — DASHBOARD

Rediseñar Resumen.

Conectar únicamente datos reales.

Si algún datasource está disabled:

usar DisabledState.

---

# FASE 4 — ANALYTICS

Crear visualización real.

Auditar privacy gate.

Implementar:

KPI
period filters
chart
top pages

solamente según datos realmente disponibles.

---

# FASE 5 — CONSULTAS

Rediseñar tabla/listado.

Tabs.
Estados.
Empty/filter states.
Detail UX si ya existe.

---

# FASE 6 — CMS

Rediseñar:

listado
filters
new content CTA
status
actions

Sin romper editor existente.

---

# FASE 7 — USERS

Rediseñar:

invite
users table
roles
status
actions

No mostrar UUID como label principal si existe información humana disponible.

---

# FASE 8 — PROFILE

Implementar:

profile UI
password change
security
feedback

---

# FASE 9 — POLISH

Revisar:

animations
responsive
keyboard
focus
empty
error
loading
spacing
typography
visual consistency

---

# FASE 10 — QUALITY GATE

Ejecutar comandos reales disponibles en el proyecto.

Como mínimo:

lint
typecheck
tests
build

Si existen tests de integración/e2e, ejecutarlos.

No inventar resultados.

Corregir regresiones introducidas.

---

# CRITERIOS DE ACEPTACIÓN VISUALES

No considero esta tarea terminada si ocurre cualquiera de estos puntos:

- el menú no muestra la sección activa
- las tabs parecen texto plano
- el contenido continúa usando solamente media pantalla
- hay UUIDs como identidad principal
- no existe topbar
- no existe menú de usuario
- no existe perfil
- no existe cambio de contraseña
- una navegación muestra página blanca mientras carga
- solo hay spinners donde deberían existir skeletons
- las cards parecen las actuales con border-radius distinto
- analytics muestra métricas falsas
- analytics salta privacy gate
- mobile rompe
- tablas no tienen jerarquía
- el sidebar sigue completamente rígido
- se usan colores fuera del Design System
- se reemplaza la identidad Castelao por un tema default shadcn
- se duplica el sistema de diseño
- se rompe el sitio público
- se rompe RLS
- se degrada auth

---

# ESTÉTICA OBJETIVO

Quiero una mezcla conceptual entre:

- dashboard SaaS moderno
- producto institucional serio
- software clínico/administrativo profesional

NO copiar literalmente ningún producto externo.

Características:

- limpio
- sobrio
- confiable
- moderno
- ordenado
- denso cuando corresponde
- accesible
- institucional

Nada de estética:

"landing page dentro del admin".

---

# IMPORTANTE SOBRE EL COLOR

No pintar todo azul.

El azul institucional debe estructurar marca y acciones primarias.

Fondos principales:

neutrales claros.

Superficies:

blanco / neutral.

Sidebar:

puede utilizar azul institucional oscuro/derivado si el Design System ya lo contempla.

Naranja:

acento cuidadosamente controlado.

Estados:

success/error/warning deben utilizar semántica propia, no colores de marca forzados.

---

# ENTREGA ESPERADA

Después de implementar, responder con un reporte técnico que contenga:

## Diagnóstico inicial

Qué estaba mal y por qué.

## Arquitectura aplicada

Qué componentes se crearon/modificaron.

## UX/UI

Qué problemas quedaron resueltos.

## Dependencias

Qué se agregó o actualizó y por qué.

## Seguridad

Confirmar que Auth/RLS no fueron debilitados.

## Analytics

Indicar específicamente:

- implementada
- configurada
- habilitada

sin confundir conceptos.

## Archivos principales

Lista de archivos relevantes.

## QA

Resultado real de:

lint
typecheck
tests
build

## Estado

Resumen:

COMPLETADO
PARCIAL
PENDIENTE
BLOQUEADO

## Próximo paso

Indicar UNA siguiente iteración recomendada.

---

# FORMA DE TRABAJO

No me preguntes decisiones menores de UI que puedas resolver profesionalmente.

Audita y toma decisiones razonables basadas en:

Design System
arquitectura existente
accesibilidad
UX
mantenibilidad

Sí debes detenerte si encuentras:

- necesidad de migración destructiva
- cambio de arquitectura crítico
- cambio en políticas de privacidad
- cambio de RLS riesgoso
- necesidad de activar producción
- credenciales faltantes
- operación irreversible

No hagas refactors ajenos al panel.

No modifiques contenido del sitio público salvo que sea estrictamente necesario para reutilizar Design System.

Empieza ahora por FASE 0.

Audita primero el repositorio.

Después implementa desde FASE 1 hacia adelante.

No comiences retocando páginas individuales sin construir primero la estructura común del admin.