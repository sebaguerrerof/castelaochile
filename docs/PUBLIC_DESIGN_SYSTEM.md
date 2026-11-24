# Castelao Chile — sistema visual público

Rediseño del 30 de septiembre de 2026. Referencia visual: https://www.institutocastelao.com/. Fuente de identidad: `Manual de Identidad Corporativa Castelao.pdf`, páginas 9–14 y normas de logotipo. La referencia de España orienta composición, fotografía y navegación; el contenido, precios y canales siguen siendo los datos de Chile en el CMS.

## Identidad y tokens

- Azul principal: `#0079be`; naranja de acento: `#da8a1b`; gris corporativo: `#868685`.
- Tonos de interfaz derivados: azul oscuro para legibilidad sobre fotografía, azul claro para superficies y bordes neutros. No reemplazan los colores corporativos del logotipo.
- PT Sans en títulos; Arial en navegación y lectura; Volkhov en citas. Las fuentes web existentes se sirven con `next/font`. Las leyendas usan la familia serif configurada con fallback; no se añadió una fuente propietaria ni se reconstruyó el logotipo con texto.
- Espaciado público: `clamp(3rem, 5.5vw, 5.25rem)`; esquinas: `.5rem`; sombras contenidas; ancho de lectura acotado. Los tokens públicos y componentes están en `src/app/(public)/public-design.css`.

## Navegación

Una fila de navegación desde 1180 px. Instituto, Tratamientos, Familias, Información y Contacto agrupan las páginas **publicadas y visibles** recibidas del CMS. Si un grupo tiene un enlace, se muestra directamente con su etiqueta editorial. Inicio queda accesible desde el logotipo y desde el menú móvil. Los grupos y sus elementos respetan la prioridad de navegación del CMS. Las páginas nuevas permanecen accesibles en Información.

Desplegables con hover de ratón, clic y teclado, Escape, cierre al salir del grupo o hacer clic fuera. La salida del ratón tiene 140 ms de tolerancia para evitar cierres durante el recorrido hacia el panel; reingresar cancela ese cierre. El panel usa opacidad y desplazamiento de 8 px durante 200–220 ms, con flecha animada. Cerrado queda `inert` y `aria-hidden`, incluso durante la transición de salida. Se respeta movimiento reducido y no se activa hover con eventos táctiles. El menú móvil usa `dialog.showModal()`, fondo modal, bloqueo de scroll, navegación agrupada, ciclo de Tab/Shift+Tab y retorno de foco. Se cierra al elegir ruta, con Escape o al pasar al breakpoint desktop. No agrega dependencias ni un segundo origen de navegación.

## Componentes públicos

- Hero de Inicio con fotografía del CMS a todo el ancho y contraste azul. Páginas interiores con composición de texto y fotografía; en móvil el título y los botones conservan prioridad sobre la imagen.
- Texto enriquecido en composición editorial de dos columnas; lectura acotada y alineada a la izquierda.
- Tarjetas, principios y pasos con jerarquía, numeración y superficies consistentes. Las tarjetas pueden tener una ruta o URL segura opcional, editable en el admin.
- Precios con importe protagonista, unidad y condiciones legibles, conservando los valores institucionales.
- Equipo con plantilla genérica, credenciales y enlaces a perfiles. Sin foto se muestran iniciales diseñadas; no se inventa un retrato. Al cargar una fotografía desde el admin reemplaza esta identidad.
- CTA en bandas azules, FAQ accesible, avisos clínicos diferenciados, galerías y canales de contacto.
- Contacto conserva el gate operativo. Si la recepción está cerrada, muestra canales confirmados y orientación de privacidad; no expone un formulario deshabilitado ni detalles internos de implementación.
- Blog, artículos, filtros, botones y footer comparten las mismas proporciones y colores. Se corrigió el icono de WhatsApp, cuyos dos rellenos blancos impedían distinguir el teléfono.
- Entrada de página breve sin reducir la opacidad de todo el contenido. Se respeta `prefers-reduced-motion`.

## Relación con el administrador

`CmsPageView` y `ProfessionalProfile` son los mismos en público y preview. El CSS público también se importa en el layout protegido, con selectores acotados que conservan los controles del admin. Textos, fotografías, alt, precios, estado, orden y SEO siguen en Supabase. Header/footer reciben navegación y configuración del mismo repositorio.

Se aplicaron dos migraciones de contenido: `20260930172631_public_design_card_links.sql` agrega destinos a las tres tarjetas iniciales de Inicio conservando texto, orden y destinos existentes. `20260930180600_public_contact_copy.sql` reemplaza dos textos operativos originales de Contacto por orientación clara para el visitante, sin sobrescribir copy ya editado, y actualiza las versiones de página. No cambian precios, condiciones clínicas, Noticias ni perfiles.

