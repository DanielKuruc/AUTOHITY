import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUsers } from '@/contexts/UsersContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function SidebarUserSection() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { users } = useUsers();
  const { user: currentUser } = useAuth();

  return (
    <TouchableOpacity 
      style={[styles.sidebarUserSection, { borderTopColor: theme.border, backgroundColor: theme.inputBackground }]}
      onPress={() => router.push('/(tabs)/profile')}
      activeOpacity={0.6}
    >
      <View style={styles.sidebarUserHeader}>
        <Ionicons name="person-circle" size={32} color={theme.accent} />
        <View style={styles.sidebarUserInfo}>
          <View style={styles.sidebarUserNameRow}>
            <Text style={[styles.sidebarUserName, { color: theme.text }]} numberOfLines={1}>
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
          <Text style={[styles.sidebarUserEmail, { color: theme.textSecondary }]} numberOfLines={1}>
            {user?.email || 'Bez emailu'}
          </Text>
        </View>
      </View>
      {user?.id && (
        <Text style={[styles.sidebarUserId, { color: theme.textTertiary }]}>
          ID: {user.id}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sidebarUserSection: {
    borderTopWidth: 1,
    padding: 12,
    gap: 8,
    marginLeft: -12,
    marginRight: -12,
    marginBottom: -12,
    paddingLeft: 12,
    paddingRight: 12,
  },
  sidebarUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sidebarUserInfo: {
    flex: 1,
  },
  sidebarUserName: {
    fontSize: 13,
    fontWeight: '600',
  },
  sidebarUserEmail: {
    fontSize: 11,
    fontWeight: '400',
  },
  sidebarUserId: {
    fontSize: 10,
    fontWeight: '400',
    fontFamily: 'monospace',
  },
  sidebarUserNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
});