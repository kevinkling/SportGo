import * as LocalAuthentication from 'expo-local-authentication';

// ok: pasó la huella/rostro/clave del teléfono.
// rechazada: el usuario canceló, falló o se bloqueó el sensor.
// no_disponible: el teléfono no tiene sensor o no hay huella cargada (hay que usar el PIN).
export type ResultadoIdentidad = 'ok' | 'rechazada' | 'no_disponible';

export async function confirmarIdentidad(mensaje = 'Confirmá que sos el encargado'): Promise<ResultadoIdentidad> {
  try {
    const hardware = await LocalAuthentication.hasHardwareAsync();
    const enrolado = await LocalAuthentication.isEnrolledAsync();
    if (!hardware || !enrolado) return 'no_disponible';
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
