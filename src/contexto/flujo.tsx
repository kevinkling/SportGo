import { createContext, use, useState, type ReactNode } from 'react';

interface FlujoValor {
  espacioId: string | null;
  setEspacioId: (id: string | null) => void;
}

const FlujoContext = createContext<FlujoValor | null>(null);

export function FlujoProvider({ children }: { children: ReactNode }) {
  const [espacioId, setEspacioId] = useState<string | null>('esp-02');
  return <FlujoContext value={{ espacioId, setEspacioId }}>{children}</FlujoContext>;
}

export function useFlujo() {
  const ctx = use(FlujoContext);
  if (!ctx) throw new Error('useFlujo fuera del provider');
  return ctx;
}
