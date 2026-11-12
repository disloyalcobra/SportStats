#!/usr/bin/env node
/**
 * Genera el SQL para restablecer la contraseña de una cuenta de SportStats.
 *
 * Uso:
 *   node scripts/restablecer-password.mjs correo@ejemplo.com [contraseñaTemporal]
 *
 * Si no indicas la contraseña se genera una aleatoria. Copia el SQL que imprime y ejecútalo en
 * `turso db shell <tu-db>`. También cierra todas las sesiones abiertas de esa cuenta.
 * Usa exactamente el mismo algoritmo que la app (scrypt, 64 bytes, salt hex de 16 bytes).
 */
import { randomBytes, scryptSync } from 'node:crypto';

const [, , correo, passwordArg] = process.argv;
if (!correo || !correo.includes('@')) {
  console.error('Uso: node scripts/restablecer-password.mjs correo@ejemplo.com [contraseñaTemporal]');
  process.exit(1);
}

// Contraseña temporal legible (sin caracteres ambiguos como 0/O o 1/l)
const ALFABETO = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const temporal = passwordArg || Array.from(randomBytes(10), b => ALFABETO[b % ALFABETO.length]).join('');
if (temporal.length < 6) {
  console.error('La contraseña debe tener al menos 6 caracteres.');
  process.exit(1);
}

const email = correo.trim().toLowerCase().replace(/'/g, "''");
const salt = randomBytes(16).toString('hex');
const hash = scryptSync(temporal, salt, 64).toString('hex');

console.log(`
Contraseña temporal para ${correo.trim().toLowerCase()}:  ${temporal}

-- Ejecuta en: turso db shell <tu-db>
UPDATE Usuarios SET passwordHash = '${hash}', salt = '${salt}' WHERE email = '${email}';
SELECT changes() AS filas_actualizadas;
DELETE FROM Sesiones WHERE idUsuario = (SELECT idUsuario FROM Usuarios WHERE email = '${email}');

Comprueba que "filas_actualizadas" sea 1 antes de enviar la contraseña (0 = el correo no existe).
Responde SOLO al mismo correo de la cuenta y pide que la cambie en "Mi cuenta" al entrar.
`);
