import { NextResponse } from 'next/server';
import { withUser, assertOwns } from '@/lib/auth';
import { candidatosAsignacion, asignarPartido } from '@/lib/torneosDb';

// GET /api/partidos/[id]/asignar — enfrentamientos de temporadas/torneos a los que se puede asignar
export const GET = withUser(async (req, { params }, user) => {
  const { id } = await params;
  await assertOwns('Partido', id, user.idUsuario, 'Partido');
  return NextResponse.json({ candidatos: await candidatosAsignacion(id, user.idUsuario) });
});

// POST /api/partidos/[id]/asignar — { idTorneoPartido }
export const POST = withUser(async (req, { params }, user) => {
  const { id } = await params;
  await assertOwns('Partido', id, user.idUsuario, 'Partido');
  const { idTorneoPartido } = await req.json();
  const asignado = await asignarPartido({ idPartido: Number(id), idTorneoPartido, idUsuario: user.idUsuario });
  return NextResponse.json({ success: true, asignado });
});
