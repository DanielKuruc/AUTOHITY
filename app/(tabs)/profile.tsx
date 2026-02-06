import { SidebarUserSection } from '@/components/SidebarUserSection';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUsers } from '@/contexts/UsersContext';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, ScrollView as RNScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { user, userStats, loadUserProfile, loadUserStats, isLoading: authLoading, logout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();
  const { isSplitView } = useTabletLayout();
  const { users } = useUsers();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    console.log('[Profile] Loading profile...');
    loadUserProfile();
    loadUserStats();
  }, []);

  const handleLogout = () => {
    Alert.alert('Odhlášení', 'Opravdu se chcete odhlásit?', [
      { text: 'Ne', style: 'cancel' },
      {
        text: 'Ano',
        style: 'destructive',
        onPress: async () => {
          console.log('[Profile] Logging out...');
          await logout();
          // AuthGate se automaticky postará o navigaci na LoginScreen
          console.log('[Profile] Logout complete');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[isSplitView ? styles.splitLayout : styles.stackedLayout]}>
        {/* LEFT SIDEBAR - TABLET ONLY */}
        {isSplitView && (
          <View style={[styles.sidebar, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
            <RNScrollView style={styles.sidebarScroll} showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                style={[styles.sidebarItem, { backgroundColor: theme.accent }]}
                onPress={() => router.push('/(tabs)')}
              >
                <Ionicons name="add-circle" size={24} color="#FFFFFF" />
                <Text style={styles.sidebarItemText}>Nový výkup</Text>
              </TouchableOpacity>

              <View style={[styles.sidebarDivider, { backgroundColor: theme.border }]} />

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
                style={styles.sidebarNavItem}
                onPress={() => router.push('/(tabs)/notifications')}
              >
                <Ionicons name="notifications" size={20} color={theme.textSecondary} />
                <Text style={[styles.sidebarNavItemText, { color: theme.text }]}>Notifikace</Text>
              </TouchableOpacity>
            </RNScrollView>

            {/* User Profile Section at Bottom */}
            <SidebarUserSection />
          </View>
        )}

        {/* CONTENT */}
        <View style={{ flex: 1 }}>
          <RNScrollView style={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Profil</Text>
        </View>

        {/* User Info Card */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <View style={styles.userHeader}>
            <Ionicons name="person-circle" size={60} color={theme.accent} />
            <View style={styles.userInfo}>
              <View style={styles.userNameRow}>
                <Text style={[styles.userName, { color: theme.text }]}>
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.userName || 'Uživatel'}
                </Text>
                {users.find(u => u.id === currentUser?.id)?.isAdmin && (
                  <View style={[styles.adminTag, { backgroundColor: theme.accent + '30' }]}>
                    <Text style={[styles.adminTagText, { color: theme.accent }]}>Admin</Text>
                  </View>
                )}
                {!users.find(u => u.id === currentUser?.id)?.isAdmin && (
                  <View style={[styles.adminTag, { backgroundColor: theme.warning + '30' }]}>
                    <Text style={[styles.adminTagText, { color: theme.warning }]}>Výkupčí</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
                {user?.email || 'Není zadáno'}
              </Text>
              {user?.id && (
                <Text style={[styles.userId, { color: theme.textTertiary }]}>
                  ID: {user.id}
                </Text>
              )}
            </View>
          </View>
        </View>



        {/* Settings Card */}
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Nastavení</Text>
          {/* Dark mode toggle */}
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingLabel}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={theme.accent} />
              <Text style={[styles.settingText, { color: theme.text }]}>Tmavý režim</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Admin Testing Section */}
        {users.find(u => u.id === currentUser?.id)?.isAdmin && (
          <View style={[styles.card, { backgroundColor: theme.card, borderLeftColor: '#FF9500', borderLeftWidth: 4 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>🧪 Admin Tools</Text>
            <TouchableOpacity
              style={[styles.adminButton, { backgroundColor: theme.accent }]}
              onPress={() => router.push('/push-test')}
            >
              <Ionicons name="notifications" size={18} color="#FFFFFF" />
              <Text style={styles.adminButtonText}>Testování notifikací</Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.helperText, { color: theme.textSecondary, marginTop: 8 }]}>
              Testuj in-app notifikace a push API
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.error }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out" size={18} color="#FFFFFF" />
          <Text style={styles.logoutText}>Odhlášení</Text>
        </TouchableOpacity>
          </RNScrollView>
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
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
    marginHorizontal: 4,
  },
  sidebarItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
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
  sidebarDivider: {
    height: 1,
    marginVertical: 8,
  },
  sidebarScroll: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 8,
  },
  scroll: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
  },
  adminTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  adminTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 14,
    fontWeight: '500',
  },
  userId: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 32,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 12,
  },
  adminButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  helperText: {
    fontSize: 13,
    fontWeight: '400',
  },
});