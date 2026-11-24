# Paso 07 — Recovery y seguimiento familiar

Fecha / entorno / rama / commit si existe: 2026-10-09, QA local `castelao-patient-qa`, localhost:3450, rama `codex/seguimiento-terapeutico`, base `4fbf785`, cambios sin commit. Migración creada con timestamp UTC 2026-10-10. Producción sin cambios.
Estado: Validado localmente (mecanismos). Aprobación institucional de la rúbrica pendiente; no se declara aceptación clínica ni activación productiva.

Objetivo y requisitos cubiertos:

§10/§12: autonomía por dimensión con evidencia, fecha, evaluador y no evaluable; instrumentos versionados e inmutables tras aprobar; familia con participantes mínimos, fuente, autor, sesiones y acuerdos. El usuario confirmó que aún no hay rúbrica aprobada. Por ello la funcionalidad disponible inicia con observaciones cualitativas: no se crea una escala ni un puntaje institucional. El mecanismo de aprobación se prueba solo con instrumentos explícitamente sintéticos que se eliminan al terminar.

Cambios implementados y rutas disponibles:

- Ficha → `/autonomia`, `/autonomia/nuevo`, `/autonomia/[oid]`: una dimensión por formulario, origen en registro Recovery propio finalizado, borrador privado, finalización y enmiendas. Ocho dimensiones del documento; evidencia máxima 600 caracteres. Un registro por sesión y dimensión. Enlace contextual desde el registro profesional y enlace de vuelta a su revisión exacta.
- `/admin/seguimiento/rubricas`: borradores, selección explícita de dimensiones y niveles sin valores por defecto, aprobación con referencia del equipo, nueva versión y retiro. Aprobadas inmutables; se conserva historial interno. Versión nueva no modifica observaciones antiguas.
- Ficha → `/familia`, `/familia/nuevo`, `/familia/[fid]`: sesión familiar propia de agenda, participantes por alias/iniciales y vínculo, objetivo/fuente, campos breves de comunicación, límites, responsabilidades, apoyo/rescate, avances y observaciones. Nota reservada independiente por versión y lectores explícitos. Máximo seis participantes; no se crean cuentas familiares.
- Acuerdos privados con responsable mínimo, fecha y resultado profesional, historia y cancelación. Compartir exige un texto independiente y confirmación expresa; retirar ese texto funciona también con acuerdos cumplidos.
- `/pacientes/compromisos`: reutiliza el portal existente para mostrar exclusivamente texto publicado, fecha y estado. No recibe título interno, responsable, participantes, fuente, resultado interno ni reserva.
- Listas de 25 registros; periodos 7/30/90 y episodio actual. Autonomía cualitativa en timeline con fuentes; niveles ordenados según instrumento aprobado en SVG, niveles categóricos como cantidades. Cada dimensión/versión tiene su propia visualización. Familia muestra cantidades previstas/realizadas, cobertura de registro y acuerdos vencidos cumplidos, con fuente de agenda.

Migraciones / configuración requerida:

`supabase/migrations/20261010000320_care_recovery_family.sql`, creada con `supabase migration new`: diez tablas (tres metadatos públicos, siete privadas), RLS en todas, siete RPC públicas invoker y sus implementaciones privadas definer con `search_path=''`; auxiliar interno de rango sin grant. Reutiliza `care_family_notes` y lectores del Paso 1. Privilegios explícitos; sin escritura directa de la aplicación. Aplicada y revisada solo en el contenedor marcado mediante `care-local apply` y `refresh-recovery-family-functions`, conservando datos/historial. Sin seeds clínicos ni cambios de paquetes, credenciales o activación productiva.

UX/UI: recorridos probados, móvil, teclado y gráficos:

Panel, Auth, colores, navegación, CareForm/CareField y estados existentes. Campos opcionales bajo secciones desplegables; borrador secundario y finalización primaria con confirmación. Participantes mínimos y reserva separados del texto del paciente. Gráficos con etiquetas aprobadas, fechas legibles fuera del SVG y lista de evidencia por revisión; el gráfico abre esa alternativa nombrada, accesible por teclado. No evaluable interrumpe líneas, no se convierte en cero. Sin episodio muestra la ausencia de fecha de ingreso.

