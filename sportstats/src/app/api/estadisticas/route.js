import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withUser, assertOwns, owns, badRequest } from '@/lib/auth';

function calcularStats(data) {
  const fgm = (data['2PM'] || 0) + (data['3PM'] || 0);
  const fga = (data['2PA'] || 0) + (data['3PA'] || 0);
  const pct2 = data['2PA'] > 0 ? Math.round((data['2PM'] / data['2PA']) * 100) : 0;
  const pct3 = data['3PA'] > 0 ? Math.round((data['3PM'] / data['3PA']) * 100) : 0;
  const fgpct = fga > 0 ? Math.round((fgm / fga) * 100) : 0;
  const ftpct = data.FTA > 0 ? Math.round((data.FTM / data.FTA) * 100) : 0;
  const reb = (data.OReb || 0) + (data.DReb || 0);
  const pts = (data['2PM'] || 0) * 2 + (data['3PM'] || 0) * 3 + (data.FTM || 0);
  return { fgm, fga, pct2, pct3, fgpct, ftpct, reb, pts };
}

function calcularJugadorStats(d) {
  const fgm = (d.two_pm || 0) + (d.three_pm || 0);
  const fga = (d.two_pa || 0) + (d.three_pa || 0);
  const pts = (d.two_pm || 0) * 2 + (d.three_pm || 0) * 3 + (d.ftm || 0);
  const reb = (d.reboteOfensivo || 0) + (d.reboteDefensivo || 0);
  // EFF = (PTS + REB + AST + STL + BLK) - (FGA-FGM + FTA-FTM + TOV)
  const EFF = (pts + reb + (d.asistencia || 0) + (d.robos || 0) + (d.bloqueos || 0))
    - ((fga - fgm) + ((d.fta || 0) - (d.ftm || 0)) + (d.perdida || 0));
  // PIR = (PTS + REB + AST + STL + BLK + PFD) - (FGA-FGM + FTA-FTM + TOV + PF)
  const PIR = (pts + reb + (d.asistencia || 0) + (d.robos || 0) + (d.bloqueos || 0) + (d.PFD || 0))
    - ((fga - fgm) + ((d.fta || 0) - (d.ftm || 0)) + (d.perdida || 0) + (d.faltasPersonales || 0));
  return { pts, reb, EFF, PIR, fgm, fga };
}

