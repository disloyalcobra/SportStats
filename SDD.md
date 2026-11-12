# 📐 Metodología SDD (Spec-Driven Development) — SportStats

> Guía oficial de desarrollo guiado por especificaciones para SportStats. Todos los desarrolladores y agentes de IA deben seguir este proceso riguroso antes y durante la escritura de código.

---

## 🎯 ¿Qué es Spec-Driven Development (SDD)?

**Spec-Driven Development (SDD)** es una metodología de ingeniería de software que antepone la **especificación** y el **diseño formal** a la implementación. 

En lugar de saltar directamente al código, cada nueva característica, refactorización o corrección mayor se descompone en 3 documentos estándar y secuenciales:

```
[ Requerimiento / Idea ]
           │
           ▼
   1. ESPECIFICACIÓN (spec.md)   ───> Define el QUÉ y el POR QUÉ (Requisitos, UX, Criterios)
           │
           ▼
   2. DISEÑO TÉCNICO (design.md) ───> Define el CÓMO técnico (Arquitectura, BD, APIs, Componentes)
           │
           ▼
   3. PLAN DE TAREAS (tasks.md)  ───> Define el PASO A PASO ejecutable y verificable
           │
           ▼
[ Implementación & Verificación ]
```

---

## 🏛️ Los Tres Pilares del SDD

| Artefacto | Propósito | Audiencia | Archivo estándar |
|---|---|---|---|
| **1. Spec (Requisitos)** | Qué problema se resuelve, historias de usuario, reglas de negocio y criterios de aceptación | Negocio, Product Owner, Devs | `spec.md` |
| **2. Design (Técnico)** | Diagramas, esquemas de BD, contratos de API, componentes UI, estados, rendimiento y seguridad | Desarrolladores, Arquitectos | `design.md` |
| **3. Tasks (Ejecución)** | Checklist desglosado en fases y tareas independientes con validación por paso | Desarrolladores, Agentes IA | `tasks.md` |

---

## 🔄 El Ciclo de Vida del Desarrollo (Fases)

### Fase 1: Especificación (`spec.md`)
1. Se crea una nueva carpeta bajo `/sdd/specs/XXX-nombre-feature/`.
2. Se copia la plantilla `sdd/templates/01-spec-template.md` como `spec.md`.
3. Se detallan el contexto, los objetivos (y qué queda fuera de alcance - Non-Goals), las historias de usuario y los criterios de aceptación en formato `Dado que / Cuando / Entonces` (Given/When/Then).
4. **Revisión**: No se avanza hasta que los requerimientos estén claros y aprobados.

### Fase 2: Diseño de Software (`design.md`)
1. Se copia la plantilla `sdd/templates/02-design-template.md` como `design.md`.
2. Se documentan las decisiones arquitectónicas:
   - Modificaciones o consultas al esquema de BD (`schema.db` / SQLite).
   - Endpoints API (`/api/...`) o Server Actions (Next.js 16).
   - Estructura de componentes (Server Components vs Client Components).
   - Manejo de estados de carga, error y casos borde.
3. **Revisión**: Se evalúan trade-offs y compatibilidad con el resto del sistema.

### Fase 3: Plan de Tareas (`tasks.md`)
1. Se copia la plantilla `sdd/templates/03-tasks-template.md` como `tasks.md`.
2. Se desglosa el trabajo en fases lógicas (e.g., Fase 1: Datos y APIs, Fase 2: Componentes UI, Fase 3: Integración y Reportes, Fase 4: Pruebas).
3. Cada tarea debe ser atómica, tener una estimación o dependencia explícita y un criterio de verificación concreto.

### Fase 4: Implementación Guiada
1. Se ejecuta tarea por tarea siguiendo el orden estipulado en `tasks.md`.
2. Conforme se completa cada tarea, se marca en el checklist `[x]`.
3. Se actualiza `memory.md` si se introducen nuevas decisiones de arquitectura o patrones.

### Fase 5: Verificación y Cierre
1. Se validan todos los criterios de aceptación del `spec.md`.
2. Se ejecutan linters (`npm run lint`), compilación (`npm run build`) y pruebas.
3. Se archiva o marca la especificación como `COMPLETADA`.

---

## 📁 Estructura del Directorio SDD

```
SportStats/
├── memory.md                   # Memoria contextual global del proyecto
├── SDD.md                      # Esta guía maestra
└── sdd/
    ├── README.md               # Índice de especificaciones y estado
    ├── templates/              # Plantillas estandarizadas reutilizables
    │   ├── 01-spec-template.md
    │   ├── 02-design-template.md
    │   └── 03-tasks-template.md
    └── specs/                  # Especificaciones activas y completadas
        ├── 000-sistema-base/
        │   ├── spec.md
        │   ├── design.md
        │   └── tasks.md
        └── [001-nombre-feature]/
            ├── spec.md
            ├── design.md
            └── tasks.md
```

---

## 🤖 Reglas de Oro para Agentes de IA y Desarrolladores

1. 🚫 **Prohibido programar a ciegas**: No escribir código de producción sin haber redactado o consultado primero la especificación (`spec.md`) y el diseño (`design.md`).
2. 🎯 **Una tarea a la vez**: Avanzar en `tasks.md` de manera progresiva, marcando las tareas terminadas con `[x]`.
3. 🔄 **Mantener sincronizada la memoria**: Cualquier cambio de paradigma técnico, nueva variable de entorno o cambio de esquema debe registrarse en `memory.md`.
4. ⚡ **Respetar Next.js 16 y React 19**: Atender siempre las directrices de `AGENTS.md` (e.g., resolución asíncrona de `params`, distinción estricta de Server/Client Components).

