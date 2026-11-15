import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Espacio } from '@/tipos';

function carpeta(nombre: string): Directory {
  const dir = new Directory(Paths.document, nombre);
  dir.create({ idempotent: true });
  return dir;
}

/** El nombre del archivo es el último tramo de la URL: "…/fotos/esp-02-1.jpg". */
function nombreDe(url: string): string {
  return url.split('/').pop() ?? url;
}

/** Baja el archivo a `dir` si todavía no está; devuelve la ruta local o null si falló. */
async function asegurarArchivo(url: string, dir: Directory): Promise<string | null> {
  const destino = new File(dir, nombreDe(url));
  if (destino.exists) return destino.uri;
  try {
    const bajado = await File.downloadFileAsync(url, dir);
    return bajado.uri;
  } catch {
    // Sin señal o servidor caído: se vuelve a intentar la próxima vez que se listen.
    return null;
  }
}

let enCurso: Promise<void> | null = null;

/**
 * Descarga al teléfono las fotos y el video de cada espacio (API nueva de
 * expo-file-system: File, Directory, Paths) y anota la ruta local en SQLite.
 * Así la galería y el recorrido se ven sin datos, como pide el PRD.
 *
 * Se llama sin esperar: la pantalla no se frena por esto. Si ya hay una
 * descarga andando, se reusa en vez de arrancar otra.
 */
export function descargarMedios(db: SQLiteDatabase, espacios: Espacio[]): Promise<void> {
  if (enCurso) return enCurso;
  enCurso = (async () => {
    const fotos = carpeta('espacios');
    const videos = carpeta('videos');
    for (const espacio of espacios) {
      for (let i = 0; i < espacio.imagenes.length; i++) {
        const ruta = await asegurarArchivo(espacio.imagenes[i], fotos);
        if (ruta) {
          await db.runAsync(
            'INSERT OR REPLACE INTO fotos_espacio (espacioId, orden, ruta) VALUES (?, ?, ?)',
            espacio.id,
            i,
            ruta,
          );
        }
      }
      if (espacio.videoUrl) {
        const ruta = await asegurarArchivo(espacio.videoUrl, videos);
        if (ruta) {
          await db.runAsync('INSERT OR REPLACE INTO videos_espacio (espacioId, ruta) VALUES (?, ?)', espacio.id, ruta);
        }
      }
    }
  })().finally(() => {
    enCurso = null;
  });
  return enCurso;
}
