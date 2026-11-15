# SportGo — Cumplimiento de los requisitos mínimos

Trabajo Final Integrador · Desarrollo para Móviles · PRD 05 «Reservas Deportivas» (Dirección de Deportes de Villaguay).

Este documento responde, punto por punto, a los **requisitos mínimos** de la cátedra. Cada punto dice qué hace la app y en qué parte del código está. Los nombres de archivo son rutas dentro del repositorio de la app.

> **Sobre el video de presentación.** El video se grabó un día antes de la entrega final (15 de noviembre), así que puede haber quedado desactualizado respecto de la app entregada: si hay diferencias entre lo que muestra el video y lo que dice este documento, vale lo de este documento y la app entregada.

## Resumen

| # | Requisito | Estado | Paquetes / lugar principal |
|---|---|---|---|
| 1 | Pantallas y navegación | Cumple | `expo-router` |
| 2 | Autenticación | Cumple | `expo-secure-store`, `expo-local-authentication` |
| 3 | Consumo de la API | Cumple | `src/servicios/`, `fetch` solo en `api.ts` |
| 4 | Cámara y sistema de archivos | Cumple | `expo-camera`, `expo-file-system` (`File`, `Directory`, `Paths`) |
| 5 | Ubicación y mapas | Cumple | `expo-location`, `react-native-maps` |
| 6 | Notificaciones locales | Cumple | `expo-notifications` |
| 7 | Persistencia y conectividad | Cumple | `expo-sqlite`, `expo-sqlite/kv-store`, `expo-network` |
| 8 | Sensores o háptica | Cumple | `expo-haptics` |
| 9 | Multimedia | Cumple | `expo-video` |
| 10 | Identidad de la aplicación | Cumple | `app.json`, `assets/images/` |

---

## 1. Pantallas y navegación

**Qué pide:** las pantallas que haga falta para cubrir lo que pide el PRD, conectadas con Expo Router.

**Cómo se cumple.** Todo el enrutado es Expo Router por archivos, bajo `src/app/`. Hay tres grupos de rutas, más las pantallas sueltas:

| Zona | Ruta | Archivo | Qué cubre del PRD |
|---|---|---|---|
| Público | `/(tabs)/espacios` | `src/app/(tabs)/espacios.tsx` | Listado de los 11 espacios, filtros por espacio y complejo, favoritos |
| Público | `/espacio/[id]` | `src/app/espacio/[id].tsx` | Ficha: fotos, características, precio, reglas, video, mapa |
| Público | `/(tabs)/turnos` | `src/app/(tabs)/turnos.tsx` | Grilla de turnos de 8 a 24 h, 7 días, reservar |
| Público | `/mapa` | `src/app/mapa.tsx` | Complejos en el mapa y «cómo llegar» |
| Jugador | `/(tabs)/reservas` | `src/app/(tabs)/reservas.tsx` | Mis reservas (vienen / pasaron), QR, cancelar, avisos |
| Cuenta | `/ingresar`, `/registrarse` | `src/app/ingresar.tsx`, `src/app/registrarse.tsx` | Ingreso y alta |
| Gestión | `/(gestion)/agenda` | `src/app/(gestion)/agenda.tsx` | Agenda del día de todos los espacios |
| Gestión | `/(gestion)/escanear` | `src/app/(gestion)/escanear.tsx` | Escaneo del QR, presentes y ausentes |
| Gestión | `/(gestion)/bloqueos` | `src/app/(gestion)/bloqueos.tsx` | Bloqueos por mantenimiento o lluvia, con motivo |
| Gestión | `/(gestion)/fijas` | `src/app/(gestion)/fijas.tsx` | Reservas fijas |
| Gestión | `/(gestion)/precios` | `src/app/(gestion)/precios.tsx` | Precio por hora |

Cómo está armada la navegación:

- `src/app/_layout.tsx` define el `Stack` raíz con los tres grupos y las pantallas sueltas, y monta los proveedores (SQLite, tema, sesión).
- `src/app/(tabs)/_layout.tsx` es un `Tabs` con Espacios, Turnos y Reservas.
- `src/app/(gestion)/_layout.tsx` es otro `Tabs` (Agenda, QR, Bloqueos, Fijas, Precios) **protegido por rol**: si no hay sesión o el rol es `jugador`, redirige a Espacios con `<Redirect>`.
- Parámetros de ruta con `useLocalSearchParams` (`id` en la ficha, `destino` en el ingreso) y navegación con `router.push`, `navigate`, `replace` y `dismissTo`.
- Se puede mirar la disponibilidad **sin cuenta**; la cuenta se pide recién al tocar «Reservar», como pide el PRD.

