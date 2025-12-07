import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  View, 
  Text, 
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PurchaseCard } from '@/components/PurchaseCard';
import { NewPurchaseModal, PurchaseInitData } from '@/components/NewPurchaseModal';
import { VinScanner } from '@/components/VinScanner';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Purchase } from '@/constants/types';
import { mockEmployees } from '@/constants/mockData';

export default function PurchasesScreen() {
  const { theme } = useTheme();
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [showVinScanner, setShowVinScanner] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { 
    filteredPurchases, 
    filter, 
    refreshing, 
    refreshPurchases 
  } = usePurchases();

  // Filtrování podle vyhledávání
  const searchedPurchases = useMemo(() => {
    if (!searchQuery.trim()) return filteredPurchases;

    const query = searchQuery.toLowerCase();
    return filteredPurchases.filter(purchase => 
      purchase.clientName.toLowerCase().includes(query) ||
      purchase.spz.toLowerCase().includes(query) ||
      purchase.carDetails?.make?.toLowerCase().includes(query) ||
      purchase.carDetails?.model?.toLowerCase().includes(query) ||
      purchase.carDetails?.vin?.toLowerCase().includes(query) ||
      purchase.notes?.toLowerCase().includes(query)
    );
  }, [filteredPurchases, searchQuery]);
  const handleFilterPress = () => {
    router.push('/filters');
  };

  const handleNewPurchasePress = () => {
    setShowNewPurchaseModal(true);
  };

  const handleVinScan = () => {
    setShowVinScanner(true);
  };

  const handleVinDetected = (vin: string) => {
    setShowVinScanner(false);
    router.push({
      pathname: '/new-purchase',
      params: { vin },
    });
  };
  const handleCreatePurchase = (data: PurchaseInitData) => {
    setShowNewPurchaseModal(false);
    router.push({
      pathname: '/new-purchase',
      params: {
        vin: data.vin,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        companyName: data.companyName || '',
        isCompany: data.isCompany ? '1' : '0',
        ico: data.ico || '',
        vehicleData: data.vehicleData ? JSON.stringify(data.vehicleData) : '',
        companyData: data.companyData ? JSON.stringify(data.companyData) : '',
      },
    });
  };

  const handleCreateEmpty = () => {
    setShowNewPurchaseModal(false);
    router.push('/new-purchase');
  };

  const renderPurchase = ({ item }: { item: Purchase }) => (
    <PurchaseCard purchase={item} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="document-text-outline" size={64} color={theme.textTertiary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        {searchQuery ? 'Žádné výsledky' : 'Žádné výkupy nenalezeny'}
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        {searchQuery 
          ? `Nenalezeny žádné výkupy pro "${searchQuery}"`
          : filter.clientName || filter.spz || filter.employeePurchasesOnly || filter.todayPurchases
            ? 'Zkuste upravit filtry'
            : 'Přidejte svůj první výkup'
        }
      </Text>
      {!searchQuery && (
        <TouchableOpacity 
          style={[styles.emptyButton, { backgroundColor: theme.accent }]} 
          onPress={handleNewPurchasePress}
        >
          <Text style={styles.emptyButtonText}>Nový výkup</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filter.clientName) count++;
    if (filter.spz) count++;
    if (filter.employeePurchasesOnly) count++;
    if (filter.todayPurchases) count++;
    if (filter.timeFilter !== 'ALL') count++;
    if (filter.purchaseStateFilter.length < 3) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();
  const currentEmployee = mockEmployees.find(emp => emp.id === '1');

  const getPurchaseText = () => {
    const count = searchedPurchases.length;
    if (count === 1) return '1 výkup';
    if (count >= 2 && count <= 4) return `${count} výkupy`;
    return `${count} výkupů`;
  };
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: theme.text }]}>AUTOHITY</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {getPurchaseText()}
              {currentEmployee && ` • ${currentEmployee.name}`}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: theme.inputBackground }]}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Ionicons 
                name={showSearch ? 'close' : 'search'} 
                size={20} 
                color={theme.text} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.iconButton, { backgroundColor: theme.inputBackground }]}
              onPress={handleVinScan}
            >
              <Ionicons name="scan" size={20} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[
                styles.iconButton, 
                { backgroundColor: activeFiltersCount > 0 ? theme.accent : theme.inputBackground }
              ]} 
              onPress={handleFilterPress}
            >
              <Ionicons 
                name="funnel" 
                size={20} 
                color={activeFiltersCount > 0 ? '#FFFFFF' : theme.text} 
              />
              {activeFiltersCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: theme.accent }]} 
              onPress={handleNewPurchasePress}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        {showSearch && (
          <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground }]}>
            <Ionicons name="search" size={18} color={theme.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Hledat v historii výkupů..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Purchases List */}
      <FlatList
        data={searchedPurchases}
        renderItem={renderPurchase}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          searchedPurchases.length === 0 && styles.emptyListContent
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshPurchases}
            tintColor={theme.accent}
            colors={[theme.accent]}
            title="Potáhněte pro obnovení"
          />
        }
      />

      {/* New Purchase Modal */}
      <NewPurchaseModal
        visible={showNewPurchaseModal}
        onClose={() => setShowNewPurchaseModal(false)}
        onCreatePurchase={handleCreatePurchase}
        onCreateEmpty={handleCreateEmpty}
      />

      {/* VIN Scanner */}
      <VinScanner
        visible={showVinScanner}
        onClose={() => setShowVinScanner(false)}
        onVinDetected={handleVinDetected}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});