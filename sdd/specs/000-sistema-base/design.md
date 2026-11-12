# 🛠️ Documento de Diseño Técnico (SDD): Sistema Base SportStats

- **ID de Diseño**: `DESIGN-000`
- **Especificación Relacionada**: [spec.md](./spec.md)
- **Estado**: `Aprobado / Base Inicial`
- **Fecha**: 2026-11-12

---

## 1. 🏛️ Arquitectura de la Solución

```mermaid
flowchart TD
    subgraph Frontend [Next.js 16 App Router]
        Layout[App Layout & Sidebar]
        Pages[Páginas: /equipos, /jugadores, /partidos, /reportes]
        Charts[Componentes Chart.js / Lucide]
    end

    subgraph Backend [Route Handlers / Next API]
        APIDashboard[/api/dashboard]
        APIEquipos[/api/equipos]
        APIJugadores[/api/jugadores]
        APIPartidos[/api/partidos]
        APIReportes[/api/reportes]
    end

    subgraph Storage [Persistencia LibSQL / SQLite]
        DB[(schema.db / Turso DB)]
    end

    Pages --> Backend
    Charts --> Backend
    Backend --> DB
```

---

## 2. 🗄️ Esquema de Base de Datos (`schema.db`)

El sistema opera con tablas normalizadas en SQLite:
1. **Catálogos**: `Rama`, `Categoria`, `Deportes`, `Posiciones`, `EstadosJugador`, `estadosPartido`, `Tipo_partido`.
2. **Entidades**: `Entrenadores`, `Equipos`, `Jugadores`.
3. **Encuentros**: `Partidos`, `JugadoresPartido`.
4. **Métricas**: `EstadisticasEquipo`, `EstadisticasJugador`.

---

## 3. 🌐 Endpoints de la API

| Ruta | Métodos | Descripción |
|---|---|---|
| `/api/dashboard` | `GET` | Resumen de conteos generales, últimos partidos y KPIs rápidos |
| `/api/equipos` | `GET, POST` | Listado y registro de equipos deportivos |
| `/api/jugadores` | `GET, POST` | Fichas de jugadores y asignación |
| `/api/partidos` | `GET, POST` | Programación y consulta de partidos |
| `/api/entrenadores` | `GET, POST` | Gestión de cuerpo técnico |
| `/api/reportes` | `GET` | Métricas agregadas y datos para gráficos de Chart.js |

---

## 4. 🧩 Convenciones Next.js 16 y React 19

- **Asincronía de parámetros**: En rutas dinámicas como `/equipos/[id]/page.js` o `/partidos/[id]/page.js`, usar:
  ```javascript
  export default async function Page({ params }) {
    const { id } = await params;
    // ...
  }
  ```
- **Conexión a base de datos**: Centralizada en `src/lib/db.js` importando `createClient` de `@libsql/client`.

