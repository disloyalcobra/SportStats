import { NextResponse } from 'next/server';
import { withUser } from '@/lib/auth';
import { cargarTorneo, eliminarTorneo, sincronizarPartidos } from '@/lib/torneosDb';

// GET /api/torneos/[id] — torneo completo con partidos y tablas
export const GET = withUser(async (req, { params }, user) => {
  const { id } = await params;
  // Torneos creados antes del vínculo con Partido: se generan sus partidos al abrirlos
  const data = await cargarTorneo(id, user.idUsuario);
  const faltan = data.partidos.some(p =>
    !p.esBye && p.idPartido === null && p.idEquipoLocal !== null && p.idEquipoVisitante !== null);
  if (faltan) {
    await sincronizarPartidos(id, user.idUsuario);
    return NextResponse.json(await cargarTorneo(id, user.idUsuario));
  }
  return NextResponse.json(data);
});

// DELETE /api/torneos/[id] — borra el torneo y sus partidos vinculados
export const DELETE = withUser(async (req, { params }, user) => {
  const { id } = await params;
  await eliminarTorneo(id, user.idUsuario);
  return NextResponse.json({ success: true });
});
