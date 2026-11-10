import { createContext, use, useEffect, useState, type ReactNode } from 'react';

import { obtenerSesion, type Sesion } from '@/servicios/sesion';

interface SesionValor {
  sesion: Sesion | null;
  lista: boolean;
  setSesion: (s: Sesion | null) => void;
}

const SesionContext = createContext<SesionValor | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [lista, setLista] = useState(false);

  useEffect(() => {
    obtenerSesion()
      .then(setSesion)
      .finally(() => setLista(true));
  }, []);

  return <SesionContext value={{ sesion, lista, setSesion }}>{children}</SesionContext>;
}

export function useSesion() {
  const ctx = use(SesionContext);
  if (!ctx) throw new Error('useSesion fuera del provider');
  return ctx;
}
  