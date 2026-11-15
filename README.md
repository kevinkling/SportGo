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

Los datos son inventados (ver `src/mocks/catalogo.ts`). La clave de todas las cuentas es `1234`.

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
- **Datos inventados detrás de servicios**: ninguna pantalla lee los mocks directamente; todo pasa por `src/servicios/`, que hoy devuelven datos locales y son asíncronos para cambiar a `fetch` cuando llegue la API.

## Estructura

```
src/
  app/          Rutas (Expo Router): (tabs), (gestion), espacio, mapa, ingresar
  components/   Componentes de UI
  constants/    Tema y paletas (claro / oscuro)
  contexto/     Tema, sesión y flujo de reserva
  dominio/      Lógica pura con tests (grilla, fijas, ingreso, recordatorios, distancia)
  mocks/        Datos de prueba
  persistencia/ Esquema y consultas SQLite
  servicios/    Acceso a datos, sesión, biometría, notificaciones, ubicación
  tipos/        Tipos compartidos (entidades y forma de respuesta de la API)
docs/           Guion del video de presentación
```
