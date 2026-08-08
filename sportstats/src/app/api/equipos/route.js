import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/equipos
export async function GET() {
  try {
    const res = await db.execute(`
      SELECT e.idEquipo, e.NombreEquipo, e.idCategoria, e.idDeporte, e.idRama,
             c.NombreCategoria, d.NombreDeporte, r.NombreRama,
             COUNT(DISTINCT j.idJugador) as totalJugadores,
             GROUP_CONCAT(DISTINCT en.NombreEntrenador || ' ' || en.ApellidoPaEntrenador) as entrenadores
      FROM Equipos e
      LEFT JOIN Categoria c ON e.idCategoria = c.idCategoria
      LEFT JOIN Deportes d ON e.idDeporte = d.idDeporte
      LEFT JOIN Rama r ON e.idRama = r.idRama
      LEFT JOIN Jugadores j ON j.idEquipo = e.idEquipo AND j.idEstadoJugador = 1
      LEFT JOIN EquiposEntrenadores ee ON ee.idEquipo = e.idEquipo
      LEFT JOIN Entrenadores en ON en.idEntrenador = ee.idEntrenador
      GROUP BY e.idEquipo
      ORDER BY e.NombreEquipo
    `);

    const catalogos = await db.batch([
      { sql: 'SELECT * FROM Categoria' },
      { sql: 'SELECT * FROM Deportes' },
      { sql: 'SELECT * FROM Rama' },
    ]);

    return NextResponse.json({
      equipos: res.rows,
      catalogos: {
        categorias: catalogos[0].rows,
        deportes: catalogos[1].rows,
        ramas: catalogos[2].rows,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/equipos - Crear equipo
export async function POST(req) {
  try {
    const body = await req.json();
    const { NombreEquipo, idCategoria, idDeporte, idRama } = body;
    const res = await db.execute({
      sql: 'INSERT INTO Equipos (NombreEquipo, idCategoria, idDeporte, idRama) VALUES (?, ?, ?, ?)',
      args: [NombreEquipo, idCategoria, idDeporte, idRama],
    });
    return NextResponse.json({ id: res.lastInsertRowid }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
