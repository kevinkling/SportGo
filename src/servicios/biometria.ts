import * as LocalAuthentication from 'expo-local-authentication';

export async function confirmarIdentidad(mensaje = 'Confirmá que sos el encargado'): Promise<boolean> {
  try {
    const hardware = await LocalAuthentication.hasHardwareAsync();
    const enrolado = await LocalAuthentication.isEnrolledAsync();
    if (!hardware || !enrolado) return true;
    const r = await LocalAuthentication.authenticateAsync({
      promptMessage: mensaje,
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar clave del teléfono',
    });
    return r.success;
  } catch {
    return true;
  }
}
