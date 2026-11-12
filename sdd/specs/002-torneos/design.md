# 🛠️ Documento de Diseño Técnico (SDD): Torneos con Diagrama

## 1. 🏛️ Arquitectura General de la Solución
- **Lógica pura** en `src/lib/torneos.js` (sin BD, testeable): generación de llaves, round-robin (método del círculo), grupos con siembra serpiente, tabla de posiciones y propagación de ganadores.
- **Persistencia** en 3 tablas nuevas creadas por `ensureSchema()` (spec 001).
- **API** REST bajo `/api/torneos`, siempre filtrada por `idUsuario`.
- **UI** Client Components: `/torneos` (lista + asistente) y `/torneos/[id]` (diagrama).

## 2. 🗄️ Modelo de Datos y Cambios en Base de Datos

### 2.1 Tablas Involucradas / Nuevas Tablas
```sql
CREATE TABLE IF NOT EXISTS Torneos (
  idTorneo          INTEGER PRIMARY KEY AUTOINCREMENT,
  idUsuario         INTEGER NOT NULL REFERENCES Usuarios(idUsuario) ON DELETE CASCADE,
  nombre            TEXT NOT NULL,
  formato           TEXT NOT NULL,          -- 'eliminacion' | 'liga' | 'grupos'
  idDeporte         INTEGER,
  puntosVictoria    INTEGER DEFAULT 3,
  puntosEmpate      INTEGER DEFAULT 1,
  puntosDerrota     INTEGER DEFAULT 0,
  idaVuelta         INTEGER DEFAULT 0,
  numGrupos         INTEGER DEFAULT 0,
  clasificanPorGrupo INTEGER DEFAULT 0,
  estado            TEXT DEFAULT 'En curso', -- 'En curso' | 'Finalizado'
  idCampeon         INTEGER,
  fechaInicio       TEXT,
  fechaCreacion     TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS TorneoEquipos (
  idTorneo  INTEGER NOT NULL REFERENCES Torneos(idTorneo) ON DELETE CASCADE,
  idEquipo  INTEGER NOT NULL REFERENCES Equipos(idEquipo),
  semilla   INTEGER,
  grupo     TEXT,
  PRIMARY KEY (idTorneo, idEquipo)
);
CREATE TABLE IF NOT EXISTS TorneoPartidos (
  idTorneoPartido   INTEGER PRIMARY KEY AUTOINCREMENT,
  idTorneo          INTEGER NOT NULL REFERENCES Torneos(idTorneo) ON DELETE CASCADE,
  fase              TEXT NOT NULL,   -- 'liga' | 'grupo' | 'eliminatoria'
  grupo             TEXT,
  ronda             INTEGER NOT NULL, -- jornada (liga/grupo) o ronda del cuadro (1 = primera)
  posicion          INTEGER NOT NULL, -- orden dentro de la ronda
  idEquipoLocal     INTEGER,
  idEquipoVisitante INTEGER,
  marcadorLocal     INTEGER,
  marcadorVisitante INTEGER,
  idGanador         INTEGER,
  esBye             INTEGER DEFAULT 0
);
```

### 2.2 Integridad y Relaciones
- En eliminatoria, el partido `(ronda r, posicion p)` alimenta a `(r+1, ceil(p/2))`; `p` impar → lado local, par → visitante. No se guarda puntero: se deriva.
- Borrar torneo borra en cascada (además se hace explícito en el handler, porque SQLite requiere `PRAGMA foreign_keys`).

## 3. 🌐 Contratos de API (Endpoints / Handlers)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/torneos` | Lista de torneos del usuario con progreso + catálogo de equipos y deportes |
| POST | `/api/torneos` | `{ nombre, formato, equipos:[id], idDeporte?, fechaInicio?, puntosVictoria?, puntosEmpate?, puntosDerrota?, idaVuelta?, numGrupos?, clasificanPorGrupo?, sorteo? }` → genera calendario/llaves |
| GET | `/api/torneos/[id]` | Torneo, equipos, partidos y tablas calculadas (`tablas: { [grupo|'general']: filas }`) |
| DELETE | `/api/torneos/[id]` | Elimina torneo |
| PUT | `/api/torneos/[id]/partidos/[idPartido]` | `{ marcadorLocal, marcadorVisitante }` o `{ limpiar: true }`; propaga ganador |
| POST | `/api/torneos/[id]/eliminatoria` | (formato grupos) genera la fase eliminatoria con los clasificados |

## 4. 🧩 Jerarquía de Componentes UI (Next.js 16 + React 19)
```
app/torneos/page.js            ('use client')  lista + <CrearTorneoModal>
app/torneos/[id]/page.js       ('use client')  obtiene id con useParams()
 ├─ components/torneos/Bracket.js          cuadro de llaves en columnas + conectores SVG
 ├─ components/torneos/TablaPosiciones.js  tabla de puntos
 ├─ components/torneos/Jornadas.js         lista de jornadas/partidos
 └─ components/torneos/ResultadoModal.js   captura de marcador
```
Conectores del bracket: cada ronda es una columna `flex` con `justify-content: space-around`; los conectores se dibujan con pseudo-elementos CSS (`.bk-match::after`, `.bk-pair::before`) para no depender de mediciones de DOM.

## 5. 🛡️ Manejo de Errores, Estados Borde y Seguridad
- Byes: el partido con un solo equipo se marca `esBye=1`, `idGanador` = ese equipo y se propaga al crear.
- Empate en eliminatoria → 400. Corregir un resultado cuyo partido siguiente ya tiene marcador → 409.
- Al limpiar/cambiar ganador se actualiza la casilla correspondiente en la ronda siguiente.
- La final define `idCampeon` y `estado='Finalizado'`; limpiarla revierte a `En curso`.
- Todos los equipos recibidos se validan con `ownsAll('Equipos', …)`.

## 6. ⚖️ Alternativas Consideradas y Trade-offs
- **Reutilizar `Partido`** para cada enfrentamiento: daría estadísticas detalladas, pero `Partido` depende de `estadisticasEquipo` para saber los equipos y obligaría a crear alineaciones; se separó para mantener el torneo simple. Se puede vincular en el futuro con una columna `idPartido`.
- **Librería de brackets** (p. ej. `react-brackets`): se evitó por peso y estilo; el cuadro con CSS es suficiente.
