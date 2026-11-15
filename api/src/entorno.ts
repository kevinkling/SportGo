/** Lee las variables de entorno una sola vez y avisa fuerte si falta alguna. */

function obligatoria(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Mirá api/.env.example.`);
  }
  return valor;
}

export const entorno = {
  urlBaseDatos: obligatoria('DATABASE_URL'),
  secretoJwt: obligatoria('JWT_SECRETO'),
  /** Render inyecta PORT; en local vale el del .env o 3000. */
  puerto: Number(process.env.PORT ?? 3000),
  /** Horas que dura el token antes de pedir ingreso de nuevo. */
  horasToken: Number(process.env.HORAS_TOKEN ?? 24 * 30),
};
