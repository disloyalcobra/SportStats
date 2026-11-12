import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withUser, owns, badRequest } from '@/lib/auth';

export const GET = withUser(async (req, ctx, user) => {
  const { searchParams } = new URL(req.url);
  const idEquipo = searchParams.get('idEquipo');

  let sql = `
    SELECT j.*, p.Nombre as posicion, e.NombreEquipo, es.Estado as estadoNombre,
           cat.NombreCategoria, r.NombreRama
    FROM Jugadores j
    LEFT JOIN Posiciones p ON j.idPosicion = p.idPosicion
    LEFT JOIN Equipos e ON j.idEquipo = e.idEquipo
    LEFT JOIN EstadosJugador es ON j.idEstadoJugador = es.idEstadoJugador
    LEFT JOIN Categoria cat ON e.idCategoria = cat.idCategoria
    LEFT JOIN Rama r ON e.idRama = r.idRama
    WHERE j.idUsuario = ?
  `;
  const args = [user.idUsuario];
  if (idEquipo) {
    sql += ' AND j.idEquipo = ?';
    args.push(idEquipo);
  }
  sql += ' ORDER BY j.ApellidoPJugador, j.NombreJugador';

  const res = await db.execute({ sql, args });

  const catalogos = await db.batch([
    { sql: 'SELECT * FROM Posiciones' },
    { sql: 'SELECT * FROM EstadosJugador' },
    { sql: 'SELECT idEquipo, NombreEquipo FROM Equipos WHERE idUsuario = ? ORDER BY NombreEquipo', args: [user.idUsuario] },
  ]);

  return NextResponse.json({
    jugadores: res.rows,
    catalogos: {
      posiciones: catalogos[0].rows,
      estados: catalogos[1].rows,
      equipos: catalogos[2].rows,
    },
  });
});

export const POST = withUser(async (req, ctx, user) => {
  const {
    NombreJugador, ApellidoPJugador, ApellidoMJugador,
    FechaNacimiento, EstaturaJugador, PesoJugador,
    SemestreJugador, NumeroJugador, idPosicion, idEquipo,
    idEstadoJugador, LugarDeOrigenJugador,
  } = await req.json();

  if (idEquipo && !(await owns('Equipos', idEquipo, user.idUsuario))) throw badRequest('Equipo no válido');

  const res = await db.execute({
    sql: `INSERT INTO Jugadores
      (NombreJugador, ApellidoPJugador, ApellidoMJugador, FechaNacimiento,
       EstaturaJugador, PesoJugador, SemestreJugador, NumeroJugador,
       idPosicion, idEquipo, idEstadoJugador, LugarDeOrigenJugador, idUsuario)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      NombreJugador, ApellidoPJugador, ApellidoMJugador, FechaNacimiento,
      EstaturaJugador, PesoJugador, SemestreJugador, NumeroJugador,
      idPosicion, idEquipo || null, idEstadoJugador, LugarDeOrigenJugador, user.idUsuario,
    ].map(v => v ?? null),
  });
  return NextResponse.json({ id: Number(res.lastInsertRowid) }, { status: 201 });
});
