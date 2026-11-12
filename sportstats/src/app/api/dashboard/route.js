import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withUser } from '@/lib/auth';

export const GET = withUser(async (req, ctx, user) => {
  const uid = user.idUsuario;

  const [equiposRes, jugadoresRes, partidosRes, torneosRes] = await db.batch([
    { sql: 'SELECT COUNT(*) as total FROM Equipos WHERE idUsuario = ?', args: [uid] },
    // Total jugadores activos
    { sql: 'SELECT COUNT(*) as total FROM Jugadores WHERE idEstadoJugador = 1 AND idUsuario = ?', args: [uid] },
    // Total partidos jugados (Culminado = 1)
    { sql: 'SELECT COUNT(*) as total FROM Partido WHERE idEstadoPartido = 1 AND idUsuario = ?', args: [uid] },
    { sql: "SELECT COUNT(*) as total FROM Torneos WHERE estado = 'En curso' AND idUsuario = ?", args: [uid] },
  ]);

  // Próximos partidos (estado Proximo = 4)
  const proximosRes = await db.execute({
    sql: `
      SELECT p.idPartido, p.fecha, p.horaInicio, p.ubicacion, p.idTipoPartido,
             tp.TipoPartido,
             GROUP_CONCAT(e.NombreEquipo) as equipos
      FROM Partido p
      LEFT JOIN Tipo_partido tp ON p.idTipoPartido = tp.idTipoPartido
      LEFT JOIN estadisticasEquipo se ON se.idPartido = p.idPartido
      LEFT JOIN Equipos e ON se.idEquipo = e.idEquipo
      WHERE p.idEstadoPartido = 4 AND p.idUsuario = ?
      GROUP BY p.idPartido
      ORDER BY p.fecha ASC
      LIMIT 5
    `,
    args: [uid],
  });

  // Partidos recientes (Culminado = 1)
  const recientesRes = await db.execute({
    sql: `
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
      WHERE p.idEstadoPartido = 1 AND p.idUsuario = ?
      ORDER BY p.fecha DESC
      LIMIT 5
    `,
    args: [uid],
  });

  // Gráfica: puntos de equipos en los últimos partidos
  const graficaRes = await db.execute({
    sql: `
      SELECT e.NombreEquipo, p.fecha, se.PTS
      FROM estadisticasEquipo se
      JOIN Equipos e ON se.idEquipo = e.idEquipo
      JOIN Partido p ON se.idPartido = p.idPartido
      WHERE p.idEstadoPartido = 1 AND p.idUsuario = ?
      ORDER BY p.fecha ASC
      LIMIT 20
    `,
    args: [uid],
  });

  // Tabla de posiciones: ganados/perdidos por equipo
  const posicionesRes = await db.execute({
    sql: `
      SELECT e.idEquipo, e.NombreEquipo, c.NombreCategoria, r.NombreRama,
             COUNT(DISTINCT p.idPartido) as partidos,
             COUNT(DISTINCT CASE WHEN se.marcadorFinalE > (
               SELECT COALESCE(MAX(se2.marcadorFinalE), 0) FROM estadisticasEquipo se2
               WHERE se2.idPartido = se.idPartido AND se2.idEquipo != se.idEquipo
             ) THEN p.idPartido END) as ganados
      FROM Equipos e
      LEFT JOIN Categoria c ON e.idCategoria = c.idCategoria
      LEFT JOIN Rama r ON e.idRama = r.idRama
      LEFT JOIN estadisticasEquipo se ON se.idEquipo = e.idEquipo
      LEFT JOIN Partido p ON se.idPartido = p.idPartido AND p.idEstadoPartido = 1
      WHERE e.idUsuario = ?
      GROUP BY e.idEquipo
    `,
    args: [uid],
  });

  const posiciones = posicionesRes.rows.map(equipo => ({
    ...equipo,
    ganados: Number(equipo.ganados),
    perdidos: Number(equipo.partidos) - Number(equipo.ganados),
  }));

  return NextResponse.json({
    kpis: {
      totalEquipos: equiposRes.rows[0].total,
      totalJugadores: jugadoresRes.rows[0].total,
      totalPartidos: partidosRes.rows[0].total,
      torneosActivos: torneosRes.rows[0].total,
    },
    proximos: proximosRes.rows,
    recientes: recientesRes.rows,
    grafica: graficaRes.rows,
    posiciones,
  });
});
