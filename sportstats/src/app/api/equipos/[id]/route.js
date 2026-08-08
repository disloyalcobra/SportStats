import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// PUT /api/equipos/[id] - Editar equipo
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { NombreEquipo, idCategoria, idDeporte, idRama } = body;
    await db.execute({
      sql: 'UPDATE Equipos SET NombreEquipo=?, idCategoria=?, idDeporte=?, idRama=? WHERE idEquipo=?',
      args: [NombreEquipo, idCategoria, idDeporte, idRama, id],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/equipos/[id] - Eliminar equipo
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    await db.execute({ sql: 'DELETE FROM Equipos WHERE idEquipo=?', args: [id] });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
