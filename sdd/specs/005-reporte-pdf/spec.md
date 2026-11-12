# 📋 Especificación Funcional: Exportar Reportes a PDF

> **Estado:** `En Revisión` · **Fecha:** 2026-11-12 · **Depende de:** 004

## 1. 🎯 Resumen Ejecutivo y Contexto

### 1.1 Problema
Las estadísticas solo se podían consultar en pantalla. Entrenadores y coordinadores necesitan compartirlas o imprimirlas en un formato presentable.

### 1.2 Objetivos (Goals)
- Botón **Exportar PDF** en Reportes que descarga un documento A4 con los **filtros activos** (competición y tipo de partido).
- Contenido del documento:
  - Encabezado de marca, fecha de generación y usuario.
  - Etiquetas con los filtros aplicados.
  - **Resumen**: partidos jugados, puntos anotados, promedio por equipo y máximo anotador.
  - Si hay una competición seleccionada: estado, fechas, **campeón** y **tabla de posiciones** (con los clasificados resaltados).
  - **Máximos anotadores** (gráfica de barras + tabla), **Rebotes**, **Asistencias** y **Eficiencia** (EFF/PIR).
  - **Rendimiento por equipo** (gráfica + tabla).
  - Glosario de abreviaturas y pie de página con "Página X de Y".

### 1.3 Fuera de Alcance (Non-Goals)
- PDF de un partido individual (box score) o de un jugador.
- Envío por correo o generación programada.

## 2. 👥 Historias de Usuario
- **HU-1:** Como entrenador, quiero descargar en PDF las estadísticas de una temporada para compartirlas con mi equipo.
- **HU-2:** Como coordinador, quiero un PDF de solo los playoffs para presentarlo en una junta.

## 3. ✅ Criterios de Aceptación (Given / When / Then)
- **Dado** un filtro de temporada, **cuando** pulso *Exportar PDF*, **entonces** se descarga `sportstats-reporte-<competición>-<fecha>.pdf` con su tabla de posiciones y su campeón.
- Las secciones sin datos muestran "Sin estadísticas disponibles para estos filtros." y el PDF no queda vacío ni falla.
- Las tablas cortas no se parten entre páginas, y las largas repiten su encabezado en la página siguiente.
- Los nombres con acentos o ñ se ven correctamente.

## 4. 🎨 Requerimientos de UI/UX y Accesibilidad
- Mismos colores de la app (azul primario `#1B3A6B`, azul medio `#2563EB`), tipografía Helvetica y gráficas vectoriales.
- Mientras se genera, el botón muestra "Generando PDF…" y queda deshabilitado.

## 5. ❓ Preguntas Abiertas y Riesgos
- Se agregan las dependencias `jspdf@4.2.1` y `jspdf-autotable@5.0.9`. Solo se cargan al pulsar el botón (import dinámico).
