import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'push';
  data?: Record<string, any>;
  timestamp: number;
  read: boolean;
  persistent?: boolean; // Persist to storage if true
}

interface NotificationContextType {
  notifications: InAppNotification[];
  addNotification: (notification: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  markAsRead: (id: string) => void;
  unreadCount: number;
  addFromPushNotification: (notification: Notifications.Notification) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = 'notifications_history';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load persisted notifications on startup
  useEffect(() => {
    loadPersistedNotifications();
  }, []);

  const loadPersistedNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as InAppNotification[];
        setNotifications(parsed);
      }
    } catch (error) {
    } finally {
      setIsLoaded(true);
    }
  };

  const persistNotifications = async (notifs: InAppNotification[]) => {
    try {
      // Keep only push notifications, max 100 most recent
      const pushNotifs = notifs.filter((n) => n.type === 'push').slice(0, 100);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pushNotifs));
    } catch (error) {
    }
  };

  const addNotification = useCallback(
    (notification: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>): string => {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newNotification: InAppNotification = {
        ...notification,
        id,
        timestamp: Date.now(),
        read: false,
        persistent: notification.type === 'push', // Persist push notifications
      };

      setNotifications((prev) => {
        const updated = [newNotification, ...prev];
        if (newNotification.persistent) {
          persistNotifications(updated);
        }
        return updated;
      });

      // Auto-remove in-app toast after 5 seconds
      // But keep push notifications in history
      if (notification.type !== 'push') {
        const duration = notification.type === 'error' ? 8000 : 5000;
        const timer = setTimeout(() => {
          removeNotification(id);
        }, duration);
      }

      return id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      persistNotifications(updated);
      return updated;
    });
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const addFromPushNotification = useCallback(
    (notification: Notifications.Notification) => {
      const content = notification.request.content;
      addNotification({
        title: content.title || 'Notifikace',
        body: content.body || '',
        type: 'push',
        data: content.data,
      });
    },
    [addNotification]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    markAsRead,
    unreadCount,
    addFromPushNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}