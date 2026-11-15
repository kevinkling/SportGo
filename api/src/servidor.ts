import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { sql } from './db.ts';
import { entorno } from './entorno.ts';
import { rutasAuth } from './rutas/auth.ts';
import { rutasEspacios } from './rutas/espacios.ts';
import { rutasGestion } from './rutas/gestion.ts';
import { rutasReservas } from './rutas/reservas.ts';
import { fallo } from './respuesta.ts';

const app = new Hono();

app.use('*', cors());

/**
 * UptimeRobot le pega acá cada 5 minutos para que Render no duerma el servicio.
 * Hace una consulta de verdad: así de paso mantiene despierta la conexión con
 * la base y avisa si Supabase se cae, no solo si Node sigue vivo.
 */
app.get('/salud', async (c) => {
  await sql`select 1`;
  return c.json({ ok: true });
});

app.route('/auth', rutasAuth);
app.route('/', rutasEspacios);
app.route('/', rutasReservas);
app.route('/gestion', rutasGestion);

app.notFound((c) => fallo(c, 404, 'NO_ENCONTRADO', 'Esa ruta no existe.'));

// Cualquier error no previsto sale con la misma forma del PRD, y el detalle
// queda en el log de Render en vez de viajar al teléfono.
app.onError((error, c) => {
  console.error(error);
  return fallo(c, 500, 'ERROR_INTERNO', 'Algo falló de nuestro lado. Probá de nuevo.');
});

serve({ fetch: app.fetch, port: entorno.puerto }, ({ port }) => {
  console.log(`SportGo API escuchando en el puerto ${port}`);
});
