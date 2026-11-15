import Storage from 'expo-sqlite/kv-store';

import { llamar } from '@/servicios/api';
import { obtenerSesion } from '@/servicios/sesion';
import { esError, type Usuario } from '@/tipos';

const CLAVE = 'sportgo.favoritos';

/**
 * Los favoritos son una preferencia: se leen siempre de kv-store, que responde
 * al instante y anda sin conexión. Con sesión, el servidor es quien manda y
 * `sincronizarFavoritos` pisa la copia local con lo que tiene la cuenta.
 */
export async function leerFavoritos(): Promise<string[]> {
  const crudo = await Storage.getItem(CLAVE);
  return crudo ? (JSON.parse(crudo) as string[]) : [];
}

async function guardar(ids: string[]) {
  await Storage.setItem(CLAVE, JSON.stringify(ids));
}

/** Trae los favoritos de la cuenta. Se llama al abrir la app y al ingresar. */
export async function sincronizarFavoritos(): Promise<void> {
  if (!(await obtenerSesion())) return;
  const r = await llamar<Usuario>('GET', '/auth/yo');
  if (!esError(r)) await guardar(r.datos.espaciosFavoritos);
}

export async function alternarFavorito(espacioId: string): Promise<string[]> {
  const actuales = await leerFavoritos();
  const eraFavorito = actuales.includes(espacioId);
  const siguiente = eraFavorito ? actuales.filter((id) => id !== espacioId) : [...actuales, espacioId];

  if (await obtenerSesion()) {
    const r = await llamar<string[]>(eraFavorito ? 'DELETE' : 'PUT', `/auth/favoritos/${espacioId}`);
    // Con sesión el servidor es quien manda: si no lo acepta (o no hay señal),
    // el corazón queda como estaba en vez de mostrar algo que la cuenta no tiene.
    if (esError(r)) return actuales;
  }
  await guardar(siguiente);
  return siguiente;
}
