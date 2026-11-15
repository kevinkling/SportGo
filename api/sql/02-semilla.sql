-- Datos fijos del municipio: los seis deportes, los once espacios y las reservas
-- fijas que ya existían en la libreta. Se puede correr muchas veces: cada insert
-- actualiza la fila si ya estaba.
--
-- Las fotos y el video quedan vacíos a propósito. Los carga `pnpm subir-medios`,
-- que sube los archivos a Supabase Storage y escribe acá las URL públicas.

insert into deportes (id, nombre, icono, color) values
  ('dep-futbol5',  'Fútbol 5',  'football-outline',   '#1f7a3e'),
  ('dep-futbol11', 'Fútbol 11', 'football-outline',   '#2d5a32'),
  ('dep-basquet',  'Básquet',   'basketball-outline', '#a86832'),
  ('dep-voley',    'Vóley',     'tennisball-outline', '#c9842a'),
  ('dep-tenis',    'Tenis',     'tennisball-outline', '#3e6b45'),
  ('dep-gimnasio', 'Gimnasio',  'barbell-outline',    '#31404d')
on conflict (id) do update set
  nombre = excluded.nombre,
  icono  = excluded.icono,
  color  = excluded.color;

insert into espacios (
  id, nombre, "deporteId", complejo, superficie, techado, iluminacion,
  capacidad, "precioPorHora", latitud, longitud, reglas, activo
) values
  ('esp-01', 'Cancha 1 — Fútbol 5',    'dep-futbol5',  'Polideportivo Municipal', 'césped sintético',   false, true,  10, 12000, -31.8642, -59.0281, 'No se permite calzado con tapones de aluminio.', true),
  ('esp-02', 'Cancha 2 — Fútbol 5',    'dep-futbol5',  'Polideportivo Municipal', 'césped sintético',   false, true,  10, 12000, -31.8642, -59.0281, 'No se permite calzado con tapones de aluminio.', true),
  ('esp-03', 'Cancha 11 — Fútbol 11',  'dep-futbol11', 'Polideportivo Municipal', 'césped natural',     false, true,  22, 18000, -31.8642, -59.0281, 'No se permite calzado con tapones de aluminio.', true),
  ('esp-04', 'Básquet 1',              'dep-basquet',  'Polideportivo Municipal', 'cemento',            false, true,  10,  8000, -31.8642, -59.0281, 'Se juega con zapatillas, no con botines.',      true),
  ('esp-05', 'Básquet 2',              'dep-basquet',  'Polideportivo Municipal', 'cemento',            false, true,  10,  8000, -31.8642, -59.0281, 'Se juega con zapatillas, no con botines.',      true),
  ('esp-06', 'Básquet 3',              'dep-basquet',  'Polideportivo Municipal', 'parquet',            true,  true,  10,  8000, -31.8642, -59.0281, 'Se juega con zapatillas, no con botines.',      true),
  ('esp-07', 'Vóley 1',                'dep-voley',    'Polideportivo Municipal', 'piso sintético',     false, true,  12,  8000, -31.8642, -59.0281, 'La red queda armada.',                          true),
  ('esp-08', 'Vóley 2',                'dep-voley',    'Polideportivo Municipal', 'piso sintético',     false, true,  12,  8000, -31.8642, -59.0281, 'La red queda armada.',                          true),
  ('esp-09', 'Tenis 1',                'dep-tenis',    'Parque Berduc',           'polvo de ladrillo',  false, true,   4,  6000, -31.8720, -59.0180, 'Traé la raqueta. La red es fija.',              true),
  ('esp-10', 'Tenis 2',                'dep-tenis',    'Parque Berduc',           'polvo de ladrillo',  false, false,  4,  6000, -31.8720, -59.0180, 'Traé la raqueta. Esta cancha no tiene luz.',    true),
  ('esp-11', 'Gimnasio',               'dep-gimnasio', 'Polideportivo Municipal', 'piso de goma',       true,  true,  30, 10000, -31.8642, -59.0281, 'Calzado de piso. Sin botines.',                 true)
on conflict (id) do update set
  nombre          = excluded.nombre,
  "deporteId"     = excluded."deporteId",
  complejo        = excluded.complejo,
  superficie      = excluded.superficie,
  techado         = excluded.techado,
  iluminacion     = excluded.iluminacion,
  capacidad       = excluded.capacidad,
  "precioPorHora" = excluded."precioPorHora",
  latitud         = excluded.latitud,
  longitud        = excluded.longitud,
  reglas          = excluded.reglas,
  activo          = excluded.activo;

-- Las fijas de la cancha 2, una fila por cada hora (la grilla es de una hora).
insert into reservas_fijas (id, "espacioId", titular, dia, inicio, fin, desde, hasta, activa) values
  ('fij-07', 'esp-02', 'Grupo de los martes',       2, '21:00', '22:00', '2026-03-01', null, true),
  ('fij-08', 'esp-02', 'Escuela N.º 12',            2, '08:00', '09:00', '2026-03-01', null, true),
  ('fij-09', 'esp-02', 'Escuela N.º 12',            2, '09:00', '10:00', '2026-03-01', null, true),
  ('fij-10', 'esp-02', 'Club Atlético Villaguay',   2, '18:00', '19:00', '2026-03-01', null, true),
  ('fij-11', 'esp-02', 'Club Atlético Villaguay',   2, '19:00', '20:00', '2026-03-01', null, true)
on conflict (id) do update set
  "espacioId" = excluded."espacioId",
  titular     = excluded.titular,
  dia         = excluded.dia,
  inicio      = excluded.inicio,
  fin         = excluded.fin,
  desde       = excluded.desde,
  hasta       = excluded.hasta,
  activa      = excluded.activa;
