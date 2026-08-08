import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [partidoRes, jugadoresRes, statsEquipoRes] = await Promise.all([
      db.execute({
        sql: `
          SELECT p.*, ep.estadoPartido, tp.TipoPartido
          FROM Partido p
          LEFT JOIN estadosPartido ep ON p.idEstadoPartido = ep.idEstadoPartido
          LEFT JOIN Tipo_partido tp ON p.idTipoPartido = tp.idTipoPartido
          WHERE p.idPartido = ?
        `,
        args: [id],
      }),
      db.execute({
        sql: `
          SELECT jp.idJugadoresPartido, jp.idJugador, jp.Localia,
                 j.NombreJugador, j.ApellidoPJugador, j.NumeroJugador,
                 j.idEquipo, e.NombreEquipo, pos.Nombre as posicion,
                 sj.idEstadisticasJugador, sj.minutos, sj.puntos, sj.reboteOfensivo, sj.reboteDefensivo,
                 sj.totalRebotes, sj.asistencia, sj.perdida, sj.robos, sj.bloqueos, sj.faltasPersonales,
                 sj.two_pm, sj.two_pa, sj.three_pm, sj.three_pa, sj.ftm, sj.fta, sj.EFF, sj.PIR, sj.plus_minus
          FROM JugadoresPartido jp
          JOIN Jugadores j ON jp.idJugador = j.idJugador
          JOIN Equipos e ON j.idEquipo = e.idEquipo
          LEFT JOIN Posiciones pos ON j.idPosicion = pos.idPosicion
          LEFT JOIN estadisticasJugador sj ON sj.idJugadoresPartido = jp.idJugadoresPartido
          WHERE jp.idPartido = ?
          ORDER BY jp.Localia DESC, j.NumeroJugador
        `,
        args: [id],
      }),
      db.execute({
        sql: `
          SELECT se.*, e.NombreEquipo
          FROM estadisticasEquipo se
          JOIN Equipos e ON se.idEquipo = e.idEquipo
          WHERE se.idPartido = ?
          ORDER BY se.idEstadisticasEquipo ASC
        `,
        args: [id],
      }),
    ]);

    // jugadores disponibles para agregar a la alineación
    const todosJugadores = await db.execute(
      "SELECT j.idJugador, j.NombreJugador, j.ApellidoPJugador, j.NumeroJugador, j.idEquipo, e.NombreEquipo FROM Jugadores j JOIN Equipos e ON j.idEquipo = e.idEquipo WHERE j.idEstadoJugador = 1 ORDER BY e.NombreEquipo, j.NumeroJugador"
    );

    // Calcular líderes del partido
    const alineacion = jugadoresRes.rows;
    const findLeader = (key) => {
      let maxVal = -1;
      let leader = null;
      for (const player of alineacion) {
        const val = player[key] || 0;
        if (val > maxVal && val > 0) {
          maxVal = val;
          leader = { ...player, valor: val };
        }
      }
      return leader;
    };

    const lideres = {
      puntos: findLeader('puntos'),
      rebotes: findLeader('totalRebotes'),
      asistencias: findLeader('asistencia'),
      robos: findLeader('robos'),
      bloqueos: findLeader('bloqueos'),
      eficiencia: findLeader('EFF'),
    };

    return NextResponse.json({
      partido: partidoRes.rows[0] || null,
      alineacion,
      statsEquipo: statsEquipoRes.rows,
      jugadoresDisponibles: todosJugadores.rows,
      lideres,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { fecha, horaInicio, horaTermino, idEstadoPartido, idTipoPartido, ubicacion, localia } = body;
    await db.execute({
      sql: 'UPDATE Partido SET fecha=?, horaInicio=?, horaTermino=?, idEstadoPartido=?, idTipoPartido=?, ubicacion=?, localia=? WHERE idPartido=?',
      args: [fecha, horaInicio, horaTermino, idEstadoPartido, idTipoPartido, ubicacion, localia ? 1 : 0, id],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await db.execute({ sql: 'DELETE FROM Partido WHERE idPartido=?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
