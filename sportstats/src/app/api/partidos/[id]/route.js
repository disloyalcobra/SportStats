import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withUser, assertOwns, notFound, HttpError } from '@/lib/auth';
import { buscarVinculo, aplicarResultado } from '@/lib/torneosDb';
import { marcadorPartido, idTipo, ESTADO_CULMINADO } from '@/lib/partidos';

export const GET = withUser(async (req, { params }, user) => {
  const { id } = await params;
  await assertOwns('Partido', id, user.idUsuario, 'Partido');

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

  // jugadores disponibles (del usuario) para agregar a la alineación
  const todosJugadores = await db.execute({
    sql: `SELECT j.idJugador, j.NombreJugador, j.ApellidoPJugador, j.NumeroJugador, j.idEquipo, e.NombreEquipo
          FROM Jugadores j JOIN Equipos e ON j.idEquipo = e.idEquipo
          WHERE j.idEstadoJugador = 1 AND j.idUsuario = ?
          ORDER BY e.NombreEquipo, j.NumeroJugador`,
    args: [user.idUsuario],
  });

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
    torneo: await buscarVinculo(id, user.idUsuario),
  });
});

export const PUT = withUser(async (req, { params }, user) => {
  const { id } = await params;
  const { fecha, horaInicio, horaTermino, idEstadoPartido, idTipoPartido, ubicacion, localia } = await req.json();

  const actual = await db.execute({
    sql: 'SELECT idEstadoPartido, idTipoPartido FROM Partido WHERE idPartido = ? AND idUsuario = ?',
    args: [id, user.idUsuario],
  });
  if (actual.rows.length === 0) throw notFound('Partido');

  // El tipo es derivado (spec 004): no se edita. Única excepción: un partido sin competición
  // puede convertirse en Amistoso.
  const idAmistoso = await idTipo('amistoso');
  let tipoFinal = Number(actual.rows[0].idTipoPartido) || null;

  // Si pertenece a un torneo, culminarlo/reabrirlo actualiza el resultado del torneo.
  // Se aplica primero: si el torneo lo rechaza (p. ej. empate en eliminatoria) el partido no cambia.
  const vinculo = await buscarVinculo(id, user.idUsuario);
  if (!vinculo && Number(idTipoPartido) === idAmistoso) tipoFinal = idAmistoso;
  if (vinculo) {
    const eraCulminado = Number(actual.rows[0].idEstadoPartido) === ESTADO_CULMINADO;
    const seraCulminado = Number(idEstadoPartido) === ESTADO_CULMINADO;
    if (seraCulminado && !eraCulminado) {
      const marcador = await marcadorPartido(id);
      await aplicarResultado({
        idTorneo: vinculo.idTorneo,
        idTorneoPartido: vinculo.idTorneoPartido,
        idUsuario: user.idUsuario,
        desdePartido: true,
        payload: {
          marcadorLocal: marcador.get(vinculo.idEquipoLocal) ?? 0,
          marcadorVisitante: marcador.get(vinculo.idEquipoVisitante) ?? 0,
        },
      });
    } else if (!seraCulminado && eraCulminado && vinculo.tieneResultado) {
      await aplicarResultado({
        idTorneo: vinculo.idTorneo,
        idTorneoPartido: vinculo.idTorneoPartido,
        idUsuario: user.idUsuario,
        desdePartido: true,
        payload: { limpiar: true },
      });
    }
  }

  const res = await db.execute({
    sql: 'UPDATE Partido SET fecha=?, horaInicio=?, horaTermino=?, idEstadoPartido=?, idTipoPartido=?, ubicacion=?, localia=? WHERE idPartido=? AND idUsuario=?',
    args: [fecha, horaInicio, horaTermino, idEstadoPartido, tipoFinal, ubicacion, localia ? 1 : 0, id, user.idUsuario].map(v => v ?? null),
  });
  if (res.rowsAffected === 0) throw notFound('Partido');
  return NextResponse.json({ success: true });
});

export const DELETE = withUser(async (req, { params }, user) => {
  const { id } = await params;
  const vinculo = await buscarVinculo(id, user.idUsuario);
  if (vinculo) {
    throw new HttpError(409, `Este partido pertenece al torneo "${vinculo.nombreTorneo}". Gestiónalo desde el torneo.`);
  }
  const res = await db.execute({
    sql: 'DELETE FROM Partido WHERE idPartido=? AND idUsuario=?',
    args: [id, user.idUsuario],
  });
  if (res.rowsAffected === 0) throw notFound('Partido');
  return NextResponse.json({ success: true });
});
