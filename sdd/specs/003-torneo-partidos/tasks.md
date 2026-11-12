# 📋 Plan de Tareas: Partidos y Estadísticas en Torneos

## 🚦 Leyenda de Estado
`[ ]` pendiente · `[x]` completada

## 📦 Fase 1: Base de Datos y Modelo de Datos
- [x] Columna `TorneoPartidos.idPartido` e índice (migración idempotente).

## 🌐 Fase 2: Capa Backend y Endpoints API
- [x] `lib/partidos.js` con `crearPartidoConEquipos()`; `POST /api/partidos` refactorizado para usarlo.
- [x] `sincronizarPartidos()`, `aplicarResultado()`, `buscarVinculo()` y `eliminarTorneo()` en `lib/torneosDb.js`.
- [x] Integración en creación de torneo, eliminatoria, GET (torneos antiguos), PUT de resultado y DELETE.
- [x] Hooks en `PUT /api/partidos/:id` (culminar/reabrir) y `DELETE /api/partidos/:id` (409).
- [x] Normalización `undefined → null` en args de Partido, Jugadores y Equipos.

## 🎨 Fase 3: Capa Frontend e Interfaces (Next.js 16)
- [x] Enlaces al partido en `ResultadoModal`; aviso del torneo en el detalle del partido; nombre del torneo en la lista.
- [x] Mensajes de error al culminar, reabrir o eliminar.

## 🧪 Fase 4: Pruebas, Verificación y Refinamiento
- [x] `next build` OK; ESLint limpio en archivos tocados.
- [x] E2E: Partidos creados con alineación (4 jugadores); culminar 0–0 en eliminatoria → rechazo; stats → culminar 70–55 → avance y creación del Partido de la final; reabrir → limpia el torneo y descarta la final pendiente; marcador rápido → Partido *Culminado*; 409 al borrar un Partido de torneo y al reabrir si el ganador ya jugó; las estadísticas del torneo aparecen en Reportes; otra cuenta recibe 404.
