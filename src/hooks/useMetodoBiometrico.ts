import { useEffect, useState } from 'react';

import { nombreMetodoBiometrico } from '@/servicios/biometria';

/** "Face ID", "Touch ID", "huella", "rostro" o "clave del teléfono", según el aparato. */
export function useMetodoBiometrico(): string {
  const [metodo, setMetodo] = useState('huella');

  useEffect(() => {
    let vivo = true;
    void nombreMetodoBiometrico().then((nombre) => {
      if (vivo) setMetodo(nombre);
    });
    return () => {
      vivo = false;
    };
  }, []);

  return metodo;
}
