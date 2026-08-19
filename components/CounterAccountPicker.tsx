import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { fetchBase44Cars, Base44Car } from '@/services/base44Api';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (car: Base44Car) => void;
}

export default function CounterAccountPicker({ visible, onClose, onSelect }: Props) {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Base44Car[]>([]);

  const load = async (q: string = '') => {
    try {
      setLoading(true);
      const res = await fetchBase44Cars(q);
      setItems(res);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) load('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface }] }>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>Vyberte vozidlo (protiúčet)</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBox, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
            <Ionicons name="search" size={18} color={theme.textSecondary} />
            <TextInput
              placeholder="Hledat značka / model / varianta"
              placeholderTextColor={theme.textTertiary}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={() => load(query)}
              style={[styles.searchInput, { color: theme.text }]}
              returnKeyType="search"
            />
            <TouchableOpacity onPress={() => load(query)}>
              <Ionicons name="arrow-forward" size={20} color={theme.accent} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loading}><ActivityIndicator color={theme.accent} /></View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: theme.border }]} />}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => { onSelect(item); onClose(); }}>
                  <View style={styles.rowMain}>
                    <Text style={[styles.rowTitle, { color: theme.text }]}>{item.make || '-'} {item.model || ''}</Text>
                    <Text style={[styles.rowSub, { color: theme.textSecondary }]}>{item.variant || ''}</Text>
                  </View>
                  <Text style={[styles.price, { color: theme.text }]}>{item.price ? `${item.price.toLocaleString('cs-CZ')} Kč` : '—'}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '85%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  title: { fontSize: 16, fontWeight: '700' },
  closeBtn: { padding: 6 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 10 },
  searchInput: { flex: 1, marginHorizontal: 8, fontSize: 15 },
  loading: { paddingVertical: 24 },
  sep: { height: 1, opacity: 0.6 },
  row: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowMain: { flex: 1, marginRight: 12 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13 },
  price: { fontSize: 15, fontWeight: '600' },
});
