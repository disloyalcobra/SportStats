import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withUser, notFound } from '@/lib/auth';

// PUT /api/equipos/[id] - Editar equipo
export const PUT = withUser(async (req, { params }, user) => {
  const { id } = await params;
  const { NombreEquipo, idCategoria, idDeporte, idRama } = await req.json();
  const res = await db.execute({
    sql: 'UPDATE Equipos SET NombreEquipo=?, idCategoria=?, idDeporte=?, idRama=? WHERE idEquipo=? AND idUsuario=?',
    args: [NombreEquipo, idCategoria, idDeporte, idRama, id, user.idUsuario].map(v => v ?? null),
  });
  if (res.rowsAffected === 0) throw notFound('Equipo');
  return NextResponse.json({ success: true });
});

// DELETE /api/equipos/[id] - Eliminar equipo
export const DELETE = withUser(async (req, { params }, user) => {
  const { id } = await params;
  const res = await db.execute({
    sql: 'DELETE FROM Equipos WHERE idEquipo=? AND idUsuario=?',
    args: [id, user.idUsuario],
  });
  if (res.rowsAffected === 0) throw notFound('Equipo');
  return NextResponse.json({ success: true });
});
