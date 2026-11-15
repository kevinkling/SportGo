import * as SecureStore from 'expo-secure-store';

import { fallo } from '@/servicios/respuesta';
import type { Respuesta } from '@/tipos';

/** La URL sale de EXPO_PUBLIC_API_URL; si no está, usa el servidor de Render. */
export const URL_API = process.env.EXPO_PUBLIC_API_URL ?? 'https://sportgo-api-adjb.onrender.com';

/** Clave de expo-secure-store donde queda la sesión ({ token, usuario }). */
export const CLAVE_SESION = 'sportgo.sesion';

/**
 * Render free tarda hasta ~1 minuto en despertar si estuvo dormido. UptimeRobot
 * lo evita, pero si pasa, mejor esperar que mostrar un error enseguida.
 */
const ESPERA_MAXIMA_MS = 25_000;

async function leerToken(): Promise<string | null> {
  const crudo = await SecureStore.getItemAsync(CLAVE_SESION);
  if (!crudo) return null;
  try {
    return (JSON.parse(crudo) as { token?: string }).token ?? null;
  } catch {
    return null;
  }
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Único lugar de la app que hace `fetch`. Pone el `Authorization: Bearer <token>`
 * si hay sesión, y devuelve siempre la misma forma que fija el PRD:
 *   { datos, meta }  o  { error: { codigo, mensaje } }
 * Cualquier falla de red (sin señal, servidor dormido, respuesta rota) sale como
 * SIN_RED, que es el código que las pantallas y la caché ya saben tratar.
 */
export async function llamar<T>(metodo: Metodo, ruta: string, cuerpo?: unknown): Promise<Respuesta<T>> {
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), ESPERA_MAXIMA_MS);
  try {
    const token = await leerToken();
    const respuesta = await fetch(`${URL_API}${ruta}`, {
      method: metodo,
      headers: {
        Accept: 'application/json',
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: control.signal,
    });
    const json = (await respuesta.json()) as Respuesta<T>;
    if (!('datos' in json) && !('error' in json)) throw new Error('Respuesta inesperada');
    return json;
  } catch {
    return fallo('SIN_RED', 'No pudimos conectar con el servidor. Probá de nuevo.');
  } finally {
    clearTimeout(corte);
  }
}

export function esSinRed<T>(r: Respuesta<T>): boolean {
  return 'error' in r && r.error.codigo === 'SIN_RED';
}
