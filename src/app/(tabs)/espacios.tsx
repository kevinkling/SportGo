import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonSesion } from '@/components/BotonSesion';
import { colorDeporte, peso } from '@/constants/tema';
import { useFlujo } from '@/contexto/flujo';
import { useTema } from '@/contexto/tema';
import { listarDeportes, listarEspacios } from '@/servicios/espacios';
import { alternarFavorito, leerFavoritos } from '@/servicios/favoritos';
import { esError, type Deporte, type Espacio } from '@/tipos';

type FiltroAbierto = 'espacio' | 'complejo' | null;

function resumenDe(nombres: string[]): string {
  if (nombres.length === 0) return 'Todos';
  if (nombres.length === 1) return nombres[0];
  return `${nombres[0]} +${nombres.length - 1}`;
}

export default function EspaciosScreen() {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setEspacioId } = useFlujo();
  const [deportes, setDeportes] = useState<Deporte[]>([]);
  const [lista, setLista] = useState<Espacio[]>([]);
  const [carga, setCarga] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [espaciosElegidos, setEspaciosElegidos] = useState<string[]>([]);
  const [complejosElegidos, setComplejosElegidos] = useState<string[]>([]);
  const [filtroAbierto, setFiltroAbierto] = useState<FiltroAbierto>(null);
  const [favoritos, setFavoritos] = useState<string[]>([]);

  const cargar = useCallback(async () => {
    setCarga(true);
    setError(null);
    const [d, e, fav] = await Promise.all([listarDeportes(), listarEspacios(), leerFavoritos()]);
    if (esError(e)) {
      setError(e.error.mensaje);
      setCarga(false);
      return;
    }
    if (esError(d)) {
      setError(d.error.mensaje);
      setCarga(false);
      return;
    }
    setDeportes(d.datos);
    setLista(e.datos);
    setFavoritos(fav);
    setCarga(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const filtrados = useMemo(() => {
    const coinciden = lista.filter((esp) => {
      const claveComplejo = esp.complejo === 'Polideportivo Municipal' ? 'poli' : 'berduc';
      const okEspacio = espaciosElegidos.length === 0 || espaciosElegidos.includes(esp.id);
      const okComplejo = complejosElegidos.length === 0 || complejosElegidos.includes(claveComplejo);
      return okEspacio && okComplejo;
    });
    return coinciden
      .map((esp, indice) => ({ esp, indice, fav: favoritos.includes(esp.id) }))
      .sort((a, b) => Number(b.fav) - Number(a.fav) || a.indice - b.indice)
      .map((item) => item.esp);
  }, [lista, espaciosElegidos, complejosElegidos, favoritos]);

  const hayFiltro = espaciosElegidos.length > 0 || complejosElegidos.length > 0;

  const resumenEspacio = useMemo(() => {
    const nombres = espaciosElegidos
      .map((id) => lista.find((esp) => esp.id === id)?.nombre)
      .filter((nombre): nombre is string => Boolean(nombre));
    return resumenDe(nombres);
  }, [espaciosElegidos, lista]);

  const resumenComplejo = useMemo(
    () => resumenDe(complejosElegidos.map((id) => (id === 'poli' ? 'Polideportivo' : 'Parque Berduc'))),
    [complejosElegidos],
  );

  function alternar(id: string, actuales: string[], asignar: (valor: string[]) => void) {
    asignar(actuales.includes(id) ? actuales.filter((item) => item !== id) : [...actuales, id]);
  }

  function abrirFiltro(cual: Exclude<FiltroAbierto, null>) {
    setFiltroAbierto((actual) => (actual === cual ? null : cual));
  }

  const estilos = crearEstilos(paleta);

  if (carga) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top + 8 }]}>
        <ActivityIndicator color={paleta.texto} />
        <Text style={estilos.muted}>Cargando espacios…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top + 8 }]}>
        <Text style={estilos.titulo}>Espacios</Text>
        <Text style={estilos.muted}>{error}</Text>
        <Pressable onPress={cargar} style={estilos.cta} accessibilityLabel="Reintentar">
          <Text style={estilos.ctaTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top + 8 }]}>
      <View style={estilos.cabeza}>
        <Text style={estilos.titulo}>Espacios</Text>
        <BotonSesion />
      </View>
      <Text style={estilos.bajada}>Mirá sin cuenta. La cuenta hace falta recién para reservar.</Text>
      <View>
        <View style={estilos.filaFiltros}>
          <BotonFiltro
            estilos={estilos}
            etiqueta="Espacio"
            resumen={resumenEspacio}
            abierto={filtroAbierto === 'espacio'}
            activo={espaciosElegidos.length > 0}
            onPress={() => abrirFiltro('espacio')}
          />
          <BotonFiltro
            estilos={estilos}
            etiqueta="Complejo"
            resumen={resumenComplejo}
            abierto={filtroAbierto === 'complejo'}
            activo={complejosElegidos.length > 0}
            onPress={() => abrirFiltro('complejo')}
          />
        </View>
        {filtroAbierto === 'espacio' ? (
          <PanelOpciones
            estilos={estilos}
            paleta={paleta}
            elegidos={espaciosElegidos}
            onTodos={() => setEspaciosElegidos([])}
            onAlternar={(id) => alternar(id, espaciosElegidos, setEspaciosElegidos)}
            opciones={[...lista]
              .map((esp, indice) => ({ esp, indice, fav: favoritos.includes(esp.id) }))
              .sort((a, b) => Number(b.fav) - Number(a.fav) || a.indice - b.indice)
              .map(({ esp }) => ({ id: esp.id, texto: esp.nombre }))}
          />
        ) : null}
        {filtroAbierto === 'complejo' ? (
          <PanelOpciones
            estilos={estilos}
            paleta={paleta}
            elegidos={complejosElegidos}
            onTodos={() => setComplejosElegidos([])}
            onAlternar={(id) => alternar(id, complejosElegidos, setComplejosElegidos)}
            opciones={[
              { id: 'poli', texto: 'Polideportivo' },
              { id: 'berduc', texto: 'Parque Berduc' },
            ]}
          />
        ) : null}
      </View>
      <Text style={estilos.muted}>
        {filtrados.length} {hayFiltro ? 'con este filtro' : 'espacios'}
      </Text>
      <FlatList
        data={filtrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={estilos.muted}>Ningún espacio con ese filtro.</Text>}
        renderItem={({ item }) => {
          const deporte = deportes.find((d) => d.id === item.deporteId);
          const deporteNombre = deporte?.nombre ?? '';
          const fav = favoritos.includes(item.id);
          return (
            <View style={estilos.card}>
              <Pressable
                onPress={async () => {
                  const sig = await alternarFavorito(item.id);
                  setFavoritos(sig);
                }}
                style={estilos.estrella}
                accessibilityLabel={fav ? 'Sacar de favoritos' : 'Marcar como favorito'}>
                <Ionicons name={fav ? 'star' : 'star-outline'} size={20} color={fav ? '#f5c451' : paleta.texto} />
              </Pressable>
              <Pressable
                onPress={() => {
                  setEspacioId(item.id);
                  router.navigate('/(tabs)/turnos');
                }}
                style={{ paddingBottom: 8 }}>
                <View style={[estilos.banner, { backgroundColor: colorDeporte[item.deporteId] ?? '#31404d' }]}>
                  {deporte ? <Ionicons name={deporte.icono} size={40} color="#f3f0e4" /> : null}
                </View>
                <Text style={estilos.nombre}>{item.nombre}</Text>
                <Text style={estilos.muted}>
                  {deporteNombre} · {item.complejo === 'Polideportivo Municipal' ? 'Polideportivo' : 'Parque Berduc'}
                </Text>
                <View style={estilos.pills}>
                  <Pill paleta={paleta} texto={item.superficie} />
                  <Pill paleta={paleta} texto={item.iluminacion ? 'Luz' : 'Sin luz'} />
                  {item.techado ? <Pill paleta={paleta} texto="Cubierta" /> : null}
                  <Pill paleta={paleta} texto={item.videoUrl ? 'Recorrido 30 s' : 'Sin recorrido'} />
                </View>
                <Text style={estilos.precio}>
                  {peso(item.precioPorHora)} <Text style={estilos.muted}>/ hora</Text>
                </Text>
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

function BotonFiltro({
  etiqueta,
  resumen,
  abierto,
  activo,
  onPress,
  estilos,
}: {
  etiqueta: string;
  resumen: string;
  abierto: boolean;
  activo: boolean;
  onPress: () => void;
  estilos: ReturnType<typeof crearEstilos>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[estilos.desplegable, activo && estilos.desplegableActivo]}
      accessibilityRole="button"
      accessibilityState={{ expanded: abierto }}
      accessibilityLabel={`${etiqueta}. ${resumen}`}>
      <View style={estilos.desplegableTexto}>
        <Text style={estilos.etiqueta}>{etiqueta}</Text>
        <Text style={estilos.valor} numberOfLines={1}>
          {resumen}
        </Text>
      </View>
      <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={16} color={estilos.chevron.color} />
    </Pressable>
  );
}

function PanelOpciones({
  estilos,
  paleta,
  opciones,
  elegidos,
  onTodos,
  onAlternar,
}: {
  estilos: ReturnType<typeof crearEstilos>;
  paleta: { texto: string; fondo: string; linea: string };
  opciones: { id: string; texto: string }[];
  elegidos: string[];
  onTodos: () => void;
  onAlternar: (id: string) => void;
}) {
  return (
    <View style={estilos.panel}>
      <ScrollView style={estilos.panelScroll} contentContainerStyle={estilos.panelContenido} nestedScrollEnabled>
        <FilaCheck paleta={paleta} texto="Todos" marcado={elegidos.length === 0} onPress={onTodos} />
        {opciones.map((opcion) => (
          <FilaCheck
            key={opcion.id}
            paleta={paleta}
            texto={opcion.texto}
            marcado={elegidos.includes(opcion.id)}
            onPress={() => onAlternar(opcion.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function FilaCheck({
  texto,
  marcado,
  onPress,
  paleta,
}: {
  texto: string;
  marcado: boolean;
  onPress: () => void;
  paleta: { texto: string; fondo: string; linea: string };
}) {
  return (
    <Pressable
      onPress={onPress}
      style={estilosCheck.fila}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcado }}>
      <View
        style={[
          estilosCheck.caja,
          { borderColor: paleta.linea },
          marcado && { backgroundColor: paleta.texto, borderColor: paleta.texto },
        ]}>
        {marcado ? <Ionicons name="checkmark" size={14} color={paleta.fondo} /> : null}
      </View>
      <Text style={[estilosCheck.texto, { color: paleta.texto }]}>{texto}</Text>
    </Pressable>
  );
}

const estilosCheck = StyleSheet.create({
  fila: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  caja: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { fontFamily: 'Manrope_400Regular', fontSize: 15, flex: 1 },
});

function Pill({ texto, paleta }: { texto: string; paleta: { secundario: string; linea: string } }) {
  return (
    <Text
      style={{
        fontSize: 12,
        paddingVertical: 3,
        paddingHorizontal: 7,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: paleta.linea,
        color: paleta.secundario,
        overflow: 'hidden',
      }}>
      {texto}
    </Text>
  );
}

function crearEstilos(paleta: { fondo: string; texto: string; secundario: string; linea: string; cta: string; ctaTexto: string; superficie: string }) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: paleta.fondo, paddingHorizontal: 16, gap: 8 },
    cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
    titulo: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 42, color: paleta.texto, lineHeight: 44, flex: 1 },
    bajada: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 13 },
    muted: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 13 },
    filaFiltros: { flexDirection: 'row', gap: 8 },
    desplegable: {
      flex: 1,
      minHeight: 52,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: paleta.linea,
      backgroundColor: paleta.superficie,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    desplegableActivo: { borderColor: paleta.texto },
    desplegableTexto: { flex: 1, gap: 1 },
    etiqueta: { fontFamily: 'Manrope_600SemiBold', fontSize: 11, color: paleta.secundario, letterSpacing: 0.4 },
    valor: { fontFamily: 'Manrope_400Regular', fontSize: 15, color: paleta.texto },
    chevron: { fontFamily: 'Manrope_700Bold', fontSize: 14, color: paleta.texto },
    panel: {
      marginTop: 6,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: paleta.linea,
      backgroundColor: paleta.superficie,
      overflow: 'hidden',
    },
    panelScroll: { maxHeight: 280 },
    panelContenido: { paddingHorizontal: 14, paddingBottom: 8 },
    cta: { minHeight: 48, borderRadius: 14, backgroundColor: paleta.cta, alignItems: 'center', justifyContent: 'center' },
    ctaTexto: { color: paleta.ctaTexto, fontFamily: 'Manrope_700Bold' },
    card: { marginBottom: 16, position: 'relative' },
    banner: { height: 96, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    nombre: { fontFamily: 'Manrope_700Bold', fontSize: 18, color: paleta.texto, marginTop: 8 },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    precio: { marginTop: 6, fontFamily: 'Manrope_700Bold', color: paleta.texto, fontSize: 16 },
    estrella: {
      position: 'absolute',
      top: 8,
      right: 8,
      zIndex: 2,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: 'rgba(0,0,0,0.42)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
