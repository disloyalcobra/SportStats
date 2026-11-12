# 📋 Plan de Tareas: Temporadas y Tipos de Partido Derivados

## 🚦 Leyenda de Estado
`[ ]` pendiente · `[x]` completada

## 📦 Fase 1: Base de Datos y Modelo de Datos
- [x] `Torneos.tipo`, `Torneos.fechaFin` (migración idempotente con `addColumnIfMissing`).
- [x] Tipo `Playoffs` en el catálogo (se crea si falta).

## 🌐 Fase 2: Capa Backend y Endpoints API
- [x] `idsTipos()`, `idTipo()`, `claveTipoCompeticion()`; `sincronizarPartidos()` usa el tipo derivado por fase.
- [x] Fechas tentativas repartidas entre inicio y fin de la temporada.
- [x] `/api/torneos` con `tipo`, validaciones de temporada y mapeo de playoffs.
- [x] `POST /api/partidos` → Amistoso; `PUT` conserva el tipo (excepto convertir a Amistoso).
- [x] `GET/POST /api/partidos/:id/asignar` (`candidatosAsignacion`, `asignarPartido`).
- [x] Reportes con filtros `idTorneo` y `tipo`.

## 🎨 Fase 3: Capa Frontend e Interfaces (Next.js 16)
- [x] `components/competiciones/*` y páginas `/temporadas`, `/temporadas/[id]`; `/torneos` reutiliza los mismos componentes.
- [x] Barra lateral con **Temporadas**; KPI "Temporadas y torneos en curso".
- [x] Partidos: "+ Nuevo amistoso", sin selector de tipo, filtro por competición, aviso y modal **Ordenar**.
- [x] Reportes: selectores de competición y tipo.

## 🧪 Fase 4: Pruebas, Verificación y Refinamiento
- [x] `next build` OK; ESLint sin errores nuevos.
- [x] E2E:
  - `POST` con tipo Torneo → Amistoso.
  - Validaciones de temporada (sin fechas, fin < inicio, playoffs > equipos).
  - Temporada de 4 equipos + playoffs 2 → 6 partidos *Temporada* entre las fechas; la final es *Playoffs*.
  - `PUT` no cambia el tipo.
  - Asignación de un partido antiguo próximo y de uno culminado 80–70 (con localía invertida: la tabla registra la victoria correcta).
  - Reasignar → 400; convertir en amistoso.
  - Reportes filtrados por playoffs, temporada y competición.
- [ ] Probar contra Turso (se agrega `Playoffs` al catálogo y columnas a `Torneos`; respaldar antes).
