# 📋 Plan de Tareas: [Nombre de la Funcionalidad]

- **ID de Tareas**: `TASKS-XXX`
- **Referencias**: [spec.md](./spec.md) | [design.md](./design.md)
- **Estado General**: `0 / [Total] Tareas Completadas`
- **Fecha de Inicio**: YYYY-MM-DD
- **Fecha de Cierre Estimada**: YYYY-MM-DD

---

## 🚦 Leyenda de Estado
- `[ ]` Pendiente
- `[/]` En Progreso
- `[x]` Completada
- `[-]` Cancelada / No requerida

---

## 📦 Fase 1: Base de Datos y Modelo de Datos
- [ ] **1.1** Verificar o actualizar esquema en `schema.db` si aplica.
- [ ] **1.2** Crear script o migración en SQLite/LibSQL.
- [ ] **1.3** Poblar datos semilla (seed data) para pruebas locales.
- [ ] **1.4** Validar integridad referencial y llaves foráneas.
  - *Criterio de éxito*: Ejecución de queries directas sin errores de sintaxis o violación de constraints.

---

## 🌐 Fase 2: Capa Backend y Endpoints API
- [ ] **2.1** Crear o actualizar Route Handler en `src/app/api/.../route.js`.
- [ ] **2.2** Implementar validación de parámetros de entrada y payload.
- [ ] **2.3** Parametrizar sentencias SQL para evitar inyecciones.
- [ ] **2.4** Probar respuestas HTTP (200, 201, 400, 404, 500) con payloads de prueba.
  - *Criterio de éxito*: Los endpoints responden con las estructuras definidas en `design.md`.

---

## 🎨 Fase 3: Capa Frontend e Interfaces (Next.js 16)
- [ ] **3.1** Configurar la ruta o página principal en `src/app/.../page.js` respetando Server Components.
- [ ] **3.2** Implementar formularios y controles interactivos (`'use client'`).
- [ ] **3.3** Aplicar estilos basados en los tokens de `globals.css` (Azul `#1B3A6B`, `#2563EB`, etc.).
- [ ] **3.4** Integrar gráficos o métricas con `Chart.js` y `lucide-react`.
- [ ] **3.5** Implementar estados visuales: Loading (skeletons), Error y Empty State.
  - *Criterio de éxito*: La interfaz es responsiva, accesible y cumple los requerimientos visuales.

---

## 🧪 Fase 4: Pruebas, Verificación y Refinamiento
- [ ] **4.1** Validar cada Criterio de Aceptación definido en `spec.md`.
- [ ] **4.2** Ejecutar linter (`npm run lint`) y corregir cualquier advertencia.
- [ ] **4.3** Ejecutar compilación de producción (`npm run build`) para verificar tipos y rutas estáticas/dinámicas.
- [ ] **4.4** Actualizar la memoria del proyecto en `memory.md` si hubo cambios en la arquitectura.
- [ ] **4.5** Marcar la especificación como `Completado` en `sdd/README.md`.

