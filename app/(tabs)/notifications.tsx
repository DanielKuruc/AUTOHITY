import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotificationCenter, NotificationItem } from '@/contexts/NotificationCenterContext';
import { useToast } from '@/contexts/ToastContext';
import { router } from 'expo-router';

const TYPE_CONFIG = {
  success: { icon: 'checkmark-circle', color: '#34C759', bg: '#34C75920' },
  error: { icon: 'close-circle', color: '#FF3B30', bg: '#FF3B3020' },
  warning: { icon: 'warning', color: '#FF9500', bg: '#FF950020' },
  info: { icon: 'information-circle', color: '#007AFF', bg: '#007AFF20' },
  reminder: { icon: 'alarm', color: '#FF9500', bg: '#FF950020' },
};

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications, isLoading } = useNotificationCenter();
  const { showToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 300));
    setRefreshing(false);
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    showToast('Notifikace označena jako přečtená', 'info');
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Smazat notifikaci',
      'Opravdu chcete smazat tuto notifikaci?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat',
          style: 'destructive',
          onPress: async () => {
            await deleteNotification(id);
            showToast('Notifikace smazána', 'info');
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Vymazat vše',
      'Opravdu chcete smazat všechny notifikace? Tuto akci nelze vrátit.',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Smazat vše',
          style: 'destructive',
          onPress: async () => {
            await deleteAllNotifications();
            showToast('Všechny notifikace smazány', 'info');
          },
        },
      ]
    );
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    showToast('Všechny notifikace označeny jako přečtené', 'info');
  };

  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const config = TYPE_CONFIG[item.type];
    const date = new Date(item.timestamp);
    const isToday = date.toDateString() === new Date().toDateString();
    const timeStr = date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    const dateStr = isToday ? timeStr : date.toLocaleDateString('cs-CZ');

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && { backgroundColor: theme.card },
          { borderBottomColor: theme.border }
        ]}
        onPress={() => {
          if (!item.read) {
            handleMarkAsRead(item.id);
          }
          if (item.purchaseId) {
            router.push(`/purchase/${item.purchaseId}`);
          }
        }}
      >
        <View style={[styles.iconWrapper, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon as any} size={20} color={config.color} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]}>{item.title}</Text>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.accent }]} />}
          </View>
          <Text style={[styles.message, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={[styles.time, { color: theme.textTertiary }]}>{dateStr}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            hitSlop={12}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={18} color={theme.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Ionicons name="notifications-off-outline" size={64} color={theme.textTertiary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>Bez notifikací</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Všechny vaše notifikace se budou zobrazovat zde
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Notifikace</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {unreadCount > 0 ? `${unreadCount} nový${unreadCount === 1 ? '' : 'ch'}` : 'Žádné nové'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.accent }]}
                onPress={handleMarkAllAsRead}
              >
                <Ionicons name="checkmark-all" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {notifications.length > 0 && (
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: theme.inputBackground }]}
                onPress={handleClearAll}
              >
                <Ionicons name="trash-outline" size={20} color={theme.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    gap: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
});
