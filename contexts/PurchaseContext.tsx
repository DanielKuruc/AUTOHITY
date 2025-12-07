import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Purchase, PurchaseFilter } from '../constants/types';
import { mockPurchases, defaultPurchaseFilter } from '../constants/mockData';

interface PurchaseContextType {
  purchases: Purchase[];
  filteredPurchases: Purchase[];
  filter: PurchaseFilter;
  loading: boolean;
  refreshing: boolean;
  setFilter: (filter: PurchaseFilter) => void;
  clearFilter: () => void;
  refreshPurchases: () => Promise<void>;
  addPurchase: (purchase: Purchase) => void;
  updatePurchase: (id: string, updates: Partial<Purchase>) => void;
  deletePurchase: (id: string) => void;
  getPurchaseById: (id: string) => Purchase | undefined;
}

const PurchaseContext = createContext<PurchaseContextType | undefined>(undefined);

const STORAGE_KEY = 'autohity_filter';

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const [purchases, setPurchases] = useState<Purchase[]>(mockPurchases);
  const [filter, setFilterState] = useState<PurchaseFilter>(defaultPurchaseFilter);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load saved filter on startup
  useEffect(() => {
    loadSavedFilter();
  }, []);

  // Apply filters to purchases
  const filteredPurchases = purchases.filter(purchase => {
    // Employee filter
    if (filter.employeePurchasesOnly && purchase.employeeId !== '1') {
      return false;
    }

    // Time filter
    const purchaseDate = new Date(purchase.purchaseDate);
    const today = new Date();
    if (filter.todayPurchases) {
      const todayStr = today.toISOString().split('T')[0];
      const purchaseDateStr = purchaseDate.toISOString().split('T')[0];
      if (todayStr !== purchaseDateStr) return false;
    }

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
    // Simulace API volání
    await new Promise(resolve => setTimeout(resolve, 1000));
    // V reálné aplikaci by se načítala data z API
    console.log('Výkupy obnoveny');
    setRefreshing(false);
  };

  const addPurchase = (purchase: Purchase) => {
    setPurchases(prev => [purchase, ...prev]);
  };

  const updatePurchase = (id: string, updates: Partial<Purchase>) => {
    setPurchases(prev => prev.map(purchase => 
      purchase.id === id ? { ...purchase, ...updates } : purchase
    ));
  };

  const deletePurchase = (id: string) => {
    setPurchases(prev => prev.filter(purchase => purchase.id !== id));
    console.log(`[PurchaseContext] Výkup ${id} byl odstraněn`);
  };

  const getPurchaseById = (id: string) => {
    return purchases.find(purchase => purchase.id === id);
  };

  const value: PurchaseContextType = {
    purchases,
    filteredPurchases,
    filter,
    loading,
    refreshing,
    setFilter,
    clearFilter,
    refreshPurchases,
    addPurchase,
    updatePurchase,
    deletePurchase,
    getPurchaseById
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