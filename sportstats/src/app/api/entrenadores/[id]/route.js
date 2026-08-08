import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      NombreEntrenador, ApellidoPaEntrenador, ApellidoMaEntrenador,
      FechaNacimiento_entrenador, LugarDeOrigenEntrenador,
      email, telefono, equiposIds,
    } = body;

    await db.execute({
      sql: `UPDATE Entrenadores SET
        NombreEntrenador = ?, ApellidoPaEntrenador = ?, ApellidoMaEntrenador = ?,
        FechaNacimiento_entrenador = ?, LugarDeOrigenEntrenador = ?,
        email = ?, telefono = ?
        WHERE idEntrenador = ?`,
      args: [
        NombreEntrenador, ApellidoPaEntrenador, ApellidoMaEntrenador || null,
        FechaNacimiento_entrenador || null, LugarDeOrigenEntrenador || null,
        email || null, telefono || null,
        id,
      ],
    });

    // Actualizar relaciones en EquiposEntrenadores
    await db.execute({
      sql: 'DELETE FROM EquiposEntrenadores WHERE idEntrenador = ?',
      args: [id],
    });

    if (Array.isArray(equiposIds) && equiposIds.length > 0) {
      const queries = equiposIds.map(idEquipo => ({
        sql: 'INSERT INTO EquiposEntrenadores (idEntrenador, idEquipo) VALUES (?, ?)',
        args: [id, idEquipo],
      }));
      await db.batch(queries);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating entrenador:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await db.execute({
      sql: 'DELETE FROM Entrenadores WHERE idEntrenador = ?',
      args: [id],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
