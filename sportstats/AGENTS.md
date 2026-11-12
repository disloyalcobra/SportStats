<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Directrices del Proyecto SportStats

1. **Memoria y Contexto**:
   - Consulta obligatoriamente [memory.md](../memory.md) antes de comenzar cualquier tarea para entender el estado del proyecto, arquitectura y decisiones técnicas vigentes.

2. **Metodología Spec-Driven Development (SDD)**:
   - Toda nueva funcionalidad, módulo o cambio de arquitectura debe guiarse por la metodología SDD documentada en [SDD.md](../SDD.md).
   - Utiliza las plantillas en `../sdd/templates/` (`01-spec-template.md`, `02-design-template.md`, `03-tasks-template.md`) y registra la nueva iniciativa en `../sdd/specs/`.
   - No comiences a codificar sin haber definido y acordado previamente la especificación y el diseño técnico.

3. **Convenciones Next.js 16 y React 19**:
   - Los parámetros dinámicos de ruta en páginas y API handlers son promesas: utiliza siempre `const { id } = await params;`.
   - Separa componentes de servidor (Server Components) para fetching de datos de los componentes de cliente (`'use client'`) para interactividad y gráficos de Chart.js.
