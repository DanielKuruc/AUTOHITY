import { NewPurchaseModal, PurchaseInitData } from '@/components/NewPurchaseModal';
import { PurchaseCard } from '@/components/PurchaseCard';
import { SidebarUserSection } from '@/components/SidebarUserSection';
import { Purchase } from '@/constants/types';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useUsers } from '@/contexts/UsersContext';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function PurchasesScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { refreshUsers } = useUsers();
  const { gridColumns, isTablet, isSplitView } = useTabletLayout();
  const { 
    filteredPurchases, 
    filter, 
    refreshing, 
    refreshPurchases,
    setInitData,
    pendingUploads,
    retryUpload
  } = usePurchases();

  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { users } = useUsers();
  const { user: currentUser } = useAuth();

  // Refresh users seznam když se screen focusne (např. po přihlášení)
  useFocusEffect(
    React.useCallback(() => {
      console.log('[Purchases] Screen focused - refreshing users list');
      refreshUsers().catch(err => console.error('[Purchases] Failed to refresh users:', err));
    }, []) // Empty dependency - refreshUsers je stabilní funkce z kontextu
  );

  // Get user name for display
  const userName = user?.firstName && user?.lastName 
    ? `${user.firstName} ${user.lastName}`
    : user?.userName || 'Přihlášený uživatel';

  // Filtrování podle vyhledávání
  const searchedPurchases = useMemo(() => {
    // Combine pending uploads with filtered purchases
    const allPurchases = [
      ...pendingUploads.map(p => ({
        ...p.purchase,
        __pending: true,
        __pendingId: p.id,
        __progress: p.progress,
        __status: p.status,
      })),
      ...filteredPurchases
    ];

    if (!searchQuery.trim()) return allPurchases;

    const query = searchQuery.toLowerCase();
    return allPurchases.filter(purchase => 
      purchase.clientName.toLowerCase().includes(query) ||
      purchase.spz.toLowerCase().includes(query) ||
      purchase.carDetails?.make?.toLowerCase().includes(query) ||
      purchase.carDetails?.model?.toLowerCase().includes(query) ||
      purchase.carDetails?.vin?.toLowerCase().includes(query) ||
      purchase.notes?.toLowerCase().includes(query)
    );
  }, [filteredPurchases, searchQuery, pendingUploads]);
  const handleFilterPress = () => {
    router.push('/filters');
  };

  const handleNewPurchasePress = () => {
    setShowNewPurchaseModal(true);
  };

  const handleCreatePurchase = (data: PurchaseInitData) => {
    setInitData(data);
    setShowNewPurchaseModal(false);
    router.push('/new-purchase');
  };

  const handleCreateEmpty = () => {
    setShowNewPurchaseModal(false);
    router.push('/new-purchase');
  };

  const getPurchaseText = () => {
    const count = searchedPurchases.length;
    if (count === 1) return '1 výkup';
    if (count >= 2 && count <= 4) return `${count} výkupy`;
    return `${count} výkupů`;
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filter.clientName) count++;
    if (filter.spz) count++;
    if (filter.employeeId) count++;
    if (filter.employeePurchasesOnly) count++;
    if (filter.todayPurchases) count++;
    if (filter.timeFilter !== 'ALL') count++;
    if (filter.purchaseStateFilter.length < 3) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const renderPurchase = ({ item }: { item: Purchase }) => (
    <PurchaseCard 
      purchase={item} 
      onRetry={(id: string) => retryUpload(id)}
    />
  );

  const renderEmptyState = () => (
    <View style={[styles.emptyState, { backgroundColor: theme.background }]}>
      <Ionicons name="layers-outline" size={48} color={theme.textTertiary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>Žádné výkupy</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Vytvořte nový výkup nebo si prohlédněte historii
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[isSplitView ? styles.splitLayout : styles.stackedLayout]}>
        {/* LEFT SIDEBAR - TABLET ONLY */}
        {isSplitView && (
          <View style={[styles.sidebar, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
            <ScrollView style={styles.sidebarScroll} showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                style={[styles.sidebarItem, { backgroundColor: theme.accent }]}
                onPress={handleNewPurchasePress}
              >
                <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                <Text style={styles.sidebarItemText}>Nový výkup</Text>
              </TouchableOpacity>

              <View style={[styles.sidebarDivider, { backgroundColor: theme.border }]} />

              <TouchableOpacity 
                style={styles.sidebarNavItem}
                onPress={() => setShowSearch(!showSearch)}
              >
                <Ionicons name="search" size={20} color={theme.textSecondary} />
                <Text style={[styles.sidebarNavItemText, { color: theme.text }]}>Hledat</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.sidebarNavItem}
                onPress={handleFilterPress}
              >
                <Ionicons name="funnel" size={20} color={activeFiltersCount > 0 ? theme.accent : theme.textSecondary} />
                <Text style={[
                  styles.sidebarNavItemText,
                  { color: activeFiltersCount > 0 ? theme.accent : theme.text }
                ]}>
                  {activeFiltersCount > 0 ? `Filtry (${activeFiltersCount})` : 'Filtry'}
                </Text>
              </TouchableOpacity>

              <View style={[styles.sidebarDivider, { backgroundColor: theme.border }]} />

              <TouchableOpacity 
                style={[styles.sidebarNavItem, { backgroundColor: theme.accent }]}
                onPress={() => router.push('/(tabs)')}
              >
                <Ionicons name="car" size={20} color="#FFFFFF" />
                <Text style={[styles.sidebarNavItemText, { color: '#FFFFFF' }]}>Výkupy</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.sidebarNavItem}
                onPress={() => router.push('/(tabs)/statistiky')}
              >
                <Ionicons name="bar-chart" size={20} color={theme.textSecondary} />
                <Text style={[styles.sidebarNavItemText, { color: theme.text }]}>Statistiky</Text>
              </TouchableOpacity>

              {users.find(u => u.id === currentUser?.id)?.isAdmin && (
                <TouchableOpacity 
                  style={styles.sidebarNavItem}
                  onPress={() => router.push('/(tabs)/reporty')}
                >
                  <Ionicons name="document-text" size={20} color={theme.textSecondary} />
                  <Text style={[styles.sidebarNavItemText, { color: theme.text }]}>Reporty</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.sidebarNavItem}
                onPress={() => router.push('/(tabs)/notifications')}
              >
                <Ionicons name="notifications" size={20} color={theme.textSecondary} />
                <Text style={[styles.sidebarNavItemText, { color: theme.text }]}>Notifikace</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* User Profile Section at Bottom */}
            <SidebarUserSection />
          </View>
        )}

        {/* RIGHT CONTENT */}
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Text style={[styles.title, { color: theme.text }]}>AUTOHITY</Text>
              </View>

              {/* Header actions - PHONE ONLY */}
              {!isSplitView && (
                <View style={styles.headerActions}>
                  <TouchableOpacity 
                    style={[styles.iconButton, { backgroundColor: theme.headerButtonBackground }]} 
                    onPress={() => setShowSearch(!showSearch)}
                  >
                    <Ionicons name="search" size={20} color={theme.headerButtonText} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[
                      styles.iconButton, 
                      { backgroundColor: activeFiltersCount > 0 ? theme.accent : theme.headerButtonBackground }
                    ]} 
                    onPress={handleFilterPress}
                  >
                    <Ionicons 
                      name="funnel" 
                      size={20} 
                      color={activeFiltersCount > 0 ? '#FFFFFF' : theme.headerButtonText} 
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
              )}
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

          {/* Purchases List - Multi-column on tablet */}
          <FlatList
            data={searchedPurchases}
            keyExtractor={(item) => item.id}
            renderItem={renderPurchase}
            showsVerticalScrollIndicator={false}
            numColumns={gridColumns}
            key={`grid-${gridColumns}`}
            columnWrapperStyle={gridColumns > 1 ? [styles.gridRow, { gap: 12, paddingHorizontal: 12 }] : undefined}
            contentContainerStyle={[
              styles.listContent,
              searchedPurchases.length === 0 && styles.emptyListContent,
              gridColumns > 1 && { paddingHorizontal: 0 }
            ]}
            ListEmptyComponent={renderEmptyState}
            scrollEnabled={true}
            nestedScrollEnabled={false}
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
        </View>
      </View>
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
  splitLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  stackedLayout: {
    flex: 1,
    flexDirection: 'column',
  },
  sidebar: {
    width: 220,
    borderRightWidth: 1,
    paddingHorizontal: 12,
    paddingBottom: 0,
    flexDirection: 'column',
  },
  sidebarScroll: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
  },
  sidebarItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 12,
  },
  sidebarNavItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sidebarDivider: {
    height: 1,
    marginVertical: 8,
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
  textSecondary: {
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
  gridRow: {
    flex: 1,
    justifyContent: 'space-between',
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
});