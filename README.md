# SportGo

App móvil de reservas para los 11 espacios deportivos municipales de Villaguay (Entre Ríos), pensada para la Dirección de Deportes. Reemplaza las reservas por WhatsApp y libretas: se ve qué turnos hay libres, se reserva, se cancela con un botón y el día del turno se muestra un QR que el encargado verifica en la puerta.

Hecha con React Native + Expo (Expo Router, TypeScript). Android e iPhone, con modo oscuro.

## Qué hace

- **Espacios**: listado con filtros por deporte y complejo, ficha con fotos, precio, reglas y video del recorrido, y mapa con "cómo llegar".
- **Disponibilidad**: grilla de turnos de 1 h (08:00–24:00) para los próximos 7 días, que cruza reservas, reservas fijas semanales y bloqueos por mantenimiento o lluvia. No pide cuenta para mirar; se pide recién al reservar.
- **Reservas**: máximo 3 activas, cancelación sola hasta 4 h antes, historial de próximas y pasadas, QR guardado en el teléfono y visible sin conexión.
- **Avisos**: recordatorio 2 h antes, suspensión de turno y turno liberado en un espacio favorito (notificaciones locales).
- **Gestión** (encargado o administrador): agenda del día, escaneo de QR con presentes y ausentes, bloqueos, reservas fijas y precio por hora.
- Sin cobro en la app: el turno se paga en el lugar.

## Cómo correrla

Usa **pnpm** (no npm ni yarn).

```bash
pnpm install
pnpm start
```

Otros comandos:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm exec expo-doctor
```

Builds con EAS (perfiles en `eas.json`):

```bash
pnpm dlx eas-cli@latest build --profile development
pnpm dlx eas-cli@latest build --profile preview --platform android
```

## Cuentas de prueba

Son cuentas de la API desplegada (se cargan con `pnpm migrar` en `api/`). La clave de todas es `1234`. Cualquiera puede además crear la suya desde "¿No tenés cuenta?" en la pantalla de ingreso.

| Rol | Correo |
|---|---|
| Jugador | `emiliano@mail.com` |
| Encargado | `marcelo@villaguay.gob.ar` |
| Administrador | `nahuel@villaguay.gob.ar` |

El encargado confirma con **huella o rostro** al abrir la pestaña de escaneo y cada vez que reabre la app. Si el teléfono no tiene sensor, o se cancela el diálogo, queda el código de encargado `1234` como alternativa (código fijo de la demo).

## Paquetes por capacidad

| Capacidad | Paquete |
|---|---|
| Navegación | `expo-router` |
| Cámara (QR) | `expo-camera` |
| Ubicación y mapa | `expo-location`, `react-native-maps` |
| Notificaciones | `expo-notifications` |
| Reservas y QR sin conexión | `expo-sqlite` |
| Estado de red | `expo-network` (banner "sin conexión") |
| Sesión segura | `expo-secure-store` (token), `expo-local-authentication` (huella del encargado) |
| Háptica | `expo-haptics` (vibración distinta para ingreso válido e inválido) |
| Archivos | `expo-file-system` (video y fotos de cada cancha) |
| Video | `expo-video` (recorrido de la cancha) |

Decisiones:

- **Sin `expo-sensors`**: `expo-haptics` alcanza para la vibración de ingreso válido/inválido.
- **Sin `expo-image-picker` ni `expo-audio`**: el PRD no pide subir fotos ni audio; el video se reproduce con `expo-video`.
- **API propia**: la cátedra no publicó la API, así que se hizo una con la forma exacta que fija el PRD (ver `api/`). La app habla con ella sólo desde `src/servicios/`, y `src/servicios/api.ts` es el único lugar que hace `fetch`.
- **SQLite es caché, no fuente de verdad**: cada lectura exitosa se guarda y, sin conexión, se devuelve la última copia. Mis reservas (con su QR) quedan siempre en el teléfono para mostrarse en la puerta.

## Estructura

```
src/
  app/          Rutas (Expo Router): (tabs), (gestion), espacio, mapa, ingresar, registrarse
  components/   Componentes de UI
  constants/    Tema y paletas (claro / oscuro)
  contexto/     Tema, sesión y flujo de reserva
  dominio/      Lógica pura con tests (grilla, fijas, ingreso, recordatorios, distancia)
  persistencia/ Esquema SQLite, caché de la API y descarga de fotos y video
  servicios/    Cliente de la API, sesión, biometría, notificaciones, ubicación
  tipos/        Tipos compartidos (entidades y forma de respuesta de la API)
docs/           Guion del video de presentación
api/            Servidor (Hono + Postgres de Supabase), se despliega en Render
```

## API

Vive en `api/` y se despliega en Render (`https://sportgo-api-adjb.onrender.com`). La base de datos y los archivos (fotos y video de las canchas) están en Supabase. UptimeRobot le pega a `/salud` cada 5 minutos para que Render no la duerma.

```bash
cd api
pnpm install
cp .env.example .env   # completar DATABASE_URL y JWT_SECRETO
pnpm dev               # servidor local en el puerto 3000
pnpm migrar --demo     # datos del municipio, usuarios de prueba y casos de ejemplo
```

La app usa esa URL por defecto; para apuntar a otra (por ejemplo `pnpm dev` en la compu) se define `EXPO_PUBLIC_API_URL`.
