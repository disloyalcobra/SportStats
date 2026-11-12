# 📋 Especificación Funcional: Sistema Base SportStats

- **ID de Especificación**: `SPEC-000`
- **Autor(es)**: Equipo SportStats
- **Estado**: `Aprobado / Base Inicial`
- **Fecha de Creación**: 2026-11-12
- **Última Actualización**: 2026-11-12
- **Documento Fuente**: `estadisticas_deportivas.md`

---

## 1. 🎯 Resumen Ejecutivo y Contexto

SportStats es un sistema unificado para la gestión y seguimiento del rendimiento deportivo en instituciones educativas y clubes. El sistema cubre desde la catalogación de ramas, categorías y deportes hasta el registro pormenorizado de partidos, jugadores, alineaciones y reportes analíticos.

### 1.1 Problema
La gestión deportiva suele llevarse en hojas de cálculo dispersas o registros manuales, lo que dificulta:
- El seguimiento histórico de estadísticas por jugador y equipo.
- La consulta rápida de clasificaciones, resultados y alineaciones.
- La generación de informes visuales para entrenadores y directivos.

### 1.2 Objetivos (Goals)
- [x] Proveer catálogos estandarizados (Ramas, Categorías, Deportes, Posiciones, Estados).
- [x] Registrar equipos con su asignación deportiva y cuerpo técnico (entrenadores).
- [x] Administrar fichas de jugadores, dorsales y estados (activo, lesionado, etc.).
- [x] Registrar partidos (fecha, hora, lugar, equipos local/visitante, marcador y tipo de partido).
- [x] Conectar estadísticas en vivo y consolidadas por jugador y equipo.
- [x] Ofrecer un panel de control y reportes visuales con gráficos interactivos.

### 1.3 Fuera de Alcance Inicial (Non-Goals)
- Venta de entradas o gestión de boletaje comercial.
- Pagos o cuotas de inscripción de deportistas.
- Transmisión de video en streaming.

---

## 2. 👥 Historias de Usuario

| ID | Rol | Quiero... | Para... |
|---|---|---|---|
| `US-001` | Entrenador | Consultar la plantilla de mi equipo y asignar jugadores al partido | planificar la estrategia y alineación |
| `US-002` | Anotador / Mesa | Capturar los puntos, faltas y estadísticas durante el partido | reflejar el marcador oficial en tiempo real |
| `US-003` | Analista / Directivo | Visualizar el dashboard de rendimiento por temporada | identificar fortalezas y áreas de mejora deportiva |
| `US-004` | Administrador | Gestionar catálogos de deportes, categorías y ramas | mantener la base de datos normalizada |

---

## 3. ✅ Criterios de Aceptación Principales

### Escenario 1: Creación de Partido y Alineación
- **Dado que** existen al menos dos equipos de la misma rama y categoría con jugadores activos.
- **Cuando** se programa un nuevo partido seleccionando equipo local, visitante y fecha.
- **Entonces** el partido se registra con estado `Programado` y permite convocar la lista de jugadores (`JugadoresPartido`).

### Escenario 2: Captura de Estadísticas
- **Dado que** un partido está `En Curso` o `Finalizado`.
- **Cuando** se registran puntos, rebotes, asistencias o faltas de un jugador.
- **Entonces** los acumulados del equipo se recalculan automáticamente y se actualiza el resumen del encuentro.

---

## 4. 🎨 Requerimientos de UI/UX
- **Paleta de Colores**: 
  - Azul Primario `#1B3A6B` (Navbar, encabezados)
  - Azul Medio `#2563EB` (Botones primarios y acentos activos)
  - Rojo Acento `#DC2626` (Alertas y acciones críticas)
- **Navegación**: Menú lateral (Sidebar) accesible con enlaces a Dashboard, Equipos, Jugadores, Partidos, Entrenadores y Reportes.

