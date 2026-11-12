# 📋 Plan de Tareas: Autenticación y Datos Aislados por Usuario

## 🚦 Leyenda de Estado
`[ ]` pendiente · `[x]` completada

## 📦 Fase 1: Base de Datos y Modelo de Datos
- [x] `lib/schema.js`: tablas `Usuarios` y `Sesiones`, columnas `idUsuario` + índices en Equipos, Jugadores, Entrenadores y Partido (migración idempotente con `PRAGMA table_info`).
- [x] Adopción de datos huérfanos por la primera cuenta (`adoptOrphanData`).
- [x] `lib/db.js`: fallback a `file:sportstats.db` cuando no hay `TURSO_DATABASE_URL` (crea esquema base + catálogos solo en local).

## 🌐 Fase 2: Capa Backend y Endpoints API
- [x] `lib/auth.js`: scrypt, sesiones con token hasheado, `withUser`, `owns/assertOwns/ownsAll`, `HttpError`.
- [x] `/api/auth/registro`, `/login`, `/logout`, `/me`.
- [x] Filtrado por usuario en: dashboard, equipos (+stats), jugadores (+stats), entrenadores, partidos (+alineación), estadísticas, reportes.
- [x] Validación de IDs referenciados (equipo de jugador/partido/entrenador, jugador de alineación, alineación de estadísticas).

## 🎨 Fase 3: Capa Frontend e Interfaces (Next.js 16)
- [x] `src/proxy.js`: redirección a `/login` sin cookie; `/login` y `/registro` redirigen a `/` con cookie.
- [x] `components/AuthForm.js`, páginas `/login` y `/registro`.
- [x] Sidebar: usuario, botón *Salir*, limpieza automática de sesión inválida.

## 🧪 Fase 4: Pruebas, Verificación y Refinamiento
- [x] `next build` sin errores; ESLint limpio en archivos nuevos/modificados.
- [x] Prueba E2E (BD local): 401/redirect sin sesión, 409 correo duplicado, 401 credenciales malas, usuario B no ve/edita/borra equipos ni torneos de A (404) ni puede referenciarlos (400), logout invalida la sesión.
- [ ] Ejecutar la migración contra Turso (ocurre sola en el primer request tras el despliegue; respaldar la BD antes).
