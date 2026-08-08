import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await db.execute(`
      SELECT en.*, 
             GROUP_CONCAT(e.NombreEquipo, ', ') as equipos,
             GROUP_CONCAT(e.idEquipo) as equiposIds
      FROM Entrenadores en
      LEFT JOIN EquiposEntrenadores ee ON ee.idEntrenador = en.idEntrenador
      LEFT JOIN Equipos e ON ee.idEquipo = e.idEquipo
      GROUP BY en.idEntrenador
      ORDER BY en.ApellidoPaEntrenador, en.NombreEntrenador
    `);

    const equiposCatalog = await db.execute('SELECT idEquipo, NombreEquipo FROM Equipos ORDER BY NombreEquipo');

    return NextResponse.json({
      entrenadores: res.rows,
      catalogos: {
        equipos: equiposCatalog.rows,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      NombreEntrenador, ApellidoPaEntrenador, ApellidoMaEntrenador,
      FechaNacimiento_entrenador, LugarDeOrigenEntrenador,
      email, telefono, equiposIds,
    } = body;

    const res = await db.execute({
      sql: `INSERT INTO Entrenadores 
        (NombreEntrenador, ApellidoPaEntrenador, ApellidoMaEntrenador, FechaNacimiento_entrenador, LugarDeOrigenEntrenador, email, telefono)
        VALUES (?,?,?,?,?,?,?)`,
      args: [
        NombreEntrenador, ApellidoPaEntrenador, ApellidoMaEntrenador || null,
        FechaNacimiento_entrenador || null, LugarDeOrigenEntrenador || null,
        email || null, telefono || null,
      ],
    });

    const idEntrenador = Number(res.lastInsertRowid);

    if (Array.isArray(equiposIds) && equiposIds.length > 0) {
      const queries = equiposIds.map(idEquipo => ({
        sql: 'INSERT INTO EquiposEntrenadores (idEntrenador, idEquipo) VALUES (?, ?)',
        args: [idEntrenador, idEquipo],
      }));
      await db.batch(queries);
    }

    return NextResponse.json({ id: idEntrenador }, { status: 201 });
  } catch (error) {
    console.error('Error creating entrenador:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
