import { NotificationCenterScreen } from '@/components/NotificationCenter';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SidebarBrand } from '@/components/SidebarBrand';
import { SidebarUserSection } from '@/components/SidebarUserSection';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUsers } from '@/contexts/UsersContext';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { isSplitView } = useTabletLayout();
  const { user } = useAuth();
  const { users } = useUsers();
  const { user: currentUser } = useAuth();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[isSplitView ? styles.splitLayout : styles.stackedLayout]}>
        {/* LEFT SIDEBAR - TABLET ONLY */}
        {isSplitView && (
          <View style={[styles.sidebar, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
            <SidebarBrand />

            <ScrollView style={styles.sidebarScroll} showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                style={[styles.sidebarNavItem, { backgroundColor: theme.inputBackground }]}
                onPress={() => router.push('/(tabs)')}
              >
                <Ionicons name="car" size={20} color={theme.textSecondary} />
                <Text style={[styles.sidebarNavItemText, { color: theme.text }]}>Výkupy</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.sidebarNavItem}
                onPress={() => router.push('/(tabs)/statistiky')}
              >
                <Ionicons name="bar-chart" size={20} color={theme.textSecondary} />
                <Text style={[styles.sidebarNavItemText, { color: theme.text }]}>Statistiky</Text>
              </TouchableOpacity>

              {users.find(u => u.id === currentUser?.id)?.isAdmin && (
                <TouchableOpacity 
                  style={styles.sidebarNavItem}
                  onPress={() => router.push('/(tabs)/reporty')}
                >
                  <Ionicons name="document-text" size={20} color={theme.textSecondary} />
                  <Text style={[styles.sidebarNavItemText, { color: theme.text }]}>Reporty</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={[styles.sidebarNavItem, { backgroundColor: theme.accent }]}
                onPress={() => router.push('/(tabs)/notifications')}
              >
                <Ionicons name="notifications" size={20} color="#FFFFFF" />
                <Text style={[styles.sidebarNavItemText, { color: '#FFFFFF' }]}>Notifikace</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* User Profile Section at Bottom */}
            <SidebarUserSection />
          </View>
        )}

        {/* CONTENT */}
        <View style={{ flex: 1 }}>
          {/* Header */}
          <ScreenHeader title="Notifikace" />

          <NotificationCenterScreen />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  splitLayout: {
    flexDirection: 'row',
    flex: 1,
  },
  stackedLayout: {
    flex: 1,
  },
  sidebar: {
    width: 220,
    borderRightWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: 'column',
  },
  sidebarScroll: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sidebarNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 12,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  sidebarNavItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
});