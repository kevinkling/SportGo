import * as Linking from 'expo-linking';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import type { Coordenadas } from '@/tipos';

export type PermisoUbicacion = 'undetermined' | 'granted' | 'denied';

export type ResultadoUbicacion =
  | { estado: 'concedida'; coordenadas: Coordenadas }
  | { estado: 'denegada' };

function deStatus(status: Location.PermissionStatus): PermisoUbicacion {
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

export async function leerPermisoUbicacion(): Promise<PermisoUbicacion> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    return deStatus(status);
  } catch {
    return 'denied';
  }
}

async function posicionActual(): Promise<ResultadoUbicacion> {
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      estado: 'concedida',
      coordenadas: { latitud: pos.coords.latitude, longitud: pos.coords.longitude },
    };
  } catch {
    return { estado: 'denegada' };
  }
}

export async function pedirUbicacion(): Promise<ResultadoUbicacion> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) return { estado: 'denegada' };
    return posicionActual();
  } catch {
    return { estado: 'denegada' };
  }
}

/** Lee la posición solo si el permiso ya está concedido. No muestra el diálogo. */
export async function ubicacionSiPermitida(): Promise<Coordenadas | null> {
  const permiso = await leerPermisoUbicacion();
  if (permiso !== 'granted') return null;
  const r = await posicionActual();
  return r.estado === 'concedida' ? r.coordenadas : null;
}

export async function abrirComoLlegar(nombre: string, coordenadas: Coordenadas): Promise<void> {
  const { latitud, longitud } = coordenadas;
  const etiqueta = encodeURIComponent(nombre);
  const nativo =
    Platform.OS === 'ios'
      ? `maps:0,0?q=${etiqueta}@${latitud},${longitud}`
      : `geo:${latitud},${longitud}?q=${latitud},${longitud}(${etiqueta})`;
  try {
    await Linking.openURL(nativo);
  } catch {
    await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitud},${longitud}`);
  }
}
