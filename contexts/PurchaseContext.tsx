import { apiService, transformApiToCamelCase } from '@/services/apiService';
import { AresCompanyData } from '@/services/aresApi';
import { VehicleDataResponse } from '@/services/vehicleDataApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { defaultPurchaseFilter } from '../constants/mockData';
import { Purchase, PurchaseFilter, PurchaseState } from '../constants/types';
import { useAuth } from './AuthContext';

interface InitialPurchaseData {
  vin?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  isCompany?: boolean;
  ico?: string;
  vehicleData?: VehicleDataResponse;
  companyData?: AresCompanyData;
  clientId?: number; // ✅ ADDED: clientId from history
}

interface AutomobilData {
  znacka: string;
  model: string;
  spz: string;
  motorovaVarianta: string;
  km: string;
  stk: string;
  vykon: string;
  barva: string;
  vin: string;
  prevodovka: string;
  palivo: string;
  pohon: string;
  doProvozu: string;
  pocetVlastniku: string;
  pocetProvozovatelu: string;
  dovoz: boolean;
  prvniMajitel: boolean;
  servisniKnizka: boolean;
  cebia: boolean;
  caVertical: boolean;
  protiucet: boolean;
  registered?: boolean;
}
interface PendingUpload {
  id: string;
  purchase: Purchase;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}
