import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPreferences {
  stkReminders: boolean;
  incompletePurchases: boolean;
  reportNotifications: boolean;
  statusChanges: boolean;
  deliveryTime: string; // HH:mm format
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

interface NotificationPreferencesContextType {
  preferences: NotificationPreferences;
  updatePreferences: (updates: Partial<NotificationPreferences>) => Promise<void>;
  isLoading: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  stkReminders: true,
  incompletePurchases: true,
  reportNotifications: true,
  statusChanges: true,
  deliveryTime: '09:00',
  soundEnabled: true,
  vibrationEnabled: true,
};

const STORAGE_KEY = '@autohity_notification_prefs';

const NotificationPreferencesContext = createContext<NotificationPreferencesContextType | undefined>(undefined);

export function NotificationPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setPreferences(JSON.parse(saved));
      } else {
        setPreferences(DEFAULT_PREFERENCES);
      }
    } catch (error) {
      console.error('[NotificationPreferences] Chyba při načítání:', error);
      setPreferences(DEFAULT_PREFERENCES);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    try {
      const updated = { ...preferences, ...updates };
      setPreferences(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      console.log('[NotificationPreferences] Preference aktualizovány');
    } catch (error) {
      console.error('[NotificationPreferences] Chyba při ukládání:', error);
    }
  };

  return (
    <NotificationPreferencesContext.Provider value={{ preferences, updatePreferences, isLoading }}>
      {children}
    </NotificationPreferencesContext.Provider>
  );
}

export function useNotificationPreferences() {
  const context = useContext(NotificationPreferencesContext);
  if (!context) {
    throw new Error('useNotificationPreferences must be used within NotificationPreferencesProvider');
  }
  return context;
}
