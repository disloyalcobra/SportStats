import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// POST /api/partidos/[id]/alineacion - Agregar jugador a la alineación de un partido
export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { idJugador, Localia } = body;

    // Verificar si ya existe
    const exists = await db.execute({
      sql: 'SELECT idJugadoresPartido FROM JugadoresPartido WHERE idJugador=? AND idPartido=?',
      args: [idJugador, id],
    });
    if (exists.rows.length > 0) {
      return NextResponse.json({ error: 'Jugador ya está en la alineación' }, { status: 400 });
    }

    const res = await db.execute({
      sql: 'INSERT INTO JugadoresPartido (idJugador, idPartido, Localia) VALUES (?,?,?)',
      args: [idJugador, id, Localia ? 1 : 0],
    });
    return NextResponse.json({ id: res.lastInsertRowid }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/partidos/[id]/alineacion - Quitar jugador de la alineación
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const idJugadoresPartido = searchParams.get('idJugadoresPartido');
    await db.execute({
      sql: 'DELETE FROM JugadoresPartido WHERE idJugadoresPartido=? AND idPartido=?',
      args: [idJugadoresPartido, id],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
