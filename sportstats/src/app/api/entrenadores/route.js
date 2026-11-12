import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withUser, ownsAll, badRequest } from '@/lib/auth';

export const GET = withUser(async (req, ctx, user) => {
  const res = await db.execute({
    sql: `
      SELECT en.*,
             GROUP_CONCAT(e.NombreEquipo, ', ') as equipos,
             GROUP_CONCAT(e.idEquipo) as equiposIds
      FROM Entrenadores en
      LEFT JOIN EquiposEntrenadores ee ON ee.idEntrenador = en.idEntrenador
      LEFT JOIN Equipos e ON ee.idEquipo = e.idEquipo AND e.idUsuario = en.idUsuario
      WHERE en.idUsuario = ?
      GROUP BY en.idEntrenador
      ORDER BY en.ApellidoPaEntrenador, en.NombreEntrenador
    `,
    args: [user.idUsuario],
  });

  const equiposCatalog = await db.execute({
    sql: 'SELECT idEquipo, NombreEquipo FROM Equipos WHERE idUsuario = ? ORDER BY NombreEquipo',
    args: [user.idUsuario],
  });

  return NextResponse.json({
    entrenadores: res.rows,
    catalogos: { equipos: equiposCatalog.rows },
  });
});

export const POST = withUser(async (req, ctx, user) => {
  const {
    NombreEntrenador, ApellidoPaEntrenador, ApellidoMaEntrenador,
    FechaNacimiento_entrenador, LugarDeOrigenEntrenador,
    email, telefono, equiposIds,
  } = await req.json();

  const ids = Array.isArray(equiposIds) ? equiposIds : [];
  if (!(await ownsAll('Equipos', ids, user.idUsuario))) throw badRequest('Equipo no válido');

  const res = await db.execute({
    sql: `INSERT INTO Entrenadores
      (NombreEntrenador, ApellidoPaEntrenador, ApellidoMaEntrenador, FechaNacimiento_entrenador, LugarDeOrigenEntrenador, email, telefono, idUsuario)
      VALUES (?,?,?,?,?,?,?,?)`,
    args: [
      NombreEntrenador, ApellidoPaEntrenador, ApellidoMaEntrenador || null,
      FechaNacimiento_entrenador || null, LugarDeOrigenEntrenador || null,
      email || null, telefono || null, user.idUsuario,
    ],
  });

  const idEntrenador = Number(res.lastInsertRowid);

  if (ids.length > 0) {
    await db.batch(ids.map(idEquipo => ({
      sql: 'INSERT INTO EquiposEntrenadores (idEntrenador, idEquipo) VALUES (?, ?)',
      args: [idEntrenador, idEquipo],
    })));
  }

  return NextResponse.json({ id: idEntrenador }, { status: 201 });
});
