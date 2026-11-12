// Generación del reporte de estadísticas en PDF (solo navegador).
// jsPDF y jspdf-autotable se cargan bajo demanda para no aumentar el bundle de la página.

const C = {
  primary: [27, 58, 107],
  mid: [37, 99, 235],
  light: [219, 234, 254],
  gray: [241, 245, 249],
  zebra: [248, 250, 252],
  border: [226, 232, 240],
  text: [15, 23, 42],
  muted: [100, 116, 139],
  white: [255, 255, 255],
  gold: [217, 119, 6],
  silver: [100, 116, 139],
  bronze: [180, 83, 9],
  champBg: [254, 249, 195],
  champText: [146, 64, 14],
  green: [21, 128, 61],
  red: [220, 38, 38],
};

const W = 210;
const H = 297;
const M = 14; // margen lateral (mm)
const CONTENT_W = W - M * 2;
const BOTTOM = H - 18; // límite inferior antes del pie

const n1 = (v) => (Number(v) || 0).toFixed(1);
const nombreJugador = (r) => `${r.NombreJugador || ''} ${r.ApellidoPJugador || ''}`.trim();

function fechaLarga(d = new Date()) {
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
}
function fechaCorta(iso) {
  if (!iso) return '';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
function slug(texto) {
  return String(texto || 'general').normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'general';
}

/**
 * @param {object} data     respuesta de GET /api/reportes (ya filtrada)
 * @param {object} filtros  { competicion: string, tipo: string }  etiquetas legibles
 */
export async function generarReportePdf(data, filtros) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 0;

  // ---------------- utilidades de dibujo ----------------
  const color = (fn, rgb) => doc[fn](...rgb);
  const texto = (str, x, yy, { size = 9, bold = false, rgb = C.text, align = 'left' } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    color('setTextColor', rgb);
    doc.text(String(str), x, yy, { align });
  };
  const recortar = (str, ancho, size) => {
    doc.setFontSize(size);
    let s = String(str || '');
    if (doc.getTextWidth(s) <= ancho) return s;
    while (s.length > 1 && doc.getTextWidth(`${s}...`) > ancho) s = s.slice(0, -1);
    return `${s}...`;
  };

  const encabezadoPagina = () => {
    color('setFillColor', C.primary);
    doc.rect(0, 0, W, 10, 'F');
    texto('SportStats · Reporte de estadísticas', M, 6.6, { size: 8, bold: true, rgb: C.white });
    texto(filtros.competicion, W - M, 6.6, { size: 8, rgb: C.light, align: 'right' });
    y = 18;
  };
  const asegurar = (alto) => {
    if (y + alto > BOTTOM) {
      doc.addPage();
      encabezadoPagina();
    }
  };

  const titulo = (str, sub) => {
    asegurar(16);
    color('setFillColor', C.mid);
    doc.rect(M, y, 1.4, 6.5, 'F');
    texto(str, M + 4, y + 5, { size: 12.5, bold: true });
    if (sub) texto(sub, W - M, y + 5, { size: 8, rgb: C.muted, align: 'right' });
    y += 10;
  };

  const sinDatos = (msg = 'Sin estadísticas disponibles para estos filtros.') => {
    asegurar(12);
    color('setFillColor', C.gray);
    doc.roundedRect(M, y, CONTENT_W, 10, 2, 2, 'F');
    texto(msg, W / 2, y + 6.3, { size: 8.5, rgb: C.muted, align: 'center' });
    y += 15;
  };

  const tarjetas = (items) => {
    const gap = 4;
    const w = (CONTENT_W - gap * (items.length - 1)) / items.length;
    const h = 24;
    asegurar(h + 6);
    items.forEach((it, i) => {
      const x = M + i * (w + gap);
      color('setFillColor', C.gray);
      color('setDrawColor', C.border);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, w, h, 2.5, 2.5, 'FD');
      color('setFillColor', it.acento || C.mid);
      doc.roundedRect(x, y, 1.6, h, 0.8, 0.8, 'F');
      texto(it.label.toUpperCase(), x + 5, y + 6.5, { size: 6.8, bold: true, rgb: C.muted });
      // Reducir la fuente hasta que el valor quepa (mínimo 9 pt) antes de recortarlo
      let size = 15;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(size);
      while (size > 9 && doc.getTextWidth(String(it.valor)) > w - 8) doc.setFontSize(--size);
      texto(recortar(it.valor, w - 8, size), x + 5, y + 15, { size, bold: true, rgb: C.primary });
      if (it.sub) texto(recortar(it.sub, w - 8, 7.2), x + 5, y + 20.5, { size: 7.2, rgb: C.muted });
    });
    y += h + 8;
  };

  /** Gráfica de barras horizontal dibujada en vectorial. */
  const barras = (filas, { etiqueta, valor, sufijo = '' }) => {
    if (!filas.length) return;
    const alto = 6.2;
    const etiquetaW = 52;
    const valorW = 14;
    const barraW = CONTENT_W - etiquetaW - valorW;
    const max = Math.max(...filas.map(r => Number(r[valor]) || 0), 1);
    asegurar(filas.length * alto + 6);
    filas.forEach((r, i) => {
      const yy = y + i * alto;
      const v = Number(r[valor]) || 0;
      texto(recortar(etiqueta(r), etiquetaW - 3, 8), M, yy + 4.2, { size: 8 });
      color('setFillColor', C.gray);
      doc.roundedRect(M + etiquetaW, yy + 0.8, barraW, alto - 1.8, 1.2, 1.2, 'F');
      color('setFillColor', i === 0 ? C.primary : C.mid);
      doc.roundedRect(M + etiquetaW, yy + 0.8, Math.max(1.5, (v / max) * barraW), alto - 1.8, 1.2, 1.2, 'F');
      texto(`${n1(v)}${sufijo}`, W - M, yy + 4.2, { size: 8, bold: true, rgb: C.primary, align: 'right' });
    });
    y += filas.length * alto + 6;
  };

  const tabla = (head, body, { columnas = {}, resaltarFilas = 0, rankCol = true } = {}) => {
    // Si la tabla cabe completa en una página pero no en el espacio restante, empezarla en la siguiente
    const estimado = (body.length + 1) * 7.6;
    if (estimado < BOTTOM - 18 && y + estimado > BOTTOM) {
      doc.addPage();
      encabezadoPagina();
    }
    asegurar(20);
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      margin: { left: M, right: M, top: 16, bottom: 20 },
      theme: 'plain',
      styles: {
        font: 'helvetica', fontSize: 8.4, cellPadding: { top: 2.1, bottom: 2.1, left: 2.4, right: 2.4 },
        textColor: C.text, lineColor: C.border, lineWidth: { bottom: 0.15 },
      },
      headStyles: { fillColor: C.primary, textColor: C.white, fontStyle: 'bold', fontSize: 7.6, lineWidth: 0 },
      alternateRowStyles: { fillColor: C.zebra },
      columnStyles: columnas,
      didParseCell: (h) => {
        if (h.section === 'head') {
          // Alinear cada encabezado igual que sus valores
          h.cell.styles.halign = columnas[h.column.index]?.halign || 'left';
          return;
        }
        if (h.section !== 'body') return;
        if (resaltarFilas && h.row.index < resaltarFilas) {
          h.cell.styles.fillColor = C.light;
          if (h.column.index === 0) h.cell.styles.textColor = C.mid;
        }
        if (rankCol && h.column.index === 0 && h.row.index < 3) {
          h.cell.styles.textColor = [C.gold, C.silver, C.bronze][h.row.index];
          h.cell.styles.fontStyle = 'bold';
        }
      },
      didDrawPage: (h) => { if (h.pageNumber > 1) encabezadoPagina(); },
    });
    y = doc.lastAutoTable.finalY + 9;
  };

  // ---------------- portada / encabezado ----------------
  color('setFillColor', C.primary);
  doc.rect(0, 0, W, 38, 'F');
  color('setFillColor', C.mid);
  doc.roundedRect(M, 9, 10, 10, 2, 2, 'F');
  texto('SS', M + 5, 15.6, { size: 8.5, bold: true, rgb: C.white, align: 'center' });
  texto('SportStats', M + 13, 15.4, { size: 11, bold: true, rgb: C.white });
  texto('Reporte de estadísticas', M, 30, { size: 19, bold: true, rgb: C.white });
  texto(`Generado el ${fechaLarga()}`, W - M, 14.5, { size: 8, rgb: C.light, align: 'right' });
  if (data.usuario) texto(`Por ${data.usuario}`, W - M, 20, { size: 8, rgb: C.light, align: 'right' });
  y = 46;

  // Filtros aplicados
  const chips = [`Competición: ${filtros.competicion}`, `Tipo de partido: ${filtros.tipo}`];
  let cx = M;
  chips.forEach(c => {
    doc.setFontSize(8);
    const w = doc.getTextWidth(c) + 8;
    color('setFillColor', C.light);
    doc.roundedRect(cx, y - 4.6, w, 7, 3.5, 3.5, 'F');
    texto(c, cx + 4, y, { size: 8, bold: true, rgb: C.mid });
    cx += w + 3;
  });
  y += 10;

  // ---------------- resumen ----------------
  const lider = data.puntos?.[0];
  titulo('Resumen');
  tarjetas([
    { label: 'Partidos jugados', valor: String(data.resumen?.partidosJugados ?? 0), sub: 'Culminados' },
    { label: 'Puntos anotados', valor: String(data.resumen?.puntosTotales ?? 0), sub: 'Entre todos los equipos', acento: C.primary },
    { label: 'Promedio por equipo', valor: n1(data.resumen?.promedioPorEquipo), sub: 'Puntos por partido', acento: C.green },
    {
      label: 'Máximo anotador',
      valor: lider ? nombreJugador(lider) : '-',
      sub: lider ? `${n1(lider.promPuntos)} pts/partido · ${lider.NombreEquipo}` : 'Sin datos',
      acento: C.gold,
    },
  ]);

  // ---------------- competición ----------------
  const comp = data.competicion;
  if (comp) {
    const tipoComp = comp.tipo === 'temporada' ? 'Temporada' : 'Torneo';
    const fechas = [fechaCorta(comp.fechaInicio), fechaCorta(comp.fechaFin)].filter(Boolean).join(' - ');
    titulo(comp.nombre, [tipoComp, fechas, comp.estado].filter(Boolean).join(' · '));

    if (comp.campeon) {
      asegurar(14);
      color('setFillColor', C.champBg);
      doc.roundedRect(M, y, CONTENT_W, 11, 2, 2, 'F');
      color('setFillColor', [250, 204, 21]);
      doc.circle(M + 6.5, y + 5.5, 3.2, 'F');
      texto('1º', M + 6.5, y + 6.8, { size: 7, bold: true, rgb: C.champText, align: 'center' });
      texto(`Campeón: ${comp.campeon}`, M + 12, y + 7, { size: 10.5, bold: true, rgb: C.champText });
      y += 16;
    }

    const grupos = Object.entries(comp.tablas || {});
    if (grupos.length === 0) {
      sinDatos('Esta competición es de eliminación directa: no tiene tabla de posiciones.');
    }
    grupos.forEach(([clave, filas]) => {
      const sub = grupos.length > 1 ? `Grupo ${clave}` : 'Tabla de posiciones';
      asegurar(24);
      texto(sub, M, y, { size: 9.5, bold: true, rgb: C.primary });
      y += 3;
      tabla(
        ['#', 'Equipo', 'PJ', 'G', 'E', 'P', 'PF', 'PC', 'DIF', 'PTS'],
        filas.map(f => [f.pos, f.NombreEquipo, f.PJ, f.G, f.E, f.P, f.PF, f.PC, f.DIF > 0 ? `+${f.DIF}` : f.DIF, f.PTS]),
        {
          resaltarFilas: comp.formato === 'grupos' ? comp.clasifican : 0,
          rankCol: comp.formato !== 'grupos',
          columnas: {
            0: { cellWidth: 9, fontStyle: 'bold' },
            1: { cellWidth: 'auto', fontStyle: 'bold' },
            9: { fontStyle: 'bold', textColor: C.primary },
          },
        },
      );
    });
    if (comp.formato === 'grupos' && comp.clasifican) {
      texto(`Resaltados: clasifican ${comp.tipo === 'temporada' ? 'a playoffs' : 'a la eliminatoria'} (${comp.clasifican}${grupos.length > 1 ? ' por grupo' : ''}).`,
        M, y - 4, { size: 7.2, rgb: C.muted });
      y += 2;
    }
  }

  // ---------------- líderes ----------------
  const columnasJugador = {
    0: { cellWidth: 9 },
    1: { fontStyle: 'bold' },
    3: { halign: 'center', cellWidth: 12 },
    4: { halign: 'right', fontStyle: 'bold', textColor: C.primary, cellWidth: 22 },
    5: { halign: 'right', cellWidth: 20 },
  };
  const filasJugador = (rows, prom, total) => rows.map((r, i) => [
    i + 1, `${nombreJugador(r)}  #${r.NumeroJugador ?? ''}`, r.NombreEquipo, Number(r.partidos) || 0,
    n1(r[prom]), total ? (Number(r[total]) || 0) : n1(r.promPIR),
  ]);

  titulo('Máximos anotadores', 'Promedio de puntos por partido');
  if (data.puntos?.length) {
    barras(data.puntos.slice(0, 8), { etiqueta: nombreJugador, valor: 'promPuntos' });
    tabla(['#', 'Jugador', 'Equipo', 'PJ', 'Prom. PTS', 'Total'], filasJugador(data.puntos, 'promPuntos', 'totalPuntos'), { columnas: columnasJugador });
  } else sinDatos();

  titulo('Rebotes', 'Promedio por partido');
  if (data.rebotes?.length) {
    tabla(['#', 'Jugador', 'Equipo', 'PJ', 'Prom. REB', 'Total'], filasJugador(data.rebotes, 'promRebotes', 'totalRebotes'), { columnas: columnasJugador });
  } else sinDatos();

  titulo('Asistencias', 'Promedio por partido');
  if (data.asistencias?.length) {
    tabla(['#', 'Jugador', 'Equipo', 'PJ', 'Prom. AST', 'Total'], filasJugador(data.asistencias, 'promAsistencias', 'totalAsistencias'), { columnas: columnasJugador });
  } else sinDatos();

  titulo('Eficiencia', 'EFF y PIR promedio');
  if (data.eficiencia?.length) {
    tabla(['#', 'Jugador', 'Equipo', 'PJ', 'EFF', 'PIR'], filasJugador(data.eficiencia, 'promEFF', null), { columnas: columnasJugador });
  } else sinDatos();

  // ---------------- equipos ----------------
  titulo('Rendimiento por equipo', 'Promedios por partido');
  if (data.equipos?.length) {
    barras(data.equipos.slice(0, 10), { etiqueta: r => r.NombreEquipo, valor: 'promPTS' });
    tabla(
      ['#', 'Equipo', 'PJ', 'PTS', 'REB', 'FG%', '3P%'],
      data.equipos.map((e, i) => [i + 1, e.NombreEquipo, Number(e.partidos) || 0, n1(e.promPTS), n1(e.promReb), `${n1(e.promFG)}%`, `${n1(e.prom3P)}%`]),
      {
        columnas: {
          0: { cellWidth: 9 },
          1: { fontStyle: 'bold' },
          2: { halign: 'center' },
          3: { halign: 'right', fontStyle: 'bold', textColor: C.primary },
          4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' },
        },
      },
    );
  } else sinDatos();

  // Glosario breve
  asegurar(14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  color('setTextColor', C.muted);
  doc.text(doc.splitTextToSize(
    'PJ: partidos jugados · PTS: puntos · REB: rebotes · AST: asistencias · FG%: tiros de campo · 3P%: triples · '
    + 'EFF/PIR: índices de eficiencia · PF/PC: puntos a favor/en contra · DIF: diferencia', CONTENT_W), M, y);

  // ---------------- pie de página ----------------
  const paginas = doc.getNumberOfPages();
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i);
    color('setDrawColor', C.border);
    doc.setLineWidth(0.3);
    doc.line(M, H - 12, W - M, H - 12);
    texto(`SportStats · ${fechaLarga()}`, M, H - 7, { size: 7.5, rgb: C.muted });
    texto(`Página ${i} de ${paginas}`, W - M, H - 7, { size: 7.5, rgb: C.muted, align: 'right' });
  }

  const hoy = new Date().toISOString().slice(0, 10);
  doc.save(`sportstats-reporte-${slug(filtros.competicionArchivo)}-${hoy}.pdf`);
}
