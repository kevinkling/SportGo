-- SportGo — esquema de la API (Postgres / Supabase)
--
-- Las columnas se escriben en camelCase y entre comillas a propósito: así una fila
-- de la tabla ya tiene la misma forma que el JSON que pide el PRD y no hace falta
-- traducir nombres en ningún lado.
--
-- Las fechas y horas se guardan como texto en el mismo formato que define el PRD
-- ("AAAA-MM-DD", "HH:MM" e ISO 8601 con zona), para que la lógica de la grilla
-- sea exactamente la misma en el teléfono y en el servidor.

create table if not exists usuarios (
  id                     text primary key,
  nombre                 text not null,
  email                  text not null unique,
  telefono               text not null,
  rol                    text not null default 'jugador'
                           check (rol in ('jugador', 'encargado', 'administrador')),
  "claveHash"            text not null,
  "espaciosFavoritos"    text[] not null default '{}',
  "cancelacionesTardias" integer not null default 0,
  ausencias              integer not null default 0,
  "creadoEn"             timestamptz not null default now()
);

create table if not exists deportes (
  id     text primary key,
  nombre text not null,
  icono  text not null,
  color  text not null
);

create table if not exists espacios (
  id              text primary key,
  nombre          text not null,
  "deporteId"     text not null references deportes (id),
  complejo        text not null,
  superficie      text not null,
  techado         boolean not null default false,
  iluminacion     boolean not null default false,
  capacidad       integer not null,
  "precioPorHora" integer not null,
  latitud         double precision not null,
  longitud        double precision not null,
  imagenes        text[] not null default '{}',
  "videoUrl"      text,
  reglas          text not null default '',
  activo          boolean not null default true
);

create table if not exists reservas (
  id                 text primary key,
  "turnoId"          text not null,
  "espacioId"        text not null references espacios (id),
  "usuarioId"        text not null references usuarios (id),
  "cantidadPersonas" integer not null,
  "codigoQr"         text not null unique,
  estado             text not null
                       check (estado in ('confirmada', 'cancelada', 'cumplida', 'ausente')),
  "ingresoEn"        text,
  "creadaEn"         text not null,
  "cancelableHasta"  text not null
);

-- Esta es la regla que evita el problema del viernes a las 21: dos personas no
-- pueden tener una reserva confirmada sobre el mismo turno. Lo impide la base,
-- no el código, así que no hay carrera posible entre dos teléfonos.
create unique index if not exists reservas_turno_confirmado
  on reservas ("turnoId")
  where estado = 'confirmada';

create index if not exists reservas_usuario on reservas ("usuarioId");
create index if not exists reservas_espacio on reservas ("espacioId");

create table if not exists reservas_fijas (
  id          text primary key,
  "espacioId" text not null references espacios (id),
  titular     text not null,
  dia         smallint not null check (dia between 0 and 6),
  inicio      text not null,
  fin         text not null,
  desde       text not null,
  hasta       text,
  activa      boolean not null default true
);

create index if not exists fijas_espacio_dia on reservas_fijas ("espacioId", dia);

create table if not exists dias_bloqueados (
  "espacioId" text not null references espacios (id),
  fecha       text not null,
  motivo      text not null,
  "creadoEn"  timestamptz not null default now(),
  primary key ("espacioId", fecha)
);

create table if not exists turnos_bloqueados (
  "espacioId" text not null references espacios (id),
  fecha       text not null,
  inicio      text not null,
  motivo      text not null,
  "creadoEn"  timestamptz not null default now(),
  primary key ("espacioId", fecha, inicio)
);

create table if not exists avisos (
  id          text primary key,
  "usuarioId" text not null references usuarios (id),
  "reservaId" text,
  mensaje     text not null,
  "creadoEn"  text not null
);

create index if not exists avisos_usuario on avisos ("usuarioId");

-- Supabase expone el esquema `public` por HTTP (PostgREST) con la clave anon, que
-- viaja en cualquier app. Con RLS activado y sin políticas, esa puerta queda
-- cerrada para todas las tablas. La API no se ve afectada: se conecta con el rol
-- `postgres`, que se saltea RLS. Sin esto, `usuarios` (con "claveHash") sería
-- legible por cualquiera que tenga la URL del proyecto.
alter table usuarios          enable row level security;
alter table deportes          enable row level security;
alter table espacios          enable row level security;
alter table reservas          enable row level security;
alter table reservas_fijas    enable row level security;
alter table dias_bloqueados   enable row level security;
alter table turnos_bloqueados enable row level security;
alter table avisos            enable row level security;

-- Supabase no deja cambiar la clave del rol `postgres` por SQL, y no se le puede dar
-- BYPASSRLS a un rol nuevo. Entonces la API entra con un rol propio, limitado al
-- esquema `public`, y una política por tabla le abre el acceso. Anon y authenticated
-- siguen sin ver nada. La clave se pone a mano: reemplazá CLAVE por la de DATABASE_URL.
--
--   create role sportgo_api login password 'CLAVE';
--   grant usage on schema public to sportgo_api;
--   grant select, insert, update, delete on all tables in schema public to sportgo_api;
--   alter default privileges in schema public grant select, insert, update, delete on tables to sportgo_api;
--   -- y por cada tabla:
--   create policy api_total on <tabla> for all to sportgo_api using (true) with check (true);
