export type Esquema = 'claro' | 'oscuro';

export interface Paleta {
  fondo: string;
  superficie: string;
  texto: string;
  secundario: string;
  linea: string;
  cta: string;
  ctaTexto: string;
  libreFondo: string;
  libreTexto: string;
  ocupado: string;
  fijo: string;
  mantenimiento: string;
  paso: string;
  lluvia: string;
  qrFondo: string;
}

export const paletas: Record<Esquema, Paleta> = {
  oscuro: {
    fondo: '#101410',
    superficie: '#171c19',
    texto: '#f4f1e6',
    secundario: '#c2bbb0',
    linea: '#2a332e',
    cta: '#f3f0e4',
    ctaTexto: '#172016',
    libreFondo: '#f3f0e4',
    libreTexto: '#172016',
    ocupado: '#e0c7be',
    fijo: '#d5e2f0',
    mantenimiento: '#f0d0a4',
    paso: '#b3aea4',
    lluvia: '#e0a15a',
    qrFondo: '#ffffff',
  },
  claro: {
    fondo: '#f6f3ea',
    superficie: '#e8e3d6',
    texto: '#172016',
    secundario: '#5c6560',
    linea: '#d4cfc2',
    cta: '#172016',
    ctaTexto: '#f3f0e4',
    libreFondo: '#ffffff',
    libreTexto: '#172016',
    ocupado: '#6b3328',
    fijo: '#1e3f5c',
    mantenimiento: '#6a4510',
    paso: '#8a857c',
    lluvia: '#e0a15a',
    qrFondo: '#ffffff',
  },
};

export const colorDeporte: Record<string, string> = {
  'dep-futbol5': '#1f7a3e',
  'dep-futbol11': '#2d5a32',
  'dep-basquet': '#a86832',
  'dep-voley': '#c9842a',
  'dep-tenis': '#3e6b45',
  'dep-gimnasio': '#31404d',
};

export function peso(n: number): string {
  return `$ ${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}
