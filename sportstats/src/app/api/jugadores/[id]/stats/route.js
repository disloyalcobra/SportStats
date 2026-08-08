import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const idTipoPartido = searchParams.get('idTipoPartido');

    // 1. Datos del jugador
    const jugadorRes = await db.execute({
      sql: `
        SELECT j.*, pos.Nombre as posicion, e.NombreEquipo, es.Estado as estadoNombre,
               cat.NombreCategoria, r.NombreRama
        FROM Jugadores j
        LEFT JOIN Posiciones pos ON j.idPosicion = pos.idPosicion
        LEFT JOIN Equipos e ON j.idEquipo = e.idEquipo
        LEFT JOIN EstadosJugador es ON j.idEstadoJugador = es.idEstadoJugador
        LEFT JOIN Categoria cat ON e.idCategoria = cat.idCategoria
        LEFT JOIN Rama r ON e.idRama = r.idRama
        WHERE j.idJugador = ?
      `,
      args: [id],
    });

    if (jugadorRes.rows.length === 0) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 });
    }

    const jugador = jugadorRes.rows[0];

    // 2. Historial de partidos con sus estadísticas individuales
    let sqlPartidos = `
      SELECT sj.*, p.idPartido, p.fecha, p.horaInicio, p.horaTermino, p.ubicacion,
             p.idEstadoPartido, ep.estadoPartido, p.idTipoPartido, tp.TipoPartido, jp.Localia,
             seLocal.idEquipo as idLocal, eLocal.NombreEquipo as equipoLocal, seLocal.marcadorFinalE as ptsLocal,
             seVis.idEquipo as idVisitante, eVis.NombreEquipo as equipoVisitante, seVis.marcadorFinalE as ptsVisitante
      FROM estadisticasJugador sj
      JOIN JugadoresPartido jp ON sj.idJugadoresPartido = jp.idJugadoresPartido
      JOIN Partido p ON jp.idPartido = p.idPartido
      LEFT JOIN estadosPartido ep ON p.idEstadoPartido = ep.idEstadoPartido
      LEFT JOIN Tipo_partido tp ON p.idTipoPartido = tp.idTipoPartido
      LEFT JOIN estadisticasEquipo seLocal ON seLocal.idPartido = p.idPartido AND (
        SELECT COUNT(*) FROM estadisticasEquipo x WHERE x.idPartido = p.idPartido AND x.idEstadisticasEquipo < seLocal.idEstadisticasEquipo
      ) = 0
      LEFT JOIN Equipos eLocal ON seLocal.idEquipo = eLocal.idEquipo
      LEFT JOIN estadisticasEquipo seVis ON seVis.idPartido = p.idPartido AND seVis.idEstadisticasEquipo != seLocal.idEstadisticasEquipo
      LEFT JOIN Equipos eVis ON seVis.idEquipo = eVis.idEquipo
      WHERE jp.idJugador = ?
    `;

    const argsPartidos = [id];

    if (year) {
      sqlPartidos += " AND strftime('%Y', p.fecha) = ?";
      argsPartidos.push(year);
    }
    if (idTipoPartido) {
      sqlPartidos += ' AND p.idTipoPartido = ?';
      argsPartidos.push(idTipoPartido);
    }

    sqlPartidos += ' ORDER BY p.fecha DESC';

    const partidosRes = await db.execute({ sql: sqlPartidos, args: argsPartidos });
    const partidos = partidosRes.rows;

    // 3. Años disponibles y tipos de partido para filtros
    const [aniosRes, tiposRes] = await Promise.all([
      db.execute({
        sql: `
          SELECT DISTINCT strftime('%Y', p.fecha) as anio
          FROM JugadoresPartido jp
          JOIN Partido p ON jp.idPartido = p.idPartido
          WHERE jp.idJugador = ? AND p.fecha IS NOT NULL
          ORDER BY anio DESC
        `,
        args: [id],
      }),
      db.execute('SELECT * FROM Tipo_partido'),
    ]);

    // 4. Calcular Vista General (Promedios calculados al vuelo)
    const partidosCulminados = partidos.filter(p => p.estadoPartido === 'Culminado');
    const totalPartidos = partidosCulminados.length;

    let totPts = 0, totReb = 0, totAst = 0, totRobos = 0, totBloqueos = 0, totMin = 0, totTOV = 0, totPF = 0;
    let tot2PM = 0, tot2PA = 0, tot3PM = 0, tot3PA = 0, totFTM = 0, totFTA = 0;
    let totEFF = 0, totPIR = 0;

    for (const p of partidosCulminados) {
      totPts += p.puntos || 0;
      totReb += p.totalRebotes || 0;
      totAst += p.asistencia || 0;
      totRobos += p.robos || 0;
      totBloqueos += p.bloqueos || 0;
      totMin += p.minutos || 0;
      totTOV += p.perdida || 0;
      totPF += p.faltasPersonales || 0;
      tot2PM += p.two_pm || 0;
      tot2PA += p.two_pa || 0;
      tot3PM += p.three_pm || 0;
      tot3PA += p.three_pa || 0;
      totFTM += p.ftm || 0;
      totFTA += p.fta || 0;
      totEFF += p.EFF || 0;
      totPIR += p.PIR || 0;
    }

    const totFGM = tot2PM + tot3PM;
    const totFGA = tot2PA + tot3PA;

    const resumenGeneral = {
      totalPartidos,
      promedios: {
        puntos: totalPartidos > 0 ? (totPts / totalPartidos).toFixed(1) : '0.0',
        rebotes: totalPartidos > 0 ? (totReb / totalPartidos).toFixed(1) : '0.0',
        asistencias: totalPartidos > 0 ? (totAst / totalPartidos).toFixed(1) : '0.0',
        robos: totalPartidos > 0 ? (totRobos / totalPartidos).toFixed(1) : '0.0',
        bloqueos: totalPartidos > 0 ? (totBloqueos / totalPartidos).toFixed(1) : '0.0',
        minutos: totalPartidos > 0 ? (totMin / totalPartidos).toFixed(1) : '0.0',
        perdidas: totalPartidos > 0 ? (totTOV / totalPartidos).toFixed(1) : '0.0',
        eff: totalPartidos > 0 ? (totEFF / totalPartidos).toFixed(1) : '0.0',
        pir: totalPartidos > 0 ? (totPIR / totalPartidos).toFixed(1) : '0.0',
        pctFG: totFGA > 0 ? ((totFGM / totFGA) * 100).toFixed(1) : '0.0',
        pct3P: tot3PA > 0 ? ((tot3PM / tot3PA) * 100).toFixed(1) : '0.0',
        pctFT: totFTA > 0 ? ((totFTM / totFTA) * 100).toFixed(1) : '0.0',
      },
      totales: {
        totPts, totReb, totAst, totRobos, totBloqueos, totMin, totTOV, totPF,
        tot2PM, tot2PA, tot3PM, tot3PA, totFTM, totFTA, totFGM, totFGA, totEFF, totPIR,
      },
    };

    return NextResponse.json({
      jugador,
      partidos,
      resumenGeneral,
      filtros: {
        anios: aniosRes.rows.map(r => r.anio),
        tiposPartido: tiposRes.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
