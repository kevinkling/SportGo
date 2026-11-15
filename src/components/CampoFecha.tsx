import Ionicons from '@react-native-vector-icons/ionicons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Calendario } from '@/components/Calendario';
import { useTema } from '@/contexto/tema';
import { tituloDia } from '@/dominio/fechas';

interface Props {
  etiqueta: string;
  valor: string;
  onElegir: (fecha: string) => void;
  minimo?: string;
}

export function CampoFecha({ etiqueta, valor, onElegir, minimo }: Props) {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const [abierto, setAbierto] = useState(false);
  const estilos = crear(paleta);

  return (
    <View style={estilos.wrap}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Pressable onPress={() => setAbierto(true)} accessibilityRole="button" style={estilos.boton}>
        <Ionicons name="calendar-outline" size={18} color={paleta.secundario} />
        <Text style={estilos.valor}>{tituloDia(valor)}</Text>
      </Pressable>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={estilos.fondo} onPress={() => setAbierto(false)}>
          <Pressable style={[estilos.hoja, { paddingBottom: insets.bottom + 16 }]} onPress={() => undefined}>
            <Text style={estilos.titulo}>{etiqueta}</Text>
            <Calendario
              valor={valor}
              minimo={minimo}
              onElegir={(f) => {
                onElegir(f);
                setAbierto(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function crear(paleta: ReturnType<typeof useTema>['paleta']) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 16, marginTop: 12, gap: 6 },
    etiqueta: { fontFamily: 'Manrope_600SemiBold', color: paleta.secundario, fontSize: 13 },
    boton: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: paleta.linea,
      borderRadius: 12,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: paleta.superficie,
    },
    valor: { color: paleta.texto, fontFamily: 'Manrope_600SemiBold', flex: 1 },
    fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    hoja: {
      backgroundColor: paleta.fondo,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 16,
    },
    titulo: { fontFamily: 'Manrope_700Bold', color: paleta.texto, fontSize: 18, paddingHorizontal: 16 },
  });
}
