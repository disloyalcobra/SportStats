# 🛠️ Documento de Diseño Técnico (SDD): Exportar Reportes a PDF

## 1. 🏛️ Arquitectura General de la Solución
- **Generación en el navegador** con `jsPDF` + `jspdf-autotable`. No hay carga de render en el servidor ni dependencias nativas, y el PDF refleja exactamente los datos ya filtrados en pantalla.
- `src/lib/reportePdf.js` exporta `generarReportePdf(data, filtros)`. Se importa dinámicamente desde `app/reportes/page.js` al pulsar el botón, junto con `jspdf` y `jspdf-autotable`.
- Las gráficas se dibujan con primitivas vectoriales (`roundedRect`), sin capturar el canvas de Chart.js: así salen nítidas al imprimir y pesan poco.

## 2. 🗄️ Modelo de Datos y Cambios en Base de Datos
Ninguno.

## 3. 🌐 Contratos de API (Endpoints / Handlers)
`GET /api/reportes` añade:
| Campo | Contenido |
|---|---|
| `usuario` | Nombre del usuario (para el encabezado) |
| `resumen` | `{ partidosJugados, puntosTotales, promedioPorEquipo }` (partidos culminados dentro del filtro) |
| `competicion` | Si hay `idTorneo`: `{ nombre, tipo, formato, estado, fechaInicio, fechaFin, clasifican, campeon, tablas }` (vía `cargarTorneo`) |
| `eficiencia[].partidos` | PJ en la tabla de eficiencia |

## 4. 🧩 Jerarquía de Componentes UI (Next.js 16 + React 19)
- `app/reportes/page.js`: botón en `AppShell.actions`, estado `exportando`, y etiquetas legibles de los filtros (`TIPOS_PARTIDO`).
- `lib/reportePdf.js`: helpers `titulo`, `tarjetas`, `barras`, `tabla`, `sinDatos`, `encabezadoPagina` y el pie de página aplicado al final a todas las páginas.

## 5. 🛡️ Manejo de Errores, Estados Borde y Seguridad
- Las fuentes estándar de PDF solo cubren Latin-1 (WinAnsi). Por eso se evitan caracteres fuera de ese rango (`…`, `—`); los acentos y la ñ sí están soportados.
- Paginación: `asegurar(alto)` crea una página nueva antes de cortar un bloque. Las tablas que caben enteras se mueven completas a la página siguiente.
- Si la generación falla, se muestra un `alert` con el error y el botón se rehabilita.

## 6. ⚖️ Alternativas Consideradas y Trade-offs
- **`window.print()` con CSS de impresión**: sin dependencias, pero el resultado depende del navegador y no se descarga directamente.
- **Render en servidor (Puppeteer / @react-pdf)**: más pesado y complicado de desplegar.
- **Capturar el canvas de Chart.js**: produce imágenes rasterizadas y obliga a renderizar las gráficas fuera de pantalla.
