import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // Quick-patch: only update idEquipo (used when adding/removing player from a team)
    if (body._removeFromTeam === true) {
      await db.execute({
        sql: 'UPDATE Jugadores SET idEquipo=? WHERE idJugador=?',
        args: [null, id],
      });
      return NextResponse.json({ success: true });
    }

    const {
      NombreJugador, ApellidoPJugador, ApellidoMJugador,
      FechaNacimiento, EstaturaJugador, PesoJugador,
      SemestreJugador, NumeroJugador, idPosicion, idEquipo,
      idEstadoJugador, LugarDeOrigenJugador,
    } = body;

    await db.execute({
      sql: `UPDATE Jugadores SET
        NombreJugador=?, ApellidoPJugador=?, ApellidoMJugador=?,
        FechaNacimiento=?, EstaturaJugador=?, PesoJugador=?,
        SemestreJugador=?, NumeroJugador=?, idPosicion=?, idEquipo=?,
        idEstadoJugador=?, LugarDeOrigenJugador=?
        WHERE idJugador=?`,
      args: [
        NombreJugador, ApellidoPJugador, ApellidoMJugador,
        FechaNacimiento, EstaturaJugador, PesoJugador,
        SemestreJugador, NumeroJugador, idPosicion, idEquipo,
        idEstadoJugador, LugarDeOrigenJugador, id,
      ],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await db.execute({ sql: 'DELETE FROM Jugadores WHERE idJugador=?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
