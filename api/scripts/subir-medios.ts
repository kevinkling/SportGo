/**
 * Sube las fotos y el video de las canchas a Supabase Storage y guarda las URL
 * públicas en la tabla `espacios`. Se puede repetir: pisa lo que ya estaba.
 *
 *   pnpm subir-medios
 *
 * Usa la API REST de Storage con fetch, sin SDK: son dos llamadas.
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { sql } from '../src/db.ts';

const URL_SUPABASE = process.env.SUPABASE_URL;
const CLAVE = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.SUPABASE_BUCKET ?? 'espacios';

if (!URL_SUPABASE || !CLAVE) {
  throw new Error('Faltan SUPABASE_URL y SUPABASE_SERVICE_KEY. Mirá api/.env.example.');
}

const FOTOS = fileURLToPath(new URL('../../assets/images/mocks/', import.meta.url));
const VIDEOS = fileURLToPath(new URL('../../assets/videos/mocks/', import.meta.url));

const cabeceras = { Authorization: `Bearer ${CLAVE}`, apikey: CLAVE };
const urlPublica = (ruta: string) => `${URL_SUPABASE}/storage/v1/object/public/${BUCKET}/${ruta}`;

async function crearBucket() {
  const r = await fetch(`${URL_SUPABASE}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...cabeceras, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  // Si ya existía (o la clave no puede crear buckets) no es grave: si de verdad
  // falta, la primera subida falla con un mensaje claro.
  if (!r.ok) console.log(`  (bucket "${BUCKET}" no creado: ${r.status}; se asume que ya existe)`);
}

async function subir(ruta: string, archivoLocal: string, tipo: string) {
  const r = await fetch(`${URL_SUPABASE}/storage/v1/object/${BUCKET}/${ruta}`, {
    method: 'POST',
    headers: { ...cabeceras, 'Content-Type': tipo, 'x-upsert': 'true' },
    body: await readFile(archivoLocal),
  });
  if (!r.ok) throw new Error(`Falló la subida de ${ruta}: ${r.status} ${await r.text()}`);
  console.log(`  subido ${ruta}`);
}

try {
  await crearBucket();

  // esp-02-3.jpg -> espacio esp-02, orden 3
  const fotos = (await readdir(FOTOS)).filter((n) => /^esp-\d+-\d+\.jpg$/.test(n)).sort();
  const porEspacio = new Map<string, string[]>();
  for (const nombre of fotos) {
    await subir(`fotos/${nombre}`, FOTOS + nombre, 'image/jpeg');
    const espacioId = nombre.replace(/-\d+\.jpg$/, '');
    porEspacio.set(espacioId, [...(porEspacio.get(espacioId) ?? []), urlPublica(`fotos/${nombre}`)]);
  }
  for (const [espacioId, urls] of porEspacio) {
    await sql`update espacios set imagenes = ${urls} where id = ${espacioId}`;
  }

  // esp-11.mp4 -> video del gimnasio. Los demás espacios quedan sin video a propósito:
  // el PRD pide poder probar "un espacio sin video".
  const videos = (await readdir(VIDEOS)).filter((n) => /^esp-\d+\.mp4$/.test(n));
  for (const nombre of videos) {
    await subir(`videos/${nombre}`, VIDEOS + nombre, 'video/mp4');
    await sql`update espacios set "videoUrl" = ${urlPublica(`videos/${nombre}`)} where id = ${nombre.replace('.mp4', '')}`;
  }

  console.log(`Listo: ${fotos.length} fotos y ${videos.length} video en el bucket "${BUCKET}".`);
} finally {
  await sql.end();
}
