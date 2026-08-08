import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Total equipos
    const equiposRes = await db.execute('SELECT COUNT(*) as total FROM Equipos');
    const totalEquipos = equiposRes.rows[0].total;

    // Total jugadores activos
    const jugadoresRes = await db.execute(
      "SELECT COUNT(*) as total FROM Jugadores WHERE idEstadoJugador = 1"
    );
    const totalJugadores = jugadoresRes.rows[0].total;

    // Total partidos jugados (Culminado = 1)
    const partidosRes = await db.execute(
      "SELECT COUNT(*) as total FROM Partido WHERE idEstadoPartido = 1"
    );
    const totalPartidos = partidosRes.rows[0].total;

    // Próximos partidos (estado Proximo = 4)
    const proximosRes = await db.execute(`
      SELECT p.idPartido, p.fecha, p.horaInicio, p.ubicacion, p.idTipoPartido,
             tp.TipoPartido,
             GROUP_CONCAT(e.NombreEquipo) as equipos
      FROM Partido p
      LEFT JOIN Tipo_partido tp ON p.idTipoPartido = tp.idTipoPartido
      LEFT JOIN estadisticasEquipo se ON se.idPartido = p.idPartido
      LEFT JOIN Equipos e ON se.idEquipo = e.idEquipo
      WHERE p.idEstadoPartido = 4
      GROUP BY p.idPartido
      ORDER BY p.fecha ASC
      LIMIT 5
    `);

    // Partidos recientes (Culminado = 1)
    const recientesRes = await db.execute(`
      SELECT p.idPartido, p.fecha, p.horaInicio, p.horaTermino, p.ubicacion,
             tp.TipoPartido,
             se.idEquipo as equipoLocalId, se.marcadorFinalE as ptsLocal, e.NombreEquipo as nombreLocal,
             se2.idEquipo as equipoVisitanteId, se2.marcadorFinalE as ptsVisitante, e2.NombreEquipo as nombreVisitante
      FROM Partido p
      LEFT JOIN Tipo_partido tp ON p.idTipoPartido = tp.idTipoPartido
      LEFT JOIN estadisticasEquipo se ON se.idPartido = p.idPartido AND (
        SELECT COUNT(*) FROM estadisticasEquipo x WHERE x.idPartido = p.idPartido AND x.idEstadisticasEquipo < se.idEstadisticasEquipo
      ) = 0
      LEFT JOIN Equipos e ON se.idEquipo = e.idEquipo
      LEFT JOIN estadisticasEquipo se2 ON se2.idPartido = p.idPartido AND se2.idEstadisticasEquipo != se.idEstadisticasEquipo
      LEFT JOIN Equipos e2 ON se2.idEquipo = e2.idEquipo
      WHERE p.idEstadoPartido = 1
      ORDER BY p.fecha DESC
      LIMIT 5
    `);

    // Gráfica: puntos de equipos en los últimos partidos
    const graficaRes = await db.execute(`
      SELECT e.NombreEquipo, p.fecha, se.PTS
      FROM estadisticasEquipo se
      JOIN Equipos e ON se.idEquipo = e.idEquipo
      JOIN Partido p ON se.idPartido = p.idPartido
      WHERE p.idEstadoPartido = 1
      ORDER BY p.fecha ASC
      LIMIT 20
    `);

    // Tabla de posiciones: ganados/perdidos por equipo
    const posicionesRes = await db.execute(`
      SELECT e.idEquipo, e.NombreEquipo, c.NombreCategoria, r.NombreRama,
             COUNT(DISTINCT p.idPartido) as partidos
      FROM Equipos e
      LEFT JOIN Categoria c ON e.idCategoria = c.idCategoria
      LEFT JOIN Rama r ON e.idRama = r.idRama
      LEFT JOIN estadisticasEquipo se ON se.idEquipo = e.idEquipo
      LEFT JOIN Partido p ON se.idPartido = p.idPartido AND p.idEstadoPartido = 1
      GROUP BY e.idEquipo
    `);

    // Calcular ganados/perdidos
    const posicionesRows = posicionesRes.rows;
    const posicionesConGanados = await Promise.all(
      posicionesRows.map(async (equipo) => {
        const ganRes = await db.execute({
          sql: `
            SELECT COUNT(*) as ganados FROM (
              SELECT se.idPartido
              FROM estadisticasEquipo se
              JOIN Partido p ON se.idPartido = p.idPartido
              WHERE se.idEquipo = ? AND p.idEstadoPartido = 1
              AND se.marcadorFinalE > (
                SELECT COALESCE(MAX(se2.marcadorFinalE), 0) FROM estadisticasEquipo se2 
                WHERE se2.idPartido = se.idPartido AND se2.idEquipo != se.idEquipo
              )
            )
          `,
          args: [equipo.idEquipo],
        });
        return {
          ...equipo,
          ganados: ganRes.rows[0].ganados,
          perdidos: Number(equipo.partidos) - Number(ganRes.rows[0].ganados),
        };
      })
    );

    return NextResponse.json({
      kpis: {
        totalEquipos,
        totalJugadores,
        totalPartidos,
      },
      proximos: proximosRes.rows,
      recientes: recientesRes.rows,
      grafica: graficaRes.rows,
      posiciones: posicionesConGanados,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
