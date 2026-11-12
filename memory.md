# 🧠 Memory Bank — SportStats

> Documento de memoria viva del proyecto. Contiene el contexto arquitectónico, decisiones técnicas, estado actual, convenciones y directrices de desarrollo para el equipo y agentes de Inteligencia Artificial.

---

## 📌 Visión del Proyecto

**SportStats** es una plataforma web integral diseñada para el registro, análisis y visualización de estadísticas deportivas de equipos, jugadores, partidos y entrenadores. Permite la gestión de catálogos deportivos, seguimiento de rendimiento individual y colectivo, generación de reportes avanzados y visualización mediante dashboards interactivos.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Versión / Detalle |
|---|---|---|
| **Framework** | Next.js (App Router) | `16.2.7` |
| **Librería UI** | React | `19.2.4` |
| **Base de Datos** | SQLite / LibSQL | `@libsql/client` (`^0.17.3`), `better-sqlite3` (`^12.10.0`) |
| **Gráficos** | Chart.js & React-Chartjs-2 | `chart.js ^4.5.1`, `react-chartjs-2 ^5.3.1` |
| **Iconografía** | Lucide React | `lucide-react ^1.17.0` |
| **PDF** | jsPDF + jspdf-autotable | `jspdf ^4.2.1`, `jspdf-autotable ^5.0.9` (solo cliente, import dinámico en `src/lib/reportePdf.js`) |
| **Linter** | ESLint | `eslint ^9`, `eslint-config-next 16.2.7` |
| **Metodología** | SDD (Spec-Driven Development) | Ver `SDD.md` y carpeta `/sdd` |

---

## 🎨 Identidad Visual y UI Tokens

Definidos en `estadisticas_deportivas.md` y `sportstats/src/app/globals.css`:

- **Azul Primario (`#1B3A6B`)**: Encabezados, barra de navegación, fondos institucionales.
- **Azul Medio (`#2563EB`)**: Botones primarios, enlaces activos, elementos destacados.
- **Azul Claro (`#DBEAFE`)**: Fondos de tarjetas, badges informativos.
- **Rojo Acento (`#DC2626`)**: Alertas, KPIs críticos/negativos, botones destructivos.
- **Rojo Suave (`#FEE2E2`)**: Fondos de advertencia, estados de alerta o inactivos.
- **Blanco (`#FFFFFF`)**: Fondos limpios de contenido y texto en superficies oscuras.
- **Gris Neutro (`#F1F5F9` / `#E2E8F0`)**: Separadores, fondos de página y bordes.
- **Texto Oscuro (`#0F172A`)**: Color base de tipografía.

---

## 🏗️ Arquitectura de Información y Base de Datos

La base de datos utiliza esquema relacional documentado en `schema.db` y `estadisticas_deportivas.md`:

### 1. Módulo de Catálogos
- `Rama` (`idRama`, `NombreRama`): Varonil, Femenil, Mixto.
- `Categoria` (`idCategoria`, `NombreCategoria`): Universitario, Juvenil A/B/C, etc.
- `Deportes` (`idDeporte`, `NombreDeporte`): Baloncesto, Voleibol, Fútbol, etc.
- `Posiciones` (`idPosicion`, `Nombre`): Base, Alero, Delantero, Portero, etc.
- `EstadosJugador` (`idEstadoJugador`, `Estado`): Activo, Lesionado, Inactivo, Suspendido.
- `estadosPartido` (`idEstadoPartido`, `estadoPartido`): Programado, En Curso, Finalizado, Cancelado.
- `Tipo_partido` (`idTipoPartido`, `TipoPartido`): Temporada Regular, Playoffs, Amistoso, Torneo.

### 2. Entidades Principales
- `Entrenadores`: Datos personales, contacto y trayectoria.
- `Equipos`: Relacionado con Rama, Deporte y Categoría.
- `Jugadores`: Datos del deportista, equipo asignado, posición y estado de salud/juego.
- `Partidos`: Enfrentamientos entre equipo local y visitante, fecha, tipo y estado.
- `JugadoresPartido`: Planilla/Alineación de jugadores convocados por partido.

