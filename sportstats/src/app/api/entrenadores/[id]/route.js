import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withUser, assertOwns, ownsAll, badRequest, notFound } from '@/lib/auth';

export const PUT = withUser(async (req, { params }, user) => {
  const { id } = await params;
  await assertOwns('Entrenadores', id, user.idUsuario, 'Entrenador');

  const {
    NombreEntrenador, ApellidoPaEntrenador, ApellidoMaEntrenador,
    FechaNacimiento_entrenador, LugarDeOrigenEntrenador,
    email, telefono, equiposIds,
  } = await req.json();

  const ids = Array.isArray(equiposIds) ? equiposIds : [];
  if (!(await ownsAll('Equipos', ids, user.idUsuario))) throw badRequest('Equipo no válido');

  await db.batch([
    {
      sql: `UPDATE Entrenadores SET
        NombreEntrenador = ?, ApellidoPaEntrenador = ?, ApellidoMaEntrenador = ?,
        FechaNacimiento_entrenador = ?, LugarDeOrigenEntrenador = ?,
        email = ?, telefono = ?
        WHERE idEntrenador = ? AND idUsuario = ?`,
      args: [
        NombreEntrenador, ApellidoPaEntrenador, ApellidoMaEntrenador || null,
        FechaNacimiento_entrenador || null, LugarDeOrigenEntrenador || null,
        email || null, telefono || null,
        id, user.idUsuario,
      ],
    },
    // Actualizar relaciones en EquiposEntrenadores
    { sql: 'DELETE FROM EquiposEntrenadores WHERE idEntrenador = ?', args: [id] },
    ...ids.map(idEquipo => ({
      sql: 'INSERT INTO EquiposEntrenadores (idEntrenador, idEquipo) VALUES (?, ?)',
      args: [id, idEquipo],
    })),
  ], 'write');

  return NextResponse.json({ success: true });
});

export const DELETE = withUser(async (req, { params }, user) => {
  const { id } = await params;
  const res = await db.execute({
    sql: 'DELETE FROM Entrenadores WHERE idEntrenador = ? AND idUsuario = ?',
    args: [id, user.idUsuario],
  });
  if (res.rowsAffected === 0) throw notFound('Entrenador');
  return NextResponse.json({ success: true });
});
