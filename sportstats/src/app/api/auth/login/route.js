import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchema } from '@/lib/schema';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';

const INVALID = 'Correo o contraseña incorrectos';

export async function POST(req) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) return NextResponse.json({ error: INVALID }, { status: 401 });

    const res = await db.execute({
      sql: 'SELECT idUsuario, nombre, email, passwordHash, salt FROM Usuarios WHERE email = ?',
      args: [email],
    });
    const user = res.rows[0];
    if (!user || !(await verifyPassword(password, user.salt, user.passwordHash))) {
      return NextResponse.json({ error: INVALID }, { status: 401 });
    }

    const idUsuario = Number(user.idUsuario);
    const session = await createSession(idUsuario);
    const response = NextResponse.json({ usuario: { idUsuario, nombre: user.nombre, email: user.email } });
    return setSessionCookie(response, session);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
