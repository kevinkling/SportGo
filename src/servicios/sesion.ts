import * as SecureStore from 'expo-secure-store';

import { buscarUsuarioPorEmail, CLAVE_PRUEBA } from '@/mocks/catalogo';
import { esperar, fallo, ok } from '@/servicios/respuesta';
import type { Respuesta, Rol, Usuario } from '@/tipos';

const CLAVE_TOKEN = 'sportgo.sesion';

export interface Sesion {
  token: string;
  usuario: Usuario;
}

export function puedeGestionar(rol: Rol): boolean {
  return rol === 'encargado' || rol === 'administrador';
}

export async function obtenerSesion(): Promise<Sesion | null> {
  const crudo = await SecureStore.getItemAsync(CLAVE_TOKEN);
  if (!crudo) return null;
  return JSON.parse(crudo) as Sesion;
}

export async function ingresar(email: string, clave: string): Promise<Respuesta<Sesion>> {
  await esperar();
  const usuario = buscarUsuarioPorEmail(email);
  if (!usuario || clave !== CLAVE_PRUEBA) {
    return fallo('CREDENCIALES', 'El correo o la clave no coinciden.');
  }
  const sesion: Sesion = { token: `tok-${usuario.id}-local`, usuario };
  await SecureStore.setItemAsync(CLAVE_TOKEN, JSON.stringify(sesion));
  return ok(sesion);
}

export async function salir(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_TOKEN);
}
