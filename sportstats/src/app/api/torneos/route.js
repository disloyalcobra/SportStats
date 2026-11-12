import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withUser, ownsAll, badRequest } from '@/lib/auth';
import {
  FORMATOS, MAX_EQUIPOS, generarEliminatoria, generarRoundRobin, asignarGrupos, barajar,
} from '@/lib/torneos';
import { sincronizarPartidos } from '@/lib/torneosDb';

// GET /api/torneos?tipo=torneo|temporada|todos — competiciones del usuario con su progreso + catálogo
export const GET = withUser(async (req, ctx, user) => {
  const tipo = new URL(req.url).searchParams.get('tipo') || 'torneo';
  const filtroTipo = tipo === 'todos' ? '' : "AND COALESCE(t.tipo, 'torneo') = ?";
  const argsTipo = tipo === 'todos' ? [] : [tipo === 'temporada' ? 'temporada' : 'torneo'];

  const [torneosRes, equiposRes, deportesRes] = await db.batch([
    {
      sql: `
        SELECT t.idTorneo, COALESCE(t.tipo, 'torneo') AS tipo, t.nombre, t.formato, t.estado,
               t.fechaInicio, t.fechaFin, t.fechaCreacion, t.clasificanPorGrupo,
               t.idCampeon, campeon.NombreEquipo AS campeon, d.NombreDeporte,
               (SELECT COUNT(*) FROM TorneoEquipos te WHERE te.idTorneo = t.idTorneo) AS totalEquipos,
               (SELECT COUNT(*) FROM TorneoPartidos tp WHERE tp.idTorneo = t.idTorneo AND tp.esBye = 0) AS totalPartidos,
               (SELECT COUNT(*) FROM TorneoPartidos tp WHERE tp.idTorneo = t.idTorneo AND tp.esBye = 0
                  AND tp.marcadorLocal IS NOT NULL AND tp.marcadorVisitante IS NOT NULL) AS partidosJugados
        FROM Torneos t
        LEFT JOIN Equipos campeon ON campeon.idEquipo = t.idCampeon
        LEFT JOIN Deportes d ON d.idDeporte = t.idDeporte
        WHERE t.idUsuario = ? ${filtroTipo}
        ORDER BY COALESCE(t.fechaInicio, t.fechaCreacion) DESC, t.idTorneo DESC
      `,
      args: [user.idUsuario, ...argsTipo],
    },
    {
      sql: `SELECT e.idEquipo, e.NombreEquipo, e.idDeporte, c.NombreCategoria, r.NombreRama
            FROM Equipos e
            LEFT JOIN Categoria c ON c.idCategoria = e.idCategoria
            LEFT JOIN Rama r ON r.idRama = e.idRama
            WHERE e.idUsuario = ? ORDER BY e.NombreEquipo`,
      args: [user.idUsuario],
    },
    { sql: 'SELECT * FROM Deportes ORDER BY NombreDeporte' },
  ]);

  return NextResponse.json({
    torneos: torneosRes.rows,
    catalogos: { equipos: equiposRes.rows, deportes: deportesRes.rows },
  });
});

const entero = (v, def) => {
  const n = Number(v);
  return Number.isInteger(n) ? n : def;
};

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

