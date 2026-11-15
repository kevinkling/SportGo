import type { Paleta } from '@/constants/tema';

/** Estilos compartidos por los formularios de ingreso y registro. */

export function estiloCampo(paleta: Paleta) {
  return {
    minHeight: 48,
    borderWidth: 1,
    borderColor: paleta.linea,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: paleta.texto,
    fontFamily: 'Manrope_400Regular' as const,
    backgroundColor: paleta.superficie,
  };
}

export function estiloBoton(paleta: Paleta) {
  return {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: paleta.cta,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
}

export function estiloError(paleta: Paleta) {
  return { color: paleta.ocupado, fontFamily: 'Manrope_400Regular' as const };
}
