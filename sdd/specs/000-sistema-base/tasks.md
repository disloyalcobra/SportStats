# 📋 Plan de Tareas: Sistema Base SportStats

- **ID de Tareas**: `TASKS-000`
- **Referencias**: [spec.md](./spec.md) | [design.md](./design.md)
- **Estado General**: `Base Implementada / En Evolución`
- **Fecha**: 2026-11-12

---

## 📦 Fase 1: Arquitectura y Datos Base
- [x] **1.1** Diseñar y normalizar el esquema relacional (`schema.db`).
- [x] **1.2** Configurar cliente de base de datos LibSQL en `sportstats/src/lib/db.js`.
- [x] **1.3** Documentar modelo funcional en `estadisticas_deportivas.md`.

---

## 🌐 Fase 2: Servicios Backend y API Routes
- [x] **2.1** Implementar endpoint `/api/dashboard`.
- [x] **2.2** Implementar endpoint `/api/equipos` (listado y creación).
- [x] **2.3** Implementar endpoint `/api/jugadores`.
- [x] **2.4** Implementar endpoint `/api/partidos`.
- [x] **2.5** Implementar endpoint `/api/entrenadores`.
- [x] **2.6** Implementar endpoint `/api/reportes`.

---

## 🎨 Fase 3: Interfaz de Usuario y Componentes (Next.js 16)
- [x] **3.1** Configurar `globals.css` con la paleta de identidad deportiva.
- [x] **3.2** Implementar `AppShell` y `Sidebar` de navegación.
- [x] **3.3** Implementar vistas de módulos:
  - [x] `/equipos` y `/equipos/[id]`
  - [x] `/jugadores` y `/jugadores/[id]`
  - [x] `/partidos` y `/partidos/[id]`
  - [x] `/entrenadores`
  - [x] `/reportes`
  - [x] Dashboard principal (`page.js`)

---

## 🚀 Fase 4: Próximas Mejoras bajo SDD
- [ ] **4.1** Migrar lógica de validación a schemas formales (Zod).
- [ ] **4.2** Añadir tests de integración para APIs y consultas LibSQL.
- [ ] **4.3** Implementar exportación de reportes a PDF/Excel.

