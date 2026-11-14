import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTema } from '@/contexto/tema';
import { fechaISO } from '@/dominio/fechas';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

interface Props {
  valor: string;
  onElegir: (fecha: string) => void;
  /** Fecha mínima elegible, "AAAA-MM-DD". */
  minimo?: string;
}

function dos(n: number) {
  return String(n).padStart(2, '0');
}

export function Calendario({ valor, onElegir, minimo }: Props) {
  const { paleta } = useTema();
  const [anio0, mes0] = valor.split('-').map(Number);
  const [vista, setVista] = useState({ anio: anio0, mes: mes0 - 1 });
  const hoy = fechaISO();
  const estilos = crear(paleta);

  const primero = new Date(vista.anio, vista.mes, 1);
  const desfase = (primero.getDay() + 6) % 7;
  const cantidad = new Date(vista.anio, vista.mes + 1, 0).getDate();
  const celdas: (number | null)[] = [
    ...Array.from({ length: desfase }, () => null),
    ...Array.from({ length: cantidad }, (_, i) => i + 1),
  ];

  function mover(delta: number) {
    const d = new Date(vista.anio, vista.mes + delta, 1);
    setVista({ anio: d.getFullYear(), mes: d.getMonth() });
  }

  return (
    <View style={estilos.caja}>
      <View style={estilos.cabeza}>
        <Pressable onPress={() => mover(-1)} accessibilityLabel="Mes anterior" style={estilos.flecha}>
          <Ionicons name="chevron-back" size={22} color={paleta.texto} />
        </Pressable>
        <Text style={estilos.mes}>
          {MESES[vista.mes]} {vista.anio}
        </Text>
        <Pressable onPress={() => mover(1)} accessibilityLabel="Mes siguiente" style={estilos.flecha}>
          <Ionicons name="chevron-forward" size={22} color={paleta.texto} />
        </Pressable>
      </View>
      <View style={estilos.fila}>
        {DIAS.map((d, i) => (
          <Text key={`${d}-${i}`} style={estilos.diaSemana}>
            {d}
          </Text>
        ))}
      </View>
      <View style={estilos.grilla}>
        {celdas.map((dia, i) => {
          if (dia === null) return <View key={`v-${i}`} style={estilos.celda} />;
          const fecha = `${vista.anio}-${dos(vista.mes + 1)}-${dos(dia)}`;
          const deshabilitado = minimo !== undefined && fecha < minimo;
          const elegido = fecha === valor;
          return (
            <View key={fecha} style={estilos.celda}>
              <Pressable
                disabled={deshabilitado}
                onPress={() => onElegir(fecha)}
                accessibilityLabel={fecha}
                style={[
                  estilos.dia,
                  elegido && { backgroundColor: paleta.texto },
                  !elegido && fecha === hoy && { borderWidth: 1, borderColor: paleta.texto },
                ]}>
                <Text
                  style={{
                    color: elegido ? paleta.fondo : deshabilitado ? paleta.paso : paleta.texto,
                    fontFamily: elegido ? 'Manrope_700Bold' : 'Manrope_400Regular',
                  }}>
                  {dia}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function crear(paleta: ReturnType<typeof useTema>['paleta']) {
  return StyleSheet.create({
    caja: {
      marginHorizontal: 16,
      marginTop: 8,
      padding: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: paleta.linea,
      backgroundColor: paleta.superficie,
    },
    cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    flecha: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    mes: { fontFamily: 'Manrope_700Bold', color: paleta.texto, fontSize: 16 },
    fila: { flexDirection: 'row' },
    diaSemana: {
      flex: 1,
      textAlign: 'center',
      fontFamily: 'Manrope_600SemiBold',
      color: paleta.secundario,
      fontSize: 12,
      paddingVertical: 4,
    },
    grilla: { flexDirection: 'row', flexWrap: 'wrap' },
    celda: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
    dia: { flex: 1, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  });
}
