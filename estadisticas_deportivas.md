# 🏀 SportStats — Sistema de Estadísticas Deportivas

> Plataforma integral para el registro, análisis y visualización de estadísticas de equipos y jugadores deportivos.

---

## 🎨 Identidad Visual

| Elemento | Color | Uso |
|---|---|---|
| **Azul Primario** | `#1B3A6B` | Encabezados, navbar, fondos principales |
| **Azul Medio** | `#2563EB` | Botones primarios, links activos, highlights |
| **Azul Claro** | `#DBEAFE` | Fondos de tarjetas, badges informativos |
| **Rojo Acento** | `#DC2626` | Alertas, KPIs negativos, botones de acción |
| **Rojo Suave** | `#FEE2E2` | Fondos de advertencia, estados inactivos |
| **Blanco** | `#FFFFFF` | Fondos base, texto sobre fondos oscuros |
| **Gris Neutro** | `#F1F5F9` | Fondos de sección, separadores |
| **Texto Oscuro** | `#0F172A` | Cuerpo de texto principal |

---

## 📐 Arquitectura del Sistema

```
SportStats
├── Módulo de Catálogos
│   ├── Ramas (Varonil / Femenil)
│   ├── Categorías (Universitario, Juv A/B/C...)
│   ├── Deportes
│   ├── Posiciones
│   └── Estados (Jugador / Partido)
│
├── Módulo de Equipos y Personal
│   ├── Equipos
│   ├── Jugadores
│   └── Entrenadores
│
├── Módulo de Partidos
│   ├── Registro de Partidos
│   ├── Alineaciones (JugadoresPartido)
│   └── Tipos y Estados de Partido
│
└── Módulo de Estadísticas
    ├── Estadísticas por Equipo
    ├── Estadísticas por Jugador
    └── Estadísticas de Partido
```

---

## 🗄️ Modelo de Datos

### Catálogos Base

#### `Rama`
Define el género de la competencia.

| Campo | Tipo | Descripción |
|---|---|---|
| `idRama` | INT (PK) | Identificador único |
| `NombreRama` | CHAR(10) | `Varonil`, `Femenil` |

#### `Categoria`
Define el nivel o categoría del equipo.

| Campo | Tipo | Descripción |
|---|---|---|
| `idCategoria` | INT (PK) | Identificador único |
| `NombreCategoria` | CHAR(15) | `Universitario`, `Juv A`, `Juv B`, `Juv C` |

#### `Deportes`
Catálogo de deportes soportados por el sistema.

| Campo | Tipo | Descripción |
|---|---|---|
| `idDeporte` | INT (PK) | Identificador único |
| `NombreDeporte` | CHAR(15) | Ej. `Basketball`, `Voleibol` |

#### `Posiciones`
Posiciones de juego disponibles por deporte.

| Campo | Tipo | Descripción |
|---|---|---|
| `idPosicion` | INT (PK) | Identificador único |
| `Nombre` | CHAR(15) | `Botador`, `Guardia`, `Alero`, `Poste` |

#### `EstadosJugador`
Estados posibles de un jugador.

| Campo | Tipo | Descripción |
|---|---|---|
| `idEstadoJugador` | INT (PK) | Identificador único |
| `Estado` | CHAR(20) | `Activo`, `Inactivo por lesión`, etc. |

#### `EstadosPartido`
Estados de ciclo de vida de un partido.

| Campo | Tipo | Descripción |
|---|---|---|
| `idEstadoPartido` | INT (PK) | Identificador único |
| `estadoPartido` | CHAR(15) | `Culminado`, `Anulado`, `Pospuesto`, `Próximo` |

#### `Tipo_partido`
Clasificación del partido según su contexto.

| Campo | Tipo | Descripción |
|---|---|---|
| `idTipoPartido` | INT (PK) | Identificador único |
| `TipoPartido` | CHAR(15) | `Amistoso`, `Temporada`, `Torneo` |

---

### Entidades Principales

#### `Entrenadores`
Registro del cuerpo técnico.

| Campo | Tipo | Descripción |
|---|---|---|
| `idEntrenador` | INT (PK) | Identificador único |
| `NombreEntrenador` | CHAR(20) | Nombre(s) |
| `ApellidoPaEntrenador` | CHAR(15) | Apellido paterno |
| `ApellidoMaEntrenador` | CHAR(15) | Apellido materno |
| `FechaNacimiento_entrenador` | DATE | Fecha de nacimiento |
| `LugarDeOrigenEntrenador` | CHAR(40) | Ciudad/Estado de origen |