---

## 2. Autenticación

**Qué pide:** registro e ingreso, con sesión que sobrevive al cierre de la app. El token va en `expo-secure-store`. El reingreso se resuelve con `expo-local-authentication` (huella o rostro), con alternativa para el dispositivo que no la tenga.

**Registro e ingreso.** Dos pantallas con formularios validados con `react-hook-form` + `zod` (correo válido, clave mínima, mensajes de error del servidor como «email en uso»): `ingresar.tsx` y `registrarse.tsx`. Llaman a `POST /auth/ingreso` y `POST /auth/registro` a través de `src/servicios/sesion.ts`. Si el usuario es encargado o administrador, el ingreso lo lleva directo al panel de gestión.

**Token en `expo-secure-store`.** Al ingresar o registrarse, la respuesta `{ token, usuario }` se guarda con `SecureStore.setItemAsync` bajo la clave `sportgo.sesion` (`sesion.ts`, función `guardarSesion`). Cerrar sesión hace `deleteItemAsync`. El token **nunca** pasa por kv-store, como exige el PRD.

**La sesión sobrevive al cierre de la app.** Al arrancar, `src/contexto/sesion.tsx` llama a `obtenerSesion()`, que lee el SecureStore, y restaura la sesión sin pedir credenciales de nuevo. Cada pedido a la API toma el token de ahí y lo manda en `Authorization: Bearer <token>` (`src/servicios/api.ts`, función `llamar`).

**Reingreso con huella o rostro.** Si se restaura una sesión guardada, queda **bloqueada** hasta pasar la identidad:

- `src/components/PuertaBiometrica.tsx` tapa toda la app y llama a `confirmarIdentidad()`, que usa `LocalAuthentication.authenticateAsync` (`src/servicios/biometria.ts`).
- Vuelve a pedirla cada vez que la app regresa de segundo plano (con 3 s de gracia para no pedirla dos veces por el vaivén del diálogo del sistema).
- El texto se adapta al aparato: «Face ID», «Touch ID», «huella», «rostro» (`nombreMetodoBiometrico` en `biometria.ts` y el hook `src/hooks/useMetodoBiometrico.ts`).
- Si falla o se cancela, quedan «Reintentar» y «Salir de la cuenta».

**Alternativa para el dispositivo sin huella ni rostro:**

1. El diálogo del sistema ofrece la **clave, PIN o patrón del teléfono** como reemplazo de la biometría (`fallbackLabel: 'Usar clave del teléfono'`).
2. Si el teléfono no tiene ni sensor ni clave de pantalla (`SecurityLevel.NONE`), `confirmarIdentidad` devuelve `no_disponible` y la app **no bloquea**: no hay nada que verificar y el usuario no queda afuera.
3. En el escáner del encargado, además, hay un **código de encargado** (campo numérico) como alternativa a la huella (`src/app/(gestion)/escanear.tsx`).

Permisos declarados en `app.json`: `USE_BIOMETRIC`, `USE_FINGERPRINT` y el texto de `faceIDPermission` para iOS.

---

## 3. Consumo de la API

**Qué pide:** consumir la API provista por la cátedra detrás de una capa de servicios propia. Los estados de carga, vacío y error tienen que verse en pantalla.

**Capa de servicios.** Ninguna pantalla hace `fetch`. Todo pasa por `src/servicios/`:

| Servicio | Responsabilidad |
|---|---|
| `api.ts` | **Único lugar con `fetch`.** Agrega el `Bearer`, aplica un corte de 25 s y normaliza cualquier falla de red a `SIN_RED` |
| `respuesta.ts` | Constructores `ok()` / `fallo()` de la forma `{ datos, meta }` / `{ error: { codigo, mensaje } }` |
| `sesion.ts` | Ingreso, registro, salida |
| `espacios.ts` | Deportes y espacios |
| `reservas.ts` | Grilla, reservar, cancelar, mis reservas, avisos |
| `gestion.ts` | Agenda, validar ingreso, bloqueos, fijas, precios |
| `favoritos.ts` | Favoritos sincronizados con la cuenta |

