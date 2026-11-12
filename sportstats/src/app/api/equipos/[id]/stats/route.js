import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withUser } from '@/lib/auth';

export const GET = withUser(async (req, { params }, user) => {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const idTipoPartido = searchParams.get('idTipoPartido');

    // 1. Datos del equipo
    const equipoRes = await db.execute({
      sql: `
        SELECT e.*, c.NombreCategoria, d.NombreDeporte, r.NombreRama
        FROM Equipos e
        LEFT JOIN Categoria c ON e.idCategoria = c.idCategoria
        LEFT JOIN Deportes d ON e.idDeporte = d.idDeporte
        LEFT JOIN Rama r ON e.idRama = r.idRama
        WHERE e.idEquipo = ? AND e.idUsuario = ?
      `,
      args: [id, user.idUsuario],
    });

    if (equipoRes.rows.length === 0) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 });
    }

    const equipo = equipoRes.rows[0];

    // 2. Partidos donde participa este equipo
    let sqlPartidos = `
      SELECT p.idPartido, p.fecha, p.horaInicio, p.horaTermino, p.ubicacion,
             p.idEstadoPartido, ep.estadoPartido, p.idTipoPartido, tp.TipoPartido,
             seLocal.idEquipo as idLocal, eLocal.NombreEquipo as equipoLocal, seLocal.marcadorFinalE as ptsLocal,
             seVis.idEquipo as idVisitante, eVis.NombreEquipo as equipoVisitante, seVis.marcadorFinalE as ptsVisitante,
             sePropia.marcadorPrimerCuartoE, sePropia.marcadorSegundoCuartoE, sePropia.marcadorTercerCuartoE, sePropia.marcadorCuartoCuartoE, sePropia.marcadorFinalE as ptsPropios,
             sePropia."2PM" as two_pm, sePropia."2PA" as two_pa, sePropia."2P%" as pct2,
             sePropia."3PM" as three_pm, sePropia."3PA" as three_pa, sePropia."3P%" as pct3,
             sePropia.FGM, sePropia.FGA, sePropia."FG%" as pctFG,
             sePropia.FTM, sePropia.FTA, sePropia."FT%" as pctFT,
             sePropia.OReb, sePropia.DReb, sePropia.Reb, sePropia.Ast, sePropia.TOV, sePropia.STL, sePropia.BLK, sePropia.PF, sePropia.PTS
      FROM estadisticasEquipo sePropia
      JOIN Partido p ON sePropia.idPartido = p.idPartido
      LEFT JOIN estadosPartido ep ON p.idEstadoPartido = ep.idEstadoPartido
      LEFT JOIN Tipo_partido tp ON p.idTipoPartido = tp.idTipoPartido
      LEFT JOIN estadisticasEquipo seLocal ON seLocal.idPartido = p.idPartido AND (
        SELECT COUNT(*) FROM estadisticasEquipo x WHERE x.idPartido = p.idPartido AND x.idEstadisticasEquipo < seLocal.idEstadisticasEquipo
      ) = 0
      LEFT JOIN Equipos eLocal ON seLocal.idEquipo = eLocal.idEquipo
      LEFT JOIN estadisticasEquipo seVis ON seVis.idPartido = p.idPartido AND seVis.idEstadisticasEquipo != seLocal.idEstadisticasEquipo
      LEFT JOIN Equipos eVis ON seVis.idEquipo = eVis.idEquipo
      WHERE sePropia.idEquipo = ?
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

    // 3. Obtener años disponibles y tipos de partido para los filtros
    const [aniosRes, tiposRes] = await Promise.all([
      db.execute({
        sql: `
          SELECT DISTINCT strftime('%Y', p.fecha) as anio
          FROM estadisticasEquipo se
          JOIN Partido p ON se.idPartido = p.idPartido
          WHERE se.idEquipo = ? AND p.fecha IS NOT NULL
          ORDER BY anio DESC
        `,
        args: [id],
      }),
      db.execute('SELECT * FROM Tipo_partido'),
    ]);

    // 4. Calcular Vista General (Estadísticas acumuladas y promedios)
    const partidosCulminados = partidos.filter(p => p.estadoPartido === 'Culminado');
    const totalPartidos = partidosCulminados.length;

    let totalPts = 0, totalPtsRival = 0;
    let total2PM = 0, total2PA = 0, total3PM = 0, total3PA = 0, totalFTM = 0, totalFTA = 0;
    let totalOReb = 0, totalDReb = 0, totalReb = 0, totalAst = 0, totalTOV = 0, totalSTL = 0, totalBLK = 0, totalPF = 0;
    let victorias = 0, derrotas = 0;

    for (const p of partidosCulminados) {
      const esLocal = String(p.idLocal) === String(id);
      const miScore = esLocal ? (p.ptsLocal || 0) : (p.ptsVisitante || 0);
      const rivalScore = esLocal ? (p.ptsVisitante || 0) : (p.ptsLocal || 0);

      totalPts += miScore;
      totalPtsRival += rivalScore;

      if (miScore > rivalScore) victorias++;
      else if (miScore < rivalScore) derrotas++;

      total2PM += p.two_pm || 0;
      total2PA += p.two_pa || 0;
      total3PM += p.three_pm || 0;
      total3PA += p.three_pa || 0;
      totalFTM += p.FTM || 0;
      totalFTA += p.FTA || 0;
      totalOReb += p.OReb || 0;
      totalDReb += p.DReb || 0;
      totalReb += p.Reb || 0;
      totalAst += p.Ast || 0;
      totalTOV += p.TOV || 0;
      totalSTL += p.STL || 0;
      totalBLK += p.BLK || 0;
      totalPF += p.PF || 0;
    }

    const totalFGM = total2PM + total3PM;
    const totalFGA = total2PA + total3PA;

    const resumenGeneral = {
      totalPartidos,
      victorias,
      derrotas,
      promedios: {
        ptsFavor: totalPartidos > 0 ? (totalPts / totalPartidos).toFixed(1) : '0.0',
        ptsContra: totalPartidos > 0 ? (totalPtsRival / totalPartidos).toFixed(1) : '0.0',
        rebotes: totalPartidos > 0 ? (totalReb / totalPartidos).toFixed(1) : '0.0',
        asistencias: totalPartidos > 0 ? (totalAst / totalPartidos).toFixed(1) : '0.0',
        robos: totalPartidos > 0 ? (totalSTL / totalPartidos).toFixed(1) : '0.0',
        bloqueos: totalPartidos > 0 ? (totalBLK / totalPartidos).toFixed(1) : '0.0',
        perdidas: totalPartidos > 0 ? (totalTOV / totalPartidos).toFixed(1) : '0.0',
        pctFG: totalFGA > 0 ? ((totalFGM / totalFGA) * 100).toFixed(1) : '0.0',
        pct3P: total3PA > 0 ? ((total3PM / total3PA) * 100).toFixed(1) : '0.0',
        pctFT: totalFTA > 0 ? ((totalFTM / totalFTA) * 100).toFixed(1) : '0.0',
      },
      totales: {
        totalPts, totalPtsRival, total2PM, total2PA, total3PM, total3PA, totalFTM, totalFTA,
        totalOReb, totalDReb, totalReb, totalAst, totalTOV, totalSTL, totalBLK, totalPF,
      },
    };

    // 5. Cargar alineaciones/stats de jugadores para cada partido del equipo
    const partidosConRoster = await Promise.all(
      partidos.map(async (p) => {
        const rosterRes = await db.execute({
          sql: `
            SELECT sj.*, j.NombreJugador, j.ApellidoPJugador, j.NumeroJugador, pos.Nombre as posicion
            FROM estadisticasJugador sj
            JOIN JugadoresPartido jp ON sj.idJugadoresPartido = jp.idJugadoresPartido
            JOIN Jugadores j ON jp.idJugador = j.idJugador
            LEFT JOIN Posiciones pos ON j.idPosicion = pos.idPosicion
            WHERE jp.idPartido = ? AND j.idEquipo = ?
            ORDER BY j.NumeroJugador ASC
          `,
          args: [p.idPartido, id],
        });
        return {
          ...p,
          roster: rosterRes.rows,
        };
      })
    );

    return NextResponse.json({
      equipo,
      partidos: partidosConRoster,
      resumenGeneral,
      filtros: {
        anios: aniosRes.rows.map(r => r.anio),
        tiposPartido: tiposRes.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching team stats:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
