import { db } from '@/lib/db';
import { notFound, badRequest, HttpError } from '@/lib/auth';
import { calcularTabla, totalRondas, slotSiguiente, tieneResultado } from '@/lib/torneos';
import {
  crearPartidoConEquipos, sqlEliminarPartido, partidoTieneDatos, datosPartido, idsTipos, claveTipoCompeticion,
  marcadorPartido, ESTADO_CULMINADO, ESTADO_PROXIMO,
} from '@/lib/partidos';
import { nextPow2 } from '@/lib/torneos';

const num = (v) => (v === null || v === undefined ? null : Number(v));
const conflict = (msg) => new HttpError(409, msg);

const normalizarPartido = (p) => ({
  idTorneoPartido: Number(p.idTorneoPartido),
  fase: p.fase,
  grupo: p.grupo,
  ronda: Number(p.ronda),
  posicion: Number(p.posicion),
  idEquipoLocal: num(p.idEquipoLocal),
  idEquipoVisitante: num(p.idEquipoVisitante),
  marcadorLocal: num(p.marcadorLocal),
  marcadorVisitante: num(p.marcadorVisitante),
  idGanador: num(p.idGanador),
  esBye: Number(p.esBye) === 1,
  idPartido: num(p.idPartido),
  estadoPartido: p.estadoPartido ?? null,
});

/** Carga un torneo del usuario con equipos, partidos y tablas calculadas. Lanza 404 si no es suyo. */
export async function cargarTorneo(idTorneo, idUsuario) {
  const torneoRes = await db.execute({
    sql: `SELECT t.*, d.NombreDeporte
          FROM Torneos t LEFT JOIN Deportes d ON d.idDeporte = t.idDeporte
          WHERE t.idTorneo = ? AND t.idUsuario = ?`,
    args: [idTorneo, idUsuario],
  });
  const t = torneoRes.rows[0];
  if (!t) throw notFound('Torneo');

  const [equiposRes, partidosRes] = await db.batch([
    {
      sql: `SELECT te.idEquipo, te.semilla, te.grupo, e.NombreEquipo
            FROM TorneoEquipos te JOIN Equipos e ON e.idEquipo = te.idEquipo
            WHERE te.idTorneo = ? ORDER BY te.semilla`,
      args: [idTorneo],
    },
    {
      sql: `SELECT tp.*, ep.estadoPartido
            FROM TorneoPartidos tp
            LEFT JOIN Partido p ON p.idPartido = tp.idPartido
            LEFT JOIN estadosPartido ep ON ep.idEstadoPartido = p.idEstadoPartido
            WHERE tp.idTorneo = ?
            ORDER BY CASE tp.fase WHEN 'eliminatoria' THEN 1 ELSE 0 END, tp.grupo, tp.ronda, tp.posicion`,
      args: [idTorneo],
    },
  ]);

  const torneo = {
    idTorneo: Number(t.idTorneo),
    tipo: t.tipo === 'temporada' ? 'temporada' : 'torneo',
    nombre: t.nombre,
    formato: t.formato,
    fechaFin: t.fechaFin,
    idDeporte: num(t.idDeporte),
    NombreDeporte: t.NombreDeporte,
    puntosVictoria: Number(t.puntosVictoria),
    puntosEmpate: Number(t.puntosEmpate),
    puntosDerrota: Number(t.puntosDerrota),
    idaVuelta: Number(t.idaVuelta) === 1,
    numGrupos: Number(t.numGrupos),
    clasificanPorGrupo: Number(t.clasificanPorGrupo),
    estado: t.estado,
    idCampeon: num(t.idCampeon),
    fechaInicio: t.fechaInicio,
    fechaCreacion: t.fechaCreacion,
  };

  const equipos = equiposRes.rows.map(e => ({
    idEquipo: Number(e.idEquipo),
    NombreEquipo: e.NombreEquipo,
    semilla: num(e.semilla),
    grupo: e.grupo,
  }));
  const partidos = partidosRes.rows.map(normalizarPartido);
  const nombres = new Map(equipos.map(e => [e.idEquipo, e.NombreEquipo]));
  const nombre = (id) => nombres.get(id) || '';
  const puntos = { victoria: torneo.puntosVictoria, empate: torneo.puntosEmpate, derrota: torneo.puntosDerrota };

  const tablas = {};
  if (torneo.formato === 'liga') {
    tablas.General = calcularTabla(equipos.map(e => e.idEquipo), partidos, puntos, nombre);
  } else if (torneo.formato === 'grupos') {
    const letras = [...new Set(equipos.map(e => e.grupo).filter(Boolean))].sort();
    for (const g of letras) {
      tablas[g] = calcularTabla(
        equipos.filter(e => e.grupo === g).map(e => e.idEquipo),
        partidos.filter(p => p.fase === 'grupo' && p.grupo === g),
        puntos,
        nombre,
      );
    }
  }

  const eliminatoria = partidos.filter(p => p.fase === 'eliminatoria');
  const rondasEliminatoria = eliminatoria.length ? Math.max(...eliminatoria.map(p => p.ronda)) : 0;

  return { torneo, equipos, partidos, tablas, rondasEliminatoria, totalRondasTeoricas: totalRondas(equipos.length) };
}

