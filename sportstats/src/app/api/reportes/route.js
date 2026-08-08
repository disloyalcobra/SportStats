import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Líderes de puntos (promedio)
    const puntosRes = await db.execute(`
      SELECT j.idJugador, j.NombreJugador, j.ApellidoPJugador, j.NumeroJugador,
             e.NombreEquipo,
             SUM(sj.puntos) as totalPuntos,
             COUNT(DISTINCT jp.idPartido) as partidos,
             ROUND(CAST(SUM(sj.puntos) AS FLOAT) / MAX(1, COUNT(DISTINCT jp.idPartido)), 1) as promPuntos
      FROM estadisticasJugador sj
      JOIN JugadoresPartido jp ON sj.idJugadoresPartido = jp.idJugadoresPartido
      JOIN Jugadores j ON jp.idJugador = j.idJugador
      JOIN Equipos e ON j.idEquipo = e.idEquipo
      GROUP BY j.idJugador
      ORDER BY promPuntos DESC
      LIMIT 10
    `);

    const rebotesRes = await db.execute(`
      SELECT j.idJugador, j.NombreJugador, j.ApellidoPJugador, j.NumeroJugador,
             e.NombreEquipo,
             SUM(sj.totalRebotes) as totalRebotes,
             COUNT(DISTINCT jp.idPartido) as partidos,
             ROUND(CAST(SUM(sj.totalRebotes) AS FLOAT) / MAX(1, COUNT(DISTINCT jp.idPartido)), 1) as promRebotes
      FROM estadisticasJugador sj
      JOIN JugadoresPartido jp ON sj.idJugadoresPartido = jp.idJugadoresPartido
      JOIN Jugadores j ON jp.idJugador = j.idJugador
      JOIN Equipos e ON j.idEquipo = e.idEquipo
      GROUP BY j.idJugador
      ORDER BY promRebotes DESC
      LIMIT 10
    `);

    const asistenciasRes = await db.execute(`
      SELECT j.idJugador, j.NombreJugador, j.ApellidoPJugador, j.NumeroJugador,
             e.NombreEquipo,
             SUM(sj.asistencia) as totalAsistencias,
             COUNT(DISTINCT jp.idPartido) as partidos,
             ROUND(CAST(SUM(sj.asistencia) AS FLOAT) / MAX(1, COUNT(DISTINCT jp.idPartido)), 1) as promAsistencias
      FROM estadisticasJugador sj
      JOIN JugadoresPartido jp ON sj.idJugadoresPartido = jp.idJugadoresPartido
      JOIN Jugadores j ON jp.idJugador = j.idJugador
      JOIN Equipos e ON j.idEquipo = e.idEquipo
      GROUP BY j.idJugador
      ORDER BY promAsistencias DESC
      LIMIT 10
    `);

    const effRes = await db.execute(`
      SELECT j.idJugador, j.NombreJugador, j.ApellidoPJugador, j.NumeroJugador,
             e.NombreEquipo,
             ROUND(CAST(SUM(sj.EFF) AS FLOAT) / MAX(1, COUNT(DISTINCT jp.idPartido)), 1) as promEFF,
             ROUND(CAST(SUM(sj.PIR) AS FLOAT) / MAX(1, COUNT(DISTINCT jp.idPartido)), 1) as promPIR
      FROM estadisticasJugador sj
      JOIN JugadoresPartido jp ON sj.idJugadoresPartido = jp.idJugadoresPartido
      JOIN Jugadores j ON jp.idJugador = j.idJugador
      JOIN Equipos e ON j.idEquipo = e.idEquipo
      GROUP BY j.idJugador
      ORDER BY promEFF DESC
      LIMIT 10
    `);

    // Por equipo
    const equiposRes = await db.execute(`
      SELECT e.NombreEquipo, 
             ROUND(AVG(se.PTS), 1) as promPTS,
             ROUND(AVG(se.Reb), 1) as promReb,
             ROUND(AVG(se."FG%"), 1) as promFG,
             ROUND(AVG(se."3P%"), 1) as prom3P,
             COUNT(*) as partidos
      FROM estadisticasEquipo se
      JOIN Equipos e ON se.idEquipo = e.idEquipo
      GROUP BY e.idEquipo
      ORDER BY promPTS DESC
    `);

    return NextResponse.json({
      puntos: puntosRes.rows,
      rebotes: rebotesRes.rows,
      asistencias: asistenciasRes.rows,
      eficiencia: effRes.rows,
      equipos: equiposRes.rows,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
