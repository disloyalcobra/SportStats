# 🛠️ Documento de Diseño Técnico (SDD): Temporadas y Tipos de Partido Derivados

## 1. 🏛️ Arquitectura General de la Solución
- **Competición = fila de `Torneos`** con `tipo` (`'torneo' | 'temporada'`). Se reutiliza el motor de las specs 002 y 003.
- Una **temporada** se traduce a formatos existentes:
  - Sin playoffs → `formato = 'liga'`.
  - Con playoffs de N → `formato = 'grupos'`, `numGrupos = 1`, `clasificanPorGrupo = N`. La "fase de grupos" de un único grupo es la temporada regular, y la eliminatoria son los playoffs.
- **Tipo derivado** (`lib/partidos.js`):
  - `idsTipos()` resuelve los ids del catálogo por patrón (`%amistoso%`, `%temporada%`, `%playoff%`, `%torneo%`) y crea los que falten.
  - `claveTipoCompeticion(tipo, fase)` decide el tipo: temporada + eliminatoria → `playoffs`; temporada → `temporada`; torneo → `torneo`.
- **UI genérica** en `components/competiciones/` (`ListaCompeticiones`, `DetalleCompeticion`, `config`). `/torneos` y `/temporadas` son envoltorios de una línea.

## 2. 🗄️ Modelo de Datos y Cambios en Base de Datos
```sql
ALTER TABLE Torneos ADD COLUMN tipo TEXT DEFAULT 'torneo';   -- idempotente (addColumnIfMissing)
ALTER TABLE Torneos ADD COLUMN fechaFin TEXT;
INSERT INTO Tipo_partido (TipoPartido) VALUES ('Playoffs');  -- solo si no existe
```
- **Fechas del calendario:** se parte de `fechaInicio`. Las jornadas, más las rondas previstas de playoffs, se reparten con un intervalo de `min(7, días / (slots − 1))` días, para quedar dentro de `fechaFin`.

## 3. 🌐 Contratos de API (Endpoints / Handlers)
| Endpoint | Cambio |
|---|---|
| `GET /api/torneos?tipo=torneo\|temporada\|todos` | Filtro por tipo; devuelve `tipo`, `fechaFin`, `clasificanPorGrupo` |
| `POST /api/torneos` | `tipo: 'temporada'` exige `fechaInicio` y `fechaFin` (fin ≥ inicio) y acepta `playoffs` (0 o entre 2 y n) |
| `POST /api/partidos` | Siempre crea un **Amistoso** (ignora `idTipoPartido`) |
| `PUT /api/partidos/:id` | Conserva el tipo; un partido sin competición solo puede pasar a Amistoso |
| `GET /api/partidos` | `sinCompeticion`, `competicionTipo/Fase/Ronda`; catálogo `competiciones` e `idTipoAmistoso` |
| `GET /api/partidos/:id/asignar` | Enfrentamientos candidatos: mismos equipos, sin resultado y con partido automático sin datos |
| `POST /api/partidos/:id/asignar` | `{ idTorneoPartido }`: reemplaza el partido automático, toma el tipo derivado y aplica el resultado si estaba culminado (si falla, se revierte) |
| `GET /api/reportes?idTorneo=&tipo=` | Filtros por competición y por tipo de partido |

## 4. 🧩 Jerarquía de Componentes UI (Next.js 16 + React 19)
```
components/competiciones/config.js              textos/rutas por tipo, formato de fechas
components/competiciones/ListaCompeticiones.js  lista + asistente (temporada: fechas + playoffs)
components/competiciones/DetalleCompeticion.js  pestañas Temporada regular / Playoffs
app/temporadas/(page|[id]/page).js, app/torneos/(page|[id]/page).js  → envoltorios
app/partidos/page.js   "+ Nuevo amistoso", filtro de competición, modal "Ordenar"
app/reportes/page.js   selectores Competición y Tipo de partido
```

## 5. 🛡️ Manejo de Errores, Estados Borde y Seguridad
- Toda consulta de competición se filtra por `Torneos.idUsuario`.
- Asignación: 400 si el partido ya pertenece a una competición o si el enfrentamiento no está disponible.

## 6. ⚖️ Alternativas Consideradas y Trade-offs
- **Tabla `Temporadas` separada:** duplicaría el calendario, la tabla y el avance de ganadores; se descartó.
- **Renombrar `/api/torneos` a `/api/competiciones`:** más preciso, pero implica cambios en todas las rutas. Se mantuvo la ruta y se documentó que representa competiciones.
