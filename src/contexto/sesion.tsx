import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import { obtenerSesion, type Sesion } from '@/servicios/sesion';

interface SesionValor {
  sesion: Sesion | null;
  lista: boolean;
  /** true mientras la sesión guardada espera la huella para poder usarse. */
  bloqueada: boolean;
  setBloqueada: (b: boolean) => void;
  /** Una sesión nueva (ingreso, registro o salida) nunca queda bloqueada. */
  setSesion: (s: Sesion | null) => void;
}

const SesionContext = createContext<SesionValor | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesionEstado] = useState<Sesion | null>(null);
  const [lista, setLista] = useState(false);
  const [bloqueada, setBloqueada] = useState(false);

  const setSesion = useCallback((s: Sesion | null) => {
    setBloqueada(false);
    setSesionEstado(s);
  }, []);

  useEffect(() => {
    obtenerSesion()
      .then((guardada) => {
        // Reingreso: la sesión que sobrevivió al cierre de la app pide huella antes de usarse.
        if (guardada) setBloqueada(true);
        setSesionEstado(guardada);
      })
      .finally(() => setLista(true));
  }, []);

  return <SesionContext value={{ sesion, lista, bloqueada, setBloqueada, setSesion }}>{children}</SesionContext>;
}

export function useSesion() {
  const ctx = use(SesionContext);
  if (!ctx) throw new Error('useSesion fuera del provider');
  return ctx;
}
