import { Hono } from 'hono';
import { z } from 'zod';

import type { Usuario } from '@/tipos';

import { nuevoId } from '../datos.ts';
import { sql } from '../db.ts';
import { fallo, ok } from '../respuesta.ts';
import {
  claveCoincide,
  conSesion,
  COLUMNAS_USUARIO,
  firmarToken,
  hashearClave,
  type Variables,
} from '../sesion.ts';

export const rutasAuth = new Hono<{ Variables: Variables }>();

const registro = z.object({
  nombre: z.string().trim().min(2, 'Escribí tu nombre.'),
  email: z.string().trim().toLowerCase().email('Ese correo no parece válido.'),
  telefono: z.string().trim().min(6, 'Dejá un teléfono de contacto.'),
  clave: z.string().min(4, 'La clave tiene que tener al menos 4 caracteres.'),
});

const ingreso = z.object({
  email: z.string().trim().toLowerCase(),
  clave: z.string().min(1),
});

rutasAuth.post('/registro', async (c) => {
  const cuerpo = registro.safeParse(await c.req.json().catch(() => null));
  if (!cuerpo.success) {
    return fallo(c, 400, 'DATOS', cuerpo.error.issues[0]?.message ?? 'Revisá los datos.');
  }
  const { nombre, email, telefono, clave } = cuerpo.data;

  const repetido = await sql`select 1 from usuarios where email = ${email}`;
  if (repetido.length > 0) {
    return fallo(c, 409, 'EMAIL_EN_USO', 'Ya hay una cuenta con ese correo.');
  }

  // Quien se registra desde la app siempre es jugador. Encargado y administrador
  // los carga la Dirección de Deportes a mano (scripts/migrar.ts).
  const [usuario] = await sql<Usuario[]>`
    insert into usuarios (id, nombre, email, telefono, rol, "claveHash")
    values (${nuevoId('usr')}, ${nombre}, ${email}, ${telefono}, 'jugador', ${await hashearClave(clave)})
    returning ${COLUMNAS_USUARIO}
  `;
  return ok(c, { token: firmarToken(usuario.id), usuario });
});

rutasAuth.post('/ingreso', async (c) => {
  const cuerpo = ingreso.safeParse(await c.req.json().catch(() => null));
  if (!cuerpo.success) {
    return fallo(c, 400, 'CREDENCIALES', 'El correo o la clave no coinciden.');
  }
  const filas = await sql<(Usuario & { claveHash: string })[]>`
    select ${COLUMNAS_USUARIO}, "claveHash" from usuarios where email = ${cuerpo.data.email}
  `;
  const fila = filas[0];
  // Se responde lo mismo si no existe el correo o si la clave está mal: así nadie
  // puede averiguar qué correos tienen cuenta probando de a uno.
  if (!fila || !(await claveCoincide(cuerpo.data.clave, fila.claveHash))) {
    return fallo(c, 401, 'CREDENCIALES', 'El correo o la clave no coinciden.');
  }
  const { claveHash: _, ...usuario } = fila;
  return ok(c, { token: firmarToken(usuario.id), usuario });
});

/** La app la llama al abrir para saber si el token guardado sigue sirviendo. */
rutasAuth.get('/yo', conSesion, (c) => ok(c, c.get('usuario')));

rutasAuth.put('/favoritos/:espacioId', conSesion, async (c) => {
  const usuario = c.get('usuario');
  const [fila] = await sql<{ espaciosFavoritos: string[] }[]>`
    update usuarios
       set "espaciosFavoritos" = array(
         select distinct unnest("espaciosFavoritos" || ${[c.req.param('espacioId')]}::text[])
       )
     where id = ${usuario.id}
     returning "espaciosFavoritos"
  `;
  return ok(c, fila.espaciosFavoritos);
});

rutasAuth.delete('/favoritos/:espacioId', conSesion, async (c) => {
  const usuario = c.get('usuario');
  const [fila] = await sql<{ espaciosFavoritos: string[] }[]>`
    update usuarios
       set "espaciosFavoritos" = array_remove("espaciosFavoritos", ${c.req.param('espacioId')})
     where id = ${usuario.id}
     returning "espaciosFavoritos"
  `;
  return ok(c, fila.espaciosFavoritos);
});
