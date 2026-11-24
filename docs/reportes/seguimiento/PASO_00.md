# Paso 00 — Auditoría, trazabilidad y recorridos

Fecha / entorno / rama / commit si existe: 2026-10-09, local, `codex/seguimiento-terapeutico`, HEAD `4fbf785`, cambios previos sin commit preservados.

Estado: Validado localmente (auditoría).

Objetivo y requisitos cubiertos: §2/4/5/12/14/16/17; inventario existente/parcial/nuevo, matriz de requisitos, propuesta aditiva y decisiones pendientes.

Cambios implementados y rutas disponibles: seis documentos de seguimiento y este reporte; ninguna ruta nueva en Paso 0. Reutilización de shells, Auth SSR/getUser, componentes institucionales, pacientes/grupos y biblioteca.

Migraciones / configuración requerida: Paso 1 aditivo; no tablas clínicas existentes. Catálogos/criterios institucionales pendientes. Stack local disponible.

UX/UI: recorridos probados, móvil, teclado y gráficos: diseño de recorridos documentado en PLAN; aún no se afirma prueba visual ni gráficos implementados.

Permisos: perfiles y casos positivos/negativos comprobados: revisión de separación CMS/biblioteca y helpers/RLS actuales; matriz clínica diseñada. Pruebas de aislamiento nuevas corresponden al Paso 1.

Datos/métricas: fuentes, reglas y casos límite verificados: no existen actividades programadas/autorreportes/asistencia; materiales activity/report no se interpretan como tales. Contrato n/N, sin datos y rangos definido, sin métricas calculadas todavía.

Pruebas: comando, resultado real y evidencia segura: `git status --short`, `git branch --show-current`, inventario `rg --files`, búsqueda de modelos/rutas y lectura de migraciones/docs; `node scripts/patient-local.mjs status` PASS con escalación local, claves ocultas. Conteos históricos no reutilizados.

Fallos detectados y correcciones: permiso inicial en `.git` y telemetría CLI fuera de workspace; escalación local permitió crear rama y comprobar QA. Changelog markdown no legible por web; consultada versión HTML oficial. Ninguna dependencia actualizada.

Pendientes/bloqueos y su impacto: criterios clínicos y catálogo de fases no entregados; usar configuración vacía/no evaluable, sin impedir construcción local. Texto pegado original no encontrado entre archivos; requisitos trazados contra la especificación disponible.

Qué está local, qué está desplegado y qué no se probó: documentos locales; no cambios remotos ni comprobaciones productivas. Aislamiento nuevo y recorridos UI por construir.

Siguiente paso concreto: Paso 1, permisos/asignaciones/episodios con RLS y lectura reservada segregada, seguido de Paso 2.
