import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withUser, assertOwns, owns, badRequest, notFound } from '@/lib/auth';

export const PUT = withUser(async (req, { params }, user) => {
  const { id } = await params;
  await assertOwns('Jugadores', id, user.idUsuario, 'Jugador');
  const body = await req.json();

  // Quick-patch: only update idEquipo (used when adding/removing player from a team)
  if (body._removeFromTeam === true) {
    await db.execute({
      sql: 'UPDATE Jugadores SET idEquipo=? WHERE idJugador=? AND idUsuario=?',
      args: [null, id, user.idUsuario],
    });
    return NextResponse.json({ success: true });
  }

  const {
    NombreJugador, ApellidoPJugador, ApellidoMJugador,
    FechaNacimiento, EstaturaJugador, PesoJugador,
    SemestreJugador, NumeroJugador, idPosicion, idEquipo,
    idEstadoJugador, LugarDeOrigenJugador,
  } = body;

  if (idEquipo && !(await owns('Equipos', idEquipo, user.idUsuario))) throw badRequest('Equipo no válido');

  await db.execute({
    sql: `UPDATE Jugadores SET
      NombreJugador=?, ApellidoPJugador=?, ApellidoMJugador=?,
      FechaNacimiento=?, EstaturaJugador=?, PesoJugador=?,
      SemestreJugador=?, NumeroJugador=?, idPosicion=?, idEquipo=?,
      idEstadoJugador=?, LugarDeOrigenJugador=?
      WHERE idJugador=? AND idUsuario=?`,
    args: [
      NombreJugador, ApellidoPJugador, ApellidoMJugador,
      FechaNacimiento, EstaturaJugador, PesoJugador,
      SemestreJugador, NumeroJugador, idPosicion, idEquipo || null,
      idEstadoJugador, LugarDeOrigenJugador, id, user.idUsuario,
    ].map(v => v ?? null),
  });
  return NextResponse.json({ success: true });
});

export const DELETE = withUser(async (req, { params }, user) => {
  const { id } = await params;
  const res = await db.execute({
    sql: 'DELETE FROM Jugadores WHERE idJugador=? AND idUsuario=?',
    args: [id, user.idUsuario],
  });
  if (res.rowsAffected === 0) throw notFound('Jugador');
  return NextResponse.json({ success: true });
});
