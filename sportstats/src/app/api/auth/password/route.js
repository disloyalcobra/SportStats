import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import {
  withUser, badRequest, HttpError, hashPassword, verifyPassword,
  createSession, setSessionCookie, SESSION_COOKIE, deleteSession,
} from '@/lib/auth';

// PUT /api/auth/password — { actual, nueva }: cambia la contraseña y cierra las demás sesiones
export const PUT = withUser(async (req, ctx, user) => {
  const { actual, nueva } = await req.json().catch(() => ({}));
  if (!actual || !nueva) throw badRequest('Indica tu contraseña actual y la nueva');
  if (String(nueva).length < 6) throw badRequest('La nueva contraseña debe tener al menos 6 caracteres');

  const res = await db.execute({
    sql: 'SELECT passwordHash, salt FROM Usuarios WHERE idUsuario = ?',
    args: [user.idUsuario],
  });
  const fila = res.rows[0];
  if (!fila || !(await verifyPassword(String(actual), fila.salt, fila.passwordHash))) {
    throw new HttpError(400, 'La contraseña actual no es correcta');
  }

  const { hash, salt } = await hashPassword(String(nueva));
  await db.batch([
    { sql: 'UPDATE Usuarios SET passwordHash = ?, salt = ? WHERE idUsuario = ?', args: [hash, salt, user.idUsuario] },
    // Cierra todas las sesiones (incluidas las de otros dispositivos)
    { sql: 'DELETE FROM Sesiones WHERE idUsuario = ?', args: [user.idUsuario] },
  ], 'write');

  // Mantener abierta la sesión actual con un token nuevo
  const store = await cookies();
  await deleteSession(store.get(SESSION_COOKIE)?.value);
  const session = await createSession(user.idUsuario);
  return setSessionCookie(NextResponse.json({ success: true }), session);
});
