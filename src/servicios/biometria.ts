import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

// ok: pasó la huella/rostro o la clave del teléfono.
// rechazada: el usuario canceló, falló o se bloqueó el sensor.
// no_disponible: el teléfono no tiene sensor ni clave de pantalla (no hay nada que verificar).
export type ResultadoIdentidad = 'ok' | 'rechazada' | 'no_disponible';

// La pantalla de bloqueo y el escáner pueden pedir la huella a la vez (al volver de segundo
// plano). Comparten el mismo pedido para que el sistema muestre un solo diálogo.
let enCurso: Promise<ResultadoIdentidad> | null = null;

async function pedirIdentidad(mensaje: string): Promise<ResultadoIdentidad> {
  try {
    // NONE = sin huella ni rostro ni PIN/patrón. Con PIN pero sin sensor, el sistema
    // ofrece la clave del teléfono como alternativa a la huella.
    const nivel = await LocalAuthentication.getEnrolledLevelAsync();
    if (nivel === LocalAuthentication.SecurityLevel.NONE) return 'no_disponible';
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: mensaje,
      cancelLabel: 'Usar código',
      fallbackLabel: 'Usar clave del teléfono',
    });
    return r.success ? 'ok' : 'rechazada';
  } catch {
    return 'no_disponible';
  }
}

export function confirmarIdentidad(mensaje = 'Confirmá que sos el encargado'): Promise<ResultadoIdentidad> {
  enCurso ??= pedirIdentidad(mensaje).finally(() => {
    enCurso = null;
  });
  return enCurso;
}

/**
 * Cómo le dice el teléfono a su método: "Face ID" en iPhone con rostro, "Touch ID" con
 * huella en iPhone, "huella" o "rostro" en Android. Sin sensor, la clave del teléfono.
 */
export async function nombreMetodoBiometrico(): Promise<string> {
  try {
    const tipos = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const ios = Platform.OS === 'ios';
    if (tipos.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return ios ? 'Face ID' : 'rostro';
    }
    if (tipos.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return ios ? 'Touch ID' : 'huella';
    }
  } catch {
    // Sin información: se usa la palabra genérica.
  }
  return 'clave del teléfono';
}
