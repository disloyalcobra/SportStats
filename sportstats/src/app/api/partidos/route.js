import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await db.execute(`
      SELECT p.*, ep.estadoPartido, tp.TipoPartido,
        e1.NombreEquipo as equipoLocal, e2.NombreEquipo as equipoVisitante,
        se1.marcadorFinalE as ptsLocal, se2.marcadorFinalE as ptsVisitante
      FROM Partido p
      LEFT JOIN estadosPartido ep ON p.idEstadoPartido = ep.idEstadoPartido
      LEFT JOIN Tipo_partido tp ON p.idTipoPartido = tp.idTipoPartido
      LEFT JOIN estadisticasEquipo se1 ON se1.idPartido = p.idPartido AND (
        SELECT COUNT(*) FROM estadisticasEquipo x WHERE x.idPartido=p.idPartido AND x.idEstadisticasEquipo < se1.idEstadisticasEquipo
      ) = 0
      LEFT JOIN Equipos e1 ON se1.idEquipo = e1.idEquipo
      LEFT JOIN estadisticasEquipo se2 ON se2.idPartido = p.idPartido AND se2.idEstadisticasEquipo != se1.idEstadisticasEquipo
      LEFT JOIN Equipos e2 ON se2.idEquipo = e2.idEquipo
      ORDER BY p.fecha DESC
    `);

    const catalogos = await db.batch([
      { sql: 'SELECT * FROM estadosPartido' },
      { sql: 'SELECT * FROM Tipo_partido' },
      { sql: 'SELECT idEquipo, NombreEquipo, idCategoria, idDeporte, idRama FROM Equipos ORDER BY NombreEquipo' },
    ]);

    return NextResponse.json({
      partidos: res.rows,
      catalogos: {
        estados: catalogos[0].rows,
        tipos: catalogos[1].rows,
        equipos: catalogos[2].rows,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { fecha, horaInicio, horaTermino, idEstadoPartido, idTipoPartido, ubicacion, idEquipoLocal, idEquipoVisitante } = body;
    
    // 1. Insertar Partido (por defecto Estado Proximo = 4 si no se especifica)
    const estadoPartido = idEstadoPartido || 4;
    const resPartido = await db.execute({
      sql: 'INSERT INTO Partido (fecha, horaInicio, horaTermino, idEstadoPartido, idTipoPartido, ubicacion, localia) VALUES (?,?,?,?,?,?,1)',
      args: [fecha, horaInicio, horaTermino, estadoPartido, idTipoPartido, ubicacion],
    });
    
    const idPartido = Number(resPartido.lastInsertRowid);
    
    if (idEquipoLocal && idEquipoVisitante) {
      // 2. Inicializar estadisticasEquipo (insertamos local primero para que tenga menor idEstadisticasEquipo)
      const resLocalStats = await db.execute({
        sql: 'INSERT INTO estadisticasEquipo (idEquipo, idPartido, marcadorPrimerCuartoE, marcadorSegundoCuartoE, marcadorTercerCuartoE, marcadorCuartoCuartoE, marcadorFinalE, PTS) VALUES (?, ?, 0, 0, 0, 0, 0, 0)',
        args: [idEquipoLocal, idPartido],
      });
      const idLocalStats = Number(resLocalStats.lastInsertRowid);

      const resVisitanteStats = await db.execute({
        sql: 'INSERT INTO estadisticasEquipo (idEquipo, idPartido, marcadorPrimerCuartoE, marcadorSegundoCuartoE, marcadorTercerCuartoE, marcadorCuartoCuartoE, marcadorFinalE, PTS) VALUES (?, ?, 0, 0, 0, 0, 0, 0)',
        args: [idEquipoVisitante, idPartido],
      });
      const idVisitanteStats = Number(resVisitanteStats.lastInsertRowid);

      // 3. Cargar jugadores activos (idEstadoJugador = 1) de ambos equipos
      const [jugadoresLocal, jugadoresVisitante] = await Promise.all([
        db.execute({
          sql: 'SELECT idJugador FROM Jugadores WHERE idEquipo = ? AND idEstadoJugador = 1',
          args: [idEquipoLocal],
        }),
        db.execute({
          sql: 'SELECT idJugador FROM Jugadores WHERE idEquipo = ? AND idEstadoJugador = 1',
          args: [idEquipoVisitante],
        }),
      ]);

      // 4. Insertar jugadores a JugadoresPartido e inicializar sus estadísticas a 0
      const batchQueries = [];
      
      for (const row of jugadoresLocal.rows) {
        batchQueries.push({
          sql: 'INSERT INTO JugadoresPartido (idJugador, idPartido, Localia) VALUES (?, ?, 1)',
          args: [row.idJugador, idPartido],
        });
      }
      
      for (const row of jugadoresVisitante.rows) {
        batchQueries.push({
          sql: 'INSERT INTO JugadoresPartido (idJugador, idPartido, Localia) VALUES (?, ?, 0)',
          args: [row.idJugador, idPartido],
        });
      }

      if (batchQueries.length > 0) {
        await db.batch(batchQueries);
      }

      // 5. Vincular jugadores en estadisticasJugador con su idEstadisticasEquipo correspondiente
      const alineados = await db.execute({
        sql: 'SELECT idJugadoresPartido, idJugador, Localia FROM JugadoresPartido WHERE idPartido = ?',
        args: [idPartido],
      });

      const statsJugadorQueries = [];
      for (const row of alineados.rows) {
        const idStatsEq = row.Localia === 1 ? idLocalStats : idVisitanteStats;
        statsJugadorQueries.push({
          sql: `INSERT INTO estadisticasJugador 
            (idJugadoresPartido, idEstadisticasEquipo, minutos, puntos, promedioPuntos,
             reboteOfensivo, reboteDefensivo, totalRebotes, asistencia, perdida, robos, bloqueos,
             faltasPersonales, two_pm, two_pa, three_pm, three_pa, ftm, fta, eficiencia, PFD, PIR, EFF, plus_minus)
            VALUES (?, ?, 0, 0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
          args: [row.idJugadoresPartido, idStatsEq],
        });
      }

      if (statsJugadorQueries.length > 0) {
        await db.batch(statsJugadorQueries);
      }
    }
    
    return NextResponse.json({ id: idPartido }, { status: 201 });
  } catch (error) {
    console.error('Error creating partido:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

