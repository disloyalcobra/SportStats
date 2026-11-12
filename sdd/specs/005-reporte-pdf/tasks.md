# 📋 Plan de Tareas: Exportar Reportes a PDF

## 🚦 Leyenda de Estado
`[ ]` pendiente · `[x]` completada

## 📦 Fase 1: Base de Datos y Modelo de Datos
- [x] Sin cambios.

## 🌐 Fase 2: Capa Backend y Endpoints API
- [x] `resumen`, `competicion` y `usuario` en `GET /api/reportes`; `partidos` en eficiencia.

## 🎨 Fase 3: Capa Frontend e Interfaces (Next.js 16)
- [x] Dependencias `jspdf@4.2.1` y `jspdf-autotable@5.0.9`.
- [x] `src/lib/reportePdf.js` con encabezado, filtros, resumen, competición, líderes, equipos, glosario y pie de página.
- [x] Botón *Exportar PDF* en Reportes (import dinámico).

## 🧪 Fase 4: Pruebas, Verificación y Refinamiento
- [x] `next build` OK; ESLint sin errores nuevos.
- [x] PDF generado desde el navegador con una temporada de 4 equipos, 8 jugadores y playoffs: 3 páginas revisadas visualmente.
- [x] Correcciones tras la revisión: PJ en eficiencia, tamaño adaptable en tarjetas, alineación de encabezados, tablas sin cortes y glosario con salto de línea.
