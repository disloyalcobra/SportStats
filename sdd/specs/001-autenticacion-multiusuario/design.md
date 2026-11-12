# 🛠️ Documento de Diseño Técnico (SDD): Autenticación y Datos Aislados por Usuario

## 1. 🏛️ Arquitectura General de la Solución

```
Navegador ──cookie ss_session──▶ proxy.js (Next 16, ex-middleware)
                                   │  sin cookie → redirect /login  (páginas)
                                   │  sin cookie → 401              (/api/*)
                                   ▼
                     Route Handler /api/...  ──▶ requireUser()  (lib/auth.js)
                                   │  valida token en tabla Sesiones (BD)
                                   │  devuelve { idUsuario, nombre, email } o 401
                                   ▼
                     SQL siempre filtrado por idUsuario (o por la propiedad
                     del registro padre: Partido / Equipo)
```

- **proxy.js** solo comprueba la *presencia* de la cookie (chequeo optimista, sin BD). La validación real ocurre en cada handler con `requireUser()`.
- **Contraseñas**: `crypto.scrypt` (Node nativo) con salt aleatorio de 16 bytes; comparación con `timingSafeEqual`. Sin dependencias nuevas.
- **Sesiones**: token aleatorio de 32 bytes (hex) guardado en BD como hash SHA-256; cookie `httpOnly`, `sameSite=lax`, `secure` en producción, 7 días.
- **Migración**: `lib/schema.js → ensureSchema()` se ejecuta una vez por proceso (memoizada) desde `requireUser()` y los endpoints de auth. Crea tablas nuevas y añade columnas `idUsuario` si no existen (`PRAGMA table_info`).

## 2. 🗄️ Modelo de Datos y Cambios en Base de Datos

### 2.1 Tablas Involucradas / Nuevas Tablas
```sql
CREATE TABLE IF NOT EXISTS Usuarios (
  idUsuario     INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre        TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,     -- normalizado a minúsculas
  passwordHash  TEXT NOT NULL,            -- scrypt hex
  salt          TEXT NOT NULL,
  fechaRegistro TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS Sesiones (
  idSesion   INTEGER PRIMARY KEY AUTOINCREMENT,
  tokenHash  TEXT NOT NULL UNIQUE,
  idUsuario  INTEGER NOT NULL REFERENCES Usuarios(idUsuario) ON DELETE CASCADE,
  expira     TEXT NOT NULL
);
ALTER TABLE Equipos      ADD COLUMN idUsuario INTEGER;  -- si no existe
ALTER TABLE Jugadores    ADD COLUMN idUsuario INTEGER;
ALTER TABLE Entrenadores ADD COLUMN idUsuario INTEGER;
ALTER TABLE Partido      ADD COLUMN idUsuario INTEGER;
```
Al registrarse el **primer** usuario: `UPDATE <tabla> SET idUsuario = ? WHERE idUsuario IS NULL` en las 4 tablas.

### 2.2 Integridad y Relaciones
| Tabla | Cómo se determina el dueño |
|---|---|
| Equipos, Jugadores, Entrenadores, Partido | Columna `idUsuario` directa |
| EquiposEntrenadores | Entrenador **y** equipo del usuario |
| JugadoresPartido, estadisticasEquipo, estadisticasJugador | Vía `Partido.idUsuario` |
| Torneos (spec 002) | Columna `idUsuario` directa |

Helpers en `lib/auth.js`: `ownsRow(tabla, idCol, id, idUsuario)` y `ownsAll(tabla, idCol, ids, idUsuario)` para validar IDs recibidos en el body (p. ej. `idEquipo` de un jugador).

## 3. 🌐 Contratos de API (Endpoints / Handlers)

| Método | Ruta | Body | Respuesta |
|---|---|---|---|
| POST | `/api/auth/registro` | `{ nombre, email, password }` | `201 { usuario }` + cookie · `400` validación · `409` correo duplicado |
| POST | `/api/auth/login` | `{ email, password }` | `200 { usuario }` + cookie · `401` |
| POST | `/api/auth/logout` | — | `200` y cookie borrada |
| GET | `/api/auth/me` | — | `200 { usuario }` · `401` |

Todos los endpoints existentes: `401` sin sesión; `404` cuando el recurso no pertenece al usuario.

## 4. 🧩 Jerarquía de Componentes UI (Next.js 16 + React 19)
- `app/login/page.js` y `app/registro/page.js` — Client Components con formulario; tras éxito `router.replace('/')` + `router.refresh()`.
- `components/AuthCard.js` — contenedor visual compartido.
- `components/Sidebar.js` — carga `/api/auth/me`, muestra usuario y botón *Cerrar sesión*; agrega el ítem **Torneos**.
- `proxy.js` en `src/` — redirecciones; si hay cookie y se visita `/login` o `/registro`, redirige a `/`.

## 5. 🛡️ Manejo de Errores, Estados Borde y Seguridad
- Mensaje de login genérico (no revela si el correo existe).
- Sesiones expiradas se eliminan al detectarlas.
- Todas las consultas parametrizadas (`args`), nunca concatenación.
- `ownsRow` impide referenciar IDs ajenos al crear/editar.
- Si `TURSO_DATABASE_URL` no está definida, `lib/db.js` usa `file:sportstats.db` local.

## 6. ⚖️ Alternativas Consideradas y Trade-offs
- **NextAuth/Auth.js**: más completo, pero añade dependencia y configuración; para correo+contraseña basta con `crypto`.
- **JWT sin estado**: no permite revocar sesiones al cerrar sesión; se eligió sesión en BD.
- **Una BD por usuario**: aislamiento máximo pero inviable con un solo Turso; se eligió columna `idUsuario`.