### 2.1 Usuarios y Torneos (specs 001 y 002)
- `Usuarios`, `Sesiones`: autenticación propia (scrypt + cookie `ss_session` httpOnly, 7 días).
- `idUsuario` en `Equipos`, `Jugadores`, `Entrenadores`, `Partido`. Las tablas hijas se aíslan por su padre (`Partido`).
- `Torneos`, `TorneoEquipos`, `TorneoPartidos`: formatos `eliminacion`, `liga`, `grupos`.
- El esquema nuevo se crea/migra solo con `ensureSchema()` (`src/lib/schema.js`) en el primer request.
- **Competiciones (spec 004):** `Torneos.tipo` = `'torneo' | 'temporada'` (+ `fechaFin`). Una temporada con playoffs es `formato='grupos'` con 1 grupo. API en `/api/torneos?tipo=…`; UI compartida en `src/components/competiciones/`.
- **El tipo de partido es DERIVADO, nunca se elige a mano:** Amistoso (creado en Partidos), Temporada (fase regular), Playoffs (fase final de temporada), Torneo. Usar `idsTipos()` / `claveTipoCompeticion()` de `src/lib/partidos.js`. Los partidos antiguos sin vínculo se marcan `sinCompeticion` y se ordenan con `/api/partidos/:id/asignar`.
- `TorneoPartidos.idPartido` vincula cada enfrentamiento con un `Partido` real (spec 003). Los resultados se aplican SIEMPRE vía `aplicarResultado()` (`src/lib/torneosDb.js`), tanto desde el torneo como al culminar o reabrir el Partido. Para crear partidos se usa `crearPartidoConEquipos()` (`src/lib/partidos.js`).

### 3. Estadísticas y Métricas
- `EstadisticasEquipo`: Puntos favor/contra, faltas, victorias, derrotas.
- `EstadisticasJugador`: Puntos, rebotes, asistencias, faltas, minutos jugados por partido.

---

## ⚡ Directrices Críticas de Código (Next.js 16 + React 19)

1. **Next.js 16 Asynchronous Dynamic APIs**:
   - En Next.js 16, `params` y `searchParams` en componentes de página y handlers de ruta son Promises. Siempre deben resolverse con `await params` antes de acceder a sus propiedades (e.g. `const { id } = await params;`).
2. **Server vs Client Components**:
   - Mantener las páginas y layouts como Server Components por defecto para data fetching directo y SEO.
   - Declarar `'use client';` únicamente en componentes con interactividad, hooks (`useState`, `useEffect`), gráficos de Chart.js o formularios interactivos.
3. **Conexión a Base de Datos**:
   - Centralizada en `sportstats/src/lib/db.js` mediante cliente `@libsql/client`.
   - Manejar siempre variables de entorno `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`. Sin ellas se usa `file:sportstats.db` local (se crea el esquema base y catálogos de prueba).
4. **Autenticación y aislamiento (obligatorio en todo endpoint nuevo)**:
   - Envolver handlers con `withUser(async (req, ctx, user) => …)` de `src/lib/auth.js`.
   - Filtrar SIEMPRE por `user.idUsuario` y validar IDs recibidos con `owns/assertOwns/ownsAll`; responder 404 si el recurso es de otro usuario.
   - `src/proxy.js` (ex-middleware en Next 16) solo hace la redirección optimista a `/login`.

---

## 📐 Metodología de Trabajo: Spec-Driven Development (SDD)

Cualquier funcionalidad nueva, refactorización de módulo o cambio de arquitectura debe adherirse estrictamente al flujo SDD:
1. **Especificación (`spec.md`)**: Requisitos, historias de usuario y criterios de aceptación verificables.
2. **Diseño Técnico (`design.md`)**: Arquitectura técnica, endpoints, esquemas DB, componentes y casos borde.
3. **Plan de Tareas (`tasks.md`)**: Lista secuencial y checklist granular de implementación.
4. **Implementación y Verificación**: Codificación guiada por las tareas aprobadas y validación cruzada.

*Consultar detalles en `SDD.md` y plantillas en `/sdd/templates`.*

---

## 📊 Estado Actual del Proyecto

- [x] Arquitectura de BD definida (`schema.db`).
- [x] Documento maestro de requerimientos funcionales (`estadisticas_deportivas.md`).
- [x] Estructura base de Next.js App Router configurada (`sportstats/src/app`).
- [x] Módulos de interfaz iniciales creados (`equipos`, `jugadores`, `entrenadores`, `partidos`, `reportes`).
- [x] Endpoints API estructurados en `src/app/api/`.
- [x] Inicio de sesión / registro con datos aislados por cuenta (spec 001).
- [x] Módulo de torneos con diagrama de llaves y tablas (spec 002).
- [ ] Implementación de SDD formal para cada módulo de estadísticas avanzadas.
- [ ] Migraciones formales y seeding de datos de prueba para SQLite/LibSQL.
- [ ] Validación de formularios con esquemas tipados y feedback en tiempo real.
- [ ] Cobertura de pruebas automáticas e integración continua.