interface PurchaseContextType {
  purchases: Purchase[];
  pendingUploads: PendingUpload[];
  filteredPurchases: Purchase[];
  filter: PurchaseFilter;
  searchQuery: string;
  isSearching: boolean;
  loadError: string | null;
  loading: boolean;
  refreshing: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  currentPage: number;
  pageSize: number;
  initData?: InitialPurchaseData;
  automobilData?: AutomobilData;
  generalNotes: string;
  serviceNotes: string;
  setFilter: (filter: PurchaseFilter) => void;
  clearFilter: () => void;
  setSearchQuery: (query: string) => void;
  refreshPurchases: () => Promise<void>;
  loadMorePurchases: () => Promise<void>;
  addPurchase: (purchase: Purchase) => void;
  addPendingUpload: (purchase: Purchase) => string;
  updatePurchaseProgress: (id: string, progress: number) => void;
  markUploadSuccess: (id: string) => void;
  markUploadError: (id: string, error: string) => void;
  retryUpload: (id: string) => void;
  updatePurchase: (id: string, updates: Partial<Purchase>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  getPurchaseById: (id: string) => Purchase | undefined;
  setInitData: (data: InitialPurchaseData) => void;
  clearInitData: () => void;
  setAutomobilData: (data: AutomobilData) => void;
  clearAutomobilData: () => void;
  setGeneralNotes: (notes: string) => void;
  setServiceNotes: (notes: string) => void;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

const STORAGE_KEY = 'autohity_filter';

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [filter, setFilterState] = useState<PurchaseFilter>(defaultPurchaseFilter);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20; // 20 items per page
  // Hledání běží na serveru nad všemi výkupy, ne jen nad načtenými stránkami
  const [searchQuery, setSearchQueryState] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const activeSearchRef = useRef('');
  const loadRequestId = useRef(0);
  const [initData, setInitData] = useState<InitialPurchaseData | undefined>(undefined);
  const [automobilData, setAutomobilData] = useState<AutomobilData | undefined>(undefined);
  const [generalNotes, setGeneralNotes] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');

  // Load saved filter
  useEffect(() => {
    loadSavedFilter();
  }, []);

  // Načte první stránku pro daný hledaný výraz. Starší odpovědi se zahazují,
  // aby při rychlém psaní nepřepsaly výsledek posledního dotazu.
  const loadFirstPage = async (search: string) => {
    const requestId = ++loadRequestId.current;
    try {
      const result = await apiService.fetchPurchasesPage(0, pageSize, search);
      if (requestId !== loadRequestId.current) return;
      setPurchases(result.items);
      setCurrentPage(0);
      setHasMore(result.hasMore);
      setLoadError(null);
    } catch (error: any) {
      if (requestId !== loadRequestId.current) return;
      // Chybu ukážeme - prázdný seznam by vypadal jako "nic nenalezeno"
      setLoadError(error?.message || 'Načtení se nezdařilo');
      setPurchases([]);
      setHasMore(false);
    } finally {
      if (requestId === loadRequestId.current) setIsSearching(false);
    }
  };

  // Sync from API when component mounts (after token is available)
  // Add delay to ensure token is restored from AsyncStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      loadFirstPage(activeSearchRef.current);
    }, 500); // 500ms delay to allow token restoration

    return () => clearTimeout(timer);
  }, []);

  // Debounce psaní v hledání
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed === activeSearch) return;
    setIsSearching(true);
    const timer = setTimeout(() => setActiveSearch(trimmed), 350);
    return () => clearTimeout(timer);
  }, [searchQuery, activeSearch]);

  // Změna hledaného výrazu = nový dotaz na server od první stránky
  const didMountSearch = useRef(false);
  useEffect(() => {
    activeSearchRef.current = activeSearch;
    if (!didMountSearch.current) {
      didMountSearch.current = true;
      return;
    }
    setIsSearching(true);
    loadFirstPage(activeSearch);
  }, [activeSearch]);

  // Apply filters to purchases
  const filteredPurchases = purchases.filter(purchase => {
    // Employee filter - show only current user's purchases
    if (filter.employeePurchasesOnly && user?.id) {
      if (purchase.employeeId !== user.id) {
        return false;
      }
    }

    // Time filter - SINGLE source of truth
    if (filter.timeFilter !== 'ALL') {
      const purchaseDate = purchase.purchaseDate ? new Date(purchase.purchaseDate) : null;
      if (!purchaseDate) return false;

      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const purchaseDateStr = purchaseDate.toISOString().split('T')[0];

      switch (filter.timeFilter) {
        case 'TODAY':
          if (todayStr !== purchaseDateStr) return false;
          break;
        case 'WEEK':
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          if (purchaseDate < weekAgo) return false;
          break;
        case 'MONTH':
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          if (purchaseDate < monthAgo) return false;
          break;
      }
    }

    // Purchase state filter
    if (!filter.purchaseStateFilter.includes(purchase.purchaseState)) {
      return false;
    }

    // Client name filter
    if (filter.clientName && !purchase.clientName.toLowerCase().includes(filter.clientName.toLowerCase())) {
      return false;
    }

    // SPZ (license plate) filter
    if (filter.spz && !purchase.spz.toLowerCase().includes(filter.spz.toLowerCase())) {
      return false;
    }

    // Employee filter
    if (filter.employeeId && purchase.employeeId !== filter.employeeId) {
      return false;
    }

    // Service notes filter
    if (filter.serviceNotesOnly) {
      if (purchase.purchaseState !== PurchaseState.COMPLETED) {
        return false;
      }
      if (!purchase.serviceNotes || purchase.serviceNotes.trim() === '') {
        return false;
      }
    }

    return true;
  });

  const loadSavedFilter = async () => {
    try {
      const savedFilter = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedFilter) {
        setFilterState(JSON.parse(savedFilter));
      }
    } catch {
      // Silent fail
    }
  };

  const setFilter = async (newFilter: PurchaseFilter) => {
    setFilterState(newFilter);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newFilter));
    } catch {
      // Silent fail
    }
  };

  const clearFilter = async () => {
    const clearedFilter = defaultPurchaseFilter;
    setFilterState(clearedFilter);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clearedFilter));
    } catch {
      // Silent fail
    }
  };

  const refreshPurchases = async () => {
    setRefreshing(true);
    await loadFirstPage(activeSearchRef.current);
    setRefreshing(false);
  };

  const loadMorePurchases = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const searchAtStart = activeSearchRef.current;
    try {
      const nextPage = currentPage + 1;
      const result = await apiService.fetchPurchasesPage(nextPage, pageSize, searchAtStart);
      // Hledaný výraz se mezitím změnil - výsledky už nepatří k aktuálnímu seznamu
      if (searchAtStart !== activeSearchRef.current) return;
      setPurchases(prev => [...prev, ...result.items]);
      setCurrentPage(nextPage);
      setHasMore(result.hasMore);
    } catch (error) {
      // Error handled silently
    } finally {
      setIsLoadingMore(false);
    }
  };

  const addPurchase = (purchase: Purchase) => {
    setPurchases(prev => [purchase, ...prev]);
    // Reset pagination when new purchase is added
    setCurrentPage(0);
  };

  const setInitDataFn = (data: InitialPurchaseData) => {
    setInitData(data);
  };

  const clearInitDataFn = () => {
    setInitData(undefined);
  };

  const setAutomobilDataFn = (data: AutomobilData) => {
    setAutomobilData(data);
  };

  const clearAutomobilDataFn = () => {
    setAutomobilData(undefined);
  };
  const addPendingUpload = (purchase: Purchase): string => {
    const localId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pending: PendingUpload = {
      id: localId,
      purchase,
      status: 'uploading',
      progress: 0,
    };
    setPendingUploads(prev => [pending, ...prev]);
    return localId;
  };

  const updatePurchaseProgress = (id: string, progress: number) => {
    setPendingUploads(prev =>
      prev.map(u => u.id === id ? { ...u, progress } : u)
    );
  };

  const markUploadSuccess = (id: string) => {
    setPendingUploads(prev =>
      prev.map(u => u.id === id ? { ...u, status: 'success', progress: 100 } : u)
    );
    setGeneralNotes('');
    setServiceNotes('');
    setTimeout(() => {
      setPendingUploads(prev => prev.filter(u => u.id !== id));
    }, 2000);
  };

  const markUploadError = (id: string, error: string) => {
    setPendingUploads(prev =>
      prev.map(u => u.id === id ? { ...u, status: 'error', error } : u)
    );
  };

  const retryUpload = (id: string) => {
    const pending = pendingUploads.find(u => u.id === id);
    if (!pending) return;
    setPendingUploads(prev =>
      prev.map(u => u.id === id ? { ...u, status: 'uploading', progress: 0, error: undefined } : u)
    );
    uploadPurchaseInBackground(id, pending.purchase);
  };

  const uploadPurchaseInBackground = async (localId: string, purchase: Purchase) => {
    try {
      const result = await apiService.createPurchase(purchase);
      if (result.id) {
        const purchaseWithId = { ...purchase, id: result.id };
        setPurchases(prev => [purchaseWithId, ...prev]);
        markUploadSuccess(localId);
      } else {
        markUploadError(localId, 'Server error');
      }
    } catch (error: any) {
      markUploadError(localId, error.message || 'Upload failed');
    }
  };

  const updatePurchase = async (id: string, updates: Partial<Purchase>) => {
    try {
      const result = await apiService.updatePurchase(id, updates);
      // API returns { success: true, data: row } - extract the data
      const purchaseData = result?.data || result;
      
      // If API returns updated purchase data, use that (it has all carDetails, etc)
      if (purchaseData && purchaseData.id) {
        // API response already comes in snake_case from PHP, need to transform to camelCase
        const transformed = transformApiToCamelCase(purchaseData);
        setPurchases(prev =>
          prev.map(p => p.id === id ? transformed : p)
        );
      } else {
        // Fallback: optimistic update
        setPurchases(prev =>
          prev.map(p => p.id === id ? { ...p, ...updates } : p)
        );
      }
    } catch (error) {
      // Error handled silently
      // Still update local state even on error for optimistic UI updates
      setPurchases(prev =>
        prev.map(p => p.id === id ? { ...p, ...updates } : p)
      );
      throw error;
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      await apiService.deletePurchase(id);
      setPurchases(prev => prev.filter(p => p.id !== id));
    } catch {
      setPurchases(prev => prev.filter(p => p.id !== id));
    }
  };

  const getPurchaseById = (id: string): Purchase | undefined => {
    return purchases.find(p => p.id === id);
  };
  const value: PurchaseContextType = {
    purchases,
    pendingUploads,
    filteredPurchases,
    filter,
    searchQuery,
    isSearching,
    loadError,
    loading,
    refreshing,
    isLoadingMore,
    hasMore,
    currentPage,
    pageSize,
    initData,
    automobilData,
    generalNotes,
    serviceNotes,
    setFilter,
    clearFilter,
    setSearchQuery: setSearchQueryState,
    refreshPurchases,
    loadMorePurchases,
    addPurchase,
    addPendingUpload,
    updatePurchaseProgress,
    markUploadSuccess,
    markUploadError,
    retryUpload,
    updatePurchase,
    deletePurchase,
    getPurchaseById,
    setInitData: setInitDataFn,
    clearInitData: clearInitDataFn,
    setAutomobilData: setAutomobilDataFn,
    clearAutomobilData: clearAutomobilDataFn,
    setGeneralNotes,
    setServiceNotes,
  };

  return (
    <PurchaseContext.Provider value={value}>
      {children}
    </PurchaseContext.Provider>
  );
}

export function usePurchases() {
  const context = useContext(PurchaseContext);
  if (context === undefined) {
    throw new Error('usePurchases must be used within a PurchaseProvider');
  }
  return context;
}