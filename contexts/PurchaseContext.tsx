import { apiService } from '@/services/apiService';
import { AresCompanyData } from '@/services/aresApi';
import { VehicleDataResponse } from '@/services/vehicleDataApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
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
  loading: boolean;
  refreshing: boolean;
  initData?: InitialPurchaseData;
  automobilData?: AutomobilData;
  generalNotes: string;
  serviceNotes: string;
  setFilter: (filter: PurchaseFilter) => void;
  clearFilter: () => void;
  refreshPurchases: () => Promise<void>;
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
  const [initData, setInitData] = useState<InitialPurchaseData | undefined>(undefined);
  const [automobilData, setAutomobilData] = useState<AutomobilData | undefined>(undefined);
  const [generalNotes, setGeneralNotes] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');

  // Load saved filter
  useEffect(() => {
    loadSavedFilter();
  }, []);

  // Sync from API when component mounts (after token is available)
  // Add delay to ensure token is restored from AsyncStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      apiService.getPurchases()
        .then((apiPurchases: any) => {
          console.log('[PurchaseContext] Synced from API on startup:', apiPurchases.length);
          setPurchases(apiPurchases);
        })
        .catch((error: any) => {
          console.error('[PurchaseContext] Chyba při synchronizaci na startu:', error);
          // Bez fallback - ukaž prázdný seznam
          setPurchases([]);
        });
    }, 500); // 500ms delay to allow token restoration

    return () => clearTimeout(timer);
  }, []);

  // Apply filters to purchases
  const filteredPurchases = purchases.filter(purchase => {
    // Employee filter - show only current user's purchases
    if (filter.employeePurchasesOnly && user?.id) {
      if (purchase.employeeId !== user.id) {
        console.log('[Filter] Skipping purchase', purchase.id, '- employeeId:', purchase.employeeId, '!== currentUserId:', user.id);
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

    // Employee filter - filtruj podle employeeId
    if (filter.employeeId && purchase.employeeId !== filter.employeeId) {
      return false;
    }

    // Service notes filter - show only completed purchases with service notes
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
    } catch (error) {
      console.log('Chyba při načítání uloženého filtru:', error);
    }
  };

  const setFilter = async (newFilter: PurchaseFilter) => {
    setFilterState(newFilter);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newFilter));
    } catch (error) {
      console.log('Chyba při ukládání filtru:', error);
    }
  };

  const clearFilter = async () => {
    const clearedFilter = defaultPurchaseFilter;
    setFilterState(clearedFilter);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(clearedFilter));
    } catch (error) {
      console.log('Chyba při mazání filtru:', error);
    }
  };

  const refreshPurchases = async () => {
    setRefreshing(true);
    try {
      // Načítat data z API
      const apiPurchases = await apiService.getPurchases();
      console.log('[PurchaseContext] Načteno z API:', apiPurchases.length);
      setPurchases(apiPurchases);
    } catch (error) {
      console.error('[PurchaseContext] Chyba při načítání z API:', error);
      // Bez fallback - ukaž prázdný seznam
      setPurchases([]);
    }
    setRefreshing(false);
  };

  const addPurchase = (purchase: Purchase) => {
    setPurchases(prev => [purchase, ...prev]);
    // Already synced to API during creation in new-purchase/index.tsx
    console.log('[PurchaseContext] Výkup přidán, již synchronizován s API');
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
  // Pending upload functions
  const addPendingUpload = (purchase: Purchase): string => {
    const localId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const pending: PendingUpload = {
      id: localId,
      purchase,
      status: 'uploading',
      progress: 0,
    };
    setPendingUploads(prev => [pending, ...prev]);
    console.log('[PurchaseContext] Added pending upload:', localId);
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
    // Reset notes after successful upload
    setGeneralNotes('');
    setServiceNotes('');
    // Remove from pending after 2 seconds
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
    // Trigger upload again
    uploadPurchaseInBackground(id, pending.purchase);
  };

  // Background upload function
  const uploadPurchaseInBackground = async (localId: string, purchase: Purchase) => {
    try {
      console.log('[PurchaseContext] Starting background upload:', localId);
      const result = await apiService.createPurchase(purchase);

      if (result.id) {
        console.log('[PurchaseContext] Upload success:', result.id);
        // Add to purchases list with server ID
        const purchaseWithId = { ...purchase, id: result.id };
        setPurchases(prev => [purchaseWithId, ...prev]);
        markUploadSuccess(localId);
      } else {
        markUploadError(localId, 'Server error');
      }
    } catch (error: any) {
      console.error('[PurchaseContext] Upload failed:', error);
      markUploadError(localId, error.message || 'Upload failed');
    }
  };

  // Update purchase function
  const updatePurchase = async (id: string, updates: Partial<Purchase>) => {
    try {
      console.log('[PurchaseContext] Updating purchase on server:', id, updates);
      // Nejdřív aktualizuj server
      await apiService.updatePurchase(id, updates);
      console.log('[PurchaseContext] Server update success');
      // Potom aktualizuj lokální state
      setPurchases(prev =>
        prev.map(p => p.id === id ? { ...p, ...updates } : p)
      );
    } catch (error) {
      console.error('[PurchaseContext] Failed to update purchase on server:', error);
      // Ještě aktualizuj lokální state aby se UI ihned zobrazilo
      setPurchases(prev =>
        prev.map(p => p.id === id ? { ...p, ...updates } : p)
      );
    }
  };

  // Delete purchase function
  const deletePurchase = async (id: string) => {
    try {
      console.log('[PurchaseContext] Deleting purchase on server:', id);
      // Nejdřív smaž na serveru
      await apiService.deletePurchase(id);
      console.log('[PurchaseContext] Server delete success');
      // Potom smaž z lokálního state
      setPurchases(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('[PurchaseContext] Failed to delete purchase on server:', error);
      // Ještě smaž z lokálního state aby se UI ihned aktualizovalo
      setPurchases(prev => prev.filter(p => p.id !== id));
    }
  };

  // Get purchase by ID
  const getPurchaseById = (id: string): Purchase | undefined => {
    return purchases.find(p => p.id === id);
  };
  const value: PurchaseContextType = {
    purchases,
    pendingUploads,
    filteredPurchases,
    filter,
    loading,
    refreshing,
    initData,
    automobilData,
    generalNotes,
    serviceNotes,
    setFilter,
    clearFilter,
    refreshPurchases,
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