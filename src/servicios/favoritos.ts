import Storage from 'expo-sqlite/kv-store';

import { usuarioPrueba } from '@/mocks/catalogo';

const CLAVE = 'sportgo.favoritos';

export async function leerFavoritos(): Promise<string[]> {
  const crudo = await Storage.getItem(CLAVE);
  if (!crudo) return usuarioPrueba.espaciosFavoritos;
  return JSON.parse(crudo) as string[];
}

export async function alternarFavorito(espacioId: string): Promise<string[]> {
  const actuales = await leerFavoritos();
  const siguiente = actuales.includes(espacioId)
    ? actuales.filter((id) => id !== espacioId)
    : [...actuales, espacioId];
  await Storage.setItem(CLAVE, JSON.stringify(siguiente));
  return siguiente;
}
