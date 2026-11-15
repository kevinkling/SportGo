import Ionicons from '@react-native-vector-icons/ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonSesion } from '@/components/BotonSesion';
import { peso } from '@/constants/tema';
import { useFlujo } from '@/contexto/flujo';
import { useSesion } from '@/contexto/sesion';
import { useTema } from '@/contexto/tema';
import { fechaISO, nombreCortoDia, numeroDia, proximosSieteDias, tituloDia } from '@/dominio/fechas';
import { faseTurno, turnoReservable, type ResultadoGrilla } from '@/dominio/grilla';
import { leerFavoritos, alternarFavorito } from '@/servicios/favoritos';
import { listarEspacios, obtenerEspacio } from '@/servicios/espacios';
import { crearReserva, obtenerGrilla } from '@/servicios/reservas';
import { esError, type Espacio, type Turno } from '@/tipos';

export default function TurnosScreen() {
  const { paleta, esquema } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const db = useSQLiteContext();
  const { espacioId, setEspacioId } = useFlujo();
  const { sesion } = useSesion();
  const hoy = fechaISO();
  const dias = proximosSieteDias(hoy);
  const [dia, setDia] = useState(hoy);
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [grilla, setGrilla] = useState<ResultadoGrilla | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [personas, setPersonas] = useState(10);
  const [carga, setCarga] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favoritos, setFavoritos] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [todos, setTodos] = useState<Espacio[]>([]);

  useEffect(() => {
    void listarEspacios(db).then((r) => {
      if (!esError(r)) setTodos(r.datos);
    });
  }, [db]);

  const cargar = useCallback(async () => {
    if (!espacioId) {
      setCarga(false);
      return;
    }
    setCarga(true);
    setError(null);
    const [esp, g, fav] = await Promise.all([
      obtenerEspacio(db, espacioId),
      obtenerGrilla(db, espacioId, dia),
      leerFavoritos(),
    ]);
    if (esError(esp)) {
      setError(esp.error.mensaje);
      setCarga(false);
      return;
    }
    if (esError(g)) {
      setError(g.error.mensaje);
      setCarga(false);
      return;
    }
    setEspacio(esp.datos);
    setGrilla(g.datos);
    setFavoritos(fav);
    const ahora = new Date();
    const libre = g.datos.turnos.find((t) => turnoReservable(t, ahora));
    setHora((h) => {
      const sigue = g.datos.turnos.find((t) => t.inicio === h && turnoReservable(t, ahora));
      return sigue?.inicio ?? libre?.inicio ?? null;
    });
    setPersonas((p) => Math.min(Math.max(2, p), esp.datos.capacidad));
    setCarga(false);
  }, [db, dia, espacioId, setPersonas]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const estilos = crear(paleta);

  const selector = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={estilos.chipsScroll}
      contentContainerStyle={estilos.chips}>
      {todos.map((e) => {
        const on = e.id === espacioId;
        return (
          <Pressable
            key={e.id}
            onPress={() => {
              setAviso(null);
              setEspacioId(e.id);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[estilos.chip, on && { backgroundColor: paleta.texto, borderColor: paleta.texto }]}>
            <Text style={{ color: on ? paleta.fondo : paleta.texto, fontFamily: 'Manrope_600SemiBold', fontSize: 13 }}>
              {e.nombre}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  if (!espacioId) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top + 8 }]}>
        <View style={[estilos.cabeza, { paddingHorizontal: 16 }]}>
          <Text style={[estilos.titulo, { paddingHorizontal: 0, flex: 1 }]}>Turnos</Text>
          <BotonSesion />
        </View>
        {selector}
        <Text style={estilos.muted}>Elegí un espacio para ver la grilla.</Text>
      </View>
    );
  }

  if (carga && !espacio) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top + 16 }]}>
        <ActivityIndicator color={paleta.texto} />
      </View>
    );
  }

  if (error || !espacio || !grilla) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top + 8 }]}>
        <Text style={estilos.muted}>{error ?? 'No hay datos.'}</Text>
        <Pressable onPress={cargar} style={estilos.cta}>
          <Text style={estilos.ctaTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const ahora = new Date();
  const cancha = espacio;
  const elegido = grilla.turnos.find((t) => t.inicio === hora);
  const sePuede = elegido ? turnoReservable(elegido, ahora) : false;
  const fav = favoritos.includes(cancha.id);
  const hayLibre = grilla.turnos.some((t) => turnoReservable(t, ahora));

  async function reservar() {
    if (!sesion) {
      router.push({ pathname: '/ingresar', params: { destino: 'reservas' } });
      return;
    }
    if (!elegido || !sePuede) return;
    const r = await crearReserva(db, {
      usuarioId: sesion.usuario.id,
      espacioId: cancha.id,
      fecha: dia,
      inicio: elegido.inicio,
      cantidadPersonas: personas,
    });
    if (esError(r)) {
      setAviso(r.error.mensaje);
      return;
    }
    router.navigate('/(tabs)/reservas');
  }

  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top + 4 }]}>
      <View style={estilos.cabeza}>
        <Pressable onPress={() => router.navigate('/(tabs)/espacios')} style={estilos.icono} accessibilityLabel="Volver a espacios">
          <Ionicons name="chevron-back" size={24} color={paleta.texto} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={estilos.nombre}>{espacio.nombre}</Text>
          <Text style={estilos.muted}>{espacio.complejo}</Text>
        </View>
        <Pressable
          style={estilos.icono}
          onPress={async () => setFavoritos(await alternarFavorito(espacio.id))}
          accessibilityLabel={fav ? 'Sacar de favoritos' : 'Marcar como favorito'}>
          <Ionicons name={fav ? 'star' : 'star-outline'} size={22} color={fav ? '#f5c451' : paleta.texto} />
        </Pressable>
        <BotonSesion />
      </View>
      {selector}

      <View style={estilos.dias}>
        {dias.map((f) => {
          const on = f === dia;
          const lluvia = f === dias[1] && espacio.id === 'esp-02';
          return (
            <Pressable
              key={f}
              onPress={() => setDia(f)}
              style={[estilos.dia, on && { backgroundColor: paleta.texto }, lluvia && { borderBottomWidth: 3, borderBottomColor: paleta.lluvia }]}
              accessibilityLabel={`${nombreCortoDia(f)} ${numeroDia(f)}`}>
              <Text style={[estilos.diaN, on && { color: paleta.fondo }]}>{numeroDia(f)}</Text>
              <Text style={[estilos.diaW, on && { color: paleta.fondo }]}>{nombreCortoDia(f)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={estilos.diaTitulo}>{tituloDia(dia)}</Text>

      {grilla.bloqueado ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={estilos.suspendido}>Suspendido</Text>
          <Text style={estilos.muted}>{grilla.motivo}</Text>
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12, gap: 6 }}>
          {grilla.turnos.map((t) => (
            <FilaTurno
              key={t.id}
              turno={t}
              ahora={ahora}
              elegido={hora === t.inicio}
              paleta={paleta}
              esquema={esquema}
              onPress={() => {
                if (turnoReservable(t, ahora)) setHora(t.inicio);
              }}
            />
          ))}
        </ScrollView>
      )}

      <View style={[estilos.barra, { paddingBottom: 8 }]}>
        {aviso ? <Text style={estilos.muted}>{aviso}</Text> : null}
        {grilla.bloqueado ? (
          <Pressable disabled style={[estilos.cta, estilos.ctaOff]}>
            <Text style={[estilos.ctaTexto, { color: paleta.secundario }]}>Día suspendido</Text>
          </Pressable>
        ) : sePuede && elegido ? (
          <>
            <Text style={{ color: paleta.texto, fontFamily: 'Manrope_700Bold' }}>
              {elegido.inicio}–{elegido.fin} · {peso(espacio.precioPorHora)}
            </Text>
            <Text style={estilos.muted}>Se paga en el lugar</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                  disabled={personas <= 2}
                  onPress={() => setPersonas((p) => p - 1)}
                  style={estilos.step}
                  accessibilityLabel="Menos personas">
                  <Ionicons name="remove" size={22} color={paleta.texto} />
                </Pressable>
                <Text style={{ minWidth: 28, textAlign: 'center', color: paleta.texto, fontFamily: 'Manrope_700Bold' }}>{personas}</Text>
                <Pressable
                  disabled={personas >= espacio.capacidad}
                  onPress={() => setPersonas((p) => p + 1)}
                  style={estilos.step}
                  accessibilityLabel="Más personas">
                  <Ionicons name="add" size={22} color={paleta.texto} />
                </Pressable>
              </View>
              <Pressable onPress={reservar} style={[estilos.cta, { flex: 1 }]}>
                <Text style={estilos.ctaTexto}>Reservar</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Pressable disabled style={[estilos.cta, estilos.ctaOff]}>
            <Text style={[estilos.ctaTexto, { color: paleta.secundario }]}>
              {hayLibre ? 'Elegí un turno libre' : 'Nada libre este día'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function FilaTurno({
  turno,
  ahora,
  elegido,
  paleta,
  esquema,
  onPress,
}: {
  turno: Turno;
  ahora: Date;
  elegido: boolean;
  paleta: ReturnType<typeof useTema>['paleta'];
  esquema: string;
  onPress: () => void;
}) {
  const fase = faseTurno(turno.fecha, turno.inicio, turno.fin, ahora);
  const reservable = turnoReservable(turno, ahora);
  let etiqueta = { libre: 'Libre', reservado: 'Ocupado', fijo: 'Fijo', mantenimiento: 'Mantenimiento' }[turno.estado];
  if (fase === 'curso') etiqueta = 'En curso';
  else if (fase === 'paso' && turno.estado === 'libre') etiqueta = 'Pasó';
  const color =
    reservable
      ? paleta.libreTexto
      : turno.estado === 'reservado'
        ? paleta.ocupado
        : turno.estado === 'fijo'
          ? paleta.fijo
          : turno.estado === 'mantenimiento'
            ? paleta.mantenimiento
            : paleta.paso;
  const fondo = reservable ? paleta.libreFondo : 'transparent';
  const borde =
    turno.estado === 'reservado'
      ? '#a85a48'
      : turno.estado === 'fijo'
        ? esquema === 'oscuro'
          ? '#8fb4d6'
          : '#3d6f99'
        : turno.estado === 'mantenimiento'
          ? paleta.lluvia
          : reservable
            ? paleta.libreFondo
            : '#5c6560';

  return (
    <Pressable
      onPress={onPress}
      disabled={!reservable}
      accessibilityLabel={`${turno.inicio}, ${etiqueta}${turno.motivoBloqueo ? `, ${turno.motivoBloqueo}` : ''}`}
      style={{
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: fondo,
        borderLeftWidth: elegido && reservable ? 8 : 3,
        borderLeftColor: elegido && reservable ? paleta.ctaTexto : borde,
        gap: 12,
      }}>
      <Text
        style={{
          fontFamily: 'BarlowCondensed_600SemiBold',
          fontSize: 30,
          minWidth: 76,
          color: reservable ? paleta.libreTexto : color,
        }}>
        {turno.inicio}
      </Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: reservable ? paleta.libreTexto : color, fontFamily: 'Manrope_600SemiBold' }}>{etiqueta}</Text>
        {turno.motivoBloqueo ? (
          <Text style={{ color: reservable ? paleta.libreTexto : color, fontSize: 12 }}>{turno.motivoBloqueo}</Text>
        ) : null}
      </View>
      {reservable ? (
        <Text style={{ fontFamily: 'Manrope_700Bold', color: paleta.libreTexto }}>{peso(turno.precio)}</Text>
      ) : null}
    </Pressable>
  );
}

function crear(paleta: ReturnType<typeof useTema>['paleta']) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: paleta.fondo },
    titulo: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 42, color: paleta.texto, paddingHorizontal: 16 },
    muted: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 13, paddingHorizontal: 16 },
    cabeza: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, zIndex: 10 },
    chipsScroll: { flexGrow: 0, marginTop: 8 },
    chips: { paddingHorizontal: 12, gap: 8 },
    chip: {
      minHeight: 40,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: paleta.linea,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icono: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    nombre: { fontFamily: 'Manrope_700Bold', fontSize: 20, color: paleta.texto, textAlign: 'center' },
    dias: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: 12 },
    dia: { flex: 1, minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    diaN: { fontSize: 16, fontFamily: 'Manrope_700Bold', color: paleta.secundario },
    diaW: { fontSize: 11, color: paleta.secundario },
    diaTitulo: { marginHorizontal: 16, marginVertical: 8, color: paleta.texto, fontFamily: 'Manrope_400Regular' },
    suspendido: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 56, color: paleta.texto, lineHeight: 56 },
    barra: { borderTopWidth: 1, borderTopColor: paleta.linea, padding: 12, gap: 8, backgroundColor: paleta.fondo },
    cta: { minHeight: 48, borderRadius: 14, backgroundColor: paleta.cta, alignItems: 'center', justifyContent: 'center' },
    ctaOff: { backgroundColor: paleta.linea },
    ctaTexto: { color: paleta.ctaTexto, fontFamily: 'Manrope_700Bold' },
    step: { width: 44, height: 44, borderWidth: 1, borderColor: paleta.linea, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  });
}