Los tipos del PRD (`Espacio`, `Turno`, `Reserva`, `ReservaFija`, `Usuario`…) están una sola vez en `src/tipos/`. La forma de respuesta es la que fija el PRD, y los errores del servidor (`TURNO_OCUPADO`, `QR_OTRO_DIA`…) llegan a pantalla con su mensaje.

**Servidor.** Se consume una API con exactamente el contrato del PRD (carpeta `api/`, Hono + Postgres) desplegada en Render. La URL sale de `EXPO_PUBLIC_API_URL` y cae por defecto al servidor desplegado. Endpoints usados: `/auth/*`, `/deportes`, `/espacios`, `/espacios/:id/grilla`, `/reservas`, `/reservas/:id/cancelar`, `/avisos` y `/gestion/*`.

**Estados de carga, vacío y error visibles.** Cada pantalla que lee datos tiene los tres:

| Pantalla | Carga | Vacío | Error |
|---|---|---|---|
| Espacios (`espacios.tsx`) | «Cargando espacios…» con indicador (l. 130) | «Ningún espacio con ese filtro.» (l. 217) | Mensaje + botón **Reintentar** (l. 139) |
| Ficha (`espacio/[id].tsx`) | Indicador (l. 79) | «Sin fotos» (l. 118) | Mensaje + **Volver** (l. 87) |
| Turnos (`turnos.tsx`) | Indicador (l. 129) | «Nada libre este día» / día «Suspendido» con el motivo | Mensaje + **Reintentar** (l. 137) |
| Reservas (`reservas.tsx`) | Indicador (l. 93) | «No hay turnos a la vista» (l. 153) | Mensaje + **Reintentar** (l. 101) |
| Mapa (`mapa.tsx`) | «Cargando mapa…» (l. 46) | «No hay complejos para mostrar.» (l. 70) | Mensaje de error (l. 55) |
| Agenda (`agenda.tsx`) | Indicador (l. 79) | Cada espacio sin turnos ocupados queda solo con su nombre | Mensaje de error (l. 80) |
| Bloqueos (`bloqueos.tsx`) | — | «No hay bloqueos cargados.» | Aviso con el mensaje del servidor |

Cómo se ve cada estado en el teléfono: **carga** = abrir la pestaña con la API dormida en Render; **error** = modo avión con la app recién instalada (sin caché); **vacío** = un filtro que no coincide, o una cuenta nueva en Reservas.

---

## 4. Cámara y sistema de archivos

**Qué pide:** `expo-camera` (foto y lectura de QR cuando el PRD lo pida) o `expo-image-picker`, y guardado y lectura en el dispositivo con la API nueva de `expo-file-system` (`File`, `Directory`, `Paths`).

### Cámara: lectura de QR con `expo-camera`

El PRD pide que el encargado escanee el QR de la reserva en la puerta. Está en `src/app/(gestion)/escanear.tsx` con el visor `src/components/VisorQr.tsx`:

- `CameraView` con `barcodeScannerSettings={{ barcodeTypes: ['qr'] }}` y `onBarcodeScanned`.
- Visor con marco, línea animada, linterna y estado «Validando…» mientras se consulta al servidor. La animación respeta «reducir movimiento».
- Permiso con `useCameraPermissions`: si se niega, la pantalla lo explica y ofrece **Permitir cámara** o **Abrir ajustes** (si está bloqueado), y además queda **«Sin cámara, a mano»**: se puede escribir el código de la reserva.
- Resultado claro (`src/components/ResultadoEscaneo.tsx`): «Puede pasar» con cancha, personas, **hora de ingreso** y código; o el motivo exacto de rechazo — «No es de hoy», «Otra cancha», «Ya ingresó», «Reserva cancelada», «Código inválido».
- El lado del jugador **dibuja** el QR de su reserva en pantalla (`src/components/QrMuestra.tsx`, matriz generada con `src/dominio/qr.ts`), así que se ve sin conexión. El test `qr.test.ts` decodifica el QR generado con `jsqr` para comprobar que es legible.

