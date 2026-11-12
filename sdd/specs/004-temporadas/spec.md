# 📋 Especificación Funcional: Temporadas y Tipos de Partido Derivados

> **Estado:** `En Revisión` · **Fecha:** 2026-11-12 · **Depende de:** 001, 002, 003

## 1. 🎯 Resumen Ejecutivo y Contexto

### 1.1 Problema
En Partidos se podía elegir libremente el tipo (Temporada, Torneo…). El resultado eran partidos "de Torneo" sin torneo y partidos "de Temporada" sin saber de cuál.

### 1.2 Decisiones aprobadas (2026-11-12)
1. Modelo de **competiciones**: temporadas y torneos comparten el mismo motor de calendario, tabla y avance de ganadores.
2. Los **playoffs** son un tipo de partido propio (`Playoffs`).
3. Las temporadas tienen **nombre libre y fechas de inicio y fin**.

### 1.3 Objetivos (Goals)
- El **tipo de partido es derivado**, nunca elegido a mano:

  | Origen | Tipo |
  |---|---|
  | Creado en *Partidos* | Amistoso |
  | Fase regular de una temporada | Temporada |
  | Fase final de una temporada | Playoffs |
  | Cualquier fase de un torneo | Torneo |
- Nueva sección **Temporadas**: nombre, fechas, deporte, equipos inscritos, liga (ida o ida y vuelta, puntos configurables) y playoffs opcionales con los mejores N.
- El calendario de la temporada se reparte entre las fechas de inicio y fin.
- En Partidos solo se crean **amistosos**. El tipo no se puede editar.
- Los partidos existentes con tipo Temporada o Torneo sin competición se marcan como **"Sin competición"**. Tienen dos acciones: *Asignar a una competición* (vincularlo a un enfrentamiento pendiente con los mismos equipos) o *Convertir en amistoso*.
- Partidos y Reportes se pueden filtrar por competición.

### 1.4 Fuera de Alcance (Non-Goals)
- Agrupar torneos dentro de una temporada (copa intra-temporada).
- Filtro por temporada en el Dashboard.

## 2. 👥 Historias de Usuario
- **HU-1:** Como usuario, quiero crear una temporada con fechas y equipos y que se genere su calendario.
- **HU-2:** Como usuario, quiero que la temporada termine en playoffs con los mejores N de la tabla.
- **HU-3:** Como usuario, quiero que en Partidos solo se creen amistosos, para no generar partidos sin contexto.
- **HU-4:** Como usuario, quiero ordenar mis partidos antiguos asignándolos a su temporada o torneo.
- **HU-5:** Como usuario, quiero ver los líderes estadísticos de una temporada concreta.

## 3. ✅ Criterios de Aceptación (Given / When / Then)
- **Dada** una temporada de 4 equipos con playoffs de 2, **cuando** se crea, **entonces** se generan 6 partidos de tipo *Temporada* con fechas entre inicio y fin.
- **Cuando** termina la fase regular y se generan los playoffs, **entonces** los partidos de la final son de tipo *Playoffs*.
- Una temporada sin fechas, o con fecha de fin anterior a la de inicio → 400.
- Playoffs mayores que el número de equipos → 400.
- `POST /api/partidos` crea siempre un *Amistoso*, ignore lo que venga en `idTipoPartido`.
- `PUT /api/partidos/:id` no cambia el tipo de un partido de competición. A un partido sin competición solo se le puede cambiar el tipo a *Amistoso*.
- Asignar un partido "Sin competición" a un enfrentamiento: los equipos deben coincidir y el enfrentamiento no debe tener resultado. Al asignarlo, el partido toma el tipo derivado y reemplaza al partido automático (si este no tenía datos). Si el partido ya estaba culminado, su resultado se aplica a la competición.
- `GET /api/reportes?idTorneo=X` limita los líderes a los partidos de esa competición.

## 4. 🎨 Requerimientos de UI/UX y Accesibilidad
- Barra lateral: **Temporadas** y **Torneos**.
- Detalle de temporada: pestañas *Temporada regular* / *Playoffs*, tabla general y rango de fechas.
- Partidos: botón **+ Nuevo amistoso**, aviso de dónde se crean los demás tipos y filtro por competición. En los partidos sin competición, botón *Ordenar*.
- Reportes: selector *Competición*.

## 5. ❓ Preguntas Abiertas y Riesgos
- Se agrega la fila `Playoffs` al catálogo `Tipo_partido` si no existe (también en Turso).
