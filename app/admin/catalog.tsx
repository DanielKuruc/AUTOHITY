import { SelectionPicker } from '@/components/SelectionPicker';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUsers } from '@/contexts/UsersContext';
import {
  Make,
  Model,
  createMake,
  createModel,
  deleteMake,
  deleteModel,
  fetchAllMakesAndModels,
  updateMake,
  updateModel,
} from '@/services/vehicleMakesModelsApi';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/utils/alert';

type PromptState =
  | { kind: 'addMake' }
  | { kind: 'renameMake'; make: Make }
  | { kind: 'addModel' }
  | { kind: 'renameModel'; model: Model }
  | null;

export default function AdminCatalogScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { users } = useUsers();

  const isAdmin = !!users.find(u => u.id === user?.id)?.isAdmin;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [makes, setMakes] = useState<Make[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedMakeName, setSelectedMakeName] = useState('---Výběr---');
  const [prompt, setPrompt] = useState<PromptState>(null);
  const [promptValue, setPromptValue] = useState('');
  const [promptSeries, setPromptSeries] = useState('');

  const selectedMake = makes.find(m => m.name === selectedMakeName);
  const modelsForMake = models
    .filter(m => m.makeId === selectedMake?.id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchAllMakesAndModels();
    if (data.success) {
      setMakes(data.makes);
      setModels(data.models);
    } else {
      showAlert('Chyba', data.error || 'Nepodařilo se načíst číselník');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openPrompt = (state: PromptState, initialValue = '', initialSeries = '') => {
    setPrompt(state);
    setPromptValue(initialValue);
    setPromptSeries(initialSeries);
  };
  const closePrompt = () => {
    setPrompt(null);
    setPromptValue('');
    setPromptSeries('');
  };

  const submitPrompt = async () => {
    if (!prompt) return;
    const name = promptValue.trim();
    if (!name) return;
    const series = promptSeries.trim();

    setSaving(true);
    try {
      if (prompt.kind === 'addMake') {
        const res = await createMake(name);
        if (!res.success) throw new Error(res.error);
      } else if (prompt.kind === 'renameMake') {
        const res = await updateMake(prompt.make.id, name, false);
        if (!res.success) throw new Error(res.error);
      } else if (prompt.kind === 'addModel') {
        if (!selectedMake) throw new Error('Nejdřív vyberte značku');
        const res = await createModel(selectedMake.id, name, series);
        if (!res.success) throw new Error(res.error);
      } else if (prompt.kind === 'renameModel') {
        const res = await updateModel(prompt.model.id, name, series);
        if (!res.success) throw new Error(res.error);
      }
      closePrompt();
      await load();
    } catch (e: any) {
      showAlert('Chyba', e.message || 'Operace se nezdařila');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteMake = (make: Make) => {
    showAlert(
      'Smazat značku',
      `Opravdu smazat značku "${make.name}"? Smažou se i všechny její modely.`,
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteMake(make.id);
            if (!res.success) {
              showAlert('Chyba', res.error || 'Nepodařilo se smazat značku');
              return;
            }
            if (selectedMakeName === make.name) setSelectedMakeName('---Výběr---');
            await load();
          },
        },
      ]
    );
  };

  const confirmDeleteModel = (model: Model) => {
    showAlert('Smazat model', `Opravdu smazat model "${model.name}"?`, [
      { text: 'Zrušit', style: 'cancel' },
      {
        text: 'Smazat',
        style: 'destructive',
        onPress: async () => {
          const res = await deleteModel(model.id);
          if (!res.success) {
            showAlert('Chyba', res.error || 'Nepodařilo se smazat model');
            return;
          }
          await load();
        },
      },
    ]);
  };

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.deniedContainer}>
          <Ionicons name="lock-closed" size={40} color={theme.textTertiary} />
          <Text style={[styles.deniedText, { color: theme.text }]}>
            Tato sekce je jen pro administrátory.
          </Text>
          <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.accent }]} onPress={() => router.back()}>
            <Text style={styles.closeBtnText}>Zpět</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Číselník značek a modelů</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <View style={styles.content}>
          {/* Makes section */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <SelectionPicker
                label="Značka"
                value={selectedMakeName}
                options={['---Výběr---', ...makes.map(m => m.name).sort((a, b) => a.localeCompare(b))]}
                onSelect={setSelectedMakeName}
              />
            </View>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: theme.accent }]}
              onPress={() => openPrompt({ kind: 'addMake' })}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            {selectedMake && (
              <>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: theme.inputBackground }]}
                  onPress={() => openPrompt({ kind: 'renameMake', make: selectedMake }, selectedMake.name)}
                >
                  <Ionicons name="pencil" size={18} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: theme.error + '20' }]}
                  onPress={() => confirmDeleteMake(selectedMake)}
                >
                  <Ionicons name="trash" size={18} color={theme.error} />
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Models section */}
          {selectedMake ? (
            <>
              <View style={styles.modelsHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Modely ({modelsForMake.length})
                </Text>
                <TouchableOpacity
                  style={[styles.addModelBtn, { backgroundColor: theme.accent }]}
                  onPress={() => openPrompt({ kind: 'addModel' })}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addModelBtnText}>Přidat model</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={modelsForMake}
                keyExtractor={item => String(item.id)}
                renderItem={({ item }) => (
                  <View style={[styles.modelRow, { borderBottomColor: theme.borderLight }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modelName, { color: theme.text }]}>{item.name}</Text>
                      {!!item.series && (
                        <Text style={[styles.modelSeries, { color: theme.textSecondary }]}>{item.series}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => openPrompt({ kind: 'renameModel', model: item }, item.name, item.series || '')}
                      hitSlop={8}
                    >
                      <Ionicons name="pencil" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDeleteModel(item)} hitSlop={8} style={{ marginLeft: 16 }}>
                      <Ionicons name="trash" size={18} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                )}
                ListEmptyComponent={
                  <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
                    Tahle značka zatím nemá žádné modely.
                  </Text>
                }
              />
            </>
          ) : (
            <View style={styles.centerFill}>
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
                Vyberte značku pro zobrazení a správu jejích modelů.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Add/rename prompt modal */}
      <Modal visible={!!prompt} transparent animationType="fade" onRequestClose={closePrompt}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {prompt?.kind === 'addMake' && 'Nová značka'}
              {prompt?.kind === 'renameMake' && 'Přejmenovat značku'}
              {prompt?.kind === 'addModel' && `Nový model (${selectedMake?.name})`}
              {prompt?.kind === 'renameModel' && 'Přejmenovat model'}
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: theme.border, color: theme.text }]}
              value={promptValue}
              onChangeText={setPromptValue}
              placeholder="Název..."
              placeholderTextColor={theme.textTertiary}
              autoFocus
            />
            {(prompt?.kind === 'addModel' || prompt?.kind === 'renameModel') && (
              <TextInput
                style={[styles.modalInput, { borderColor: theme.border, color: theme.text, marginTop: 10 }]}
                value={promptSeries}
                onChangeText={setPromptSeries}
                placeholder="Řada (volitelné, např. 3 Series)..."
                placeholderTextColor={theme.textTertiary}
              />
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={closePrompt} disabled={saving}>
                <Text style={[styles.modalBtnText, { color: theme.textSecondary }]}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: theme.accent }]}
                onPress={submitPrompt}
                disabled={saving || !promptValue.trim()}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Uložit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modelsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  addModelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addModelBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modelName: { fontSize: 15, fontWeight: '500' },
  modelSeries: { fontSize: 12, marginTop: 2 },
  emptyText: { textAlign: 'center', fontSize: 14, paddingVertical: 20 },
  deniedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  deniedText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
  closeBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  closeBtnText: { color: '#FFFFFF', fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: { width: '100%', maxWidth: 400, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, minWidth: 72, alignItems: 'center' },
  modalBtnPrimary: {},
  modalBtnText: { fontSize: 14, fontWeight: '600' },
});
