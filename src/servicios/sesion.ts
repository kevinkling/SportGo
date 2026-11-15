import * as SecureStore from 'expo-secure-store';

import { CLAVE_SESION, llamar } from '@/servicios/api';
import { esError, type Respuesta, type Rol, type Usuario } from '@/tipos';

export interface Sesion {
  token: string;
  usuario: Usuario;
}

export function puedeGestionar(rol: Rol): boolean {
  return rol === 'encargado' || rol === 'administrador';
}

/** La sesión sobrevive al cierre de la app: el token queda en expo-secure-store. */
export async function obtenerSesion(): Promise<Sesion | null> {
  const crudo = await SecureStore.getItemAsync(CLAVE_SESION);
  if (!crudo) return null;
  return JSON.parse(crudo) as Sesion;
}

async function guardarSesion(r: Respuesta<Sesion>): Promise<Respuesta<Sesion>> {
  if (!esError(r)) await SecureStore.setItemAsync(CLAVE_SESION, JSON.stringify(r.datos));
  return r;
}

export async function ingresar(email: string, clave: string): Promise<Respuesta<Sesion>> {
  return guardarSesion(await llamar<Sesion>('POST', '/auth/ingreso', { email, clave }));
}

export async function registrar(entrada: {
  nombre: string;
  email: string;
  telefono: string;
  clave: string;
}): Promise<Respuesta<Sesion>> {
  return guardarSesion(await llamar<Sesion>('POST', '/auth/registro', entrada));
}

export async function salir(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_SESION);
}
