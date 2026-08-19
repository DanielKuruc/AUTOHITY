import { SelectionPicker } from '@/components/SelectionPicker';
import { defaultPurchaseFilter } from '@/constants/mockData';
import { PurchaseFilter, PurchaseState, TimeFilterType } from '@/constants/types';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUsers } from '@/contexts/UsersContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showAlert } from '@/utils/alert';

export default function FiltersScreen() {
  const { theme } = useTheme();
  const { filter, setFilter, clearFilter } = usePurchases();
  const { users = [], isLoading: usersLoading } = useUsers();
  const [localFilter, setLocalFilter] = useState<PurchaseFilter>(filter);

  // Mapuj uživatele na seznam výkupčích s ID
  const buyerOptions = Array.isArray(users) 
    ? ['---Výběr---', ...users.map(u => u.id)]
    : ['---Výběr---'];
  // Pro zobrazení: mapuj ID na jméno
  const getBuyerDisplayName = (userId: string) => {
    if (userId === '---Výběr---') return '---Výběr---';
    const user = users.find(u => u.id === userId);
    return user ? user.lastName : userId;
  };

  useEffect(() => {
    setLocalFilter(filter);
  }, [filter]);

  const handleSave = async () => {
    await setFilter(localFilter);
    router.back();
  };

  const handleClear = () => {
    showAlert(
      'Vymazat filtry',
      'Opravdu chcete vymazat všechny filtry?',
      [
        { text: 'Zrušit', style: 'cancel' },
        { 
          text: 'Vymazat', 
          style: 'destructive',
          onPress: async () => {
            await clearFilter();
            setLocalFilter(defaultPurchaseFilter);
            router.back();
          }
        }
      ]
    );
  };

  const handleCancel = () => {
    router.back();
  };

  const updateFilter = (updates: Partial<PurchaseFilter>) => {
    setLocalFilter(prev => ({ ...prev, ...updates }));
  };

  const togglePurchaseState = (state: PurchaseState) => {
    const currentStates = localFilter.purchaseStateFilter;
    const newStates = currentStates.includes(state)
      ? currentStates.filter(s => s !== state)
      : [...currentStates, state];
    updateFilter({ purchaseStateFilter: newStates });
  };

  const getStateText = (state: PurchaseState) => {
    switch (state) {
      case PurchaseState.NEW:
        return 'NOVÝ';
      case PurchaseState.IN_PROGRESS:
        return 'ROZJEDNÁNO';
      case PurchaseState.COMPLETED:
        return 'VYKOUPENO';
      case PurchaseState.CANCELLED:
        return 'ODMÍTNUTO';
      default:
        return state;
    }
  };

  const getTimeFilterText = (filter: TimeFilterType) => {
    switch (filter) {
      case TimeFilterType.ALL:
        return 'Vše';
      case TimeFilterType.TODAY:
        return 'Dnes';
      case TimeFilterType.WEEK:
        return 'Tento týden';
      case TimeFilterType.MONTH:
        return 'Tento měsíc';
      default:
        return filter;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={handleCancel}>
          <Ionicons name="close" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Filtry</Text>
        <TouchableOpacity 
          style={[styles.headerSaveBtn, { backgroundColor: theme.accent }]} 
          onPress={handleSave}
        >
          <Text style={styles.headerSaveText}>Použít</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Filters */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Rychlé filtry</Text>
          <View style={[styles.filterRow, { borderBottomColor: theme.border }]}>
            <View style={styles.filterInfo}>
              <Text style={[styles.filterLabel, { color: theme.text }]}>Pouze moje výkupy</Text>
              <Text style={[styles.filterDescription, { color: theme.textSecondary }]}>Zobrazit jen výkupy přiřazené mně</Text>
            </View>
            <Switch
              value={localFilter.employeePurchasesOnly}
              onValueChange={(value) => updateFilter({ employeePurchasesOnly: value })}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.filterRow, { borderBottomColor: theme.border }]}>
            <View style={styles.filterInfo}>
              <Text style={[styles.filterLabel, { color: theme.text }]}>Dnešní výkupy</Text>
              <Text style={[styles.filterDescription, { color: theme.textSecondary }]}>Zobrazit pouze dnešní výkupy</Text>
            </View>
            <Switch
              value={localFilter.timeFilter === TimeFilterType.TODAY}
              onValueChange={(value) => updateFilter({ timeFilter: value ? TimeFilterType.TODAY : TimeFilterType.ALL })}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={[styles.filterRow]}>
            <View style={styles.filterInfo}>
              <Text style={[styles.filterLabel, { color: theme.text }]}>SERVIS</Text>
              <Text style={[styles.filterDescription, { color: theme.textSecondary }]}>Vykoupená vozidla se servisním požadavkem</Text>
            </View>
            <Switch
              value={localFilter.serviceNotesOnly || false}
              onValueChange={(value) => updateFilter({ serviceNotesOnly: value })}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Time Filter */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Časové období</Text>
          {Object.values(TimeFilterType).map((timeFilter) => (
            <TouchableOpacity
              key={timeFilter}
              style={[styles.optionRow, { borderBottomColor: theme.border }]}
              onPress={() => updateFilter({ timeFilter })}
            >
              <Text style={[styles.optionLabel, { color: theme.text }]}>{getTimeFilterText(timeFilter)}</Text>
              <Ionicons
                name={localFilter.timeFilter === timeFilter ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={theme.accent}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Purchase States */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Stav výkupu</Text>
          {Object.values(PurchaseState).map((state) => (
            <TouchableOpacity
              key={state}
              style={[styles.optionRow, { borderBottomColor: theme.border }]}
              onPress={() => togglePurchaseState(state)}
            >
              <Text style={[styles.optionLabel, { color: theme.text }]}>{getStateText(state)}</Text>
              <Ionicons
                name={localFilter.purchaseStateFilter.includes(state) ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={theme.accent}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Buyer dropdown */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Výkupčí</Text>
          <View style={{ paddingHorizontal: 16 }}>
            {usersLoading ? (
              <ActivityIndicator color={theme.accent} />
            ) : (
              <SelectionPicker
                label="Výkupčí"
                value={localFilter.employeeId ? getBuyerDisplayName(localFilter.employeeId) : '---Výběr---'}
                options={buyerOptions.map(id => getBuyerDisplayName(id))}
                onSelect={(displayName) => {
                  const userId = users.find(u => u.lastName === displayName)?.id;
                  updateFilter({ employeeId: displayName === '---Výběr---' ? '' : userId });
                }}
                placeholder="---Výběr---"
              />
            )}
          </View>
        </View>

        {/* Clear All Button */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <TouchableOpacity style={[styles.clearButton, { backgroundColor: theme.error }]} onPress={handleClear}>
            <Text style={styles.clearButtonText}>Vymazat všechny filtry</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  headerSaveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FF3B30' },
  headerSaveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  cancelButton: {
    fontSize: 17,
    color: '#8E8E93',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  saveButton: {
    fontSize: 17,
    color: '#e30613',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 20,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  filterInfo: {
    flex: 1,
    marginRight: 16,
  },
  filterLabel: {
    fontSize: 17,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  filterDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  optionLabel: {
    fontSize: 17,
    color: '#1A1A1A',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    marginBottom: 8,
  },
  textInput: {
    fontSize: 17,
    color: '#1A1A1A',
    padding: 0,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});