Consolidación final PASS: 227 controles UX, 46 rutas/estados y 18 contextos, cero hallazgos abiertos. Incluye 57 controles nuevos de Recovery/familia y 170 de regresión; anchos 320/375/768/1440 y menú 320×568, foco/teclado/contraste, barra contraída/cuenta y secciones abiertas en móvil. Capturas seleccionadas inspeccionadas visualmente, incluidas trayectoria con hueco/versiones, rúbricas, formularios familiares, portal y ausencia de ingreso. No acredita certificación WCAG ni pruebas con dispositivos físicos.

Permisos: perfiles y casos positivos/negativos comprobados:

Lectura de ficha y autonomía: cuenta staff vigente, patient.read/records.read y asignación actual. Escribir autonomía exige además records.create, autoría del registro Recovery y asignación vigente Recovery. Configurar/aprobar instrumentos: decisions.manage + records.read; rol CMS o superadmin técnico no concede clínica. Familia añade family.read; registro propio de agenda y records.create para modificar. Coordinación familiar finalizada para lectores clínicos con familia y alcance; borradores solo propios. Reservas por versión solo autor o lector concedido expresamente, con permisos/alcance actual. Nueva reserva no hereda lectores. Auditoría de actor/acción/recurso sin contenido. Portal: propia identidad activa y proyección mínima; no lee RPC clínica ni datos de otra persona. Revocación se comprueba con JWT existente.

Datos/métricas: fuentes, reglas y casos límite verificados:

Autonomía: última revisión final por observación, dentro del rango elegido; borradores no son mediciones. Cualitativas/evaluadas/no evaluables conservan su estado. Categorías no se promedian; instrumentos separados por ID y versión, sin score. Para una rúbrica ordenada, eje ordinal rotulado con su leyenda y no una magnitud numérica. Nuevas observaciones solo seleccionan la versión aprobada vigente; enmiendas conservan su versión inicial incluso tras reemplazar/retirar el instrumento. Retirar la versión más reciente no vuelve a habilitar una anterior: comprobado en SQL y navegador. Un borrador nuevo no sustituye la versión aprobada.

Familia: sesiones esperadas son paciente–evento familiar no cancelado con término hasta el corte y comienzo dentro del periodo; realizadas requieren cierre efectivo y estado completed. Cobertura de registros = realizadas con al menos una sesión familiar finalizada / realizadas (no duplica autores). Acuerdos = cumplidos y verificados / acuerdos vencidos en rango, excluyendo cancelados. Se muestran cantidades y fuentes; sin N no se interpreta cumplimiento. Las notas y participantes no entran a agregados generales. Corte actual; no se presenta reconstrucción histórica ni comparación de niveles entre versiones.

Pruebas: comando, resultado real y evidencia segura:

- `node scripts/care-local.mjs db-test`: PASS, 495 SQL/RLS acumuladas, 95 nuevas; authenticated/anon y rollback completo. Incluye fuentes familiares 29, páginas 25+4, ausencia de episodio, especialidad vigente, reservas por versión y retiro sin reactivación.
- `node scripts/care-local.mjs recovery-family-e2e` con `CARE_UX_AUDIT=true`: ejecución final PASS, 33 controles nuevos con Auth/JWT normales y acciones servidor reales. Persistencia de borrador/fecha, finalización/enmienda, validación/foco, aprobación/versionado/retiro, clic del gráfico/hueco, privacidad, publicación independiente/retiro, concurrencia, revocación y limpieza.
- Regresiones de atención actuales: planificación 32, reportes 19, registros 24 y dashboard/indicadores 48 PASS (123 controles); con los 33 nuevos, 156 funcionales. `node scripts/patient-local.mjs db-test`: 76 SQL PASS con rollback. `node scripts/patient-local.mjs test`: 30 E2E biblioteca/Auth PASS, correo exclusivamente Mailpit.
- `node scripts/care-local.mjs build`: PASS con todas las rutas nuevas. `npm run typecheck`, `npm run lint`: PASS; `npm run test`: 95 PASS.
- `supabase db advisors --local --workdir tmp/patient-supabase-local --type all --level warn --fail-on error`: PASS; cinco WARN de rendimiento existentes, ninguno nuevo ni ERROR. `db lint` public/private: sin errores; tres avisos existentes de variables en planning/report_configure.
- `care-local ux-audit` ejecutó las cinco suites secuenciales y detectó los hallazgos descritos abajo; tras corregirlos se repitió Recovery/familia sobre el build final. `node scripts/care-local.mjs ux-report`: consolidación final PASS, 227 controles/18 contextos/46 rutas-estados, cero hallazgos. No se declara PASS el intento inicial fallido.
- Verificación independiente de limpieza, consulta local de solo lectura: Auth QA, perfiles, observaciones, sesiones familiares, acuerdos, rúbricas, alertas y valoraciones a cero; trigger `protect_last_active_superadmin` habilitado. Biblioteca registra cleanup completo y cero IDs pendientes.
- Evidencias ignoradas: `tmp/care-qa/db-results.json`, `recovery-family-e2e-results.json`, `ux/results.json` y PNG, `step-07-advisors.json`, `step-07-db-lint.txt`, `step-07-unit-tests.txt`, `step-07-cleanup-verification.txt`, resultados de biblioteca en `tmp/patient-library-qa`. Datos neutros y cuentas @example.test; claves y datos reales fuera de documentos/capturas.