### Sistema de archivos: `File`, `Directory`, `Paths`

`src/persistencia/medios.ts` usa la API nueva (no la vieja que tira error en ejecución):

- `new Directory(Paths.document, 'espacios')` y `'videos'`, creadas con `create({ idempotent: true })`.
- `File.downloadFileAsync(url, dir)` baja las fotos y el video de cada espacio al teléfono.
- `new File(dir, nombre).exists` evita bajar dos veces lo ya guardado (lectura del estado del disco).
- La ruta local de cada archivo se anota en SQLite (`fotos_espacio`, `videos_espacio`).
- `src/servicios/medios.ts` devuelve la ruta local si existe y la URL remota si no: la galería y el recorrido en video se ven **sin datos**, que es lo que pide el PRD («guardar el video y las fotos de cada cancha para verlos sin datos»).
- La descarga corre en segundo plano al listar los espacios: la pantalla no espera.

---

## 5. Ubicación y mapas

**Qué pide:** `expo-location` junto con `react-native-maps`. Si el usuario niega el permiso, la app tiene que seguir siendo usable.

**Mapas.** `src/components/MapaComplejo.tsx` usa `MapView` y un `Marker` por complejo (Polideportivo Municipal y Parque Berduc), con zoom ajustado a los marcadores (`fitToCoordinates`), y sigue el modo oscuro/claro. Se muestra en la pantalla `mapa.tsx` (acceso desde el ícono de mapa en Espacios) y dentro de cada ficha, centrado en el complejo del espacio. Para web hay una versión alternativa, `MapaComplejo.web.tsx`.

**Ubicación.** `src/servicios/ubicacion.ts`:

- `requestForegroundPermissionsAsync` + `getCurrentPositionAsync` solo cuando el usuario toca «Usar mi ubicación»; en el resto de los casos se lee con `getForegroundPermissionsAsync` y **no se abre ningún diálogo por sorpresa**.
- Con el permiso concedido se muestra el punto del usuario y se marca el **complejo más cercano** (cálculo en `src/dominio/distancia.ts`, con tests). En el listado de espacios aparece la etiqueta «Más cerca».
- **Cómo llegar:** `abrirComoLlegar` abre la app de mapas del teléfono (`geo:` en Android, `maps:` en iOS), con respaldo a Google Maps por URL.

**Si el usuario niega el permiso, la app sigue siendo usable.** El permiso es siempre opcional: todas las funciones de ubicación devuelven `denegada` o `null` en vez de lanzar, el mapa se ve igual con los marcadores, el listado y las reservas no dependen de la ubicación, y la pantalla lo aclara («Sin ubicación no se marca el complejo más cercano. El mapa se ve igual.»). El mensaje del permiso en `app.json` dice lo mismo: *«Si la denegás, el resto de la app sigue igual»*.

---

## 6. Notificaciones locales

**Qué pide:** `expo-notifications`, disparadas por un hecho real de la aplicación, no por un botón de prueba.

La app **no tiene ningún botón de prueba**. Las tres notificaciones del PRD salen de hechos reales (`src/servicios/notificaciones.ts`):

| Notificación | Hecho que la dispara | Cómo |
|---|---|---|
| **Recordatorio 2 h antes** | El jugador **crea una reserva** (`crearReserva` en `src/servicios/reservas.ts`) | `programarRecordatorio` agenda una notificación con trigger `DATE` a 2 h del inicio del turno (`src/dominio/recordatorio.ts`, con tests). Se cancela al cancelar la reserva y se reprograma al abrir la app |
| **Turno suspendido** | La gestión **bloquea un turno o día** por lluvia o mantenimiento y el servidor deja un aviso para quien tenía reserva | Al abrir la app o volver a primer plano, `OyenteNotificaciones` (`src/components/OyenteNotificaciones.tsx`) trae los avisos y `notificarAvisosNuevos` lanza una notificación local por cada uno nuevo, una sola vez. También cancela el recordatorio de esa reserva |
| **Turno libre en un favorito** | Un turno de un espacio marcado como favorito **pasa de ocupado a libre** | Al refrescar la grilla, `avisarLiberados` compara con la copia anterior y `emitirEventoDisponibilidad` notifica (solo si el espacio es favorito) |

Además:

