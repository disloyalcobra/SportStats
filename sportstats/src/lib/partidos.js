import { db } from '@/lib/db';

export const ESTADO_CULMINADO = 1;
export const ESTADO_PROXIMO = 4;

/**
 * Crea un Partido con sus registros asociados:
 * estadisticasEquipo de ambos equipos (local primero), alineación con los jugadores
 * activos de cada equipo y estadisticasJugador en 0.
 * @returns {Promise<number>} idPartido
 */
export async function crearPartidoConEquipos({
  idUsuario, fecha, horaInicio = null, horaTermino = null, idEstadoPartido = ESTADO_PROXIMO,
  idTipoPartido = null, ubicacion = null, idEquipoLocal, idEquipoVisitante,
}) {
  const resPartido = await db.execute({
    sql: 'INSERT INTO Partido (fecha, horaInicio, horaTermino, idEstadoPartido, idTipoPartido, ubicacion, localia, idUsuario) VALUES (?,?,?,?,?,?,1,?)',
    args: [fecha, horaInicio, horaTermino, idEstadoPartido || ESTADO_PROXIMO, idTipoPartido, ubicacion, idUsuario],
  });
  const idPartido = Number(resPartido.lastInsertRowid);
  if (!idEquipoLocal || !idEquipoVisitante) return idPartido;

  // Local primero para que tenga el menor idEstadisticasEquipo (convención usada en las consultas)
  const insertStats = 'INSERT INTO estadisticasEquipo (idEquipo, idPartido, marcadorPrimerCuartoE, marcadorSegundoCuartoE, marcadorTercerCuartoE, marcadorCuartoCuartoE, marcadorFinalE, PTS) VALUES (?, ?, 0, 0, 0, 0, 0, 0)';
  const idLocalStats = Number((await db.execute({ sql: insertStats, args: [idEquipoLocal, idPartido] })).lastInsertRowid);
  const idVisitanteStats = Number((await db.execute({ sql: insertStats, args: [idEquipoVisitante, idPartido] })).lastInsertRowid);

  const activos = (idEquipo) => db.execute({
    sql: 'SELECT idJugador FROM Jugadores WHERE idEquipo = ? AND idEstadoJugador = 1 AND idUsuario = ?',
    args: [idEquipo, idUsuario],
  });
  const [jugadoresLocal, jugadoresVisitante] = await Promise.all([activos(idEquipoLocal), activos(idEquipoVisitante)]);

  const alineacion = [
    ...jugadoresLocal.rows.map(r => ({ sql: 'INSERT INTO JugadoresPartido (idJugador, idPartido, Localia) VALUES (?, ?, 1)', args: [r.idJugador, idPartido] })),
    ...jugadoresVisitante.rows.map(r => ({ sql: 'INSERT INTO JugadoresPartido (idJugador, idPartido, Localia) VALUES (?, ?, 0)', args: [r.idJugador, idPartido] })),
  ];
  if (alineacion.length === 0) return idPartido;
  await db.batch(alineacion, 'write');

  const alineados = await db.execute({
    sql: 'SELECT idJugadoresPartido, Localia FROM JugadoresPartido WHERE idPartido = ?',
    args: [idPartido],
  });
  await db.batch(alineados.rows.map(row => ({
    sql: `INSERT INTO estadisticasJugador
      (idJugadoresPartido, idEstadisticasEquipo, minutos, puntos, promedioPuntos,
       reboteOfensivo, reboteDefensivo, totalRebotes, asistencia, perdida, robos, bloqueos,
       faltasPersonales, two_pm, two_pa, three_pm, three_pa, ftm, fta, eficiencia, PFD, PIR, EFF, plus_minus)
      VALUES (?, ?, 0, 0, 0.0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
    args: [row.idJugadoresPartido, Number(row.Localia) === 1 ? idLocalStats : idVisitanteStats],
  })), 'write');

  return idPartido;
}

/** Borra un partido y todos sus registros dependientes (sin depender de PRAGMA foreign_keys). */
export function sqlEliminarPartido(idPartido) {
  return [
    { sql: 'DELETE FROM estadisticasJugador WHERE idJugadoresPartido IN (SELECT idJugadoresPartido FROM JugadoresPartido WHERE idPartido = ?)', args: [idPartido] },
    { sql: 'DELETE FROM estadisticasJugador WHERE idEstadisticasEquipo IN (SELECT idEstadisticasEquipo FROM estadisticasEquipo WHERE idPartido = ?)', args: [idPartido] },
    { sql: 'DELETE FROM JugadoresPartido WHERE idPartido = ?', args: [idPartido] },
    { sql: 'DELETE FROM estadisticasEquipo WHERE idPartido = ?', args: [idPartido] },
    { sql: 'DELETE FROM Partido WHERE idPartido = ?', args: [idPartido] },
  ];
}

/** Qué información tiene capturada un partido. */
export async function datosPartido(idPartido) {
  const res = await db.execute({
    sql: `SELECT p.idEstadoPartido,
            (SELECT COALESCE(SUM(marcadorFinalE + PTS), 0) FROM estadisticasEquipo WHERE idPartido = p.idPartido) AS eq,
            (SELECT COALESCE(SUM(sj.minutos + sj.puntos + sj.totalRebotes + sj.asistencia), 0)
               FROM estadisticasJugador sj JOIN JugadoresPartido jp ON jp.idJugadoresPartido = sj.idJugadoresPartido
              WHERE jp.idPartido = p.idPartido) AS jug
          FROM Partido p WHERE p.idPartido = ?`,
    args: [idPartido],
  });
  const r = res.rows[0];
  if (!r) return { existe: false, culminado: false, marcador: false, jugadores: false };
  return {
    existe: true,
    culminado: Number(r.idEstadoPartido) === ESTADO_CULMINADO,
    marcador: Number(r.eq) > 0,
    jugadores: Number(r.jug) > 0,
  };
}

/** true si el partido ya tiene información capturada (culminado, marcador o estadísticas). */
export async function partidoTieneDatos(idPartido) {
  const d = await datosPartido(idPartido);
  return d.culminado || d.marcador || d.jugadores;
}

/** Marcador final de cada equipo de un partido: Map(idEquipo → puntos). */
export async function marcadorPartido(idPartido) {
  const res = await db.execute({
    sql: 'SELECT idEquipo, marcadorFinalE, PTS FROM estadisticasEquipo WHERE idPartido = ?',
    args: [idPartido],
  });
  return new Map(res.rows.map(r => [Number(r.idEquipo), Number(r.marcadorFinalE || r.PTS || 0)]));
}

// ===================== Tipos de partido (derivados, spec 004) =====================
// El tipo nunca se elige a mano: depende de dónde vive el partido.
const TIPOS = {
  amistoso: { patron: '%amistoso%', nombre: 'Amistoso' },
  temporada: { patron: '%temporada%', nombre: 'Temporada' },
  playoffs: { patron: '%playoff%', nombre: 'Playoffs' },
  torneo: { patron: '%torneo%', nombre: 'Torneo' },
};

let tiposCache = null;

/** Mapa { amistoso, temporada, playoffs, torneo } → idTipoPartido. Crea en el catálogo los que falten. */
export async function idsTipos() {
  if (tiposCache) return tiposCache;
  const ids = {};
  for (const [clave, { patron, nombre }] of Object.entries(TIPOS)) {
    const res = await db.execute({
      sql: 'SELECT idTipoPartido FROM Tipo_partido WHERE LOWER(TipoPartido) LIKE ? ORDER BY idTipoPartido LIMIT 1',
      args: [patron],
    });
    if (res.rows[0]) {
      ids[clave] = Number(res.rows[0].idTipoPartido);
    } else {
      const ins = await db.execute({ sql: 'INSERT INTO Tipo_partido (TipoPartido) VALUES (?)', args: [nombre] });
      ids[clave] = Number(ins.lastInsertRowid);
    }
  }
  tiposCache = ids;
  return ids;
}

export const idTipo = async (clave) => (await idsTipos())[clave];

/** Clave del tipo de un partido de competición según el tipo de competición y la fase. */
export function claveTipoCompeticion(tipoCompeticion, fase) {
  if (tipoCompeticion === 'temporada') return fase === 'eliminatoria' ? 'playoffs' : 'temporada';
  return 'torneo';
}
