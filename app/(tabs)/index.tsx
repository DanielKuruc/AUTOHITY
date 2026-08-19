import { NewPurchaseModal, PurchaseInitData } from '@/components/NewPurchaseModal';
import { PurchaseCard } from '@/components/PurchaseCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SidebarBrand } from '@/components/SidebarBrand';
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
  ActivityIndicator,
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
    retryUpload,
    isLoadingMore,
    hasMore,
    loadMorePurchases,
    searchQuery,
    setSearchQuery,
    isSearching,
    loadError
  } = usePurchases();

  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const { users } = useUsers();
  const { user: currentUser } = useAuth();

  // Refresh users seznam když se screen focusne (např. po přihlášení)
  useFocusEffect(
    React.useCallback(() => {
    }, []) // Empty dependency - refreshUsers je stabilní funkce z kontextu
  );

  // Get user name for display
  const userName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : user?.userName || 'Přihlášený uživatel';

  // Hledání probíhá na serveru (viz PurchaseContext), tady už jen spojíme
  // rozpracované uploady s tím, co přišlo z API. Během hledání je neukazujeme,
  // aby neplavaly v nesouvisejících výsledcích.
  const searchedPurchases = useMemo(() => {
    if (searchQuery.trim()) return filteredPurchases;

    return [
      ...pendingUploads.map(p => ({
        ...p.purchase,
        __pending: true,
        __pendingId: p.id,
        __progress: p.progress,
        __status: p.status,
      })),
      ...filteredPurchases
    ];
  }, [filteredPurchases, searchQuery, pendingUploads]);
  const handleFilterPress = () => {
    router.push('/filters');
  };

  const toggleSearch = () => {
    // Při zavření vyčistíme dotaz, ať nezůstane viset skrytý filtr
    if (showSearch) setSearchQuery('');
    setShowSearch(!showSearch);
  };

  const handleNewPurchasePress = () => {
    setShowNewPurchaseModal(true);
  };

  const handleCreatePurchase = (data: PurchaseInitData) => {
    console.log('handleCreatePurchase - data from modal:', {
      vin: data.vin,
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      ico: data.ico,
      isCompany: data.isCompany,
      companyData: data.companyData,
    });
    setInitData(data);
    setShowNewPurchaseModal(false);
    // Navigate to new-purchase root, let index.tsx load the data into context
    // Then user can switch to automobil tab
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
      isPending={(item as any).__pending}
      progress={(item as any).__progress || 0}
      status={(item as any).__status}
      onRetry={(id: string) => retryUpload(id)}
    />
  );

  const renderEmptyState = () => {
    if (isSearching) {
      return (
        <View style={[styles.emptyState, { backgroundColor: theme.background }]}>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary, marginTop: 16 }]}>
            Hledám...
          </Text>
        </View>
      );
    }

    if (loadError) {
      return (
        <View style={[styles.emptyState, { backgroundColor: theme.background }]}>
          <Ionicons name="cloud-offline-outline" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Načtení se nezdařilo</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>{loadError}</Text>
          <TouchableOpacity onPress={refreshPurchases}>
            <Text style={[styles.emptySubtitle, { color: theme.accent }]}>Zkusit znovu</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (searchQuery.trim()) {
      return (
        <View style={[styles.emptyState, { backgroundColor: theme.background }]}>
          <Ionicons name="search-outline" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Nic nenalezeno</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Pro „{searchQuery.trim()}“ nemáme žádný výkup
          </Text>
        </View>
      );
    }

    return (
      <View style={[styles.emptyState, { backgroundColor: theme.background }]}>
        <Ionicons name="layers-outline" size={48} color={theme.textTertiary} />
        <Text style={[styles.emptyTitle, { color: theme.text }]}>Žádné výkupy</Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          Vytvořte nový výkup nebo si prohlédněte historii
        </Text>
      </View>
    );
  };

  const renderLoadingFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={[styles.loadingFooter, { backgroundColor: theme.background }]}>
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Načítám více výkupů...</Text>
      </View>
    );
  };

  const handleEndReached = () => {
    if (hasMore && !isLoadingMore) {
      loadMorePurchases();
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[isSplitView ? styles.splitLayout : styles.stackedLayout]}>
        {/* LEFT SIDEBAR - TABLET ONLY */}
        {isSplitView && (
          <View style={[styles.sidebar, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
            <SidebarBrand />

            <ScrollView style={styles.sidebarScroll} showsVerticalScrollIndicator={false}>
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
          <ScreenHeader
            title="Výkupy"
            actions={
              <>
                {/* Header actions - TABLET ONLY (ikona + text) */}
                {isSplitView && (
                  <View style={styles.headerActionsTablet}>
                    <TouchableOpacity
                      style={[styles.headerActionButton, { backgroundColor: theme.inputBackground }]}
                      onPress={toggleSearch}
                    >
                      <Ionicons name="search" size={20} color={theme.text} />
                      <Text style={[styles.headerActionText, { color: theme.text }]}>Hledat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.headerActionButton, { backgroundColor: theme.inputBackground }]}
                      onPress={handleFilterPress}
                    >
                      <Ionicons
                        name={activeFiltersCount > 0 ? 'funnel' : 'funnel-outline'}
                        size={20}
                        color={activeFiltersCount > 0 ? theme.accent : theme.text}
                      />
                      <Text style={[
                        styles.headerActionText,
                        { color: activeFiltersCount > 0 ? theme.accent : theme.text }
                      ]}>
                        {activeFiltersCount > 0 ? `Filtry (${activeFiltersCount})` : 'Filtry'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.headerActionButton, { backgroundColor: theme.accent }]}
                      onPress={handleNewPurchasePress}
                    >
                      <Ionicons name="add" size={20} color="#FFFFFF" />
                      <Text style={[styles.headerActionText, { color: '#FFFFFF' }]}>Nový výkup</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Header actions - PHONE ONLY */}
                {!isSplitView && (
                  <View style={styles.headerActions}>
                    <TouchableOpacity
                      style={styles.iconButtonPlain}
                      onPress={toggleSearch}
                    >
                      <Ionicons name="search" size={22} color={theme.text} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButtonPlain}
                      onPress={handleFilterPress}
                    >
                      <Ionicons
                        name={activeFiltersCount > 0 ? 'funnel' : 'funnel-outline'}
                        size={22}
                        color={activeFiltersCount > 0 ? theme.accent : theme.text}
                      />
                      {activeFiltersCount > 0 && (
                        <View style={[styles.filterBadge, { borderColor: theme.background }]}>
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
              </>
            }
          >
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
                  {isSearching && <ActivityIndicator size="small" color={theme.textTertiary} />}
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
          </ScreenHeader>

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
            ListFooterComponent={renderLoadingFooter}
            scrollEnabled={true}
            nestedScrollEnabled={false}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.8}
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
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: 'column',
  },
  sidebarScroll: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 12,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  sidebarNavItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  textSecondary: {
    fontSize: 14,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerActionsTablet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  headerActionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  iconButtonPlain: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
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
  loadingFooter: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