// ===================== Vínculo con Partido =====================

const hoyISO = () => new Date().toISOString().slice(0, 10);

function sumarDias(fechaISO, dias) {
  const d = new Date(`${fechaISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const esFecha = (f) => /^\d{4}-\d{2}-\d{2}$/.test(f || '');
const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);

/**
 * Fecha tentativa (editable luego en Partidos): una jornada/ronda por semana desde la fecha de inicio.
 * Si la competición tiene fecha de fin, el calendario se reparte dentro del rango (máximo una semana entre jornadas).
 */
function fechaTentativa(torneo, partidos, p) {
  const base = esFecha(torneo.fechaInicio) ? torneo.fechaInicio : hoyISO();
  const jornadasPrevias = Math.max(0, ...partidos.filter(x => x.fase !== 'eliminatoria').map(x => x.ronda));
  const slot = p.fase === 'eliminatoria' ? jornadasPrevias + p.ronda - 1 : p.ronda - 1;

  let intervalo = 7;
  if (esFecha(torneo.fechaFin) && torneo.fechaFin > base) {
    // Rondas de eliminatoria: las ya generadas o, si aún no existen (playoffs), las previstas
    const rondasGeneradas = Math.max(0, ...partidos.filter(x => x.fase === 'eliminatoria').map(x => x.ronda));
    const rondasPrevistas = torneo.formato === 'grupos'
      ? Math.log2(nextPow2(Math.max(2, torneo.numGrupos * torneo.clasificanPorGrupo)))
      : 0;
    const totalSlots = jornadasPrevias + (rondasGeneradas || rondasPrevistas);
    if (totalSlots > 1) intervalo = Math.max(1, Math.min(7, Math.floor(diasEntre(base, torneo.fechaFin) / (totalSlots - 1))));
  }
  return sumarDias(base, slot * intervalo);
}

/**
 * Crea un Partido (con alineaciones y estadísticas en 0) para cada enfrentamiento del torneo
 * que ya tiene sus dos equipos y aún no está vinculado.
 */
export async function sincronizarPartidos(idTorneo, idUsuario) {
  const { torneo, partidos } = await cargarTorneo(idTorneo, idUsuario);
  const pendientes = partidos.filter(p =>
    !p.esBye && p.idPartido === null && p.idEquipoLocal !== null && p.idEquipoVisitante !== null);
  if (pendientes.length === 0) return 0;

  const tipos = await idsTipos();
  const LOTE = 5;
  for (let i = 0; i < pendientes.length; i += LOTE) {
    await Promise.all(pendientes.slice(i, i + LOTE).map(async (p) => {
      const idPartido = await crearPartidoConEquipos({
        idUsuario,
        fecha: fechaTentativa(torneo, partidos, p),
        idTipoPartido: tipos[claveTipoCompeticion(torneo.tipo, p.fase)],
        idEstadoPartido: ESTADO_PROXIMO,
        idEquipoLocal: p.idEquipoLocal,
        idEquipoVisitante: p.idEquipoVisitante,
      });
      await db.execute({
        sql: 'UPDATE TorneoPartidos SET idPartido = ? WHERE idTorneoPartido = ?',
        args: [idPartido, p.idTorneoPartido],
      });
    }));
  }
  return pendientes.length;
}

/** Enfrentamiento de torneo vinculado a un Partido del usuario (o null). */
export async function buscarVinculo(idPartido, idUsuario) {
  const res = await db.execute({
    sql: `SELECT tp.idTorneo, tp.idTorneoPartido, tp.fase, tp.ronda, tp.grupo,
                 tp.idEquipoLocal, tp.idEquipoVisitante, tp.marcadorLocal, tp.marcadorVisitante, t.nombre, t.tipo
          FROM TorneoPartidos tp JOIN Torneos t ON t.idTorneo = tp.idTorneo
          WHERE tp.idPartido = ? AND t.idUsuario = ?`,
    args: [idPartido, idUsuario],
  });
  const r = res.rows[0];
  if (!r) return null;
  return {
    idTorneo: Number(r.idTorneo),
    idTorneoPartido: Number(r.idTorneoPartido),
    nombreTorneo: r.nombre,
    tipoCompeticion: r.tipo === 'temporada' ? 'temporada' : 'torneo',
    fase: r.fase,
    ronda: Number(r.ronda),
    grupo: r.grupo,
    idEquipoLocal: num(r.idEquipoLocal),
    idEquipoVisitante: num(r.idEquipoVisitante),
    tieneResultado: r.marcadorLocal !== null && r.marcadorVisitante !== null,
  };
}

// ===================== Resultados =====================

/**
 * Registra (o borra) el resultado de un enfrentamiento y propaga sus efectos:
 * avance en el cuadro, campeón, tabla de liga y Partido vinculado.
 *
 * @param {object} opts
 * @param {{marcadorLocal:number, marcadorVisitante:number}|{limpiar:true}} opts.payload
 * @param {boolean} opts.desdePartido  true cuando el cambio viene de cerrar/reabrir el Partido
 *                                     (en ese caso no se vuelve a escribir el Partido).
 */
export async function aplicarResultado({ idTorneo, idTorneoPartido, idUsuario, payload, desdePartido = false }) {
  const { torneo, partidos } = await cargarTorneo(idTorneo, idUsuario);

  const partido = partidos.find(p => p.idTorneoPartido === Number(idTorneoPartido));
  if (!partido) throw notFound('Partido del torneo');
  if (partido.esBye) throw badRequest('Este enfrentamiento es un pase directo (bye)');
  if (partido.idEquipoLocal === null || partido.idEquipoVisitante === null) {
    throw badRequest('Aún no están definidos los dos equipos de este enfrentamiento');
  }

  const limpiar = payload.limpiar === true;
  let marcadorLocal = null;
  let marcadorVisitante = null;
  let idGanador = null;

  if (!limpiar) {
    marcadorLocal = Number(payload.marcadorLocal);
    marcadorVisitante = Number(payload.marcadorVisitante);
    if (![marcadorLocal, marcadorVisitante].every(n => Number.isInteger(n) && n >= 0)) {
      throw badRequest('Los marcadores deben ser números enteros mayores o iguales a 0');
    }
    if (marcadorLocal > marcadorVisitante) idGanador = partido.idEquipoLocal;
    else if (marcadorVisitante > marcadorLocal) idGanador = partido.idEquipoVisitante;
  }

  // Captura rápida desde el torneo: no pisar un marcador calculado a partir de estadísticas de jugadores
  if (!desdePartido && !limpiar && partido.idPartido) {
    const datos = await datosPartido(partido.idPartido);
    if (datos.jugadores) {
      throw conflict('Este partido ya tiene estadísticas de jugadores. Edita el marcador desde el partido y márcalo como culminado.');
    }
  }

  const queries = [];
  if (partido.fase === 'eliminatoria') {
    if (!limpiar && idGanador === null) {
      throw badRequest(desdePartido
        ? 'Es un partido de eliminatoria y el marcador está empatado. Captura un marcador con ganador antes de culminarlo.'
        : 'En eliminatoria no puede haber empate');
    }

    const ultimaRonda = Math.max(...partidos.filter(p => p.fase === 'eliminatoria').map(p => p.ronda));
    if (partido.ronda < ultimaRonda) {
      const sig = slotSiguiente(partido.ronda, partido.posicion);
      const siguiente = partidos.find(p =>
        p.fase === 'eliminatoria' && p.ronda === sig.ronda && p.posicion === sig.posicion);
      const columna = sig.lado === 'local' ? 'idEquipoLocal' : 'idEquipoVisitante';

      if (siguiente[columna] !== idGanador) {
        if (tieneResultado(siguiente)) {
          throw conflict('El ganador ya jugó la siguiente ronda. Borra primero ese resultado para poder cambiar este.');
        }
        if (siguiente.idPartido) {
          // El rival del siguiente partido cambia: su Partido pendiente se descarta y se recrea después
          if (await partidoTieneDatos(siguiente.idPartido)) {
            throw conflict('El partido de la siguiente ronda ya tiene estadísticas capturadas. Bórralas antes de cambiar este resultado.');
          }
          queries.push(...sqlEliminarPartido(siguiente.idPartido));
        }
        queries.push({
          sql: `UPDATE TorneoPartidos SET ${columna} = ?, idPartido = NULL WHERE idTorneoPartido = ?`,
          args: [idGanador, siguiente.idTorneoPartido],
        });
      }
    } else {
      // Es la final: define (o retira) al campeón
      queries.push({
        sql: 'UPDATE Torneos SET estado = ?, idCampeon = ? WHERE idTorneo = ?',
        args: [idGanador ? 'Finalizado' : 'En curso', idGanador, torneo.idTorneo],
      });
    }
  } else if (torneo.formato === 'grupos' && partidos.some(p => p.fase === 'eliminatoria')) {
    throw conflict('La eliminatoria ya fue generada; los resultados de grupos no pueden cambiar.');
  }

  queries.unshift({
    sql: `UPDATE TorneoPartidos SET marcadorLocal = ?, marcadorVisitante = ?, idGanador = ?
          WHERE idTorneoPartido = ? AND idTorneo = ?`,
    args: [marcadorLocal, marcadorVisitante, idGanador, partido.idTorneoPartido, torneo.idTorneo],
  });

  // Reflejar el resultado en el Partido vinculado
  if (!desdePartido && partido.idPartido) {
    if (limpiar) {
      queries.push({ sql: 'UPDATE Partido SET idEstadoPartido = ? WHERE idPartido = ?', args: [ESTADO_PROXIMO, partido.idPartido] });
    } else {
      queries.push(
        {
          sql: 'UPDATE estadisticasEquipo SET marcadorFinalE = ?, PTS = ? WHERE idPartido = ? AND idEquipo = ?',
          args: [marcadorLocal, marcadorLocal, partido.idPartido, partido.idEquipoLocal],
        },
        {
          sql: 'UPDATE estadisticasEquipo SET marcadorFinalE = ?, PTS = ? WHERE idPartido = ? AND idEquipo = ?',
          args: [marcadorVisitante, marcadorVisitante, partido.idPartido, partido.idEquipoVisitante],
        },
        { sql: 'UPDATE Partido SET idEstadoPartido = ? WHERE idPartido = ?', args: [ESTADO_CULMINADO, partido.idPartido] },
      );
    }
  }

  await db.batch(queries, 'write');

  // Liga: cuando todos los partidos tienen resultado, el líder de la tabla es campeón
  if (torneo.formato === 'liga') {
    const actualizado = await cargarTorneo(idTorneo, idUsuario);
    const completo = actualizado.partidos.every(tieneResultado);
    const lider = actualizado.tablas.General?.[0]?.idEquipo ?? null;
    await db.execute({
      sql: 'UPDATE Torneos SET estado = ?, idCampeon = ? WHERE idTorneo = ?',
      args: [completo ? 'Finalizado' : 'En curso', completo ? lider : null, torneo.idTorneo],
    });
  }

  // Crear el Partido de la siguiente ronda si ya quedaron definidos sus dos equipos
  await sincronizarPartidos(idTorneo, idUsuario);
}

/** Borra el torneo y todos sus Partidos vinculados (con alineaciones y estadísticas). */
export async function eliminarTorneo(idTorneo, idUsuario) {
  const { partidos } = await cargarTorneo(idTorneo, idUsuario);
  await db.batch([
    ...partidos.filter(p => p.idPartido).flatMap(p => sqlEliminarPartido(p.idPartido)),
    { sql: 'DELETE FROM TorneoPartidos WHERE idTorneo = ?', args: [idTorneo] },
    { sql: 'DELETE FROM TorneoEquipos WHERE idTorneo = ?', args: [idTorneo] },
    { sql: 'DELETE FROM Torneos WHERE idTorneo = ? AND idUsuario = ?', args: [idTorneo, idUsuario] },
  ], 'write');
}

// ===================== Ordenar partidos sin competición (spec 004) =====================

/** Equipos (local, visitante) de un Partido según el orden de estadisticasEquipo. */
async function equiposDePartido(idPartido) {
  const res = await db.execute({
    sql: 'SELECT idEquipo FROM estadisticasEquipo WHERE idPartido = ? ORDER BY idEstadisticasEquipo',
    args: [idPartido],
  });
  return res.rows.map(r => Number(r.idEquipo));
}

/**
 * Enfrentamientos de las competiciones del usuario a los que se puede asignar un Partido suelto:
 * mismos equipos (en cualquier orden), sin resultado y cuyo Partido automático no tenga datos.
 */
export async function candidatosAsignacion(idPartido, idUsuario) {
  const [a, b] = await equiposDePartido(idPartido);
  if (!a || !b) return [];
  const res = await db.execute({
    sql: `SELECT tp.idTorneoPartido, tp.idTorneo, tp.fase, tp.grupo, tp.ronda, tp.idPartido,
                 t.nombre, t.tipo, el.NombreEquipo AS local, ev.NombreEquipo AS visitante
          FROM TorneoPartidos tp
          JOIN Torneos t ON t.idTorneo = tp.idTorneo
          LEFT JOIN Equipos el ON el.idEquipo = tp.idEquipoLocal
          LEFT JOIN Equipos ev ON ev.idEquipo = tp.idEquipoVisitante
          WHERE t.idUsuario = ? AND tp.esBye = 0
            AND tp.marcadorLocal IS NULL AND tp.marcadorVisitante IS NULL
            AND ((tp.idEquipoLocal = ? AND tp.idEquipoVisitante = ?) OR (tp.idEquipoLocal = ? AND tp.idEquipoVisitante = ?))
          ORDER BY t.nombre, tp.fase, tp.ronda`,
    args: [idUsuario, a, b, b, a],
  });
  const candidatos = [];
  for (const r of res.rows) {
    const libre = r.idPartido === null || !(await partidoTieneDatos(Number(r.idPartido)));
    if (!libre) continue;
    candidatos.push({
      idTorneoPartido: Number(r.idTorneoPartido),
      idTorneo: Number(r.idTorneo),
      competicion: r.nombre,
      tipo: r.tipo === 'temporada' ? 'temporada' : 'torneo',
      fase: r.fase,
      grupo: r.grupo,
      ronda: Number(r.ronda),
      local: r.local,
      visitante: r.visitante,
    });
  }
  return candidatos;
}

/**
 * Vincula un Partido sin competición a un enfrentamiento pendiente. El Partido toma el tipo derivado,
 * reemplaza al Partido automático y, si ya estaba culminado, su resultado se aplica a la competición.
 */
export async function asignarPartido({ idPartido, idTorneoPartido, idUsuario }) {
  if (await buscarVinculo(idPartido, idUsuario)) throw badRequest('Este partido ya pertenece a una competición');

  const candidato = (await candidatosAsignacion(idPartido, idUsuario))
    .find(c => c.idTorneoPartido === Number(idTorneoPartido));
  if (!candidato) {
    throw badRequest('El enfrentamiento no está disponible: los equipos no coinciden, ya tiene resultado o su partido tiene datos');
  }

  const slot = await db.execute({
    sql: 'SELECT idPartido, idEquipoLocal, idEquipoVisitante FROM TorneoPartidos WHERE idTorneoPartido = ?',
    args: [candidato.idTorneoPartido],
  });
  const automatico = num(slot.rows[0].idPartido);
  const original = await db.execute({ sql: 'SELECT idTipoPartido, idEstadoPartido FROM Partido WHERE idPartido = ?', args: [idPartido] });
  const tipoOriginal = num(original.rows[0].idTipoPartido);
  const tipos = await idsTipos();

  await db.batch([
    ...(automatico ? sqlEliminarPartido(automatico) : []),
    { sql: 'UPDATE TorneoPartidos SET idPartido = ? WHERE idTorneoPartido = ?', args: [idPartido, candidato.idTorneoPartido] },
    {
      sql: 'UPDATE Partido SET idTipoPartido = ? WHERE idPartido = ?',
      args: [tipos[claveTipoCompeticion(candidato.tipo, candidato.fase)], idPartido],
    },
  ], 'write');

  if (Number(original.rows[0].idEstadoPartido) === ESTADO_CULMINADO) {
    const marcador = await marcadorPartido(idPartido);
    try {
      await aplicarResultado({
        idTorneo: candidato.idTorneo,
        idTorneoPartido: candidato.idTorneoPartido,
        idUsuario,
        desdePartido: true,
        payload: {
          marcadorLocal: marcador.get(num(slot.rows[0].idEquipoLocal)) ?? 0,
          marcadorVisitante: marcador.get(num(slot.rows[0].idEquipoVisitante)) ?? 0,
        },
      });
    } catch (error) {
      // Deshacer el vínculo; el Partido automático se recrea al abrir la competición
      await db.batch([
        { sql: 'UPDATE TorneoPartidos SET idPartido = NULL WHERE idTorneoPartido = ?', args: [candidato.idTorneoPartido] },
        { sql: 'UPDATE Partido SET idTipoPartido = ? WHERE idPartido = ?', args: [tipoOriginal, idPartido] },
      ], 'write');
      throw error;
    }
  }
  return candidato;
}
