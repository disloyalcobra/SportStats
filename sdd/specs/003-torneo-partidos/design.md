# 🛠️ Documento de Diseño Técnico (SDD): Partidos y Estadísticas en Torneos

## 1. 🏛️ Arquitectura General de la Solución
```
TorneoPartidos.idPartido ──▶ Partido ──▶ estadisticasEquipo / JugadoresPartido / estadisticasJugador

PUT /api/torneos/:id/partidos/:tp ─┐
                                   ├─▶ aplicarResultado()  (lib/torneosDb.js)
PUT /api/partidos/:id (culminar/   │      · valida (empate, ronda siguiente jugada, stats de jugadores)
     reabrir partido vinculado) ───┘      · actualiza torneo + avance en cuadro + campeón
                                          · refleja en Partido (solo si el origen es el torneo)
                                          · sincronizarPartidos(): crea Partidos de enfrentamientos ya definidos
```
- `lib/partidos.js`: `crearPartidoConEquipos()` (extraído de `POST /api/partidos`, se reutiliza en ambos lados), `sqlEliminarPartido()`, `datosPartido()`, `marcadorPartido()`, `idTipoTorneo()`.
- `lib/torneosDb.js`: `sincronizarPartidos()`, `buscarVinculo()`, `aplicarResultado()`, `eliminarTorneo()`.

## 2. 🗄️ Modelo de Datos y Cambios en Base de Datos

### 2.1 Tablas Involucradas / Nuevas Tablas
```sql
ALTER TABLE TorneoPartidos ADD COLUMN idPartido INTEGER;  -- migración idempotente en ensureSchema()
CREATE INDEX IF NOT EXISTS idx_torneopartidos_partido ON TorneoPartidos(idPartido);
```

### 2.2 Integridad y Relaciones
- Origen del marcador al culminar: `estadisticasEquipo.marcadorFinalE` (si es 0, se usa `PTS`) de cada equipo.
- Marcador rápido desde el torneo: escribe `marcadorFinalE = PTS = marcador` y `Partido.idEstadoPartido = 1`.
- Limpiar resultado desde el torneo: `Partido.idEstadoPartido = 4` (se conservan las estadísticas).
- Fecha tentativa: `fechaInicio` (o hoy) + 7 días × (ronda − 1). En la eliminatoria de grupos se suma además el número de jornadas de grupo.

## 3. 🌐 Contratos de API (Endpoints / Handlers)
| Endpoint | Cambio |
|---|---|
| `POST /api/torneos`, `POST /api/torneos/:id/eliminatoria` | Llaman a `sincronizarPartidos()` |
| `GET /api/torneos/:id` | Partidos incluyen `idPartido` y `estadoPartido`; sincroniza torneos antiguos |
| `PUT /api/torneos/:id/partidos/:tp` | Usa `aplicarResultado()`; 409 si el Partido ya tiene estadísticas de jugadores |
| `DELETE /api/torneos/:id` | Borra también los Partidos vinculados y sus registros |
| `GET /api/partidos` | Añade `idTorneo`, `torneoNombre` |
| `GET /api/partidos/:id` | Añade `torneo` (vínculo) |
| `PUT /api/partidos/:id` | Culminar o reabrir un Partido vinculado aplica el resultado al torneo **antes** de guardar (si el torneo lo rechaza, el Partido no cambia) |
| `DELETE /api/partidos/:id` | 409 si pertenece a un torneo |

## 4. 🧩 Jerarquía de Componentes UI (Next.js 16 + React 19)
- `ResultadoModal`: bloque informativo con enlaces a `/partidos/:id` y `/partidos/:id/estadisticas`.
- `partidos/[id]/page.js`: aviso del torneo y `alert` con el error al culminar o reabrir.
- `partidos/page.js`: nombre del torneo en la columna Tipo y error al eliminar.

## 5. 🛡️ Manejo de Errores, Estados Borde y Seguridad
- Todo vínculo se resuelve filtrando por `Torneos.idUsuario`.
- Los args de INSERT/UPDATE de Partido, Jugadores y Equipos normalizan `undefined` → `null`.

## 6. ⚖️ Alternativas Consideradas y Trade-offs
- **Crear el Partido solo al capturar el resultado**: se descartó porque impediría registrar alineación y estadísticas antes del juego.
- **Fuente única de verdad en Partido**: el torneo se seguiría calculando desde `estadisticasEquipo`, pero se pierde el marcador rápido. Se eligió sincronización bidireccional con validación previa.
