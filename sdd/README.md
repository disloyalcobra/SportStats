# 📁 SDD — Registro de Especificaciones y Plantillas

Bienvenido al repositorio central de especificaciones de **SportStats** bajo la metodología **Spec-Driven Development**.

---

## 📑 Índice de Especificaciones

| ID | Nombre | Estado | Fecha | Descripción |
|---|---|---|---|---|
| `000` | [Sistema Base SportStats](./specs/000-sistema-base/) | `Activo / Base` | 2026-11 | Arquitectura fundacional, catálogos, equipos, jugadores, partidos y reportes. |
| `001` | [Autenticación y datos por usuario](./specs/001-autenticacion-multiusuario/) | `En Revisión` | 2026-11 | Registro, inicio/cierre de sesión y aislamiento total de datos por cuenta. |
| `002` | [Torneos con diagrama](./specs/002-torneos/) | `En Revisión` | 2026-11 | Eliminación directa, liga por puntos y grupos + eliminatoria con cuadro de llaves y tablas. |
| `003` | [Partidos y estadísticas en torneos](./specs/003-torneo-partidos/) | `En Revisión` | 2026-11 | Cada enfrentamiento genera un Partido real con alineación y estadísticas; resultado sincronizado en ambos sentidos. |
| `004` | [Temporadas y tipos de partido derivados](./specs/004-temporadas/) | `En Revisión` | 2026-11 | Temporadas (liga + playoffs) con fechas; el tipo de partido se deriva de su competición; en Partidos solo se crean amistosos. |
| `005` | [Exportar reportes a PDF](./specs/005-reporte-pdf/) | `En Revisión` | 2026-11 | PDF con resumen, tabla de posiciones, líderes y rendimiento por equipo según los filtros activos. |
| `006` | *Próxima especificación* | `Pendiente` | — | Usar plantillas para iniciar una nueva iniciativa. |

*Estados posibles: `Borrador`, `En Revisión`, `Aprobado`, `En Implementación`, `Completado`, `Deprecado`.*

---

## 🛠️ Cómo iniciar una nueva especificación

1. Crea un directorio con el siguiente identificador correlativo bajo `sdd/specs/`:
   ```bash
   mkdir sdd/specs/001-nombre-de-la-funcionalidad
   ```
2. Copia las tres plantillas maestras desde `sdd/templates/`:
   - `01-spec-template.md` -> `sdd/specs/001-.../spec.md`
   - `02-design-template.md` -> `sdd/specs/001-.../design.md`
   - `03-tasks-template.md` -> `sdd/specs/001-.../tasks.md`
3. Rellena los documentos en orden (Spec -> Design -> Tasks) y somételos a revisión.
4. Actualiza este archivo `sdd/README.md` añadiendo la fila a la tabla de especificaciones.