// GET /api/estadisticas?idPartido=X - Obtener stats de un partido
export const GET = withUser(async (req, ctx, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const idPartido = searchParams.get('idPartido');
    if (!idPartido) return NextResponse.json({ error: 'idPartido requerido' }, { status: 400 });
    await assertOwns('Partido', idPartido, user.idUsuario, 'Partido');

    const [equipoRes, jugadorRes] = await Promise.all([
      db.execute({
        sql: `SELECT se.*, e.NombreEquipo FROM estadisticasEquipo se 
              JOIN Equipos e ON se.idEquipo = e.idEquipo WHERE se.idPartido=?`,
        args: [idPartido],
      }),
      db.execute({
        sql: `SELECT sj.*, j.NombreJugador, j.ApellidoPJugador, j.NumeroJugador, jp.Localia, j.idEquipo, e.NombreEquipo
              FROM estadisticasJugador sj
              JOIN JugadoresPartido jp ON sj.idJugadoresPartido = jp.idJugadoresPartido
              JOIN Jugadores j ON jp.idJugador = j.idJugador
              JOIN Equipos e ON j.idEquipo = e.idEquipo
              WHERE jp.idPartido=?
              ORDER BY jp.Localia DESC, j.NumeroJugador`,
        args: [idPartido],
      }),
    ]);

    return NextResponse.json({
      statsEquipo: equipoRes.rows,
      statsJugador: jugadorRes.rows,
    });
  } catch (error) {
    if (error.status) throw error;
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// POST /api/estadisticas - Guardar/actualizar stats de equipo y jugadores
export const POST = withUser(async (req, ctx, user) => {
  try {
    const body = await req.json();
    const { idPartido, idEquipo, statsEquipo, statsJugadores } = body;

    await assertOwns('Partido', idPartido, user.idUsuario, 'Partido');
    if (!(await owns('Equipos', idEquipo, user.idUsuario))) throw badRequest('Equipo no válido');

    // Solo se aceptan registros de alineación que pertenezcan a este partido
    const alineacionRes = await db.execute({
      sql: 'SELECT idJugadoresPartido FROM JugadoresPartido WHERE idPartido = ?',
      args: [idPartido],
    });
    const alineacionValida = new Set(alineacionRes.rows.map(r => Number(r.idJugadoresPartido)));

    // Verificar que el partido NO esté marcado como Culminado (idEstadoPartido = 1)
    const partidoCheck = await db.execute({
      sql: 'SELECT idEstadoPartido FROM Partido WHERE idPartido = ?',
      args: [idPartido],
    });

    if (partidoCheck.rows.length > 0 && Number(partidoCheck.rows[0].idEstadoPartido) === 1) {
      return NextResponse.json(
        { error: 'El partido ya está culminado. No se pueden modificar estadísticas de un partido terminado.' },
        { status: 400 }
      );
    }

    const { fgm, fga, pct2, pct3, fgpct, ftpct, reb, pts } = calcularStats(statsEquipo);

    // Upsert estadisticasEquipo
    const existeEquipo = await db.execute({
      sql: 'SELECT idEstadisticasEquipo FROM estadisticasEquipo WHERE idPartido=? AND idEquipo=?',
      args: [idPartido, idEquipo],
    });

    let idEstadisticasEquipo;
    if (existeEquipo.rows.length > 0) {
      idEstadisticasEquipo = existeEquipo.rows[0].idEstadisticasEquipo;
      await db.execute({
        sql: `UPDATE estadisticasEquipo SET
          marcadorPrimerCuartoE=?, marcadorSegundoCuartoE=?, marcadorTercerCuartoE=?, marcadorCuartoCuartoE=?, marcadorFinalE=?,
          "2PM"=?, "2PA"=?, "2P%"=?, "3PM"=?, "3PA"=?, "3P%"=?,
          FGM=?, FGA=?, "FG%"=?, FTM=?, FTA=?, "FT%"=?,
          OReb=?, DReb=?, Reb=?, Ast=?, TOV=?, STL=?, BLK=?, SR=?, PF=?, PTS=?
          WHERE idEstadisticasEquipo=?`,
        args: [
          statsEquipo.marcadorPrimerCuartoE || 0, statsEquipo.marcadorSegundoCuartoE || 0,
          statsEquipo.marcadorTercerCuartoE || 0, statsEquipo.marcadorCuartoCuartoE || 0,
          statsEquipo.marcadorFinalE || pts,
          statsEquipo['2PM'] || 0, statsEquipo['2PA'] || 0, pct2,
          statsEquipo['3PM'] || 0, statsEquipo['3PA'] || 0, pct3,
          fgm, fga, fgpct, statsEquipo.FTM || 0, statsEquipo.FTA || 0, ftpct,
          statsEquipo.OReb || 0, statsEquipo.DReb || 0, reb,
          statsEquipo.Ast || 0, statsEquipo.TOV || 0, statsEquipo.STL || 0,
          statsEquipo.BLK || 0, statsEquipo.SR || 0, statsEquipo.PF || 0, pts,
          idEstadisticasEquipo,
        ],
      });
    } else {
      const res2 = await db.execute({
        sql: `INSERT INTO estadisticasEquipo
          (idEquipo, idPartido, marcadorPrimerCuartoE, marcadorSegundoCuartoE, marcadorTercerCuartoE, marcadorCuartoCuartoE, marcadorFinalE,
          "2PM","2PA","2P%","3PM","3PA","3P%",FGM,FGA,"FG%",FTM,FTA,"FT%",
          OReb,DReb,Reb,Ast,TOV,STL,BLK,SR,PF,PTS)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          idEquipo, idPartido,
          statsEquipo.marcadorPrimerCuartoE || 0, statsEquipo.marcadorSegundoCuartoE || 0,
          statsEquipo.marcadorTercerCuartoE || 0, statsEquipo.marcadorCuartoCuartoE || 0,
          statsEquipo.marcadorFinalE || pts,
          statsEquipo['2PM'] || 0, statsEquipo['2PA'] || 0, pct2,
          statsEquipo['3PM'] || 0, statsEquipo['3PA'] || 0, pct3,
          fgm, fga, fgpct, statsEquipo.FTM || 0, statsEquipo.FTA || 0, ftpct,
          statsEquipo.OReb || 0, statsEquipo.DReb || 0, reb,
          statsEquipo.Ast || 0, statsEquipo.TOV || 0, statsEquipo.STL || 0,
          statsEquipo.BLK || 0, statsEquipo.SR || 0, statsEquipo.PF || 0, pts,
        ],
      });
      idEstadisticasEquipo = Number(res2.lastInsertRowid);
    }

    // Upsert estadisticasJugador
    for (const sj of (statsJugadores || [])) {
      if (!alineacionValida.has(Number(sj.idJugadoresPartido))) continue;
      const { pts: ptsJ, reb: rebJ, EFF, PIR } = calcularJugadorStats(sj);
      const existeJ = await db.execute({
        sql: 'SELECT idEstadisticasJugador FROM estadisticasJugador WHERE idJugadoresPartido=?',
        args: [sj.idJugadoresPartido],
      });
      if (existeJ.rows.length > 0) {
        await db.execute({
          sql: `UPDATE estadisticasJugador SET
            idEstadisticasEquipo=?, minutos=?, puntos=?,
            reboteOfensivo=?, reboteDefensivo=?, totalRebotes=?,
            asistencia=?, perdida=?, robos=?, bloqueos=?, faltasPersonales=?,
            two_pm=?, two_pa=?, three_pm=?, three_pa=?, ftm=?, fta=?,
            EFF=?, PIR=?, plus_minus=?, PFD=?
            WHERE idEstadisticasJugador=?`,
          args: [
            idEstadisticasEquipo, sj.minutos || 0, ptsJ,
            sj.reboteOfensivo || 0, sj.reboteDefensivo || 0, rebJ,
            sj.asistencia || 0, sj.perdida || 0, sj.robos || 0, sj.bloqueos || 0, sj.faltasPersonales || 0,
            sj.two_pm || 0, sj.two_pa || 0, sj.three_pm || 0, sj.three_pa || 0, sj.ftm || 0, sj.fta || 0,
            EFF, PIR, sj.plus_minus || 0, sj.PFD || 0,
            existeJ.rows[0].idEstadisticasJugador,
          ],
        });
      } else {
        await db.execute({
          sql: `INSERT INTO estadisticasJugador
            (idJugadoresPartido, idEstadisticasEquipo, minutos, puntos,
            reboteOfensivo, reboteDefensivo, totalRebotes,
            asistencia, perdida, robos, bloqueos, faltasPersonales,
            two_pm, two_pa, three_pm, three_pa, ftm, fta,
            EFF, PIR, plus_minus, PFD, promedioPuntos, eficiencia)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,0)`,
          args: [
            sj.idJugadoresPartido, idEstadisticasEquipo, sj.minutos || 0, ptsJ,
            sj.reboteOfensivo || 0, sj.reboteDefensivo || 0, rebJ,
            sj.asistencia || 0, sj.perdida || 0, sj.robos || 0, sj.bloqueos || 0, sj.faltasPersonales || 0,
            sj.two_pm || 0, sj.two_pa || 0, sj.three_pm || 0, sj.three_pa || 0, sj.ftm || 0, sj.fta || 0,
            EFF, PIR, sj.plus_minus || 0, sj.PFD || 0,
          ],
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.status) throw error;
    console.error('Stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
