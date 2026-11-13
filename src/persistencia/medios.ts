import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import { fotosBundle, videosBundle } from '@/mocks/medios';

async function copiarAlDocumento(modulo: number, carpeta: Directory, nombre: string): Promise<string> {
  const asset = Asset.fromModule(modulo);
  await asset.downloadAsync();
  if (!asset.localUri) throw new Error(`No se pudo leer ${nombre}`);
  const destino = new File(carpeta, nombre);
  if (!destino.exists) {
    new File(asset.localUri).copy(destino);
  }
  return destino.uri;
}

export async function sembrarMedios(db: SQLiteDatabase) {
  const fotosDir = new Directory(Paths.document, 'espacios');
  if (!fotosDir.exists) fotosDir.create();
  const videosDir = new Directory(Paths.document, 'videos');
  if (!videosDir.exists) videosDir.create();

  const fotos = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM fotos_espacio');
  if (!fotos || fotos.c === 0) {
    for (const [espacioId, modulos] of Object.entries(fotosBundle)) {
      for (let i = 0; i < modulos.length; i++) {
        const nombre = `${espacioId}-${i + 1}.jpg`;
        const ruta = await copiarAlDocumento(modulos[i], fotosDir, nombre);
        await db.runAsync('INSERT INTO fotos_espacio (espacioId, orden, ruta) VALUES (?, ?, ?)', espacioId, i, ruta);
      }
    }
  }

  const videos = await db.getFirstAsync<{ c: number }>('SELECT COUNT(*) as c FROM videos_espacio');
  if (!videos || videos.c === 0) {
    for (const [espacioId, modulo] of Object.entries(videosBundle)) {
      const ruta = await copiarAlDocumento(modulo, videosDir, `${espacioId}.mp4`);
      await db.runAsync('INSERT INTO videos_espacio (espacioId, ruta) VALUES (?, ?)', espacioId, ruta);
    }
  }
}
