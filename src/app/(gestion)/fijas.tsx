import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BotonSesion } from '@/components/BotonSesion';
import { CampoFecha } from '@/components/CampoFecha';
import { Selector } from '@/components/Selector';
import { useSesion } from '@/contexto/sesion';
import { useTema } from '@/contexto/tema';
import { fechaISO, tituloDia } from '@/dominio/fechas';
import { agruparFijas, type FranjaFija, type GrupoFija } from '@/dominio/fijas';
import { HORAS } from '@/dominio/grilla';
import { listarEspacios } from '@/servicios/espacios';
import { desactivarFijas, guardarFijas, listarFijasServicio } from '@/servicios/gestion';
import { esError, type Espacio } from '@/tipos';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const OPCIONES_DIA = DIAS.map((d, i) => ({ valor: String(i), etiqueta: d }));
const OPCIONES_DESDE = HORAS.map((h) => ({ valor: h.inicio, etiqueta: h.inicio }));
const OPCIONES_HASTA = HORAS.map((h) => ({ valor: h.fin, etiqueta: h.fin }));

const franjaNueva = (): FranjaFija => ({ dia: 2, inicio: '21:00', fin: '22:00' });

export default function FijasScreen() {
  const { paleta } = useTema();
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { sesion } = useSesion();
  const hoy = fechaISO();

  const [grupos, setGrupos] = useState<GrupoFija[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [reemplazaIds, setReemplazaIds] = useState<string[]>([]);

  const [titular, setTitular] = useState('');
  const [espacioId, setEspacioId] = useState('esp-02');
  const [desde, setDesde] = useState(hoy);
  const [sinFin, setSinFin] = useState(true);
  const [hasta, setHasta] = useState(hoy);
  const [franjas, setFranjas] = useState<FranjaFija[]>([franjaNueva()]);

  const cargar = useCallback(async () => {
    const [f, e] = await Promise.all([listarFijasServicio(db), listarEspacios(db)]);
    if (!esError(f)) setGrupos(agruparFijas(f.datos));
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

  function cambiarFranja(i: number, cambio: Partial<FranjaFija>) {
    setFranjas((prev) => prev.map((f, n) => (n === i ? { ...f, ...cambio } : f)));
  }

  function limpiar() {
    setReemplazaIds([]);
    setTitular('');
    setDesde(hoy);
    setSinFin(true);
    setHasta(hoy);
    setFranjas([franjaNueva()]);
  }

  async function onGuardar() {
    const r = await guardarFijas(
      db,
      { espacioId, titular, desde, hasta: sinFin ? null : hasta, franjas, reemplazaIds },
      rol,
    );
    if (esError(r)) {
      setAviso(r.error.mensaje);
      return;
    }
    setAviso(reemplazaIds.length > 0 ? 'Cambios guardados.' : 'Fija cargada.');
    limpiar();
    void cargar();
  }

  function editar(g: GrupoFija) {
    // Se juntan todas las horas del mismo titular, espacio y vigencia en un solo formulario.
    const mismos = grupos.filter(
      (o) =>
        o.espacioId === g.espacioId &&
        o.titular === g.titular &&
        o.desde === g.desde &&
        o.hasta === g.hasta &&
        o.activa === g.activa,
    );
    setReemplazaIds(mismos.flatMap((o) => o.ids));
    setTitular(g.titular);
    setEspacioId(g.espacioId);
    setDesde(g.desde);
    setSinFin(g.hasta === null);
    setHasta(g.hasta ?? hoy);
    setFranjas(mismos.map((o) => ({ dia: o.dia, inicio: o.inicio, fin: o.fin })));
    setAviso(null);
  }

  return (
    <ScrollView style={estilos.pantalla} contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 32 }}>
      <View style={[estilos.cabeza, { paddingHorizontal: 16 }]}>
        <Text style={estilos.titulo}>Fijas</Text>
        <BotonSesion />
      </View>
      <Text style={estilos.muted}>
        {reemplazaIds.length > 0 ? 'Editando una reserva fija' : 'Nueva reserva fija'}. Ocupa esos horarios todas las
        semanas.
      </Text>

      <Text style={estilos.etiqueta}>Titular</Text>
      <TextInput
        value={titular}
        onChangeText={setTitular}
        placeholder="Ej.: Grupo de los martes"
        placeholderTextColor={paleta.secundario}
        style={estilos.input}
      />

      <Selector etiqueta="Espacio" valor={espacioId} opciones={opcionesEspacio} onElegir={setEspacioId} />

      <Text style={[estilos.seccion, { marginTop: 20 }]}>Horarios de la semana</Text>
      {franjas.map((f, i) => (
        <View key={i} style={estilos.franja}>
          <Selector
            etiqueta="Día"
            valor={String(f.dia)}
            opciones={OPCIONES_DIA}
            onElegir={(v) => cambiarFranja(i, { dia: Number(v) as FranjaFija['dia'] })}
          />
          <View style={{ flexDirection: 'row' }}>
            <View style={{ flex: 1 }}>
              <Selector etiqueta="Desde" valor={f.inicio} opciones={OPCIONES_DESDE} onElegir={(v) => cambiarFranja(i, { inicio: v })} />
            </View>
            <View style={{ flex: 1 }}>
              <Selector etiqueta="Hasta" valor={f.fin} opciones={OPCIONES_HASTA} onElegir={(v) => cambiarFranja(i, { fin: v })} />
            </View>
          </View>
          {franjas.length > 1 ? (
            <Pressable onPress={() => setFranjas((prev) => prev.filter((_, n) => n !== i))} style={estilos.quitarFranja}>
              <Ionicons name="trash-outline" size={18} color={paleta.ocupado} />
              <Text style={{ color: paleta.ocupado, fontFamily: 'Manrope_700Bold' }}>Quitar este horario</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      <Pressable onPress={() => setFranjas((prev) => [...prev, franjaNueva()])} style={estilos.agregar}>
        <Ionicons name="add-circle-outline" size={20} color={paleta.texto} />
        <Text style={{ color: paleta.texto, fontFamily: 'Manrope_700Bold' }}>Agregar otro horario</Text>
      </Pressable>

      <Text style={[estilos.seccion, { marginTop: 20 }]}>Desde cuándo y hasta cuándo</Text>
      <CampoFecha etiqueta="Empieza el" valor={desde} onElegir={setDesde} />
      <Pressable
        onPress={() => setSinFin((v) => !v)}
        accessibilityRole="switch"
        accessibilityState={{ checked: sinFin }}
        style={estilos.opcionFin}>
        <Ionicons name={sinFin ? 'checkbox' : 'square-outline'} size={24} color={paleta.texto} />
        <Text style={{ color: paleta.texto, fontFamily: 'Manrope_600SemiBold', flex: 1 }}>
          Sigue todas las semanas, sin fecha de fin
        </Text>
      </Pressable>
      {!sinFin ? <CampoFecha etiqueta="Termina el" valor={hasta} onElegir={setHasta} minimo={desde} /> : null}

      <Pressable onPress={() => void onGuardar()} style={[estilos.cta, { marginHorizontal: 16 }]}>
        <Text style={estilos.ctaTexto}>{reemplazaIds.length > 0 ? 'Guardar cambios' : 'Cargar fija'}</Text>
      </Pressable>
      {reemplazaIds.length > 0 ? (
        <Pressable onPress={limpiar} style={[estilos.secundario, { marginHorizontal: 16 }]}>
          <Text style={{ color: paleta.texto, fontFamily: 'Manrope_700Bold' }}>Cancelar edición</Text>
        </Pressable>
      ) : null}
      {aviso ? <Text style={estilos.muted}>{aviso}</Text> : null}

      <Text style={[estilos.seccion, { marginTop: 24 }]}>Cargadas</Text>
      {grupos.map((g) => (
        <View key={g.ids[0]} style={estilos.fila}>
          <View style={{ flex: 1 }}>
            <Text style={estilos.item}>{g.titular}</Text>
            <Text style={estilos.detalle}>
              {DIAS[g.dia]} de {g.inicio} a {g.fin} · {nombreEspacio(g.espacioId)}
            </Text>
            <Text style={estilos.detalle}>
              {g.hasta ? `Del ${tituloDia(g.desde)} al ${tituloDia(g.hasta)}` : `Desde el ${tituloDia(g.desde)}, sin fin`}
              {g.activa ? '' : ' · dada de baja'}
            </Text>
          </View>
          <Pressable onPress={() => editar(g)} style={estilos.accion}>
            <Text style={{ color: paleta.texto, fontFamily: 'Manrope_700Bold' }}>Editar</Text>
          </Pressable>
          {g.activa ? (
            <Pressable onPress={() => void desactivarFijas(db, g.ids, rol).then(() => cargar())} style={estilos.accion}>
              <Text style={{ color: paleta.ocupado, fontFamily: 'Manrope_700Bold' }}>Dar de baja</Text>
            </Pressable>
          ) : null}
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
    input: {
      marginHorizontal: 16,
      marginTop: 6,
      minHeight: 48,
      borderWidth: 1,
      borderColor: paleta.linea,
      borderRadius: 12,
      paddingHorizontal: 12,
      color: paleta.texto,
      fontFamily: 'Manrope_400Regular',
      backgroundColor: paleta.superficie,
    },
    seccion: { fontFamily: 'Manrope_700Bold', color: paleta.texto, fontSize: 18, paddingHorizontal: 16 },
    franja: {
      marginHorizontal: 16,
      marginTop: 12,
      paddingBottom: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: paleta.linea,
    },
    quitarFranja: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 16,
      marginTop: 4,
    },
    agregar: {
      minHeight: 48,
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: paleta.linea,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    opcionFin: {
      minHeight: 48,
      paddingHorizontal: 16,
      marginTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cta: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: paleta.cta,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    ctaTexto: { color: paleta.ctaTexto, fontFamily: 'Manrope_700Bold' },
    secundario: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: paleta.linea,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 8,
    },
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
    accion: { minHeight: 44, justifyContent: 'center' },
  });
}
