import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchema, adoptOrphanData } from '@/lib/schema';
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));
    const nombre = String(body.nombre || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

    if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 });
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Correo electrónico no válido' }, { status: 400 });
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const exists = await db.execute({ sql: 'SELECT 1 FROM Usuarios WHERE email = ?', args: [email] });
    if (exists.rows.length > 0) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese correo' }, { status: 409 });
    }

    const { hash, salt } = await hashPassword(password);
    const res = await db.execute({
      sql: 'INSERT INTO Usuarios (nombre, email, passwordHash, salt) VALUES (?, ?, ?, ?)',
      args: [nombre, email, hash, salt],
    });
    const idUsuario = Number(res.lastInsertRowid);

    // La primera cuenta hereda los datos registrados antes de existir usuarios.
    const count = await db.execute('SELECT COUNT(*) AS n FROM Usuarios');
    if (Number(count.rows[0].n) === 1) await adoptOrphanData(idUsuario);

    const session = await createSession(idUsuario);
    const response = NextResponse.json({ usuario: { idUsuario, nombre, email } }, { status: 201 });
    return setSessionCookie(response, session);
  } catch (error) {
    console.error('Registro error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
