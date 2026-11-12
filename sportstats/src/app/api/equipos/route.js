import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { withUser } from '@/lib/auth';

// GET /api/equipos — solo los equipos del usuario
export const GET = withUser(async (req, ctx, user) => {
  const res = await db.execute({
    sql: `
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
      WHERE e.idUsuario = ?
      GROUP BY e.idEquipo
      ORDER BY e.NombreEquipo
    `,
    args: [user.idUsuario],
  });

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
});

// POST /api/equipos — Crear equipo
export const POST = withUser(async (req, ctx, user) => {
  const { NombreEquipo, idCategoria, idDeporte, idRama } = await req.json();
  const res = await db.execute({
    sql: 'INSERT INTO Equipos (NombreEquipo, idCategoria, idDeporte, idRama, idUsuario) VALUES (?, ?, ?, ?, ?)',
    args: [NombreEquipo, idCategoria, idDeporte, idRama, user.idUsuario].map(v => v ?? null),
  });
  return NextResponse.json({ id: Number(res.lastInsertRowid) }, { status: 201 });
});