## QA reproducible

Comandos: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` y `pnpm audit --prod`.

`scripts/qa-public-design.mjs` usa Playwright disponible en el runtime y Chrome instalado. Comprueba el header en 320, 375, 390, 768, 1024, 1180, 1280, 1440 y 1920 px; páginas interiores, Equipo, perfil, Contacto, Blog y artículo en móvil/tablet/desktop; teclado, modal, enlaces de tarjetas y movimiento reducido. Artefactos ignorados en `tmp/public-design-qa`.

`scripts/qa-cms-browser.mjs` conserva la QA de público/admin, preview y guardados de borradores, incluyendo destinos de tarjetas. Nunca publica fixtures; limpia registros y archivos al terminar. Resultados en `tmp/cms-qa`.

El frontend no se despliega por ejecutar estos scripts. La fotografía autorizada de Marcelo y otras confirmaciones editoriales continúan pendientes.

## Seguridad de dependencias

Durante el cierre, `pnpm audit --prod` detectó el aviso `GHSA-vcvr-r3jv-pc5j`, incorporado a la base de avisos el 30 de septiembre. Se actualizaron `next` y `eslint-config-next` de 16.3.5 a **16.3.6**, conservando las versiones exactas y el lockfile. No hay uso de `next/og` ni `ImageResponse` en las rutas del proyecto. La auditoría posterior al parche devuelve cero vulnerabilidades conocidas. Referencia: https://github.com/advisories/GHSA-vcvr-r3jv-pc5j.

## Resultado de la validación

Cierre del rediseño: lint, typecheck, build de producción con Next.js 16.3.6 y `git diff --check` aprobados; **53/53 pruebas unitarias**, **45 comprobaciones públicas de diseño/navegación** y **63 comprobaciones funcionales del CMS** aprobadas. La auditoría de dependencias de producción devuelve cero vulnerabilidades conocidas.

La base conserva 232 artículos. El cierre de QA confirmó cero páginas, profesionales y artículos de prueba pendientes. Las capturas y resultados quedan en las carpetas ignoradas indicadas arriba. Vista previa local de producción: `http://localhost:3300`; no se desplegó el frontend.

Ajuste posterior del header: **48 comprobaciones públicas aprobadas**, incluyendo hover en los tres grupos, recorrido hacia sus enlaces, cierre animado, enlaces cerrados fuera del foco y movimiento reducido. También se verificaron reingreso rápido del cursor, clic sobre un panel abierto y operación táctil en desktop/móvil. Lint sin advertencias, typecheck, las 53 pruebas existentes y build aprobados. La vista previa local se actualizó con este cambio.

## Recuperación del entorno local del blog

El registro del navegador mostró módulos de Next.js 16.3.5 después de actualizar las dependencias a 16.3.6. Se reprodujo el error al navegar desde Inicio hacia Blog en el servidor de desarrollo 3000; la vista previa 3300 funcionaba. El proceso antiguo se detuvo y su caché `.next` se conservó en `tmp` antes de regenerarla. El arranque limpio reveló una instalación incompleta: el enlace a PostCSS 8.5.28 existía, pero faltaban los archivos del paquete. Se reparó con `pnpm install --frozen-lockfile --force`, sin cambiar versiones.

Ambos servidores ahora ejecutan 16.3.6. Se verificaron **16 recorridos/rutas** entre los dos puertos: navegación Inicio → header → Blog → artículo con prefetch normal, búsqueda, paginación y cinco artículos del registro, sin errores JavaScript ni respuestas 500. Pasaron las 53 pruebas existentes. Resultados en `tmp/blog-runtime-recovery.json`. Una pestaña que conserva los módulos anteriores debe realizar una recarga completa para recibir los archivos actuales. Al actualizar Next.js durante desarrollo, reiniciar el proceso antes de continuar la revisión.

## Publicación para el cliente

El 30 de septiembre se desplegó el commit `ecd363f` en https://castelaochile.vercel.app. Vercel confirmó Production Ready y build aprobado. Las **48 comprobaciones públicas** pasaron en esa URL; también se comprobó la navegación normal hacia Blog y artículos, búsqueda, paginación y redirección del admin sin sesión. Se conserva el modo review/noindex. Detalle de despliegue y alcance del QA remoto: [CASTELAO_CMS_STATUS.md](./CASTELAO_CMS_STATUS.md).
