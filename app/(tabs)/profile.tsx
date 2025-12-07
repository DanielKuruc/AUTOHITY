import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PurchaseState } from '@/constants/types';
import { mockEmployees } from '@/constants/mockData';
import { 
  registerForPushNotifications,
  sendPurchaseStatusNotification,
} from '@/services/notificationService';

export default function ProfileScreen() {
  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const { purchases } = usePurchases();
  const currentEmployee = mockEmployees.find(emp => emp.id === '1');
  const myPurchases = purchases.filter(p => p.employeeId === '1');

  const getStatsForState = (state: PurchaseState) => {
    return myPurchases.filter(p => p.purchaseState === state).length;
  };

  const handleThemeChange = () => {
    Alert.alert(
      'Vzhled aplikace',
      'Vyberte barevné schéma:',
      [
        { 
          text: 'Světlý', 
          onPress: () => setThemeMode('light'),
        },
        { 
          text: 'Tmavý', 
          onPress: () => setThemeMode('dark'),
        },
        { 
          text: 'Systémový', 
          onPress: () => setThemeMode('system'),
        },
        { text: 'Zrušit', style: 'cancel' },
      ]
    );
  };

  const handleNotificationSettings = async () => {
    const token = await registerForPushNotifications();
    if (token) {
      Alert.alert('Notifikace', 'Notifikace jsou povoleny.\n\nPush token byl zaregistrován.');
    } else {
      Alert.alert('Notifikace', 'Notifikace nejsou povoleny nebo zařízení je simulátor.');
    }
  };

  const handleTestNotification = async () => {
    await sendPurchaseStatusNotification(
      'Test Klient',
      'TEST123',
      PurchaseState.COMPLETED,
      'test-id'
    );
    Alert.alert('Test', 'Testovací notifikace byla odeslána');
  };

  const getThemeModeLabel = () => {
    switch (themeMode) {
      case 'light': return 'Světlý';
      case 'dark': return 'Tmavý';
      case 'system': return 'Systémový';
    }
  };

  const renderStatCard = (title: string, value: number, color: string) => (
    <View style={[styles.statCard, { backgroundColor: theme.card }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{title}</Text>
    </View>
  );

  const renderMenuItem = (
    icon: string, 
    title: string, 
    subtitle?: string, 
    onPress?: () => void, 
    rightText?: string
  ) => (
    <TouchableOpacity 
      style={[styles.menuItem, { borderBottomColor: theme.borderLight }]} 
      onPress={onPress || (() => {})}
    >
      <View style={[styles.menuIcon, { backgroundColor: theme.accentLight }]}>
        <Ionicons name={icon as any} size={22} color={theme.accent} />
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuText, { color: theme.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.menuSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
      {rightText ? (
        <Text style={[styles.menuRightText, { color: theme.textSecondary }]}>{rightText}</Text>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <View style={[styles.avatarContainer, { backgroundColor: theme.accent }]}>
            <Text style={styles.avatarText}>
              {currentEmployee?.name.split(' ').map(n => n[0]).join('')}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {currentEmployee?.name}
            </Text>
            <Text style={[styles.role, { color: theme.accent }]}>
              {currentEmployee?.role}
            </Text>
            <Text style={[styles.email, { color: theme.textSecondary }]}>
              daniel.kuruc@autohity.cz
            </Text>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Moje statistiky</Text>
          <View style={styles.statsGrid}>
            {renderStatCard('Nové', getStatsForState(PurchaseState.NEW), theme.accent)}
            {renderStatCard('Probíhá', getStatsForState(PurchaseState.IN_PROGRESS), theme.warning)}
            {renderStatCard('Dokončené', getStatsForState(PurchaseState.COMPLETED), theme.success)}
            {renderStatCard('Celkem', myPurchases.length, theme.textSecondary)}
          </View>
        </View>

        {/* Settings Menu */}
        <View style={[styles.menuSection, { backgroundColor: theme.surface }]}>
          <Text style={[styles.menuSectionTitle, { color: theme.textSecondary }]}>
            NASTAVENÍ
          </Text>
          {renderMenuItem(
            'color-palette',
            'Vzhled',
            'Barevné schéma aplikace',
            handleThemeChange,
            getThemeModeLabel()
          )}
          {renderMenuItem(
            'notifications',
            'Notifikace',
            'Nastavení upozornění',
            handleNotificationSettings
          )}
          {renderMenuItem(
            'flask',
            'Test notifikace',
            'Odeslat testovací notifikaci',
            handleTestNotification
          )}
        </View>

        <View style={[styles.menuSection, { backgroundColor: theme.surface }]}>
          <Text style={[styles.menuSectionTitle, { color: theme.textSecondary }]}>
            ÚČET
          </Text>
          {renderMenuItem('person', 'Upravit profil', 'Osobní údaje')}
          {renderMenuItem('lock-closed', 'Změnit heslo')}
          {renderMenuItem('help-circle', 'Nápověda')}
          {renderMenuItem('information-circle', 'O aplikaci', 'Verze 1.0.0')}
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: theme.surface }]}
          onPress={() => Alert.alert('Odhlásit', 'Opravdu se chcete odhlásit?')}
        >
          <Ionicons name="log-out" size={22} color={theme.error} />
          <Text style={[styles.logoutText, { color: theme.error }]}>Odhlásit se</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginBottom: 8,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  role: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  email: {
    fontSize: 14,
  },
  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  menuSection: {
    marginBottom: 8,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  menuSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  menuRightText: {
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});