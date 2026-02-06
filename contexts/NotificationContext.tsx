import React, { createContext, useContext, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'push';
  data?: Record<string, any>;
  timestamp: number;
  read: boolean;
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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

  const addNotification = useCallback(
    (notification: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>): string => {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newNotification: InAppNotification = {
        ...notification,
        id,
        timestamp: Date.now(),
        read: false,
      };

      setNotifications((prev) => [newNotification, ...prev]);

      // Auto-remove after 5 seconds for info/success, keep error longer
      const duration = notification.type === 'error' ? 8000 : 5000;
      const timer = setTimeout(() => {
        removeNotification(id);
      }, duration);

      return id;
    },
    []
  );

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
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