#### `Equipos`
Equipos registrados en el sistema.

| Campo | Tipo | Descripción |
|---|---|---|
| `idEquipo` | INT (PK) | Identificador único |
| `NombreEquipo` | CHAR(40) | Nombre del equipo |
| `idCategoria` | INT (FK) | → `Categoria` |
| `idDeporte` | INT (FK) | → `Deportes` |
| `idRama` | INT (FK) | → `Rama` |

#### `Jugadores`
Jugadores registrados (alumnos UMAD en contexto universitario).

| Campo | Tipo | Descripción |
|---|---|---|
| `idJugador` | INT (PK) | ID de alumno / jugador |
| `NombreJugador` | CHAR(30) | Nombre(s) |
| `ApellidoPJugador` | CHAR(15) | Apellido paterno |
| `ApellidoMJugador` | CHAR(15) | Apellido materno |
| `FechaNacimiento` | DATE | Fecha de nacimiento |
| `EstaturaJugador` | FLOAT | Estatura en metros |
| `PesoJugador` | FLOAT | Peso en kilogramos |
| `SemestreJugador` | INT | Semestre actual |
| `NumeroJugador` | INT | Número de camiseta |
| `idPosicion` | INT (FK) | → `Posiciones` |
| `idEquipo` | INT (FK) | → `Equipos` |
| `idEstadoJugador` | INT (FK) | → `EstadosJugador` |
| `LugarDeOrigenJugador` | CHAR(40) | Ciudad/Estado de origen |

---

### Partidos

#### `Partido`
Registro de cada encuentro deportivo.

| Campo | Tipo | Descripción |
|---|---|---|
| `idPartido` | INT (PK) | Identificador único |
| `fecha` | DATE | Fecha del partido |
| `horaInicio` | CHAR(20) | Hora de inicio |
| `horaTermino` | CHAR(20) | Hora de término |
| `ubicacion` | CHAR(50) | Cancha o instalación |
| `localia` | BOOL | `true` = local, `false` = visitante |
| `idEstadoPartido` | INT (FK) | → `EstadosPartido` |
| `idTipoPartido` | INT (FK) | → `Tipo_partido` |

#### `JugadoresPartido`
Tabla de alineación: qué jugadores participaron en cada partido.

| Campo | Tipo | Descripción |
|---|---|---|
| `idJugadoresPartido` | INT (PK) | Identificador único |
| `idJugador` | INT (FK) | → `Jugadores` |
| `idPartido` | INT (FK) | → `Partido` |
| `Localia` | BOOL | `true` = local, `false` = visitante |

#### `EquiposEntrenadores`
Relación entre equipos y sus entrenadores (un equipo puede tener varios).

| Campo | Tipo | Descripción |
|---|---|---|
| `idEquipoEntrenador` | INT (PK) | Identificador único |
| `idEquipo` | INT (FK) | → `Equipos` |
| `idEntrenador` | INT (FK) | → `Entrenadores` |

---

### Estadísticas

#### `estadisticasEquipo`
Box score completo por equipo en un partido.

| Campo | Tipo | Descripción |
|---|---|---|
| `idEstadisticasEquipo` | INT (PK) | Identificador único |
| `idEquipo` | INT (FK) | → `Equipos` |
| `marcadorPrimerCuartoE` | INT | Puntos al cierre del 1er cuarto |
| `marcadorSegundoCuartoE` | INT | Puntos al cierre del 2do cuarto |
| `marcadorTercerCuartoE` | INT | Puntos al cierre del 3er cuarto |
| `marcadorCuartoCuartoE` | INT | Puntos al cierre del 4to cuarto |
| `marcadorFinalE` | INT | Marcador final |
| `2PM` / `2PA` / `2P%` | INT / FLOAT | Tiros de 2 hechos, intentados, porcentaje |
| `3PM` / `3PA` / `3P%` | INT / FLOAT | Tiros de 3 hechos, intentados, porcentaje |
| `FGM` / `FGA` / `FG%` | INT / FLOAT | Tiros de campo totales |
| `FTM` / `FTA` / `FT%` | INT / FLOAT | Tiros libres hechos, intentados, porcentaje |
| `OReb` / `DReb` / `Reb` | INT | Rebotes ofensivos, defensivos y totales |
| `Ast` | INT | Asistencias |
| `TOV` | INT | Pérdidas de balón (Turnovers) |
| `STL` | INT | Robos (Steals) |
| `BLK` | INT | Bloqueos |
| `SR` | INT | Segundas oportunidades (Second chance points) |
| `PF` | INT | Faltas personales |
| `PTS` | INT | Puntos totales |

