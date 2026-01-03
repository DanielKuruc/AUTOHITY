import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { PurchaseState } from '@/constants/types';
import { mockEmployees } from '@/constants/mockData';
import { 
  registerForPushNotifications,
  sendPurchaseStatusNotification,
} from '@/services/notificationService';

interface NotificationSettings {
  statusChanges: boolean;
  reminders: boolean;
  reports: boolean;
  reminderTime: string;
}

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

export default function ProfileScreen() {
  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const { purchases } = usePurchases();
  const { user, logout, changePassword } = useAuth();
  const currentEmployee = mockEmployees.find(emp => emp.id === '1');
  const myPurchases = purchases.filter(p => p.employeeId === '1');

  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    statusChanges: true,
    reminders: true,
    reports: true,
    reminderTime: '09:00',
  });

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (saved) {
        setNotificationSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error('[Profile] Chyba při načítání nastavení notifikací:', error);
    }
  };

  const saveNotificationSettings = async (settings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
      setNotificationSettings(settings);
      Alert.alert('Úspěch', 'Nastavení notifikací bylo uloženo');
    } catch (error) {
      console.error('[Profile] Chyba při ukládání nastavení notifikací:', error);
      Alert.alert('Chyba', 'Nepodařilo se uložit nastavení');
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean | string) => {
    const updated = { ...notificationSettings, [key]: value };
    setNotificationSettings(updated);
  };

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

  const handleOpenNotificationSettings = () => {
    setShowNotificationModal(true);
  };

  const handleSaveNotificationSettings = async () => {
    await saveNotificationSettings(notificationSettings);
    setShowNotificationModal(false);
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

  const confirmLogout = () => {
    Alert.alert(
      'Odhlásit',
      'Opravdu se chcete odhlásit?',
      [
        { text: 'Zrušit', style: 'cancel' },
        { text: 'Ano', style: 'destructive', onPress: () => logout() },
      ]
    );
  };
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
            handleOpenNotificationSettings
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
          onPress={confirmLogout}
        >
          <Ionicons name="log-out" size={22} color={theme.error} />
          <Text style={[styles.logoutText, { color: theme.error }]}>Odhlásit se</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Notification Settings Modal */}
      <Modal
        visible={showNotificationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowNotificationModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrapper, { backgroundColor: theme.accent + '20' }]}>
                <Ionicons name="notifications" size={28} color={theme.accent} />
              </View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Nastavení notifikací</Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                Vyberte, jaké notifikace chcete dostávat
              </Text>
            </View>

            <View style={styles.notificationItems}>
              {/* Status Changes */}
              <View style={[styles.notificationItem, { borderBottomColor: theme.border }]}>
                <View style={styles.notificationInfo}>
                  <Text style={[styles.notificationTitle, { color: theme.text }]}>
                    Změny stavu výkupů
                  </Text>
                  <Text style={[styles.notificationDescription, { color: theme.textSecondary }]}>
                    Dostaňte upozornění na změny stavu výkupů
                  </Text>
                </View>
                <Switch
                  value={notificationSettings.statusChanges}
                  onValueChange={(value) => updateSetting('statusChanges', value)}
                  trackColor={{ false: theme.border, true: theme.accent + '40' }}
                  thumbColor={notificationSettings.statusChanges ? theme.accent : theme.textTertiary}
                />
              </View>

              {/* Reminders */}
              <View style={[styles.notificationItem, { borderBottomColor: theme.border }]}>
                <View style={styles.notificationInfo}>
                  <Text style={[styles.notificationTitle, { color: theme.text }]}>
                    Připomínky
                  </Text>
                  <Text style={[styles.notificationDescription, { color: theme.textSecondary }]}>
                    Denní připomínky na nedokončené výkupy
                  </Text>
                </View>
                <Switch
                  value={notificationSettings.reminders}
                  onValueChange={(value) => updateSetting('reminders', value)}
                  trackColor={{ false: theme.border, true: theme.accent + '40' }}
                  thumbColor={notificationSettings.reminders ? theme.accent : theme.textTertiary}
                />
              </View>

              {/* Reminder Time */}
              {notificationSettings.reminders && (
                <View style={[styles.notificationTimeItem, { backgroundColor: theme.inputBackground }]}>
                  <Ionicons name="time" size={20} color={theme.accent} />
                  <Text style={[styles.notificationTimeLabel, { color: theme.text }]}>
                    Čas připomínky
                  </Text>
                  <Text style={[styles.notificationTimeValue, { color: theme.accent }]}>
                    {notificationSettings.reminderTime}
                  </Text>
                </View>
              )}

              {/* Reports */}
              <View style={[styles.notificationItem, { borderBottomColor: theme.border }]}>
                <View style={styles.notificationInfo}>
                  <Text style={[styles.notificationTitle, { color: theme.text }]}>
                    Reporty
                  </Text>
                  <Text style={[styles.notificationDescription, { color: theme.textSecondary }]}>
                    Týdenní a měsíční reporty
                  </Text>
                </View>
                <Switch
                  value={notificationSettings.reports}
                  onValueChange={(value) => updateSetting('reports', value)}
                  trackColor={{ false: theme.border, true: theme.accent + '40' }}
                  thumbColor={notificationSettings.reports ? theme.accent : theme.textTertiary}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButtonSecondary, { backgroundColor: theme.inputBackground }]}
                onPress={() => setShowNotificationModal(false)}
              >
                <Text style={[styles.modalButtonSecondaryText, { color: theme.text }]}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButtonPrimary, { backgroundColor: theme.accent }]}
                onPress={handleSaveNotificationSettings}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonPrimaryText}>Uložit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    zIndex: 1,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
  },
  notificationItems: {
    marginBottom: 24,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  notificationInfo: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 13,
  },
  notificationTimeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginVertical: 8,
    gap: 12,
  },
  notificationTimeLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  notificationTimeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});