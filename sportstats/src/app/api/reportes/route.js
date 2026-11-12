import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withUser } from '@/lib/auth';
import { idsTipos, ESTADO_CULMINADO } from '@/lib/partidos';
import { cargarTorneo } from '@/lib/torneosDb';

/**
 * GET /api/reportes?idTorneo=X&tipo=amistoso|temporada|playoffs|torneo
 * Líderes y promedios limitados a los partidos del usuario, opcionalmente filtrados
 * por competición (temporada/torneo) y por tipo de partido.
 */
export const GET = withUser(async (req, ctx, user) => {
  const { searchParams } = new URL(req.url);
  const idTorneo = searchParams.get('idTorneo');
  const tipo = searchParams.get('tipo');
  const tipos = await idsTipos();

  // Filtro común sobre el Partido (alias p)
  let filtro = 'p.idUsuario = ?';
  const args = [user.idUsuario];
  if (idTorneo) {
    filtro += ` AND p.idPartido IN (
      SELECT tp.idPartido FROM TorneoPartidos tp JOIN Torneos t ON t.idTorneo = tp.idTorneo
      WHERE tp.idTorneo = ? AND t.idUsuario = ?)`;
    args.push(idTorneo, user.idUsuario);
  }
  if (tipo && tipos[tipo]) {
    filtro += ' AND p.idTipoPartido = ?';
    args.push(tipos[tipo]);
  }

  const lideres = (selectExtra, orderBy) => `
    SELECT j.idJugador, j.NombreJugador, j.ApellidoPJugador, j.NumeroJugador,
           e.NombreEquipo,
           ${selectExtra}
    FROM estadisticasJugador sj
    JOIN JugadoresPartido jp ON sj.idJugadoresPartido = jp.idJugadoresPartido
    JOIN Partido p ON p.idPartido = jp.idPartido
    JOIN Jugadores j ON jp.idJugador = j.idJugador
    JOIN Equipos e ON j.idEquipo = e.idEquipo
    WHERE ${filtro}
    GROUP BY j.idJugador
    ORDER BY ${orderBy} DESC
    LIMIT 10
  `;

  const [puntosRes, rebotesRes, asistenciasRes, effRes, equiposRes, competicionesRes, resumenRes] = await db.batch([
    {
      sql: lideres(`SUM(sj.puntos) as totalPuntos,
         COUNT(DISTINCT jp.idPartido) as partidos,
         ROUND(CAST(SUM(sj.puntos) AS FLOAT) / MAX(1, COUNT(DISTINCT jp.idPartido)), 1) as promPuntos`, 'promPuntos'),
      args,
    },
    {
      sql: lideres(`SUM(sj.totalRebotes) as totalRebotes,
         COUNT(DISTINCT jp.idPartido) as partidos,
         ROUND(CAST(SUM(sj.totalRebotes) AS FLOAT) / MAX(1, COUNT(DISTINCT jp.idPartido)), 1) as promRebotes`, 'promRebotes'),
      args,
    },
    {
      sql: lideres(`SUM(sj.asistencia) as totalAsistencias,
         COUNT(DISTINCT jp.idPartido) as partidos,
         ROUND(CAST(SUM(sj.asistencia) AS FLOAT) / MAX(1, COUNT(DISTINCT jp.idPartido)), 1) as promAsistencias`, 'promAsistencias'),
      args,
    },
    {
      sql: lideres(`COUNT(DISTINCT jp.idPartido) as partidos,
         ROUND(CAST(SUM(sj.EFF) AS FLOAT) / MAX(1, COUNT(DISTINCT jp.idPartido)), 1) as promEFF,
         ROUND(CAST(SUM(sj.PIR) AS FLOAT) / MAX(1, COUNT(DISTINCT jp.idPartido)), 1) as promPIR`, 'promEFF'),
      args,
    },
    {
      sql: `
        SELECT e.NombreEquipo,
               ROUND(AVG(se.PTS), 1) as promPTS,
               ROUND(AVG(se.Reb), 1) as promReb,
               ROUND(AVG(se."FG%"), 1) as promFG,
               ROUND(AVG(se."3P%"), 1) as prom3P,
               COUNT(*) as partidos
        FROM estadisticasEquipo se
        JOIN Partido p ON p.idPartido = se.idPartido
        JOIN Equipos e ON se.idEquipo = e.idEquipo
        WHERE e.idUsuario = ? AND ${filtro}
        GROUP BY e.idEquipo
        ORDER BY promPTS DESC
      `,
      args: [user.idUsuario, ...args],
    },
    {
      sql: `SELECT idTorneo, nombre, COALESCE(tipo, 'torneo') AS tipo FROM Torneos
            WHERE idUsuario = ? ORDER BY COALESCE(fechaInicio, fechaCreacion) DESC`,
      args: [user.idUsuario],
    },
    {
      // Resumen de partidos culminados dentro del filtro
      sql: `SELECT COUNT(DISTINCT p.idPartido) AS partidos,
                   COALESCE(SUM(se.marcadorFinalE), 0) AS puntos
            FROM Partido p
            JOIN estadisticasEquipo se ON se.idPartido = p.idPartido
            WHERE ${filtro} AND p.idEstadoPartido = ?`,
      args: [...args, ESTADO_CULMINADO],
    },
  ]);

  const partidosJugados = Number(resumenRes.rows[0].partidos) || 0;
  const puntosTotales = Number(resumenRes.rows[0].puntos) || 0;

  // Datos de la competición seleccionada (tabla de posiciones, campeón) para el reporte
  let competicion = null;
  if (idTorneo) {
    const { torneo, equipos, tablas } = await cargarTorneo(idTorneo, user.idUsuario);
    const nombre = new Map(equipos.map(e => [e.idEquipo, e.NombreEquipo]));
    competicion = {
      nombre: torneo.nombre,
      tipo: torneo.tipo,
      formato: torneo.formato,
      estado: torneo.estado,
      fechaInicio: torneo.fechaInicio,
      fechaFin: torneo.fechaFin,
      clasifican: torneo.clasificanPorGrupo,
      campeon: torneo.idCampeon ? nombre.get(torneo.idCampeon) || null : null,
      totalEquipos: equipos.length,
      tablas: Object.fromEntries(Object.entries(tablas).map(([k, filas]) =>
        [k, filas.map(f => ({ ...f, NombreEquipo: nombre.get(f.idEquipo) || '' }))])),
    };
  }

  return NextResponse.json({
    usuario: user.nombre,
    resumen: {
      partidosJugados,
      puntosTotales,
      promedioPorEquipo: partidosJugados ? Math.round((puntosTotales / (partidosJugados * 2)) * 10) / 10 : 0,
    },
    competicion,
    puntos: puntosRes.rows,
    rebotes: rebotesRes.rows,
    asistencias: asistenciasRes.rows,
    eficiencia: effRes.rows,
    equipos: equiposRes.rows,
    competiciones: competicionesRes.rows,
  });
});
