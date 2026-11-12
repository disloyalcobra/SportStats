import { db, isLocalDb } from '@/lib/db';

// Tablas cuyos registros pertenecen directamente a un usuario.
export const OWNED_TABLES = {
  Equipos: 'idEquipo',
  Jugadores: 'idJugador',
  Entrenadores: 'idEntrenador',
  Partido: 'idPartido',
};

const AUTH_AND_TOURNAMENT_TABLES = [
  `CREATE TABLE IF NOT EXISTS Usuarios (
    idUsuario INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    salt TEXT NOT NULL,
    fechaRegistro TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS Sesiones (
    idSesion INTEGER PRIMARY KEY AUTOINCREMENT,
    tokenHash TEXT NOT NULL UNIQUE,
    idUsuario INTEGER NOT NULL REFERENCES Usuarios(idUsuario) ON DELETE CASCADE,
    expira TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS Torneos (
    idTorneo INTEGER PRIMARY KEY AUTOINCREMENT,
    idUsuario INTEGER NOT NULL REFERENCES Usuarios(idUsuario) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    formato TEXT NOT NULL,
    idDeporte INTEGER,
    puntosVictoria INTEGER DEFAULT 3,
    puntosEmpate INTEGER DEFAULT 1,
    puntosDerrota INTEGER DEFAULT 0,
    idaVuelta INTEGER DEFAULT 0,
    numGrupos INTEGER DEFAULT 0,
    clasificanPorGrupo INTEGER DEFAULT 0,
    estado TEXT DEFAULT 'En curso',
    idCampeon INTEGER,
    fechaInicio TEXT,
    fechaCreacion TEXT DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS TorneoEquipos (
    idTorneo INTEGER NOT NULL REFERENCES Torneos(idTorneo) ON DELETE CASCADE,
    idEquipo INTEGER NOT NULL REFERENCES Equipos(idEquipo),
    semilla INTEGER,
    grupo TEXT,
    PRIMARY KEY (idTorneo, idEquipo)
  )`,
  `CREATE TABLE IF NOT EXISTS TorneoPartidos (
    idTorneoPartido INTEGER PRIMARY KEY AUTOINCREMENT,
    idTorneo INTEGER NOT NULL REFERENCES Torneos(idTorneo) ON DELETE CASCADE,
    fase TEXT NOT NULL,
    grupo TEXT,
    ronda INTEGER NOT NULL,
    posicion INTEGER NOT NULL,
    idEquipoLocal INTEGER,
    idEquipoVisitante INTEGER,
    marcadorLocal INTEGER,
    marcadorVisitante INTEGER,
    idGanador INTEGER,
    esBye INTEGER DEFAULT 0,
    idPartido INTEGER
  )`,
  'CREATE INDEX IF NOT EXISTS idx_sesiones_token ON Sesiones(tokenHash)',
  'CREATE INDEX IF NOT EXISTS idx_torneos_usuario ON Torneos(idUsuario)',
  'CREATE INDEX IF NOT EXISTS idx_torneopartidos_torneo ON TorneoPartidos(idTorneo)',
];

