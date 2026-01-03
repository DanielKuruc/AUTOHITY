import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Purchase, PurchaseFilter } from '../constants/types';
import { mockPurchases, defaultPurchaseFilter, mockEmployees } from '../constants/mockData';
import { createRemindersForAllPurchases } from '@/services/reminderService';
import { apiService } from '@/services/apiService';
import { VehicleDataResponse } from '@/services/vehicleDataApi';
import { AresCompanyData } from '@/services/aresApi';

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

interface PurchaseContextType {
  purchases: Purchase[];
  filteredPurchases: Purchase[];
  filter: PurchaseFilter;
  loading: boolean;
  refreshing: boolean;
  initData?: InitialPurchaseData;
  setFilter: (filter: PurchaseFilter) => void;
  clearFilter: () => void;
  refreshPurchases: () => Promise<void>;
  addPurchase: (purchase: Purchase) => void;
  updatePurchase: (id: string, updates: Partial<Purchase>) => void;
  deletePurchase: (id: string) => void;
  getPurchaseById: (id: string) => Purchase | undefined;
  setInitData: (data: InitialPurchaseData) => void;
  clearInitData: () => void;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

const STORAGE_KEY = 'autohity_filter';

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const [purchases, setPurchases] = useState<Purchase[]>(mockPurchases);
  const [filter, setFilterState] = useState<PurchaseFilter>(defaultPurchaseFilter);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initData, setInitData] = useState<InitialPurchaseData | undefined>(undefined);

  // Load saved filter
  useEffect(() => {
    loadSavedFilter();
  }, []);

  // Sync from API when component mounts (after token is available)
  // Add delay to ensure token is restored from AsyncStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      apiService.getPurchases()
        .then(apiPurchases => {
          if (apiPurchases.length > 0) {
            console.log('[PurchaseContext] Synced from API on startup:', apiPurchases.length);
            setPurchases(apiPurchases);
          }
        })
        .catch(error => {
          console.error('[PurchaseContext] Chyba při synchronizaci na startu:', error);
          // Use mock data as fallback
          setPurchases(mockPurchases);
        });
    }, 500); // 500ms delay to allow token restoration

    return () => clearTimeout(timer);
  }, []);

  // Initialize reminders when purchases change
  useEffect(() => {
    if (purchases.length > 0) {
      createRemindersForAllPurchases(purchases).catch(error => {
        console.error('[PurchaseContext] Chyba při inicializaci reminderů:', error);
      });
    }
  }, [purchases]);

  // Apply filters to purchases
  const filteredPurchases = purchases.filter(purchase => {
    // Employee filter
    if (filter.employeePurchasesOnly && purchase.employeeId !== '1') {
      return false;
    }

    // Time filter
    const purchaseDate = purchase.purchaseDate ? new Date(purchase.purchaseDate) : null;
    const today = new Date();
    
    if (filter.todayPurchases && purchaseDate) {
      const todayStr = today.toISOString().split('T')[0];
      const purchaseDateStr = purchaseDate.toISOString().split('T')[0];
      if (todayStr !== purchaseDateStr) return false;
    }

    if (purchaseDate) {
      switch (filter.timeFilter) {
        case 'TODAY':
          const todayStr = today.toISOString().split('T')[0];
          const purchaseDateStr = purchaseDate.toISOString().split('T')[0];
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

    // Employee name filter
    if (filter.employeeName) {
      const employee = mockEmployees.find(e => e.id === purchase.employeeId);
      const employeeName = employee?.name || '';
      if (!employeeName.toLowerCase().includes(filter.employeeName.toLowerCase())) {
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
      if (apiPurchases.length > 0) {
        console.log('[PurchaseContext] Načteno z API:', apiPurchases.length);
        setPurchases(apiPurchases);
      } else {
        // Fallback na mock data pokud API je prázdné
        console.log('[PurchaseContext] API je prázdné, používám mock data');
        setPurchases(mockPurchases);
      }
    } catch (error) {
      console.error('[PurchaseContext] Chyba při načítání z API:', error);
      // Fallback na mock data pokud nastal error
      setPurchases(mockPurchases);
    }
    setRefreshing(false);
  };

  const addPurchase = (purchase: Purchase) => {
    setPurchases(prev => [purchase, ...prev]);
    // Already synced to API during creation in new-purchase/index.tsx
    console.log('[PurchaseContext] Výkup přidán, již synchronizován s API');
  };

  const updatePurchase = (id: string, updates: Partial<Purchase>) => {
    setPurchases(prev => prev.map(purchase => 
      purchase.id === id ? { ...purchase, ...updates } : purchase
    ));
    // Sync to API in background
    try {
      const updatedPurchase = purchases.find(p => p.id === id);
      if (updatedPurchase) {
        const merged = { ...updatedPurchase, ...updates };
        apiService.updatePurchase(id, merged).catch(error => {
          console.error('[PurchaseContext] Chyba při synchronizaci aktualizace:', error);
        });
      } else {
        console.warn(`[PurchaseContext] Nelze synchronizovat aktualizaci, výkup s id ${id} nebyl nalezen`);
      }
    } catch (error) {
      console.error('[PurchaseContext] Neočekávaná chyba při synchronizaci aktualizace:', error);
    }
  };

  const deletePurchase = (id: string) => {
    setPurchases(prev => prev.filter(purchase => purchase.id !== id));
    console.log(`[PurchaseContext] Výkup ${id} byl odstraněn`);
    // Delete from API in background
    apiService.deletePurchase(id).catch(error => {
      console.error('[PurchaseContext] Chyba při mazání z API:', error);
    });
  };

  const getPurchaseById = (id: string) => {
    return purchases.find(purchase => purchase.id === id);
  };

  const setInitDataFn = (data: InitialPurchaseData) => {
    setInitData(data);
  };

  const clearInitDataFn = () => {
    setInitData(undefined);
  };

  const value: PurchaseContextType = {
    purchases,
    filteredPurchases,
    filter,
    loading,
    refreshing,
    initData,
    setFilter,
    clearFilter,
    refreshPurchases,
    addPurchase,
    updatePurchase,
    deletePurchase,
    getPurchaseById,
    setInitData: setInitDataFn,
    clearInitData: clearInitDataFn
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