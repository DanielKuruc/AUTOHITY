import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, InAppNotification } from '@/contexts/NotificationContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getPurchaseIdFromData } from '@/services/pushNotifications';
import { router } from 'expo-router';

/**
 * Toast-style notification popup for in-app push notifications
 */
export function NotificationToast({ notification }: { notification: InAppNotification }) {
  const { theme } = useTheme();
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(animValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(notification.notification_type === 'error' ? 5000 : 3000),
      Animated.timing(animValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getColors = () => {
    switch (notification.notification_type) {
      case 'success':
        return { bg: '#34C759', icon: 'checkmark-circle' };
      case 'error':
        return { bg: '#FF3B30', icon: 'close-circle' };
      case 'warning':
        return { bg: '#FF9500', icon: 'alert-circle' };
      case 'new_purchase':
        return { bg: theme.accent, icon: 'car' };
      case 'state_change':
        return { bg: '#007AFF', icon: 'swap-vertical' };
      default:
        return { bg: theme.accent, icon: 'information-circle' };
    }
  };

  const colors = getColors();

  return (
    <SafeAreaView style={styles.toastContainer} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          {
            backgroundColor: colors.bg,
            opacity: animValue,
            transform: [
              {
                translateY: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.toastContent}>
          <Ionicons name={colors.icon as any} size={20} color="#FFFFFF" />
          <View style={styles.toastText}>
            {notification.title && (
              <Text style={styles.toastTitle}>{notification.title}</Text>
            )}
            {notification.body && (
              <Text style={styles.toastBody}>{notification.body}</Text>
            )}
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

/**
 * Full notification center screen
 */
export function NotificationCenterScreen() {
  const { notifications, clearNotifications, removeNotification, markAsRead, markAllAsRead, isLoading, loadNotifications } = useNotifications();
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadNotifications();
    } catch (error) {
    } finally {
      setRefreshing(false);
    }
  };

  if (notifications.length === 0) {
    return (
      <ScrollView 
        style={[styles.container, { backgroundColor: theme.background }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.accent}
            title="Aktualizuji..."
            titleColor={theme.textSecondary}
          />
        }
      >
        <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
          <Ionicons name="notifications-off" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Žádné notifikace
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.accent}
          title="Aktualizuji..."
          titleColor={theme.textSecondary}
        />
      }
    >
      {/* Mark all as read button */}
      <TouchableOpacity
        style={[styles.clearButton, { backgroundColor: theme.card }]}
        onPress={markAllAsRead}
      >
        <Ionicons name="checkmark-done" size={16} color={theme.accent} />
        <Text style={[styles.clearButtonText, { color: theme.accent }]}>
          Označit všechny jako přečtené
        </Text>
      </TouchableOpacity>

      {/* Notifications list */}
      <View style={styles.notificationsContainer}>
        {notifications.map((notification) => (
          <NotificationItem
            key={String(notification.id)}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
            onPress={() => {
              markAsRead(notification.id);
              // Notifikace o výkupu nese purchaseId - otevři rovnou to vozidlo
              const purchaseId = getPurchaseIdFromData(notification.data);
              if (purchaseId) {
                router.push(`/purchase/${purchaseId}`);
              }
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
}

/**
 * Single notification item in the list
 */
function NotificationItem({
  notification,
  onClose,
  onPress,
}: {
  notification: InAppNotification;
  onClose: () => void;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  const getTypeColors = () => {
    switch (notification.notification_type) {
      case 'success':
        return {
          bg: '#34C75915',
          border: '#34C759',
          icon: 'checkmark-circle',
          color: '#34C759',
        };
      case 'error':
        return {
          bg: '#FF3B3015',
          border: '#FF3B30',
          icon: 'close-circle',
          color: '#FF3B30',
        };
      case 'warning':
        return {
          bg: '#FF950015',
          border: '#FF9500',
          icon: 'alert-circle',
          color: '#FF9500',
        };
      case 'new_purchase':
        return {
          bg: theme.accentLight,
          border: theme.accent,
          icon: 'car',
          color: theme.accent,
        };
      case 'state_change':
        return {
          bg: '#007AFF15',
          border: '#007AFF',
          icon: 'swap-vertical',
          color: '#007AFF',
        };
      default:
        return {
          bg: theme.inputBackground,
          border: theme.border,
          icon: 'notifications',
          color: theme.accent,
        };
    }
  };

  const colors = getTypeColors();
  const timeAgo = getTimeAgo(new Date(notification.created_at).getTime());

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: colors.bg,
          borderLeftColor: colors.border,
          opacity: notification.is_read ? 0.6 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Ionicons name={colors.icon as any} size={20} color={colors.color} />
          <View style={styles.notificationMeta}>
            {notification.title && (
              <Text
                style={[
                  styles.notificationTitle,
                  { color: theme.text, fontWeight: notification.is_read ? '500' : '700' },
                ]}
              >
                {notification.title}
              </Text>
            )}
            <Text style={[styles.notificationTime, { color: theme.textTertiary }]}>
              {timeAgo}
            </Text>
          </View>
        </View>

        {notification.body && (
          <Text style={[styles.notificationBody, { color: theme.textSecondary }]}>
            {notification.body}
          </Text>
        )}
      </View>

      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close" size={20} color={theme.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  if (seconds < 60) {
    return 'právě teď';
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `před ${minutes}m`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `před ${hours}h`;
  } else {
    const days = Math.floor(seconds / 86400);
    return `před ${days}d`;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  notificationsContainer: {
    gap: 12,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  notificationMeta: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    marginBottom: 2,
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationBody: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 28, // Align with title (icon width + gap)
  },
  closeButton: {
    padding: 4,
  },
  toastContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
  toast: {
    backgroundColor: '#FF9500',
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toastText: {
    flex: 1,
  },
  toastTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  toastBody: {
    color: '#FFFFFF',
    fontSize: 13,
  },
});