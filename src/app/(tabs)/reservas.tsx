import { useFocusEffect, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonSesion } from '@/components/BotonSesion';
import { PreferenciasAvisos } from '@/components/PreferenciasAvisos';
import { QrMuestra } from '@/components/QrMuestra';
import { peso } from '@/constants/tema';
import { useSesion } from '@/contexto/sesion';
import { useTema } from '@/contexto/tema';
import { esCancelacionTardia, fechaDesdeTurnoId } from '@/dominio/grilla';
import { tituloDia } from '@/dominio/fechas';
import { listarEspacios } from '@/servicios/espacios';
import { cancelarReserva, listarAvisos, listarReservas } from '@/servicios/reservas';
import { esError, type Aviso, type Espacio, type Reserva } from '@/tipos';

export default function ReservasScreen() {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const router = useRouter();
  const { sesion, lista } = useSesion();
  const [tab, setTab] = useState<'vienen' | 'pasaron'>('vienen');
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [carga, setCarga] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    if (!sesion) {
      setCarga(false);
      return;
    }
    setCarga(true);
    const [r, e, a] = await Promise.all([
      listarReservas(db, sesion.usuario.id),
      listarEspacios(db),
      listarAvisos(db, sesion.usuario.id),
    ]);
    if (esError(r)) {
      setError(r.error.mensaje);
      setCarga(false);
      return;
    }
    if (esError(e)) {
      setError(e.error.mensaje);
      setCarga(false);
      return;
    }
    setReservas(r.datos);
    setEspacios(e.datos);
    setAvisos(esError(a) ? [] : a.datos);
    setError(null);
    setCarga(false);
  }, [db, sesion]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const estilos = crear(paleta);

  if (!lista) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top + 16 }]}>
        <ActivityIndicator color={paleta.texto} />
      </View>
    );
  }

  if (!sesion) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top + 16, paddingHorizontal: 16, gap: 12 }]}>
        <View style={estilos.cabeza}>
          <Text style={estilos.titulo}>Reservas</Text>
          <BotonSesion />
        </View>
        <Text style={estilos.muted}>Entrá para ver y cancelar tus turnos.</Text>
        <Pressable onPress={() => router.push('/ingresar')} style={estilos.cta}>
          <Text style={estilos.ctaTexto}>Entrar</Text>
        </Pressable>
      </View>
    );
  }

  if (carga) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top + 16 }]}>
        <ActivityIndicator color={paleta.texto} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top + 16, paddingHorizontal: 16 }]}>
        <Text style={estilos.muted}>{error}</Text>
        <Pressable onPress={cargar} style={estilos.cta}>
          <Text style={estilos.ctaTexto}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  const vienen = reservas.filter((r) => r.estado === 'confirmada');
  const pasaron = reservas.filter((r) => r.estado !== 'confirmada');
  const ahora = new Date();

  async function onCancelar(id: string) {
    const r = await cancelarReserva(db, id, ahora);
    if (!esError(r)) cargar();
  }

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }}>
      <View style={[estilos.cabeza, { paddingHorizontal: 16 }]}>
        <Text style={estilos.titulo}>Reservas</Text>
        <BotonSesion />
      </View>
      <PreferenciasAvisos reservas={vienen} />
      <View style={estilos.seg}>
        <Pressable onPress={() => setTab('vienen')} style={[estilos.segBtn, tab === 'vienen' && estilos.segOn]}>
          <Text style={{ color: tab === 'vienen' ? paleta.fondo : paleta.secundario, fontFamily: 'Manrope_700Bold' }}>Vienen</Text>
        </Pressable>
        <Pressable onPress={() => setTab('pasaron')} style={[estilos.segBtn, tab === 'pasaron' && estilos.segOn]}>
          <Text style={{ color: tab === 'pasaron' ? paleta.fondo : paleta.secundario, fontFamily: 'Manrope_700Bold' }}>Pasaron</Text>
        </Pressable>
      </View>
      {tab === 'vienen' ? (
        <>
          {avisos.length > 0 ? (
            <View style={{ paddingHorizontal: 16, gap: 8, marginBottom: 12 }}>
              {avisos.map((av) => (
                <Text key={av.id} style={{ color: paleta.lluvia, fontFamily: 'Manrope_600SemiBold' }}>
                  {av.mensaje}
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={estilos.muted}>{vienen.length} de 3 reservas activas</Text>
          {vienen.length === 0 ? (
            <View style={{ padding: 36, alignItems: 'center' }}>
              <Text style={{ color: paleta.texto, fontFamily: 'Manrope_700Bold', fontSize: 22 }}>No hay turnos a la vista</Text>
              <Text style={estilos.muted}>Reservá desde la grilla.</Text>
            </View>
          ) : (
            vienen.map((r) => {
              const esp = espacios.find((e) => e.id === r.espacioId);
              const tardia = esCancelacionTardia(r.cancelableHasta, ahora);
              return (
                <View key={r.id} style={{ paddingHorizontal: 16, gap: 8, marginBottom: 24 }}>
                  <Text style={{ color: paleta.texto, fontFamily: 'Manrope_700Bold', fontSize: 22 }}>
                    {esp?.nombre ?? r.espacioId}
                  </Text>
                  <Text style={estilos.muted}>{tituloDia(fechaDesdeTurnoId(r.turnoId) ?? r.creadaEn.slice(0, 10))}</Text>
                  <Text style={estilos.muted}>{horaDeTurno(r.turnoId)} · {esp?.complejo}</Text>
                  <Text style={estilos.muted}>{r.cantidadPersonas} personas</Text>
                  <Text style={{ color: paleta.texto, fontSize: 28, fontFamily: 'Manrope_700Bold' }}>
                    {peso(esp?.precioPorHora ?? 0)}
                  </Text>
                  <Text style={estilos.muted}>Se paga en el lugar</Text>
                  <View style={{ alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                    <View style={{ backgroundColor: paleta.qrFondo, padding: 10, borderRadius: 8 }}>
                      <QrMuestra codigo={r.codigoQr} />
                    </View>
                    <Text selectable style={{ color: paleta.texto, fontFamily: 'Manrope_600SemiBold', letterSpacing: 1 }}>
                      {r.codigoQr}
                    </Text>
                    <Text style={estilos.muted}>Mostráselo al encargado</Text>
                    <Text style={estilos.muted}>Guardada en el teléfono. Se ve sin señal.</Text>
                  </View>
                  <View style={{ borderTopWidth: 1, borderTopColor: paleta.linea, paddingTop: 8 }}>
                    <Text style={estilos.muted}>
                      {tardia
                        ? 'La cancelación sin aviso ya cerró. Si cancelás ahora, queda el aviso.'
                        : `Podés cancelar sin aviso hasta ${r.cancelableHasta.slice(11, 16)}.`}
                    </Text>
                    <Pressable onPress={() => onCancelar(r.id)} style={estilos.secundario}>
                      <Text style={{ color: paleta.texto, fontFamily: 'Manrope_700Bold' }}>Cancelar reserva</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </>
      ) : (
        pasaron.map((r) => {
          const esp = espacios.find((e) => e.id === r.espacioId);
          return (
            <View key={r.id} style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: paleta.linea }}>
              <Text style={{ color: paleta.texto, fontFamily: 'Manrope_700Bold' }}>{esp?.nombre ?? r.espacioId}</Text>
              <Text style={estilos.muted}>{horaDeTurno(r.turnoId)}</Text>
              <Text style={{ color: paleta.texto, marginTop: 6, letterSpacing: 1, fontSize: 12, textTransform: 'uppercase' }}>
                {r.estado === 'cumplida' ? 'Cumplida' : r.estado === 'ausente' ? 'Ausente' : 'Cancelada'}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function horaDeTurno(turnoId: string): string {
  const h = turnoId.slice(-2);
  if (!/^\d\d$/.test(h)) return turnoId;
  const fin = String(Number(h) + 1).padStart(2, '0');
  return `${h}:00 a ${fin}:00`;
}

function crear(paleta: ReturnType<typeof useTema>['paleta']) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: paleta.fondo },
    cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
    titulo: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 42, color: paleta.texto, flex: 1 },
    muted: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 13, paddingHorizontal: 16 },
    cta: { minHeight: 48, borderRadius: 14, backgroundColor: paleta.cta, alignItems: 'center', justifyContent: 'center' },
    ctaTexto: { color: paleta.ctaTexto, fontFamily: 'Manrope_700Bold' },
    seg: { flexDirection: 'row', margin: 16, padding: 4, backgroundColor: paleta.superficie, borderRadius: 12, gap: 4 },
    segBtn: { flex: 1, minHeight: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    segOn: { backgroundColor: paleta.texto },
    secundario: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: paleta.linea,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
  });
}
