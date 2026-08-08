import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const idEquipo = searchParams.get('idEquipo');

    let sql = `
      SELECT j.*, p.Nombre as posicion, e.NombreEquipo, es.Estado as estadoNombre,
             cat.NombreCategoria, r.NombreRama
      FROM Jugadores j
      LEFT JOIN Posiciones p ON j.idPosicion = p.idPosicion
      LEFT JOIN Equipos e ON j.idEquipo = e.idEquipo
      LEFT JOIN EstadosJugador es ON j.idEstadoJugador = es.idEstadoJugador
      LEFT JOIN Categoria cat ON e.idCategoria = cat.idCategoria
      LEFT JOIN Rama r ON e.idRama = r.idRama
    `;
    const args = [];
    if (idEquipo) {
      sql += ' WHERE j.idEquipo = ?';
      args.push(idEquipo);
    }
    sql += ' ORDER BY j.ApellidoPJugador, j.NombreJugador';

    const res = await db.execute({ sql, args });

    const catalogos = await db.batch([
      { sql: 'SELECT * FROM Posiciones' },
      { sql: 'SELECT * FROM EstadosJugador' },
      { sql: 'SELECT idEquipo, NombreEquipo FROM Equipos ORDER BY NombreEquipo' },
    ]);

    return NextResponse.json({
      jugadores: res.rows,
      catalogos: {
        posiciones: catalogos[0].rows,
        estados: catalogos[1].rows,
        equipos: catalogos[2].rows,
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
      NombreJugador, ApellidoPJugador, ApellidoMJugador,
      FechaNacimiento, EstaturaJugador, PesoJugador,
      SemestreJugador, NumeroJugador, idPosicion, idEquipo,
      idEstadoJugador, LugarDeOrigenJugador,
    } = body;

    const res = await db.execute({
      sql: `INSERT INTO Jugadores 
        (NombreJugador, ApellidoPJugador, ApellidoMJugador, FechaNacimiento,
         EstaturaJugador, PesoJugador, SemestreJugador, NumeroJugador,
         idPosicion, idEquipo, idEstadoJugador, LugarDeOrigenJugador)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        NombreJugador, ApellidoPJugador, ApellidoMJugador, FechaNacimiento,
        EstaturaJugador, PesoJugador, SemestreJugador, NumeroJugador,
        idPosicion, idEquipo, idEstadoJugador, LugarDeOrigenJugador,
      ],
    });
    return NextResponse.json({ id: res.lastInsertRowid }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