#### `estadisticasPartido`
Vincula las estadísticas de ambos equipos (local y visitante) a un partido.

| Campo | Tipo | Descripción |
|---|---|---|
| `idEstadisticasPartido` | INT (PK) | Identificador único |
| `idEstadisticasEquipo_local` | INT (FK) | → `estadisticasEquipo` (local) |
| `idEstadisticasEquipo_visitante` | INT (FK) | → `estadisticasEquipo` (visitante) |

#### `estadisticasJugador`
Estadísticas individuales de cada jugador en un partido.

| Campo | Tipo | Descripción |
|---|---|---|
| `idEstadisticasJugador` | INT (PK) | Identificador único |
| `idJugadoresPartido` | INT (FK) | → `JugadoresPartido` |
| `idEstadisticasEquipo` | INT (FK) | → `estadisticasEquipo` |
| `minutos` | INT | Minutos jugados |
| `puntos` | INT | Puntos anotados |
| `promedioPuntos` | FLOAT | Promedio de puntos por partido |
| `reboteOfensivo` | INT | Rebotes ofensivos |
| `reboteDefensivo` | INT | Rebotes defensivos |
| `totalRebotes` | INT | Total de rebotes |
| `asistencia` | INT | Asistencias |
| `perdida` | INT | Pérdidas |
| `robos` | INT | Robos |
| `bloqueos` | INT | Bloqueos |
| `faltasPersonales` | INT | Faltas personales |
| `2pm_2pa` | CHAR(10) | Tiros de 2 (ej. `"4/7"`) |
| `3pm_3pa` | CHAR(10) | Tiros de 3 (ej. `"2/5"`) |
| `ftm_fta` | CHAR(10) | Tiros libres (ej. `"3/4"`) |
| `eficiencia` | INT | Índice de eficiencia calculado |
| `PFD` | INT | Faltas personales recibidas |
| `PIR` | INT | Performance Index Rating |
| `EFF` | INT | Efficiency Rating |
| `plus_minus` | INT | +/- diferencial mientras estuvo en cancha |

---

## 🗺️ Diagrama de Relaciones (ERD Simplificado)

```
Rama ──────────────────────────────────┐
Categoria ─────────────────────────────┼──► Equipos ◄── EquiposEntrenadores ──► Entrenadores
Deportes ──────────────────────────────┘       │
                                               │
Posiciones ──────────────────────────────► Jugadores
EstadosJugador ──────────────────────────────► │
                                               │
                                       JugadoresPartido ◄── Partido ◄── EstadosPartido
                                               │                └────── Tipo_partido
                                               │
                                   estadisticasJugador
                                               │
                                   estadisticasEquipo ◄── Equipos
                                               │
                               estadisticasPartido
                               (local + visitante)
```

---

## 📱 Módulos de la Aplicación

### 1. 🏠 Dashboard Principal
- Resumen de partidos recientes y próximos.
- KPIs globales: equipos activos, jugadores registrados, partidos jugados.
- Gráfica de rendimiento por equipo (últimos 5 partidos).
- Tabla de posiciones general.

### 2. 👥 Gestión de Equipos
- Alta, edición y baja de equipos.
- Filtro por categoría, rama y deporte.
- Vista de plantel completo con foto y número de camiseta.
- Asignación de entrenadores al equipo.
- Historial de partidos del equipo.

### 3. 🏃 Gestión de Jugadores
- Alta y edición de jugadores con datos biométricos (estatura, peso).
- Cambio de estado: `Activo`, `Inactivo por lesión`, etc.
- Perfil individual con estadísticas acumuladas de la temporada.
- Historial de participación en partidos.

### 4. 🎽 Gestión de Entrenadores
- Registro de entrenadores con datos personales.
- Asignación a uno o más equipos.
- Historial de equipos dirigidos.

### 5. 🏟️ Registro de Partidos
- Creación de partido con equipos local/visitante, fecha, hora y ubicación.
- Selección de alineación (jugadores por partido).
- Cambio de estado del partido: `Próximo` → `Culminado` / `Anulado` / `Pospuesto`.
- Vista de marcador por cuartos.

### 6. 📊 Captura de Estadísticas
- Formulario de estadísticas por equipo (box score completo por cuartos).
- Formulario de estadísticas por jugador (stats individuales).
- Cálculo automático de porcentajes (`FG%`, `3P%`, `FT%`).
- Cálculo automático de `EFF`, `PIR` y `plus_minus`.

