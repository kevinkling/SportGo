import postgres from 'postgres';

import { entorno } from './entorno.ts';

/**
 * Conexión al Postgres de Supabase.
 *
 * Va por el pooler en modo SESIÓN (puerto 5432). Se probó el de transacción (6543) y
 * con dos pedidos simultáneos las consultas quedaban colgadas para siempre: el
 * pooler y postgres.js se pisan a mitad del protocolo. En modo sesión cada
 * conexión de la API queda atada a la suya y eso no pasa.
 *
 * `prepare: false` igual se deja: no hace falta nombrar sentencias para un
 * servidor de este tamaño, y así el código sirve también si algún día se cambia
 * a un pooler que no las soporte.
 *
 * `max: 4` porque el plan gratis tiene pocas conexiones y Render puede levantar
 * más de una instancia.
 */
export const sql = postgres(entorno.urlBaseDatos, {
  prepare: false,
  max: 4,
  idle_timeout: 20,
  connect_timeout: 15,
});

export type Sql = typeof sql;