// Esquema base (equivalente a schema.db). Se crea solo si no existe (bases nuevas).
const BASE_TABLES = [
  'CREATE TABLE IF NOT EXISTS Rama (idRama INTEGER PRIMARY KEY AUTOINCREMENT, NombreRama TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS Categoria (idCategoria INTEGER PRIMARY KEY AUTOINCREMENT, NombreCategoria TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS Deportes (idDeporte INTEGER PRIMARY KEY AUTOINCREMENT, NombreDeporte TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS Posiciones (idPosicion INTEGER PRIMARY KEY AUTOINCREMENT, Nombre TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS EstadosJugador (idEstadoJugador INTEGER PRIMARY KEY AUTOINCREMENT, Estado TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS estadosPartido (idEstadoPartido INTEGER PRIMARY KEY AUTOINCREMENT, estadoPartido TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS Tipo_partido (idTipoPartido INTEGER PRIMARY KEY AUTOINCREMENT, TipoPartido TEXT NOT NULL)',
  `CREATE TABLE IF NOT EXISTS Entrenadores (idEntrenador INTEGER PRIMARY KEY AUTOINCREMENT, NombreEntrenador TEXT NOT NULL,
    ApellidoPaEntrenador TEXT NOT NULL, ApellidoMaEntrenador TEXT, FechaNacimiento_entrenador TEXT,
    LugarDeOrigenEntrenador TEXT, email TEXT, telefono TEXT)`,
  `CREATE TABLE IF NOT EXISTS Equipos (idEquipo INTEGER PRIMARY KEY AUTOINCREMENT, NombreEquipo TEXT NOT NULL,
    idCategoria INTEGER, idDeporte INTEGER, idRama INTEGER)`,
  `CREATE TABLE IF NOT EXISTS Jugadores (idJugador INTEGER PRIMARY KEY, NombreJugador TEXT NOT NULL, ApellidoPJugador TEXT NOT NULL,
    ApellidoMJugador TEXT, FechaNacimiento TEXT, EstaturaJugador REAL, PesoJugador REAL, SemestreJugador INTEGER,
    idPosicion INTEGER, idEquipo INTEGER, idEstadoJugador INTEGER, LugarDeOrigenJugador TEXT, NumeroJugador INTEGER)`,
  `CREATE TABLE IF NOT EXISTS Partido (idPartido INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT NOT NULL, horaInicio TEXT,
    horaTermino TEXT, idEstadoPartido INTEGER, idTipoPartido INTEGER, ubicacion TEXT, localia INTEGER)`,
  `CREATE TABLE IF NOT EXISTS EquiposEntrenadores (idEquipoEntrenador INTEGER PRIMARY KEY AUTOINCREMENT,
    idEquipo INTEGER REFERENCES Equipos(idEquipo) ON DELETE CASCADE,
    idEntrenador INTEGER REFERENCES Entrenadores(idEntrenador) ON DELETE CASCADE)`,
  `CREATE TABLE IF NOT EXISTS JugadoresPartido (idJugadoresPartido INTEGER PRIMARY KEY AUTOINCREMENT,
    idJugador INTEGER REFERENCES Jugadores(idJugador) ON DELETE CASCADE,
    idPartido INTEGER REFERENCES Partido(idPartido) ON DELETE CASCADE, Localia INTEGER)`,
  `CREATE TABLE IF NOT EXISTS estadisticasEquipo (idEstadisticasEquipo INTEGER PRIMARY KEY AUTOINCREMENT,
    idEquipo INTEGER, idPartido INTEGER REFERENCES Partido(idPartido) ON DELETE CASCADE,
    marcadorPrimerCuartoE INTEGER DEFAULT 0, marcadorSegundoCuartoE INTEGER DEFAULT 0, marcadorTercerCuartoE INTEGER DEFAULT 0,
    marcadorCuartoCuartoE INTEGER DEFAULT 0, marcadorFinalE INTEGER DEFAULT 0,
    "2PM" INTEGER DEFAULT 0, "2PA" INTEGER DEFAULT 0, "2P%" REAL DEFAULT 0.0, "3PM" INTEGER DEFAULT 0, "3PA" INTEGER DEFAULT 0,
    "3P%" REAL DEFAULT 0.0, FGM INTEGER DEFAULT 0, FGA INTEGER DEFAULT 0, "FG%" REAL DEFAULT 0.0, FTM INTEGER DEFAULT 0,
    FTA INTEGER DEFAULT 0, "FT%" REAL DEFAULT 0.0, OReb INTEGER DEFAULT 0, DReb INTEGER DEFAULT 0, Reb INTEGER DEFAULT 0,
    Ast INTEGER DEFAULT 0, TOV INTEGER DEFAULT 0, STL INTEGER DEFAULT 0, BLK INTEGER DEFAULT 0, SR INTEGER DEFAULT 0,
    PF INTEGER DEFAULT 0, PTS INTEGER DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS estadisticasJugador (idEstadisticasJugador INTEGER PRIMARY KEY AUTOINCREMENT,
    idJugadoresPartido INTEGER REFERENCES JugadoresPartido(idJugadoresPartido) ON DELETE CASCADE,
    idEstadisticasEquipo INTEGER REFERENCES estadisticasEquipo(idEstadisticasEquipo) ON DELETE CASCADE,
    minutos INTEGER DEFAULT 0, puntos INTEGER DEFAULT 0, promedioPuntos REAL DEFAULT 0.0, reboteOfensivo INTEGER DEFAULT 0,
    reboteDefensivo INTEGER DEFAULT 0, totalRebotes INTEGER DEFAULT 0, asistencia INTEGER DEFAULT 0, perdida INTEGER DEFAULT 0,
    robos INTEGER DEFAULT 0, bloqueos INTEGER DEFAULT 0, faltasPersonales INTEGER DEFAULT 0, two_pm INTEGER DEFAULT 0,
    two_pa INTEGER DEFAULT 0, three_pm INTEGER DEFAULT 0, three_pa INTEGER DEFAULT 0, ftm INTEGER DEFAULT 0, fta INTEGER DEFAULT 0,
    eficiencia INTEGER DEFAULT 0, PFD INTEGER DEFAULT 0, PIR INTEGER DEFAULT 0, EFF INTEGER DEFAULT 0, plus_minus INTEGER DEFAULT 0)`,
];

