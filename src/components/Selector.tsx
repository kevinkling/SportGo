import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTema } from '@/contexto/tema';

export interface OpcionSelector {
  valor: string;
  etiqueta: string;
}

interface Props {
  etiqueta: string;
  valor: string;
  opciones: OpcionSelector[];
  onElegir: (valor: string) => void;
}

export function Selector({ etiqueta, valor, opciones, onElegir }: Props) {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const [abierto, setAbierto] = useState(false);
  const actual = opciones.find((o) => o.valor === valor);
  const estilos = crear(paleta);

  return (
    <View style={estilos.wrap}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Pressable
        onPress={() => setAbierto(true)}
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${actual?.etiqueta ?? 'sin elegir'}`}
        style={estilos.boton}>
        <Text style={estilos.valor} numberOfLines={1}>
          {actual?.etiqueta ?? 'Elegir'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={paleta.secundario} />
      </Pressable>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={estilos.fondo} onPress={() => setAbierto(false)}>
          <Pressable style={[estilos.hoja, { paddingBottom: insets.bottom + 12 }]} onPress={() => undefined}>
            <Text style={estilos.titulo}>{etiqueta}</Text>
            <FlatList
              data={opciones}
              keyExtractor={(o) => o.valor}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onElegir(item.valor);
                    setAbierto(false);
                  }}
                  style={estilos.opcion}>
                  <Text
                    style={{
                      color: paleta.texto,
                      fontFamily: item.valor === valor ? 'Manrope_700Bold' : 'Manrope_400Regular',
                      flex: 1,
                    }}>
                    {item.etiqueta}
                  </Text>
                  {item.valor === valor ? <Ionicons name="checkmark" size={20} color={paleta.texto} /> : null}
                </Pressable>
              )}
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
      justifyContent: 'space-between',
      backgroundColor: paleta.superficie,
      gap: 8,
    },
    valor: { color: paleta.texto, fontFamily: 'Manrope_600SemiBold', flex: 1 },
    fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    hoja: {
      maxHeight: '70%',
      backgroundColor: paleta.fondo,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 16,
    },
    titulo: { fontFamily: 'Manrope_700Bold', color: paleta.texto, fontSize: 18, paddingHorizontal: 16, paddingBottom: 8 },
    opcion: {
      minHeight: 52,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: paleta.linea,
    },
  });
}