- Canales de Android (`recordatorios` con importancia alta, `avisos`) y permiso pedido en el momento en que hace falta, sin bloquear el flujo si se niega.
- El jugador puede activar o desactivar recordatorios y avisos de favoritos desde `src/components/PreferenciasAvisos.tsx` (guardado en kv-store); si el permiso del sistema está denegado, ofrece abrir los ajustes.
- Tocar una notificación **abre la pantalla correcta** (reservas, o la grilla del espacio favorito) con `addNotificationResponseReceivedListener`.

---

## 7. Persistencia y conectividad

**Qué pide:** `expo-sqlite` para los datos y `expo-sqlite/kv-store` para preferencias y sesión. La app tiene que abrir y mostrar algo sin conexión, y avisar el estado de la red con `expo-network`.

### `expo-sqlite`: los datos

Base `sportgo.db`, abierta con `SQLiteProvider` en el layout raíz y migrada con `PRAGMA user_version` (`src/persistencia/esquema.ts`). Cuatro tablas:

| Tabla | Para qué |
|---|---|
| `reservas` | **Mis reservas con su `codigoQr`**: se renuevan con cada respuesta del servidor y se leen de acá sin conexión |
| `cache` | Última respuesta buena de cada lectura (`espacios`, `deportes`, `grilla:<espacio>:<fecha>`, `avisos:<usuario>`) |
| `fotos_espacio` | Ruta local de cada foto descargada |
| `videos_espacio` | Ruta local del video descargado |

### `expo-sqlite/kv-store`: preferencias

Usado en `src/servicios/favoritos.ts` (espacios favoritos) y `src/servicios/notificaciones.ts` (preferencias de avisos y avisos ya vistos). Responde al instante y funciona sin conexión.

> **Nota sobre «y sesión».** La sesión se maneja así: el **token** vive en `expo-secure-store` (lo exige el PRD: «nunca en kv-store»), y el **estado de la sesión** (usuario, rol, bloqueo biométrico) vive en el contexto de React, restaurado desde el SecureStore al arrancar. Lo que sí está en kv-store es lo que depende de la cuenta pero no es secreto: los favoritos, que se sincronizan con el servidor al ingresar.

### Abrir y mostrar algo sin conexión

`src/persistencia/cache.ts`, función `conCache`: pide a la API; si anduvo, guarda la respuesta; si **no hubo red** (`SIN_RED`), devuelve la última guardada. Un error real del servidor (404, 409…) **no** se tapa con la caché. Resultado sin conexión:

- Espacios, fichas, deportes y la última grilla vista de cada día se muestran desde SQLite.
- **Mis reservas y su QR** se muestran siempre desde SQLite en caso de fallo de red (`listarReservas`), que es el caso de uso central del PRD: el QR en la puerta de la cancha, sin señal.
- Fotos y video ya descargados se ven desde el disco.

Límite honesto: una instalación nueva que se abre por primera vez sin conexión no tiene nada guardado todavía, y ahí se ve el estado de error con «Reintentar».

### Estado de la red con `expo-network`

`src/components/BannerSinConexion.tsx` usa `useNetworkState` y, cuando `isConnected` o `isInternetReachable` es `false`, muestra un banner fijo arriba, anunciado a lectores de pantalla (`accessibilityRole="alert"`): *«Sin conexión. Tus reservas y el QR siguen disponibles.»* No parpadea al arrancar mientras el estado es desconocido.

---

## 8. Sensores o háptica

**Qué pide:** al menos un uso justificado de `expo-sensors` o `expo-haptics`, que aporte algo a la experiencia.

Se usa **`expo-haptics`**, con el uso que pide el PRD: *«vibración distinta al validar un ingreso correcto y uno inválido»*. Eso importa porque el encargado trabaja de noche, a la intemperie y con el teléfono en la mano: la vibración confirma el resultado sin tener que mirar la pantalla.

| Momento | Háptica | Archivo |
|---|---|---|
| QR válido: «Puede pasar» | `notificationAsync(Success)` | `escanear.tsx`, l. 127 |
| QR inválido (otro día, otra cancha, ya ingresó, cancelado…) | `notificationAsync(Error)` | `escanear.tsx`, l. 118 |
| Código de encargado correcto / incorrecto | `Success` / `Error` | `escanear.tsx`, l. 101 y 105 |
| Encender o apagar la linterna | `selectionAsync()` | `VisorQr.tsx`, l. 62 |
| Precio por hora guardado | `Success` | `precios.tsx`, l. 53 |