const CATALOG_SEEDS = {
  Rama: ['NombreRama', ['Varonil', 'Femenil', 'Mixto']],
  Categoria: ['NombreCategoria', ['Universitario', 'Juvenil A', 'Juvenil B', 'Juvenil C']],
  Deportes: ['NombreDeporte', ['Baloncesto', 'Voleibol', 'Fútbol']],
  Posiciones: ['Nombre', ['Base', 'Escolta', 'Alero', 'Ala-Pívot', 'Pívot']],
  EstadosJugador: ['Estado', ['Activo', 'Lesionado', 'Inactivo', 'Suspendido']],
  // El código usa 1 = Culminado y 4 = Próximo
  estadosPartido: ['estadoPartido', ['Culminado', 'En Curso', 'Cancelado', 'Proximo']],
  Tipo_partido: ['TipoPartido', ['Amistoso', 'Temporada', 'Torneo', 'Playoffs']],
};

/**
 * Crea el esquema base y llena los catálogos vacíos. Es idempotente: en una base existente
 * (CREATE TABLE IF NOT EXISTS, catálogos con datos) no modifica nada; en una base nueva
 * —local o Turso— deja la app lista para usarse.
 */
async function bootstrapBase() {
  await db.batch(BASE_TABLES.map(sql => ({ sql })), 'write');
  const tablas = Object.entries(CATALOG_SEEDS);
  const conteos = await db.batch(tablas.map(([table]) => ({ sql: `SELECT COUNT(*) AS n FROM ${table}` })));
  const inserts = tablas.flatMap(([table, [col, values]], i) =>
    Number(conteos[i].rows[0].n) === 0
      ? values.map(v => ({ sql: `INSERT INTO ${table} (${col}) VALUES (?)`, args: [v] }))
      : []);
  if (inserts.length) await db.batch(inserts, 'write');
}

async function migrate() {
  if (isLocalDb && process.env.VERCEL) {
    // En Vercel el sistema de archivos es de solo lectura: la base local no funcionaría.
    throw new Error('Falta la variable de entorno TURSO_DATABASE_URL en Vercel.');
  }
  await bootstrapBase();
  await db.batch(AUTH_AND_TOURNAMENT_TABLES.map(sql => ({ sql })), 'write');

  for (const table of Object.keys(OWNED_TABLES)) {
    const info = await db.execute(`PRAGMA table_info(${table})`);
    if (!info.rows.some(r => r.name === 'idUsuario')) {
      await db.execute(`ALTER TABLE ${table} ADD COLUMN idUsuario INTEGER`);
    }
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_${table.toLowerCase()}_usuario ON ${table}(idUsuario)`);
  }

  // Vínculo enfrentamiento de torneo → Partido (spec 003)
  await addColumnIfMissing('TorneoPartidos', 'idPartido', 'INTEGER');
  await db.execute('CREATE INDEX IF NOT EXISTS idx_torneopartidos_partido ON TorneoPartidos(idPartido)');

  // Competiciones: temporada | torneo, con fecha de fin (spec 004)
  await addColumnIfMissing('Torneos', 'tipo', "TEXT DEFAULT 'torneo'");
  await addColumnIfMissing('Torneos', 'fechaFin', 'TEXT');
}

async function addColumnIfMissing(table, column, definition) {
  const info = await db.execute(`PRAGMA table_info(${table})`);
  if (!info.rows.some(r => r.name === column)) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

let schemaReady = null;

/** Crea/actualiza las tablas necesarias una sola vez por proceso. */
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = migrate().catch(err => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

/** Asigna al usuario indicado todos los registros que aún no tienen dueño. */
export async function adoptOrphanData(idUsuario) {
  await db.batch(
    Object.keys(OWNED_TABLES).map(table => ({
      sql: `UPDATE ${table} SET idUsuario = ? WHERE idUsuario IS NULL`,
      args: [idUsuario],
    })),
    'write'
  );
}
