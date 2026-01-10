import React, { useState, useMemo } from 'react';
import { 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  View, 
  Text, 
  RefreshControl,
  TextInput,
  Image as RNImage,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { PurchaseCard } from '@/components/PurchaseCard';
import { NewPurchaseModal, PurchaseInitData } from '@/components/NewPurchaseModal';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { Purchase } from '@/constants/types';
import { mockEmployees } from '@/constants/mockData';
import { apiService } from '@/services/apiService';

export default function PurchasesScreen() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { 
    filteredPurchases, 
    filter, 
    refreshing, 
    refreshPurchases,
    setInitData
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

  const handleCreatePurchase = (data: PurchaseInitData) => {
    setInitData(data);
    setShowNewPurchaseModal(false);
    // Navigate immediately
    router.push('/new-purchase');
  };

  const handleCreateEmpty = () => {
    setShowNewPurchaseModal(false);
    router.push('/new-purchase');
  };

  const handleTestApi = async () => {
    try {
      const now = new Date();
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const isoDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      // 1) Create purchase
      const createRes = await apiService.createPurchase({
        clientName: 'Test API',
        clientType: 'person',
        spz: `TEST${Date.now().toString().slice(-4)}`,
        purchaseDate: isoDate,
        purchaseState: 'NEW',
        notes: 'Created via Test API button',
      });
      const id = String(createRes.id || createRes.data?.id || createRes?.purchaseId || '');
      if (!id) throw new Error('Failed to obtain purchase ID');

      // 2) Upload one normal photo and one defect photo using bundled assets
      const carAsset = RNImage.resolveAssetSource(require('@/assets/test-car-2.jpg'));
      const defectAsset = RNImage.resolveAssetSource(require('@/assets/test-damage-1.jpg'));
      await apiService.uploadPhotos(id, [carAsset.uri]);
      const defectUpload = await apiService.uploadDefectPhotos(id, [defectAsset.uri]);

      // 3) Update notes
      await apiService.updatePurchase(id, { notes: 'Test API update OK' });

      // 4) Optionally delete uploaded defect photo (keep gallery tidy)
      const uploaded = (defectUpload as any)?.files?.[0] as string | undefined;
      if (uploaded) {
        const filename = uploaded.split('/').pop() as string;
        if (filename) {
          await apiService.deletePhoto(id, filename);
        }
      }

      showToast('Test API úspěšný ✅', 'success');
      // Refresh list to reflect the new record
      refreshPurchases();
    } catch (e: any) {
      showToast(e?.message || 'Chyba testu API', 'error');
    }
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
              style={[styles.iconButton, { backgroundColor: theme.inputBackground }]}
              onPress={handleTestApi}
              accessibilityLabel="Test API"
            >
              <Ionicons name="flask" size={20} color={theme.text} />
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