### 7. 📈 Reportes y Análisis
- **Por equipo:** promedios de temporada, tendencias, comparativa local vs visitante.
- **Por jugador:** líderes estadísticos, ranking por categoría (puntos, rebotes, asistencias).
- **Por partido:** box score detallado con comparativa entre equipos.
- Exportación de reportes en PDF y Excel.

### 8. ⚙️ Administración de Catálogos
- CRUD completo para: Ramas, Categorías, Deportes, Posiciones, Estados.
- Solo accesible para usuarios con rol `Administrador`.

---

## 🔄 Flujos Principales

### Flujo: Registro de un Partido

```
1. Crear Partido
   └─ Asignar fecha, hora, ubicación, tipo y estado inicial ("Próximo")

2. Asignar Alineaciones
   └─ Seleccionar jugadores locales y visitantes (JugadoresPartido)

3. Jugar el Partido
   └─ Actualizar estado a "Culminado"

4. Capturar Estadísticas del Equipo
   └─ Registrar marcador por cuartos y box score (estadisticasEquipo)
   └─ Vincular local y visitante en estadisticasPartido

5. Capturar Estadísticas por Jugador
   └─ Registrar stats individuales por cada jugador en JugadoresPartido
   └─ Calcular EFF, PIR, plus_minus automáticamente
```

### Flujo: Alta de un Jugador

```
1. Crear registro en Jugadores
   └─ Datos personales, biométricos y académicos (semestre)
   └─ Asignar posición, equipo y estado inicial ("Activo")

2. El jugador queda disponible para:
   └─ Ser incluido en alineaciones de partidos
   └─ Acumular estadísticas individuales
```

---

## 📐 Fórmulas y Cálculos Automáticos

| Métrica | Fórmula |
|---|---|
| `FG%` | `FGM / FGA × 100` |
| `2P%` | `2PM / 2PA × 100` |
| `3P%` | `3PM / 3PA × 100` |
| `FT%` | `FTM / FTA × 100` |
| `Reb Total` | `OReb + DReb` |
| `EFF` | `(PTS + REB + AST + STL + BLK) − (FGA−FGM + FTA−FTM + TOV)` |
| `PIR` | `(PTS + REB + AST + STL + BLK + PFD) − (FGA−FGM + FTA−FTM + TOV + PF)` |
| `promedioPuntos` | `SUM(puntos) / partidos_jugados` |

---

## 🚦 Estados y Ciclos de Vida

### Partido
```
Próximo ──► [Se juega] ──► Culminado
         └──► Pospuesto
         └──► Anulado
```

### Jugador
```
Activo ──► Inactivo por lesión ──► Activo
       └──► Inactivo (baja)
```

---

## 🛡️ Roles de Usuario

| Rol | Permisos |
|---|---|
| **Administrador** | Acceso total: catálogos, equipos, jugadores, partidos, estadísticas, reportes. |
| **Capturista** | Registro y edición de partidos y estadísticas. Consulta de equipos y jugadores. |
| **Entrenador** | Consulta de estadísticas de su equipo y jugadores. Sin permisos de edición. |
| **Público / Consulta** | Solo visualización de resultados y estadísticas publicadas. |

---

## 🗂️ Glosario de Términos

| Sigla / Término | Significado |
|---|---|
| **PTS** | Points — Puntos anotados |
| **REB** | Rebounds — Rebotes totales |
| **OReb** | Offensive Rebounds — Rebotes ofensivos |
| **DReb** | Defensive Rebounds — Rebotes defensivos |
| **AST** | Assists — Asistencias |
| **TOV** | Turnovers — Pérdidas de balón |
| **STL** | Steals — Robos de balón |
| **BLK** | Blocks — Bloqueos |
| **FGM / FGA** | Field Goals Made / Attempted — Tiros de campo |
| **FTM / FTA** | Free Throws Made / Attempted — Tiros libres |
| **2PM / 2PA** | 2-Point Field Goals Made / Attempted |
| **3PM / 3PA** | 3-Point Field Goals Made / Attempted |
| **PF** | Personal Fouls — Faltas personales cometidas |
| **PFD** | Personal Fouls Drawn — Faltas personales recibidas |
| **PIR** | Performance Index Rating |
| **EFF** | Efficiency Rating |
| **+/−** | Plus/Minus — Diferencial de puntos mientras el jugador estuvo en cancha |
| **SR** | Second chance points — Puntos de segunda oportunidad |
| **Localia** | Condición del equipo/jugador en el partido: local (`true`) o visitante (`false`) |

---

*SportStats — Documento de Especificación del Sistema v1.0*  
*Generado para uso interno del área de Desarrollo de Software*