Fallos detectados y correcciones:

SQL de fixture sin episodio generaba periodo vacío: se añadió ingreso explícito; periodo inválido se rechazaba como cast genérico y ahora tiene validación explícita. Tipos iniciales usaban Map.groupBy fuera del target actual: reemplazado por Map sin cambiar el target. Draft RPC inicialmente tenía forma de payload distinta del editor; corregida y verificada recarga de texto/fecha. Selección de lectores mediante tabla de capacidades ocultaba otros usuarios por RLS: elegibilidad se calcula en RPC bajo alcance actual. Se preserva la fecha de borrador aparte de la versión final. Se bloqueó inyección de instrumento en observación cualitativa existente y se endurecieron estructuras JSON. Edición Recovery exige especialidad vigente.

Revocar el último lector desmontaba el formulario y perdía confirmación: se conserva la acción y feedback aunque no queden lectores. Verificación/publicación/retiro hacen visibles sus estados finales; pruebas esperan el estado real. Pruebas leían URL/DOM antes de finalizar streaming y contaban círculos de iconos del shell: esperas explícitas y selectores dentro del gráfico. El fixture de niveles usaba un salto escapado: corregido a líneas reales. Fechas pequeñas dentro de SVG no eran legibles en móvil: trasladadas a texto y leyenda, letras ampliadas. Todos los intentos fallidos retiraron sus fixtures antes de repetir. Studio estaba deshabilitado; asesores consultados con CLI local vigente. La revisión visual del estado sin episodio detectó que una fecha null se mostraba como 1969: corregido el tipo nullable y comprobada la ausencia de ingreso en SQL/navegador/UX. La auditoría inicial detectó 12 hallazgos de jerarquía en cuatro anchos de configuración de rúbrica: borrador cambiado a secundario; repetición final sin hallazgos. Selección de rúbrica tras retiro corregida para no reactivar versiones anteriores; historial conservado y comportamiento verificado. El gráfico ahora abre su evidencia y esa interacción pasó en navegador. No se reutilizaron resultados fallidos como PASS.

Pendientes/bloqueos y su impacto:

**Aprobación institucional de la rúbrica pendiente**, confirmada por el usuario. El flujo local permite registrarla cuando exista; hasta entonces se usa cualitativo/no evaluable. Sin niveles de QA persistentes al cerrar. Aceptación profesional, tiempo real de llenado, dispositivos físicos, volumen/paginación de historiales extensos y acuerdos de retención/consentimiento en Paso 11. Indicadores nuevos son individuales y actuales; agregados generales conservan fuentes operativas del Paso 6 sin información de terceros. Decisiones/supervisión (8), informes (9), jobs/reglas/plazos (10) y QA integral (11) pendientes.

Qué está local, qué está desplegado y qué no se probó:

Código/SQL/UI locales. Ningún commit, push, db push remoto, despliegue, invitación familiar, correo externo o cambio de producción. No aprobación clínica real, usuarios reales, respaldo productivo, scheduler, dispositivos físicos o volumen de producción. Las categorías y actas de prueba son sintéticas y no representan el programa Castelao.

Siguiente paso concreto:

Paso 8: decisiones, tareas delegadas y supervisión. Mantener pendiente la aprobación institucional de la rúbrica y la aceptación final; ninguna de ellas se sustituye por instrumentos sintéticos de QA.
