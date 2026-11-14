import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonSesion } from '@/components/BotonSesion';
import { Calendario } from '@/components/Calendario';
import { Selector } from '@/components/Selector';
import { useSesion } from '@/contexto/sesion';
import { useTema } from '@/contexto/tema';
import { fechaISO, tituloDia } from '@/dominio/fechas';
import { HORAS } from '@/dominio/grilla';
import { listarEspacios } from '@/servicios/espacios';
import {
  bloquearDia,
  bloquearTurnos,
  desbloquearDia,
  desbloquearTurno,
  listarBloqueos,
  type BloqueoVigente,
} from '@/servicios/gestion';
import { esError, type Espacio } from '@/tipos';

export default function BloqueosScreen() {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { sesion } = useSesion();
  const hoy = fechaISO();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioId, setEspacioId] = useState('esp-02');
  const [fecha, setFecha] = useState(hoy);
  const [inicios, setInicios] = useState<string[]>([]);
  const [diaEntero, setDiaEntero] = useState(true);
  const [motivo, setMotivo] = useState('');
  const [vigentes, setVigentes] = useState<BloqueoVigente[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const [r, e] = await Promise.all([listarBloqueos(db), listarEspacios(db)]);
    if (!esError(r)) setVigentes(r.datos);
    if (!esError(e)) setEspacios(e.datos);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const estilos = crear(paleta);
  const rol = sesion?.usuario.rol ?? 'jugador';
  const opcionesEspacio = espacios.map((e) => ({ valor: e.id, etiqueta: e.nombre }));
  const nombreEspacio = (id: string) => espacios.find((e) => e.id === id)?.nombre ?? id;

  async function onBloquear() {
    const error = diaEntero
      ? await bloquearDia(db, { espacioId, fecha, motivo, rol }).then((r) => (esError(r) ? r.error.mensaje : null))
      : await bloquearTurnos(db, { espacioId, fecha, inicios, motivo, rol }).then((r) =>
          esError(r) ? r.error.mensaje : null,
        );
    setAviso(error ?? 'Bloqueo guardado. Si había reservas, se avisó.');
    if (!error) {
      setMotivo('');
      setInicios([]);
      void cargar();
    }
  }

  async function onQuitar(b: BloqueoVigente) {
    if (b.tipo === 'dia') await desbloquearDia(db, b.espacioId, b.fecha, rol);
    else await desbloquearTurno(db, b.espacioId, b.fecha, b.inicio ?? '', rol);
    void cargar();
  }

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }}>
      <View style={[estilos.cabeza, { paddingHorizontal: 16 }]}>
        <Text style={estilos.titulo}>Bloqueos</Text>
        <BotonSesion />
      </View>

      <Selector etiqueta="Espacio" valor={espacioId} opciones={opcionesEspacio} onElegir={setEspacioId} />

      <View style={estilos.modo}>
        <Pressable onPress={() => setDiaEntero(true)} style={[estilos.chip, diaEntero && estilos.chipOn]}>
          <Text style={{ color: diaEntero ? paleta.fondo : paleta.texto, fontFamily: 'Manrope_700Bold' }}>Día entero</Text>
        </Pressable>
        <Pressable onPress={() => setDiaEntero(false)} style={[estilos.chip, !diaEntero && estilos.chipOn]}>
          <Text style={{ color: !diaEntero ? paleta.fondo : paleta.texto, fontFamily: 'Manrope_700Bold' }}>Uno o varios turnos</Text>
        </Pressable>
      </View>

      <Text style={estilos.etiqueta}>{diaEntero ? 'Día a bloquear' : 'Día del turno'}</Text>
      <Calendario valor={fecha} onElegir={setFecha} minimo={hoy} />

      {!diaEntero ? (
        <>
          <Text style={estilos.etiqueta}>
            Turnos a bloquear ({inicios.length} elegido{inicios.length === 1 ? '' : 's'})
          </Text>
          <View style={estilos.horas}>
            {HORAS.map((h) => {
              const on = inicios.includes(h.inicio);
              return (
                <Pressable
                  key={h.inicio}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() =>
                    setInicios((prev) => (on ? prev.filter((x) => x !== h.inicio) : [...prev, h.inicio]))
                  }
                  style={[estilos.hora, on && estilos.chipOn]}>
                  <Text style={{ color: on ? paleta.fondo : paleta.texto, fontFamily: 'Manrope_600SemiBold' }}>
                    {h.inicio}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <TextInput
        value={motivo}
        onChangeText={setMotivo}
        placeholder="Motivo (lluvia, pintura, torneo…)"
        placeholderTextColor={paleta.secundario}
        style={estilos.input}
      />
      <Pressable onPress={() => void onBloquear()} style={[estilos.cta, { marginHorizontal: 16 }]}>
        <Text style={estilos.ctaTexto}>Bloquear</Text>
      </Pressable>
      {aviso ? <Text style={estilos.muted}>{aviso}</Text> : null}

      <Text style={[estilos.seccion, { marginTop: 24 }]}>Vigentes</Text>
      {vigentes.length === 0 ? <Text style={estilos.muted}>No hay bloqueos cargados.</Text> : null}
      {vigentes.map((b) => (
        <View key={`${b.tipo}-${b.espacioId}-${b.fecha}-${b.inicio ?? ''}`} style={estilos.fila}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.item}>{nombreEspacio(b.espacioId)}</Text>
            <Text style={estilos.detalle}>
              {tituloDia(b.fecha)} · {b.inicio ? `${b.inicio} hs` : 'día entero'}
            </Text>
            <Text style={estilos.detalle}>{b.motivo}</Text>
          </View>
          <Pressable onPress={() => void onQuitar(b)} style={estilos.quitar}>
            <Text style={{ color: paleta.texto, fontFamily: 'Manrope_700Bold' }}>Quitar</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

function crear(paleta: ReturnType<typeof useTema>['paleta']) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: paleta.fondo },
    cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
    titulo: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 42, color: paleta.texto, flex: 1 },
    muted: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 13, paddingHorizontal: 16, marginTop: 8 },
    etiqueta: {
      fontFamily: 'Manrope_600SemiBold',
      color: paleta.secundario,
      fontSize: 13,
      paddingHorizontal: 16,
      marginTop: 12,
    },
    modo: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 16 },
    chip: {
      minHeight: 44,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: paleta.linea,
      paddingHorizontal: 14,
      justifyContent: 'center',
    },
    chipOn: { backgroundColor: paleta.texto, borderColor: paleta.texto },
    horas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginTop: 8 },
    hora: {
      minHeight: 44,
      minWidth: 72,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: paleta.linea,
      alignItems: 'center',
      justifyContent: 'center',
    },
    input: {
      margin: 16,
      minHeight: 48,
      borderWidth: 1,
      borderColor: paleta.linea,
      borderRadius: 12,
      paddingHorizontal: 12,
      color: paleta.texto,
      fontFamily: 'Manrope_400Regular',
      backgroundColor: paleta.superficie,
    },
    cta: { minHeight: 48, borderRadius: 14, backgroundColor: paleta.cta, alignItems: 'center', justifyContent: 'center' },
    ctaTexto: { color: paleta.ctaTexto, fontFamily: 'Manrope_700Bold' },
    seccion: { fontFamily: 'Manrope_700Bold', color: paleta.texto, fontSize: 18, paddingHorizontal: 16 },
    fila: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: paleta.linea,
      marginTop: 8,
    },
    item: { color: paleta.texto, fontFamily: 'Manrope_700Bold' },
    detalle: { color: paleta.secundario, fontFamily: 'Manrope_400Regular', fontSize: 13 },
    quitar: { minHeight: 44, justifyContent: 'center' },
  });
}
