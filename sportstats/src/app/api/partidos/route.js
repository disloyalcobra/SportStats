import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withUser, ownsAll, badRequest } from '@/lib/auth';
import { crearPartidoConEquipos, idsTipos, idTipo } from '@/lib/partidos';

export const GET = withUser(async (req, ctx, user) => {
  const res = await db.execute({
    sql: `
      SELECT p.*, ep.estadoPartido, tp.TipoPartido,
        e1.NombreEquipo as equipoLocal, e2.NombreEquipo as equipoVisitante,
        se1.marcadorFinalE as ptsLocal, se2.marcadorFinalE as ptsVisitante,
        t.idTorneo, t.nombre as torneoNombre, COALESCE(t.tipo, 'torneo') as competicionTipo,
        tpar.fase as competicionFase, tpar.ronda as competicionRonda
      FROM Partido p
      LEFT JOIN estadosPartido ep ON p.idEstadoPartido = ep.idEstadoPartido
      LEFT JOIN Tipo_partido tp ON p.idTipoPartido = tp.idTipoPartido
      LEFT JOIN estadisticasEquipo se1 ON se1.idPartido = p.idPartido AND (
        SELECT COUNT(*) FROM estadisticasEquipo x WHERE x.idPartido=p.idPartido AND x.idEstadisticasEquipo < se1.idEstadisticasEquipo
      ) = 0
      LEFT JOIN Equipos e1 ON se1.idEquipo = e1.idEquipo
      LEFT JOIN estadisticasEquipo se2 ON se2.idPartido = p.idPartido AND se2.idEstadisticasEquipo != se1.idEstadisticasEquipo
      LEFT JOIN Equipos e2 ON se2.idEquipo = e2.idEquipo
      LEFT JOIN TorneoPartidos tpar ON tpar.idPartido = p.idPartido
      LEFT JOIN Torneos t ON t.idTorneo = tpar.idTorneo
      WHERE p.idUsuario = ?
      ORDER BY p.fecha DESC
    `,
    args: [user.idUsuario],
  });

  const tiposIds = await idsTipos();
  const catalogos = await db.batch([
    { sql: 'SELECT * FROM estadosPartido' },
    { sql: 'SELECT * FROM Tipo_partido' },
    {
      sql: 'SELECT idEquipo, NombreEquipo, idCategoria, idDeporte, idRama FROM Equipos WHERE idUsuario = ? ORDER BY NombreEquipo',
      args: [user.idUsuario],
    },
    {
      sql: "SELECT idTorneo, nombre, COALESCE(tipo, 'torneo') AS tipo FROM Torneos WHERE idUsuario = ? ORDER BY COALESCE(fechaInicio, fechaCreacion) DESC",
      args: [user.idUsuario],
    },
  ]);

  // Partido "sin competición": tipo distinto de Amistoso y sin vínculo (datos previos a la spec 004)
  const partidos = res.rows.map(p => ({
    ...p,
    sinCompeticion: !p.idTorneo && Number(p.idTipoPartido) !== tiposIds.amistoso,
  }));

  return NextResponse.json({
    partidos,
    catalogos: {
      estados: catalogos[0].rows,
      tipos: catalogos[1].rows,
      equipos: catalogos[2].rows,
      competiciones: catalogos[3].rows,
      idTipoAmistoso: tiposIds.amistoso,
    },
  });
});

// POST /api/partidos — solo crea AMISTOSOS. Los partidos de temporada, playoffs y torneo
// se generan desde su competición (spec 004); cualquier idTipoPartido recibido se ignora.
export const POST = withUser(async (req, ctx, user) => {
  const { fecha, horaInicio, horaTermino, idEstadoPartido, ubicacion, idEquipoLocal, idEquipoVisitante } = await req.json();
  const idTipoPartido = await idTipo('amistoso');

  if (!(await ownsAll('Equipos', [idEquipoLocal, idEquipoVisitante].filter(Boolean), user.idUsuario))) {
    throw badRequest('Equipo no válido');
  }

  const idPartido = await crearPartidoConEquipos({
    idUsuario: user.idUsuario,
    fecha, horaInicio, horaTermino, idEstadoPartido, idTipoPartido, ubicacion,
    idEquipoLocal, idEquipoVisitante,
  });

  return NextResponse.json({ id: idPartido }, { status: 201 });
});
