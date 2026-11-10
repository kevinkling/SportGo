import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

import { paletas, type Esquema, type ModoTema, type Paleta } from '@/constants/tema';

const CLAVE = 'sportgo.tema';

interface TemaValor {
  modo: ModoTema;
  esquema: Esquema;
  paleta: Paleta;
  setModo: (modo: ModoTema) => void;
}

const TemaContext = createContext<TemaValor | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const sistema = useColorScheme();
  const [modo, setModoEstado] = useState<ModoTema>('sistema');

  useEffect(() => {
    Storage.getItem(CLAVE).then((v) => {
      if (v === 'claro' || v === 'oscuro' || v === 'sistema') setModoEstado(v);
    });
  }, []);

  const esquema: Esquema = modo === 'sistema' ? (sistema === 'light' ? 'claro' : 'oscuro') : modo === 'claro' ? 'claro' : 'oscuro';

  function setModo(siguiente: ModoTema) {
    setModoEstado(siguiente);
    Storage.setItem(CLAVE, siguiente);
  }

  return (
    <TemaContext value={{ modo, esquema, paleta: paletas[esquema], setModo }}>
      {children}
    </TemaContext>
  );
}

export function useTema() {
  const ctx = use(TemaContext);
  if (!ctx) throw new Error('useTema fuera del provider');
  return ctx;
}
