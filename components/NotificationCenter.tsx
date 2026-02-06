import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications, InAppNotification } from '@/contexts/NotificationContext';
import { useTheme } from '@/contexts/ThemeContext';

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
      Animated.delay(notification.type === 'error' ? 5000 : 3000),
      Animated.timing(animValue, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getColors = () => {
    switch (notification.type) {
      case 'success':
        return { bg: '#34C759', icon: 'checkmark-circle' };
      case 'error':
        return { bg: '#FF3B30', icon: 'close-circle' };
      case 'warning':
        return { bg: '#FF9500', icon: 'alert-circle' };
      case 'push':
        return { bg: theme.accent, icon: 'notifications' };
      default:
        return { bg: theme.accent, icon: 'information-circle' };
    }
  };

  const colors = getColors();

  return (
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
                outputRange: [-100, 0],
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
  );
}

/**
 * Full notification center screen
 */
export function NotificationCenterScreen() {
  const { notifications, clearNotifications, removeNotification, markAsRead } = useNotifications();
  const { theme } = useTheme();

  if (notifications.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
        <Ionicons name="notifications-off" size={48} color={theme.textTertiary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Žádné notifikace
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Clear all button */}
      <TouchableOpacity
        style={[styles.clearButton, { backgroundColor: theme.card }]}
        onPress={clearNotifications}
      >
        <Ionicons name="trash-outline" size={16} color={theme.accent} />
        <Text style={[styles.clearButtonText, { color: theme.accent }]}>
          Smazat všechny
        </Text>
      </TouchableOpacity>

      {/* Notifications list */}
      <View style={styles.notificationsContainer}>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
            onPress={() => markAsRead(notification.id)}
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
    switch (notification.type) {
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
      case 'push':
        return {
          bg: theme.accentLight,
          border: theme.accent,
          icon: 'notifications',
          color: theme.accent,
        };
      default:
        return {
          bg: theme.inputBackground,
          border: theme.border,
          icon: 'information-circle',
          color: theme.accent,
        };
    }
  };

  const colors = getTypeColors();
  const timeAgo = getTimeAgo(notification.timestamp);

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        {
          backgroundColor: colors.bg,
          borderLeftColor: colors.border,
          opacity: notification.read ? 0.6 : 1,
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
                  { color: theme.text, fontWeight: notification.read ? '500' : '700' },
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
  toast: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
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
