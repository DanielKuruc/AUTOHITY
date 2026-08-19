import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '@/services/apiService';

export interface ServerNotification {
  id: number;
  user_id: number;
  title: string;
  body: string;
  notification_type: string;
  data?: Record<string, any>;
  is_read: boolean;
  read_at?: string | null;
  push_sent_at?: string | null;
  push_failed: boolean;
  created_at: string;
}

export interface InAppNotification extends ServerNotification {
  timestamp: number;
}

interface NotificationContextType {
  notifications: InAppNotification[];
  addNotification: (title: string, body: string, type: string, data?: Record<string, any>) => void;
  removeNotification: (id: number) => void;
  clearNotifications: () => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  unreadCount: number;
  isLoading: boolean;
  refreshNotifications: () => Promise<void>;
  loadNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      const loadNotifs = async () => {
        try {
          setIsLoading(true);
          const url = `${API_BASE_URL}/notifications?user_id=${user.id}&limit=100&offset=0`;
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            setIsLoading(false);
            return;
          }

          const result = await response.json();
          const serverNotifications = (result.data || []) as ServerNotification[];

          const notificationsWithTimestamp: InAppNotification[] = serverNotifications.map(n => ({
            ...n,
            timestamp: new Date(n.created_at).getTime(),
          }));

          setNotifications(notificationsWithTimestamp);
          const unread = notificationsWithTimestamp.filter(n => !n.is_read).length;
          setUnreadCount(unread);
        } catch (error) {
          // Silent fail
        } finally {
          setIsLoading(false);
        }
      };

      loadNotifs();
    }
  }, [user?.id]);

  const refreshNotifications = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    try {
      setIsLoading(true);
      const url = `${API_BASE_URL}/notifications?user_id=${user.id}&limit=100&offset=0`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load notifications: ${response.status}`);
      }

      const result = await response.json();
      const serverNotifications = (result.data || []) as ServerNotification[];

      const notificationsWithTimestamp: InAppNotification[] = serverNotifications.map(n => ({
        ...n,
        timestamp: new Date(n.created_at).getTime(),
      }));

      setNotifications(notificationsWithTimestamp);
      const unread = notificationsWithTimestamp.filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const addNotification = useCallback(
    async (title: string, body: string, type: string, data?: Record<string, any>) => {
      if (!user?.id) return;

      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            action: 'create',
            title,
            body,
            type,
            data,
          }),
        });

        if (response.ok) {
          await refreshNotifications();
        }
      } catch (error) {
        // Silent fail
      }
    },
    [user?.id, refreshNotifications]
  );

  const removeNotification = useCallback(
    async (id: number) => {
      if (!user?.id) return;

      try {
        await fetch(`${API_BASE_URL}/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            action: 'delete',
            notification_id: id,
          }),
        });

        setNotifications(prev => prev.filter(n => n.id !== id));
      } catch (error) {
        // Silent fail
      }
    },
    [user?.id]
  );

  const markAsRead = useCallback(
    async (id: number) => {
      if (!user?.id) return;

      try {
        await fetch(`${API_BASE_URL}/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            action: 'mark_as_read',
            notification_id: id,
          }),
        });

        setNotifications(prev =>
          prev.map(n =>
            n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          )
        );

        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        // Silent fail
      }
    },
    [user?.id]
  );

  const markAllAsRead = useCallback(
    async () => {
      if (!user?.id) return;

      try {
        await fetch(`${API_BASE_URL}/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: user.id,
            action: 'mark_all_as_read',
          }),
        });

        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        );

        setUnreadCount(0);
      } catch (error) {
        // Silent fail
      }
    },
    [user?.id]
  );

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    markAsRead,
    markAllAsRead,
    unreadCount,
    isLoading,
    refreshNotifications,
    loadNotifications: refreshNotifications,
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