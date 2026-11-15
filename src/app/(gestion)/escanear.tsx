import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonSesion } from '@/components/BotonSesion';
import { useSesion } from '@/contexto/sesion';
import { useTema } from '@/contexto/tema';
import { confirmarIdentidad } from '@/servicios/biometria';
import { validarIngreso } from '@/servicios/gestion';
import { esError } from '@/tipos';

// Alternativa a la huella (teléfono sin sensor o huella cancelada). Código fijo de la demo.
const PIN_ENCARGADO = '1234';

export default function EscanearScreen() {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { sesion } = useSesion();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [listo, setListo] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [manual, setManual] = useState('');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [sinSensor, setSinSensor] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; titulo: string; detalle: string } | null>(null);

  // Evita pedir la huella dos veces: el diálogo del sistema también mueve el AppState.
  const autenticando = useRef(false);

  const pedirHuella = useCallback(async () => {
    if (autenticando.current) return;
    autenticando.current = true;
    const r = await confirmarIdentidad('Confirmá que sos el encargado para escanear');
    autenticando.current = false;
    setSinSensor(r === 'no_disponible');
    if (r === 'ok') setListo(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setResultado(null);
      setPausado(false);
      setListo(false);
      setPin('');
      setPinError(false);
      void pedirHuella();
      let anterior = AppState.currentState;
      const sub = AppState.addEventListener('change', (estado) => {
        if (estado === 'background') setListo(false);
        // Al reabrir la app desde segundo plano se vuelve a pedir la huella.
        if (estado === 'active' && anterior === 'background') void pedirHuella();
        anterior = estado;
      });
      return () => {
        setListo(false);
        sub.remove();
      };
    }, [pedirHuella]),
  );

  function validarPin() {
    if (pin === PIN_ENCARGADO) {
      setPinError(false);
      setListo(true);
    } else {
      setPinError(true);
      setPin('');
    }
  }

  const estilos = crear(paleta);

  async function procesar(codigo: string) {
    if (!sesion || pausado) return;
    setPausado(true);
    const r = await validarIngreso(db, codigo, sesion.usuario.rol);
    if (esError(r)) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setResultado({ ok: false, titulo: 'No entra', detalle: r.error.mensaje });
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setResultado({
      ok: true,
      titulo: 'Ingreso registrado',
      detalle: `${r.datos.espacioNombre} · ${r.datos.reserva.codigoQr} · ${r.datos.reserva.ingresoEn?.slice(11, 16)}`,
    });
  }

  if (!listo) {
    return (
      <View style={[estilos.pantalla, { paddingTop: insets.top + 16 }]}>
        <Text style={estilos.muted}>
          {sinSensor
            ? 'Este teléfono no tiene huella cargada. Ingresá el código de encargado para escanear.'
            : 'Confirmá con tu huella o ingresá el código de encargado para escanear.'}
        </Text>
        <TextInput
          value={pin}
          onChangeText={setPin}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          placeholder="Código"
          placeholderTextColor={paleta.secundario}
          onSubmitEditing={validarPin}
          style={estilos.input}
        />
        {pinError ? <Text style={[estilos.muted, { color: paleta.ocupado }]}>Código incorrecto.</Text> : null}
        <Pressable onPress={validarPin} style={[estilos.cta, { marginHorizontal: 16 }]}>
          <Text style={estilos.ctaTexto}>Entrar</Text>
        </Pressable>
        {!sinSensor ? (
          <Pressable
            onPress={() => void pedirHuella()}
            style={[estilos.cta, estilos.ctaSecundario, { marginHorizontal: 16 }]}>
            <Text style={[estilos.ctaTexto, { color: paleta.texto }]}>Usar huella</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (resultado) {
    return (
      <View style={[estilos.pantalla, { backgroundColor: resultado.ok ? paleta.libreFondo : paleta.superficie, paddingTop: insets.top + 24, paddingHorizontal: 16, gap: 12 }]}>
        <Text style={[estilos.titulo, { color: resultado.ok ? paleta.libreTexto : paleta.ocupado }]}>{resultado.titulo}</Text>
        <Text style={{ color: paleta.texto, fontFamily: 'Manrope_400Regular', fontSize: 16 }}>{resultado.detalle}</Text>
        <Pressable
          onPress={() => {
            setResultado(null);
            setPausado(false);
            setManual('');
          }}
          style={estilos.cta}>
          <Text style={estilos.ctaTexto}>Escanear otro</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[estilos.pantalla, { paddingTop: insets.top + 8 }]}>
      <View style={[estilos.cabeza, { paddingHorizontal: 16 }]}>
        <Text style={estilos.titulo}>Escanear</Text>
        <BotonSesion />
      </View>
      {!permiso?.granted ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Text style={estilos.muted}>Hace falta la cámara para leer el QR en la puerta.</Text>
          <Pressable onPress={() => void pedirPermiso()} style={estilos.cta}>
            <Text style={estilos.ctaTexto}>Permitir cámara</Text>
          </Pressable>
        </View>
      ) : (
        <CameraView
          style={{ height: 280, margin: 16, borderRadius: 16, overflow: 'hidden' }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={pausado ? undefined : ({ data }) => void procesar(data)}
        />
      )}
      <Text style={estilos.muted}>Si no toma el código, escribilo.</Text>
      <TextInput
        value={manual}
        onChangeText={setManual}
        autoCapitalize="characters"
        placeholder="VGY-DEMO-PUERTA"
        placeholderTextColor={paleta.secundario}
        style={estilos.input}
      />
      <Pressable onPress={() => void procesar(manual)} style={[estilos.cta, { marginHorizontal: 16 }]}>
        <Text style={estilos.ctaTexto}>Validar código</Text>
      </Pressable>
    </View>
  );
}

function crear(paleta: ReturnType<typeof useTema>['paleta']) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: paleta.fondo },
    cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
    titulo: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 42, color: paleta.texto, flex: 1 },
    muted: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 13, paddingHorizontal: 16 },
    cta: { minHeight: 48, borderRadius: 14, backgroundColor: paleta.cta, alignItems: 'center', justifyContent: 'center' },
    ctaTexto: { color: paleta.ctaTexto, fontFamily: 'Manrope_700Bold' },
    ctaSecundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: paleta.linea, marginTop: 8 },
    input: {
      margin: 16,
      minHeight: 48,
      borderWidth: 1,
      borderColor: paleta.linea,
      borderRadius: 12,
      paddingHorizontal: 12,
      color: paleta.texto,
      fontFamily: 'Manrope_600SemiBold',
      backgroundColor: paleta.superficie,
    },
  });
}
