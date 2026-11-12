# 📋 Plan de Tareas: Torneos con Diagrama

## 🚦 Leyenda de Estado
`[ ]` pendiente · `[x]` completada

## 📦 Fase 1: Base de Datos y Modelo de Datos
- [x] Tablas `Torneos`, `TorneoEquipos`, `TorneoPartidos` en `ensureSchema()`.

## 🌐 Fase 2: Capa Backend y Endpoints API
- [x] `lib/torneos.js` (lógica pura): siembra, cuadro con byes, round-robin (círculo), grupos serpiente, tabla, siembra de clasificados, nombres de ronda.
- [x] `lib/torneosDb.js`: `cargarTorneo()` con tablas calculadas y control de propiedad.
- [x] `GET/POST /api/torneos`, `GET/DELETE /api/torneos/[id]`.
- [x] `PUT /api/torneos/[id]/partidos/[idPartido]` con propagación del ganador, campeón, 400 empate en eliminatoria y 409 si la ronda siguiente ya se jugó.
- [x] `POST /api/torneos/[id]/eliminatoria` (formato grupos).

## 🎨 Fase 3: Capa Frontend e Interfaces (Next.js 16)
- [x] `/torneos`: tarjetas con progreso/campeón y asistente de creación (formato, deporte, fecha, equipos con siembra, sorteo, puntos, ida y vuelta, grupos, resumen en vivo).
- [x] `/torneos/[id]`: `Bracket` (columnas + conectores CSS + columna de campeón), `TablaPosiciones`, `Jornadas`, `ResultadoModal`.
- [x] Ítem *Torneos* en la barra lateral y KPI *Torneos en curso* en el Dashboard.

## 🧪 Fase 4: Pruebas, Verificación y Refinamiento
- [x] Pruebas unitarias de la lógica (siembra, byes, round-robin 2–8 equipos ida/vuelta sin choques por jornada, tabla, cruces 1A–2B).
- [x] Prueba E2E: eliminación de 6 equipos con byes hasta campeón y borrado de la final; liga de 5 equipos hasta campeón; grupos 2×3 → eliminatoria 1A–2B / 1B–2A.
- [x] Revisión visual del cuadro, grupos y asistente.
- [ ] (Futuro) Vincular enfrentamientos de torneo con `Partido` para estadísticas detalladas.
