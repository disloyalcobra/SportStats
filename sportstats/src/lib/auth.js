import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureSchema, OWNED_TABLES } from '@/lib/schema';

const scrypt = promisify(scryptCb);

export const SESSION_COOKIE = 'ss_session';
const SESSION_DAYS = 7;

// ===================== Errores HTTP =====================
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const unauthorized = () => new HttpError(401, 'No autenticado');
export const notFound = (what = 'Recurso') => new HttpError(404, `${what} no encontrado`);
export const badRequest = (msg) => new HttpError(400, msg);

// ===================== Contraseñas =====================
export async function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const key = await scrypt(password, salt, 64);
  return { hash: key.toString('hex'), salt };
}

export async function verifyPassword(password, salt, expectedHex) {
  const { hash } = await hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHex, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

// ===================== Sesiones =====================
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export async function createSession(idUsuario) {
  const token = randomBytes(32).toString('hex');
  const expira = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.execute({
    sql: 'INSERT INTO Sesiones (tokenHash, idUsuario, expira) VALUES (?, ?, ?)',
    args: [hashToken(token), idUsuario, expira.toISOString()],
  });
  return { token, expira };
}

export function setSessionCookie(response, { token, expira }) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expira,
  });
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return response;
}

export async function deleteSession(token) {
  if (token) await db.execute({ sql: 'DELETE FROM Sesiones WHERE tokenHash = ?', args: [hashToken(token)] });
}

/** Devuelve el usuario de la sesión actual o null. */
export async function getCurrentUser() {
  await ensureSchema();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const res = await db.execute({
    sql: `SELECT s.idSesion, s.expira, u.idUsuario, u.nombre, u.email
          FROM Sesiones s JOIN Usuarios u ON u.idUsuario = s.idUsuario
          WHERE s.tokenHash = ?`,
    args: [hashToken(token)],
  });
  const row = res.rows[0];
  if (!row) return null;
  if (new Date(row.expira) < new Date()) {
    await db.execute({ sql: 'DELETE FROM Sesiones WHERE idSesion = ?', args: [row.idSesion] });
    return null;
  }
  return { idUsuario: Number(row.idUsuario), nombre: row.nombre, email: row.email };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

// ===================== Propiedad de registros =====================
const OWNABLE = { ...OWNED_TABLES, Torneos: 'idTorneo' };

/** true si el registro `id` de `table` pertenece al usuario. */
export async function owns(table, id, idUsuario) {
  const col = OWNABLE[table];
  if (!col) throw new Error(`Tabla no soportada: ${table}`);
  if (id === null || id === undefined || id === '') return false;
  const res = await db.execute({
    sql: `SELECT 1 FROM ${table} WHERE ${col} = ? AND idUsuario = ?`,
    args: [id, idUsuario],
  });
  return res.rows.length > 0;
}

/** Lanza 404 si el registro no pertenece al usuario. */
export async function assertOwns(table, id, idUsuario, what) {
  if (!(await owns(table, id, idUsuario))) throw notFound(what);
}

/** true si TODOS los ids pertenecen al usuario. */
export async function ownsAll(table, ids, idUsuario) {
  const col = OWNABLE[table];
  if (!col) throw new Error(`Tabla no soportada: ${table}`);
  const unique = [...new Set((ids || []).map(Number))];
  if (unique.length === 0) return true;
  const placeholders = unique.map(() => '?').join(',');
  const res = await db.execute({
    sql: `SELECT COUNT(*) AS n FROM ${table} WHERE idUsuario = ? AND ${col} IN (${placeholders})`,
    args: [idUsuario, ...unique],
  });
  return Number(res.rows[0].n) === unique.length;
}

// ===================== Envoltorio para Route Handlers =====================
/**
 * Envuelve un handler exigiendo sesión:
 *   export const GET = withUser(async (req, ctx, user) => { ... });
 * Convierte HttpError en la respuesta JSON correspondiente.
 */
export function withUser(handler) {
  return async (req, ctx) => {
    try {
      const user = await requireUser();
      return await handler(req, ctx, user);
    } catch (error) {
      if (error instanceof HttpError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      console.error(error);
      return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
    }
  };
}
