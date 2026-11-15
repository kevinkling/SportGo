import bcrypt from 'bcryptjs';
import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';

import type { Usuario } from '@/tipos';

import { sql } from './db.ts';
import { entorno } from './entorno.ts';
import { fallo } from './respuesta.ts';

/** Lo que queda disponible en `c.get('usuario')` una vez pasado `conSesion`. */
export type Variables = { usuario: Usuario };

const COLUMNAS_USUARIO = sql`
  id, nombre, email, telefono, rol,
  "espaciosFavoritos", "cancelacionesTardias", ausencias
`;

export { COLUMNAS_USUARIO };

export async function hashearClave(clave: string): Promise<string> {
  return bcrypt.hash(clave, 10);
}

export async function claveCoincide(clave: string, hash: string): Promise<boolean> {
  return bcrypt.compare(clave, hash);
}

export function firmarToken(usuarioId: string): string {
  return jwt.sign({ sub: usuarioId }, entorno.secretoJwt, {
    expiresIn: `${entorno.horasToken}h`,
  });
}

function usuarioIdDelToken(token: string): string | null {
  try {
    const carga = jwt.verify(token, entorno.secretoJwt);
    if (typeof carga === 'string' || typeof carga.sub !== 'string') return null;
    return carga.sub;
  } catch {
    return null;
  }
}

export async function buscarUsuario(id: string): Promise<Usuario | null> {
  const filas = await sql<Usuario[]>`
    select ${COLUMNAS_USUARIO} from usuarios where id = ${id}
  `;
  return filas[0] ?? null;
}

/**
 * Exige `Authorization: Bearer <token>` y deja el usuario en el contexto.
 * El token lo guarda la app en expo-secure-store, nunca en kv-store.
 */
export const conSesion = createMiddleware<{ Variables: Variables }>(async (c, siguiente) => {
  const cabecera = c.req.header('Authorization') ?? '';
  const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : '';
  if (!token) {
    return fallo(c, 401, 'SIN_SESION', 'Ingresá para hacer esto.');
  }
  const id = usuarioIdDelToken(token);
  if (!id) {
    return fallo(c, 401, 'SESION_VENCIDA', 'Tu sesión venció. Ingresá de nuevo.');
  }
  const usuario = await buscarUsuario(id);
  if (!usuario) {
    return fallo(c, 401, 'SESION_VENCIDA', 'Tu sesión venció. Ingresá de nuevo.');
  }
  c.set('usuario', usuario);
  await siguiente();
});

/** Encargado o administrador: todo lo de la pestaña de gestión. */
export const conGestion = createMiddleware<{ Variables: Variables }>(async (c, siguiente) => {
  const { rol } = c.get('usuario');
  if (rol !== 'encargado' && rol !== 'administrador') {
    return fallo(c, 403, 'PROHIBIDO', 'Esta acción es del encargado.');
  }
  await siguiente();
});
