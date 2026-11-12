import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withUser, badRequest, HttpError } from '@/lib/auth';
import { cargarTorneo, sincronizarPartidos } from '@/lib/torneosDb';
import { generarEliminatoria, sembrarClasificados, tieneResultado } from '@/lib/torneos';

// POST /api/torneos/[id]/eliminatoria — genera el cuadro final con los clasificados de grupos
export const POST = withUser(async (req, { params }, user) => {
  const { id } = await params;
  const { torneo, partidos, tablas } = await cargarTorneo(id, user.idUsuario);

  if (torneo.formato !== 'grupos') throw badRequest('Solo los torneos de grupos tienen esta fase');
  if (partidos.some(p => p.fase === 'eliminatoria')) throw new HttpError(409, 'La eliminatoria ya fue generada');
  const pendientes = partidos.filter(p => p.fase === 'grupo' && !tieneResultado(p)).length;
  if (pendientes > 0) throw badRequest(`Faltan ${pendientes} resultados de la fase de grupos`);

  const clasificados = sembrarClasificados(tablas, torneo.clasificanPorGrupo);
  const cuadro = generarEliminatoria(clasificados);

  await db.batch(cuadro.map(p => ({
    sql: `INSERT INTO TorneoPartidos
      (idTorneo, fase, grupo, ronda, posicion, idEquipoLocal, idEquipoVisitante, idGanador, esBye)
      VALUES (?,?,?,?,?,?,?,?,?)`,
    args: [torneo.idTorneo, 'eliminatoria', null, p.ronda, p.posicion, p.idEquipoLocal, p.idEquipoVisitante, p.idGanador, p.esBye],
  })), 'write');

  await sincronizarPartidos(id, user.idUsuario);
  return NextResponse.json(await cargarTorneo(id, user.idUsuario), { status: 201 });
});