// POST /api/torneos — crea la competición (torneo o temporada) y genera su calendario / cuadro
export const POST = withUser(async (req, ctx, user) => {
  const body = await req.json();
  const tipo = body.tipo === 'temporada' ? 'temporada' : 'torneo';
  const etiqueta = tipo === 'temporada' ? 'la temporada' : 'el torneo';
  const nombre = String(body.nombre || '').trim();
  let formato = body.formato;
  let equipos = [...new Set((body.equipos || []).map(Number).filter(Number.isInteger))];
  let numGrupos = 0;
  let clasificanPorGrupo = 0;
  let fechaFin = null;

  if (!nombre) throw badRequest(`El nombre de ${etiqueta} es obligatorio`);

  if (tipo === 'temporada') {
    // Temporada = liga (fase regular) + playoffs opcionales con los mejores N
    if (!FECHA_RE.test(body.fechaInicio || '') || !FECHA_RE.test(body.fechaFin || '')) {
      throw badRequest('La temporada necesita fecha de inicio y fecha de fin');
    }
    if (body.fechaFin < body.fechaInicio) throw badRequest('La fecha de fin no puede ser anterior a la de inicio');
    fechaFin = body.fechaFin;
    const playoffs = entero(body.playoffs, 0);
    if (playoffs !== 0 && (playoffs < 2 || playoffs > equipos.length)) {
      throw badRequest(`Los playoffs deben incluir entre 2 y ${equipos.length} equipos`);
    }
    formato = playoffs ? 'grupos' : 'liga';
    numGrupos = playoffs ? 1 : 0;
    clasificanPorGrupo = playoffs;
    if (equipos.length < 2) throw badRequest('Se necesitan al menos 2 equipos');
  } else {
    if (!FORMATOS[formato]) throw badRequest('Formato de torneo no válido');
    if (equipos.length < FORMATOS[formato].minEquipos) {
      throw badRequest(`Se necesitan al menos ${FORMATOS[formato].minEquipos} equipos para este formato`);
    }
  }
  if (equipos.length > MAX_EQUIPOS) throw badRequest(`Máximo ${MAX_EQUIPOS} equipos`);
  if (!(await ownsAll('Equipos', equipos, user.idUsuario))) throw badRequest('Algún equipo no es válido');

  const puntosVictoria = entero(body.puntosVictoria, 3);
  const puntosEmpate = entero(body.puntosEmpate, 1);
  const puntosDerrota = entero(body.puntosDerrota, 0);
  const idaVuelta = body.idaVuelta ? 1 : 0;

  if (body.sorteo) equipos = barajar(equipos);

  let partidos = [];
  let grupoDe = new Map();

  if (formato === 'eliminacion') {
    partidos = generarEliminatoria(equipos);
  } else if (formato === 'liga') {
    partidos = generarRoundRobin(equipos, { idaVuelta: Boolean(idaVuelta) });
  } else {
    if (tipo === 'torneo') {
      numGrupos = entero(body.numGrupos, 2);
      clasificanPorGrupo = entero(body.clasificanPorGrupo, 2);
    }
    if (numGrupos < 1) throw badRequest('Debe haber al menos 1 grupo');
    const menorGrupo = Math.floor(equipos.length / numGrupos);
    if (menorGrupo < 2) throw badRequest('Cada grupo debe tener al menos 2 equipos');
    if (clasificanPorGrupo < 1 || clasificanPorGrupo > menorGrupo) {
      throw badRequest(`Los clasificados por grupo deben estar entre 1 y ${menorGrupo}`);
    }
    if (numGrupos * clasificanPorGrupo < 2) throw badRequest('Deben clasificar al menos 2 equipos en total');

    const grupos = asignarGrupos(equipos, numGrupos);
    for (const [letra, ids] of Object.entries(grupos)) {
      ids.forEach(id => grupoDe.set(id, letra));
      partidos.push(...generarRoundRobin(ids, { idaVuelta: Boolean(idaVuelta), fase: 'grupo', grupo: letra }));
    }
  }

  const res = await db.execute({
    sql: `INSERT INTO Torneos
      (idUsuario, tipo, nombre, formato, idDeporte, puntosVictoria, puntosEmpate, puntosDerrota,
       idaVuelta, numGrupos, clasificanPorGrupo, estado, fechaInicio, fechaFin)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'En curso',?,?)`,
    args: [
      user.idUsuario, tipo, nombre, formato, body.idDeporte || null,
      puntosVictoria, puntosEmpate, puntosDerrota,
      idaVuelta, numGrupos, clasificanPorGrupo, body.fechaInicio || null, fechaFin,
    ],
  });
  const idTorneo = Number(res.lastInsertRowid);

  try {
    await db.batch([
    ...equipos.map((idEquipo, i) => ({
      sql: 'INSERT INTO TorneoEquipos (idTorneo, idEquipo, semilla, grupo) VALUES (?,?,?,?)',
      args: [idTorneo, idEquipo, i + 1, grupoDe.get(idEquipo) || null],
    })),
    ...partidos.map(p => ({
      sql: `INSERT INTO TorneoPartidos
        (idTorneo, fase, grupo, ronda, posicion, idEquipoLocal, idEquipoVisitante, idGanador, esBye)
        VALUES (?,?,?,?,?,?,?,?,?)`,
      args: [idTorneo, p.fase, p.grupo, p.ronda, p.posicion, p.idEquipoLocal, p.idEquipoVisitante, p.idGanador, p.esBye],
    })),
    ], 'write');
  } catch (error) {
    // No dejar un torneo vacío si falla la generación del calendario
    await db.execute({ sql: 'DELETE FROM Torneos WHERE idTorneo = ?', args: [idTorneo] });
    throw error;
  }

  // Un Partido real (con alineaciones y estadísticas) por cada enfrentamiento con equipos definidos
  await sincronizarPartidos(idTorneo, user.idUsuario);

  return NextResponse.json({ id: idTorneo }, { status: 201 });
});
