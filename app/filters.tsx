import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  View, 
  Text, 
  TextInput,
  Switch,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { usePurchases } from '@/contexts/PurchaseContext';
import { PurchaseFilter, PurchaseState, TimeFilterType } from '@/constants/types';
import { defaultPurchaseFilter } from '@/constants/mockData';

export default function FiltersScreen() {
  const { filter, setFilter, clearFilter } = usePurchases();
  const [localFilter, setLocalFilter] = useState<PurchaseFilter>(filter);

  useEffect(() => {
    setLocalFilter(filter);
  }, [filter]);

  const handleSave = async () => {
    await setFilter(localFilter);
    router.back();
  };

  const handleClear = () => {
    Alert.alert(
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
        return 'Nový';
      case PurchaseState.IN_PROGRESS:
        return 'Probíhá';
      case PurchaseState.COMPLETED:
        return 'Dokončen';
      case PurchaseState.CANCELLED:
        return 'Zrušen';
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel}>
          <Text style={styles.cancelButton}>Zrušit</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Filtry</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>Použít</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Filters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rychlé filtry</Text>
          <View style={styles.filterRow}>
            <View style={styles.filterInfo}>
              <Text style={styles.filterLabel}>Pouze moje výkupy</Text>
              <Text style={styles.filterDescription}>Zobrazit jen výkupy přiřazené mně</Text>
            </View>
            <Switch
              value={localFilter.employeePurchasesOnly}
              onValueChange={(value) => updateFilter({ employeePurchasesOnly: value })}
              trackColor={{ false: '#E5E5E7', true: '#e30613' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.filterRow}>
            <View style={styles.filterInfo}>
              <Text style={styles.filterLabel}>Dnešní výkupy</Text>
              <Text style={styles.filterDescription}>Zobrazit pouze dnešní výkupy</Text>
            </View>
            <Switch
              value={localFilter.todayPurchases}
              onValueChange={(value) => updateFilter({ todayPurchases: value })}
              trackColor={{ false: '#E5E5E7', true: '#e30613' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Time Filter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Časové období</Text>
          {Object.values(TimeFilterType).map((timeFilter) => (
            <TouchableOpacity
              key={timeFilter}
              style={styles.optionRow}
              onPress={() => updateFilter({ timeFilter })}
            >
              <Text style={styles.optionLabel}>{getTimeFilterText(timeFilter)}</Text>
              <Ionicons
                name={localFilter.timeFilter === timeFilter ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color="#e30613"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Purchase States */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stav výkupu</Text>
          {Object.values(PurchaseState).map((state) => (
            <TouchableOpacity
              key={state}
              style={styles.optionRow}
              onPress={() => togglePurchaseState(state)}
            >
              <Text style={styles.optionLabel}>{getStateText(state)}</Text>
              <Ionicons
                name={localFilter.purchaseStateFilter.includes(state) ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color="#e30613"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Search Filters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vyhledávání</Text>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Jméno klienta</Text>
            <TextInput
              style={styles.textInput}
              value={localFilter.clientName}
              onChangeText={(text) => updateFilter({ clientName: text })}
              placeholder="Zadejte jméno klienta..."
              placeholderTextColor="#8E8E93"
              returnKeyType="done"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Registrační značka (SPZ)</Text>
            <TextInput
              style={styles.textInput}
              value={localFilter.spz}
              onChangeText={(text) => updateFilter({ spz: text })}
              placeholder="Zadejte registrační značku..."
              placeholderTextColor="#8E8E93"
              returnKeyType="done"
              autoCapitalize="characters"
            />
          </View>
        </View>

        {/* Clear All Button */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
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