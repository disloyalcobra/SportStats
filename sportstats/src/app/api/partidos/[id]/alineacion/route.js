import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withUser, assertOwns, owns, badRequest } from '@/lib/auth';

// POST /api/partidos/[id]/alineacion - Agregar jugador a la alineación de un partido
export const POST = withUser(async (req, { params }, user) => {
  const { id } = await params;
  await assertOwns('Partido', id, user.idUsuario, 'Partido');
  const { idJugador, Localia } = await req.json();
  if (!(await owns('Jugadores', idJugador, user.idUsuario))) throw badRequest('Jugador no válido');

  // Verificar si ya existe
  const exists = await db.execute({
    sql: 'SELECT idJugadoresPartido FROM JugadoresPartido WHERE idJugador=? AND idPartido=?',
    args: [idJugador, id],
  });
  if (exists.rows.length > 0) {
    return NextResponse.json({ error: 'Jugador ya está en la alineación' }, { status: 400 });
  }

  const res = await db.execute({
    sql: 'INSERT INTO JugadoresPartido (idJugador, idPartido, Localia) VALUES (?,?,?)',
    args: [idJugador, id, Localia ? 1 : 0],
  });
  return NextResponse.json({ id: Number(res.lastInsertRowid) }, { status: 201 });
});

// DELETE /api/partidos/[id]/alineacion - Quitar jugador de la alineación
export const DELETE = withUser(async (req, { params }, user) => {
  const { id } = await params;
  await assertOwns('Partido', id, user.idUsuario, 'Partido');
  const { searchParams } = new URL(req.url);
  const idJugadoresPartido = searchParams.get('idJugadoresPartido');
  await db.execute({
    sql: 'DELETE FROM JugadoresPartido WHERE idJugadoresPartido=? AND idPartido=?',
    args: [idJugadoresPartido, id],
  });
  return NextResponse.json({ success: true });
});
