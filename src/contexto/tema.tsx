import { createContext, use, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { paletas, type Esquema, type Paleta } from '@/constants/tema';

interface TemaValor {
  esquema: Esquema;
  paleta: Paleta;
}

const TemaContext = createContext<TemaValor | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const sistema = useColorScheme();
  const esquema: Esquema = sistema === 'light' ? 'claro' : 'oscuro';

  return <TemaContext value={{ esquema, paleta: paletas[esquema] }}>{children}</TemaContext>;
}

export function useTema() {
  const ctx = use(TemaContext);
  if (!ctx) throw new Error('useTema fuera del provider');
  return ctx;
}
