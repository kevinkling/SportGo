// El servidor no usa íconos: alcanza con que el nombre sea texto.
// Esto deja importar `@/tipos` (que tipa Deporte.icono con el paquete de la app)
// sin traer React Native al backend. Ver "paths" en api/tsconfig.json.
export type IoniconsIconName = string;
