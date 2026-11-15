import Ionicons from '@react-native-vector-icons/ionicons';
import { useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonSesion } from '@/components/BotonSesion';
import { ResultadoEscaneo, type DatosResultado } from '@/components/ResultadoEscaneo';
import { VisorQr } from '@/components/VisorQr';
import type { Paleta } from '@/constants/tema';
import { useSesion } from '@/contexto/sesion';
import { useTema } from '@/contexto/tema';
import { useMetodoBiometrico } from '@/hooks/useMetodoBiometrico';
import { confirmarIdentidad } from '@/servicios/biometria';
import { validarIngreso } from '@/servicios/gestion';
import { esError } from '@/tipos';

// Alternativa a la huella (teléfono sin sensor o huella cancelada). Código fijo de la demo.
const PIN_ENCARGADO = '1234';

const TITULO_POR_CODIGO: Record<string, string> = {
  YA_INGRESO: 'Ya ingresó',
  QR_OTRO_DIA: 'No es de hoy',
  QR_OTRA_CANCHA: 'Otra cancha',
  RESERVA_CANCELADA: 'Reserva cancelada',
  RESERVA_AUSENTE: 'Marcada ausente',
  QR_INVALIDO: 'Código inválido',
};

export default function EscanearScreen() {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { sesion } = useSesion();
  const metodo = useMetodoBiometrico();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [listo, setListo] = useState(false);
  const [pausado, setPausado] = useState(false);
  const [manual, setManual] = useState('');
  const [manualAbierto, setManualAbierto] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [sinSensor, setSinSensor] = useState(false);
  const [resultado, setResultado] = useState<DatosResultado | null>(null);

  // Evita pedir la huella dos veces: el diálogo del sistema también mueve el AppState.
  const autenticando = useRef(false);
  // El visor puede avisar el mismo QR varias veces antes de que React pause la lectura.
  const procesando = useRef(false);

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
      setManualAbierto(false);
      setPin('');
      setPinError(false);
      procesando.current = false;
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
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPinError(false);
      setListo(true);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPinError(true);
      setPin('');
    }
  }

  async function procesar(texto: string) {
    const codigo = texto.trim();
    if (!sesion || !codigo || procesando.current) return;
    procesando.current = true;
    setPausado(true);
    const r = await validarIngreso(db, codigo, sesion.usuario.rol);
    if (esError(r)) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setResultado({
        ok: false,
        titulo: TITULO_POR_CODIGO[r.error.codigo] ?? 'No entra',
        mensaje: r.error.mensaje,
        filas: [{ etiqueta: 'Código leído', valor: codigo }],
      });
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const { reserva, espacioNombre } = r.datos;
    setResultado({
      ok: true,
      titulo: 'Puede pasar',
      mensaje: 'Ingreso registrado.',
      filas: [
        { etiqueta: 'Cancha', valor: espacioNombre },
        { etiqueta: 'Personas', valor: String(reserva.cantidadPersonas) },
        { etiqueta: 'Hora de ingreso', valor: reserva.ingresoEn?.slice(11, 16) ?? '—' },
        { etiqueta: 'Código', valor: reserva.codigoQr },
      ],
    });
  }

  function escanearOtro() {
    procesando.current = false;
    setResultado(null);
    setPausado(false);
    setManual('');
    setManualAbierto(false);
  }

  const estilos = crear(paleta);

  const cabecera = (
    <View style={[estilos.cabeza, { paddingTop: insets.top + 8 }]}>
      <Text style={estilos.titulo}>Escanear</Text>
      <BotonSesion />
    </View>
  );

  // 1) Acceso del encargado: huella / rostro o código.
  if (!listo) {
    const esRostro = metodo === 'Face ID' || metodo === 'rostro';
    return (
      <View style={estilos.pantalla}>
        {cabecera}
        <ScrollView contentContainerStyle={estilos.centro} keyboardShouldPersistTaps="handled">
          <View style={estilos.tarjeta}>
            <View style={estilos.iconoCirculo}>
              <Ionicons name={esRostro ? 'scan-outline' : 'finger-print-outline'} size={40} color={paleta.texto} />
            </View>
            <Text style={estilos.tarjetaTitulo}>Acceso del encargado</Text>
            <Text style={estilos.muted}>
              {sinSensor
                ? 'Este teléfono no tiene huella, rostro ni clave cargada. Ingresá el código de encargado para escanear.'
                : `Confirmá con ${metodo} o ingresá el código de encargado para escanear.`}
            </Text>

            {!sinSensor ? (
              <Pressable
                onPress={() => void pedirHuella()}
                accessibilityRole="button"
                style={[estilos.cta, estilos.ctaFila]}>
                <Ionicons name={esRostro ? 'scan-outline' : 'finger-print-outline'} size={20} color={paleta.ctaTexto} />
                <Text style={estilos.ctaTexto}>Usar {metodo}</Text>
              </Pressable>
            ) : null}

            {!sinSensor ? (
              <View style={estilos.separador}>
                <View style={estilos.separadorLinea} />
                <Text style={estilos.separadorTexto}>o con código</Text>
                <View style={estilos.separadorLinea} />
              </View>
            ) : null}

            <TextInput
              value={pin}
              onChangeText={(t) => {
                setPin(t);
                if (pinError) setPinError(false);
              }}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              placeholder="••••"
              placeholderTextColor={paleta.secundario}
              onSubmitEditing={validarPin}
              accessibilityLabel="Código de encargado"
              style={[estilos.pin, pinError && { borderColor: paleta.ocupado }]}
            />
            {pinError ? <Text style={[estilos.muted, { color: paleta.ocupado }]}>Código incorrecto. Probá de nuevo.</Text> : null}
            <Pressable
              onPress={validarPin}
              accessibilityRole="button"
              style={[estilos.cta, !sinSensor && estilos.ctaSecundario]}>
              <Text style={[estilos.ctaTexto, !sinSensor && { color: paleta.texto }]}>Entrar</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  // 2) Resultado de la lectura.
  if (resultado) {
    return <ResultadoEscaneo datos={resultado} onOtro={escanearOtro} />;
  }

  // 3) Cámara: cargando permiso, permiso denegado o visor.
  if (!permiso) {
    return (
      <View style={estilos.pantalla}>
        {cabecera}
        <View style={estilos.centro}>
          <ActivityIndicator color={paleta.texto} />
        </View>
      </View>
    );
  }

  if (!permiso.granted) {
    const puedePedir = permiso.canAskAgain;
    return (
      <View style={estilos.pantalla}>
        {cabecera}
        <ScrollView contentContainerStyle={estilos.centro}>
          <View style={estilos.tarjeta}>
            <View style={estilos.iconoCirculo}>
              <Ionicons name="camera-outline" size={40} color={paleta.texto} />
            </View>
            <Text style={estilos.tarjetaTitulo}>Falta permiso de cámara</Text>
            <Text style={estilos.muted}>
              {puedePedir
                ? 'La cámara se usa solo para leer el QR de la reserva en la puerta.'
                : 'El permiso está bloqueado. Activalo desde los ajustes del teléfono para leer el QR.'}
            </Text>
            <Pressable
              onPress={() => (puedePedir ? void pedirPermiso() : void Linking.openSettings())}
              accessibilityRole="button"
              style={estilos.cta}>
              <Text style={estilos.ctaTexto}>{puedePedir ? 'Permitir cámara' : 'Abrir ajustes'}</Text>
            </Pressable>
          </View>
          <ManualAlternativa
            estilos={estilos}
            paleta={paleta}
            valor={manual}
            onCambiar={setManual}
            onValidar={() => void procesar(manual)}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {cabecera}
      <VisorQr pausado={pausado} onCodigo={(c) => void procesar(c)} />
      <View style={[estilos.barra]}>
        {manualAbierto ? (
          <View style={estilos.barraFila}>
            <TextInput
              value={manual}
              onChangeText={setManual}
              autoFocus
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="VGY-1234-1710"
              placeholderTextColor={paleta.secundario}
              returnKeyType="done"
              onSubmitEditing={() => void procesar(manual)}
              accessibilityLabel="Código de la reserva"
              style={[estilos.campo, { flex: 1 }]}
            />
            <Pressable
              onPress={() => void procesar(manual)}
              accessibilityRole="button"
              accessibilityLabel="Validar código"
              style={estilos.validar}>
              <Ionicons name="arrow-forward" size={22} color={paleta.ctaTexto} />
            </Pressable>
            <Pressable
              onPress={() => setManualAbierto(false)}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={estilos.cerrar}>
              <Ionicons name="close" size={22} color={paleta.secundario} />
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setManualAbierto(true)} accessibilityRole="button" style={estilos.barraBoton}>
            <Ionicons name="keypad-outline" size={20} color={paleta.texto} />
            <Text style={estilos.barraTexto}>¿No toma el QR? Escribí el código</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function ManualAlternativa({
  estilos,
  paleta,
  valor,
  onCambiar,
  onValidar,
}: {
  estilos: ReturnType<typeof crear>;
  paleta: Paleta;
  valor: string;
  onCambiar: (t: string) => void;
  onValidar: () => void;
}) {
  return (
    <View style={[estilos.tarjeta, { marginTop: 16 }]}>
      <Text style={estilos.tarjetaTitulo}>Sin cámara, a mano</Text>
      <TextInput
        value={valor}
        onChangeText={onCambiar}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="VGY-1234-1710"
        placeholderTextColor={paleta.secundario}
        onSubmitEditing={onValidar}
        accessibilityLabel="Código de la reserva"
        style={estilos.campo}
      />
      <Pressable onPress={onValidar} accessibilityRole="button" style={[estilos.cta, estilos.ctaSecundario]}>
        <Text style={[estilos.ctaTexto, { color: paleta.texto }]}>Validar código</Text>
      </Pressable>
    </View>
  );
}

function crear(paleta: Paleta) {
  return StyleSheet.create({
    pantalla: { flex: 1, backgroundColor: paleta.fondo },
    cabeza: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingBottom: 8,
      backgroundColor: paleta.fondo,
      zIndex: 10,
    },
    titulo: { fontFamily: 'BarlowCondensed_600SemiBold', fontSize: 42, color: paleta.texto, flex: 1 },
    centro: { flexGrow: 1, justifyContent: 'center', padding: 16 },
    tarjeta: {
      borderRadius: 22,
      padding: 20,
      gap: 14,
      backgroundColor: paleta.superficie,
      borderWidth: 1,
      borderColor: paleta.linea,
    },
    iconoCirculo: {
      alignSelf: 'center',
      width: 76,
      height: 76,
      borderRadius: 38,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: paleta.fondo,
      borderWidth: 1,
      borderColor: paleta.linea,
    },
    tarjetaTitulo: {
      fontFamily: 'BarlowCondensed_600SemiBold',
      fontSize: 30,
      color: paleta.texto,
      textAlign: 'center',
    },
    muted: { fontFamily: 'Manrope_400Regular', color: paleta.secundario, fontSize: 14, textAlign: 'center', lineHeight: 20 },
    cta: {
      minHeight: 52,
      borderRadius: 14,
      backgroundColor: paleta.cta,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaFila: { flexDirection: 'row', gap: 10 },
    ctaTexto: { color: paleta.ctaTexto, fontFamily: 'Manrope_700Bold', fontSize: 16 },
    ctaSecundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: paleta.linea },
    separador: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    separadorLinea: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: paleta.linea },
    separadorTexto: { fontFamily: 'Manrope_600SemiBold', color: paleta.secundario, fontSize: 12 },
    pin: {
      minHeight: 56,
      borderWidth: 1,
      borderColor: paleta.linea,
      borderRadius: 14,
      textAlign: 'center',
      letterSpacing: 10,
      fontSize: 24,
      color: paleta.texto,
      fontFamily: 'Manrope_700Bold',
      backgroundColor: paleta.fondo,
    },
    campo: {
      minHeight: 52,
      borderWidth: 1,
      borderColor: paleta.linea,
      borderRadius: 14,
      paddingHorizontal: 14,
      color: paleta.texto,
      fontFamily: 'Manrope_600SemiBold',
      fontSize: 16,
      backgroundColor: paleta.fondo,
    },
    barra: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: paleta.fondo,
      borderTopWidth: 1,
      borderTopColor: paleta.linea,
    },
    barraBoton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    barraTexto: { fontFamily: 'Manrope_600SemiBold', color: paleta.texto, fontSize: 15 },
    barraFila: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    validar: {
      width: 52,
      height: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: paleta.cta,
    },
    cerrar: { width: 44, height: 52, alignItems: 'center', justifyContent: 'center' },
  });
}
