import { createClient } from '@libsql/client';

// Sin Turso configurado se usa una base SQLite local (solo para desarrollo).
export const isLocalDb = !process.env.TURSO_DATABASE_URL;

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:sportstats.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});