---

## 9. Multimedia

**Qué pide:** cuando el PRD pida audio o video, resolverlo con `expo-audio` o `expo-video`, con controles de reproducción a la vista.

El PRD pide **video** (el recorrido de 20 a 30 s de cada cancha) y **no pide audio**, así que se usa `expo-video` y no hace falta `expo-audio`.

- `src/components/RecorridoVideo.tsx`: `useVideoPlayer` + `VideoView` con **`nativeControls`** (play, pausa, barra de progreso y pantalla completa a la vista del sistema).
- Antes de reproducir se ve una portada con el botón **Ver Recorrido**; al tocarlo, el reproductor arranca.
- Está dentro de la galería de la ficha del espacio, a continuación de las fotos (`espacio/[id].tsx`).
- El video sale de `videoDeEspacio` (`src/servicios/medios.ts`): si ya se descargó al teléfono usa el archivo local, y si no, la URL remota. Se puede ver sin datos.
- Un espacio **sin video** (caso que el PRD pide contemplar) no muestra el reproductor, y el listado lo indica con la etiqueta «Sin recorrido».

---

## 10. Identidad de la aplicación

**Qué pide:** ícono y pantalla de presentación propios, y nombre del producto. El ícono va en PNG cuadrado de 1024×1024, sin transparencias.

**Nombre.** `SportGo` (campo `name` de `app.json`), con `slug: sportgo` y paquete `com.villaguay.sportgo` en Android e iOS.

**Ícono.** `assets/images/icono.png`, referenciado en `expo.icon` y en `ios.icon`. Verificado con el archivo real:

| Archivo | Formato | Tamaño | Canal alfa |
|---|---|---|---|
| `icono.png` | PNG | **1024 × 1024** (cuadrado) | Todos los píxeles opacos (alfa mínimo = 255): **sin transparencias** |

En Android hay además ícono adaptativo (`android-icon-foreground.png`, 1024×1024, con fondo sólido `#f6f3ea`).

**Pantalla de presentación.** Son dos capas:

1. **Splash nativo** configurado con el plugin `expo-splash-screen` en `app.json`: imagen propia `splash-icon.png`, fondo `#f6f3ea` y variante para modo oscuro (`splash-icon-dark.png`, fondo `#101410`).
2. **Intro animada propia** (`src/components/SplashInicio.tsx`, con `react-native-reanimated`): se trazan las líneas de la cancha, cae la pelota y aparecen el nombre «SportGo» y la bajada «Canchas y turnos». Dura menos de 3 s y respeta «reducir movimiento».

---

## Además del mínimo

Cosas que el PRD pide y que están resueltas:

- **Reservas fijas** cruzadas con reservas y bloqueos en la grilla (la «parte difícil» del PRD), resueltas en el servidor y cubiertas con tests de dominio (`grilla.test.ts`).
- **Reglas del negocio**: máximo 3 reservas activas (el servidor responde `TOPE`), cancelación sola hasta 4 h antes (después responde `CANCELACION_TARDIA` y pide avisar a la Dirección) y turnos pasados no reservables. Cubierto por tests en `grilla.test.ts`.
- **Modo oscuro** automático según el sistema, textos con contraste para uso nocturno y roles (`jugador`, `encargado`, `administrador`).
- **Tests**: 5 suites y 30 tests de la lógica de dominio (`pnpm test`).
- **Build instalable**: perfiles `development`, `preview` (APK) y `production` en `eas.json`.

## Decisiones sobre paquetes que no están

| Paquete | Por qué no está |
|---|---|
| `expo-image-picker` | El requisito admite `expo-camera` **o** `expo-image-picker`, y el PRD pide la cámara para leer el QR. La función «subir fotos del estado de una cancha» aparece en la tabla de capacidades del PRD pero no en la lista de lo que la app debe hacer |
| `expo-sensors` | El requisito admite `expo-sensors` **o** `expo-haptics`; la vibración de ingreso válido/inválido se resuelve con `expo-haptics` |
| `expo-audio` | El PRD no pide audio |
