import { NextResponse } from 'next/server';
import { withUser } from '@/lib/auth';
import { aplicarResultado, cargarTorneo } from '@/lib/torneosDb';

/**
 * PUT /api/torneos/[id]/partidos/[idPartido]
 * Body: { marcadorLocal, marcadorVisitante }  ó  { limpiar: true }
 * Actualiza el torneo y el Partido vinculado (marcador + estado Culminado/Próximo).
 */
export const PUT = withUser(async (req, { params }, user) => {
  const { id, idPartido } = await params;
  const payload = await req.json();
  await aplicarResultado({ idTorneo: id, idTorneoPartido: idPartido, idUsuario: user.idUsuario, payload });
  return NextResponse.json(await cargarTorneo(id, user.idUsuario));
});
