import { DatePickerField } from '@/components/DatePickerField';
import { SidebarUserSection } from '@/components/SidebarUserSection';
import { PurchaseState } from '@/constants/types';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { sharePurchasesList } from '@/services/exportService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ReportPeriod = 'week' | 'month' | 'quarter' | 'custom';

export default function ReportyScreen() {
  const { theme } = useTheme();
  const { purchases } = usePurchases();
  const { isSplitView } = useTabletLayout();
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('month');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  const parseCustomDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    // Format: dd.mm.yyyy
    const parts = dateString.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (!parts) return null;
    const [, day, month, year] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  };

  // Helper function to parse date from Czech format or ISO format
  const parseDateString = (dateString: string | null | undefined): Date | null => {
    if (!dateString || typeof dateString !== 'string') return null;
    const trimmed = dateString.trim();
    if (!trimmed) return null;
    // Try Czech format first (dd.mm.yyyy)
    const czechDate = parseCustomDate(trimmed);
    if (czechDate && !isNaN(czechDate.getTime())) {
      return czechDate;
    }
    // Fallback to ISO format
    const isoDate = new Date(trimmed);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    return null;
  };

  const reportData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;
    let periodLabel: string;

    switch (selectedPeriod) {
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        periodLabel = 'Týdenní report';
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = 'Měsíční report';
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        periodLabel = 'Čtvrtletní report';
        break;
      case 'custom':
        const parsedStart = parseCustomDate(customStartDate);
        const parsedEnd = parseCustomDate(customEndDate);
        startDate = parsedStart || new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = parsedEnd || now;
        periodLabel = 'Vlastní report';
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodLabel = 'Měsíční report';
    }

    const periodPurchases = purchases.filter(p => {
      // Use createdAt if available, fallback to purchaseDate
      const dateString = String(p.createdAt || p.purchaseDate || '');
      if (!dateString.trim()) return false;
      const purchaseDate = parseDateString(dateString);
      if (!purchaseDate) return false;
      return purchaseDate >= startDate && purchaseDate <= endDate;
    });

    const byState = {
      new: periodPurchases.filter(p => p.purchaseState === PurchaseState.NEW).length,
      inProgress: periodPurchases.filter(p => p.purchaseState === PurchaseState.IN_PROGRESS).length,
      completed: periodPurchases.filter(p => p.purchaseState === PurchaseState.COMPLETED).length,
      cancelled: periodPurchases.filter(p => p.purchaseState === PurchaseState.CANCELLED).length,
    };

    // Debug logging
    console.log('[Reporty] Total purchases:', purchases.length);
    console.log('[Reporty] Period:', selectedPeriod, 'startDate:', startDate, 'endDate:', endDate);
    console.log('[Reporty] Filtered periodPurchases:', periodPurchases.length);
    if (purchases.length > 0) {
      console.log('[Reporty] First purchase createdAt:', purchases[0].createdAt);
      const parsed = parseDateString(purchases[0].createdAt || '');
      console.log('[Reporty] Parsed first date:', parsed);
    }
    console.log('[Reporty] byState:', byState);

    // Debug totalAmount
    console.log('[Reporty] Checking totalAmount in periodPurchases:');
    periodPurchases.forEach((p, idx) => {
      console.log(`  [${idx}] Purchase ${p.id}: totalAmount=${p.totalAmount}, customerPrice=${p.customerPrice}, offeredPrice=${p.offeredPrice}`);
    });
    const totalValue = periodPurchases.reduce((sum, p) => {
      let amount = 0;
      if (typeof p.totalAmount === 'number') {
        amount = p.totalAmount;
      } else if (typeof p.totalAmount === 'string' && p.totalAmount) {
        const parsed = parseFloat((p.totalAmount as string).replace(',', '.'));
        amount = isNaN(parsed) ? 0 : parsed;
      }
      return sum + amount;
    }, 0);
    const completedValue = periodPurchases
      .filter(p => p.purchaseState === PurchaseState.COMPLETED)
      .reduce((sum, p) => {
        let amount = 0;
        if (typeof p.totalAmount === 'number') {
          amount = p.totalAmount;
        } else if (typeof p.totalAmount === 'string' && p.totalAmount) {
          const parsed = parseFloat((p.totalAmount as string).replace(',', '.'));
          amount = isNaN(parsed) ? 0 : parsed;
        }
        return sum + amount;
      }, 0);

    // Výkupy podle značky
    const byMake: Record<string, number> = {};
    periodPurchases.forEach(p => {
      const make = p.carDetails?.make || 'Neznámá';
      byMake[make] = (byMake[make] || 0) + 1;
    });

    const topMakes = Object.entries(byMake)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      periodLabel,
      startDate: startDate.toLocaleDateString('cs-CZ'),
      endDate: endDate.toLocaleDateString('cs-CZ'),
      total: periodPurchases.length,
      byState,
      totalValue,
      completedValue,
      avgValue: periodPurchases.length > 0 ? totalValue / periodPurchases.length : 0,
      successRate: periodPurchases.length > 0 
        ? (byState.completed / periodPurchases.length) * 100 
        : 0,
      topMakes,
    };
  }, [purchases, selectedPeriod, customStartDate, customEndDate]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = async () => {
    try {
      const now = new Date();
      let startDate: Date = new Date(now);
      let periodName = 'Report';
      switch (selectedPeriod) {
        case 'week':
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          periodName = 'Týdenní report';
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          periodName = 'Měsíční report';
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          periodName = 'Čtvrtletní report';
          break;
      }

      const periodPurchases = purchases.filter(p => {
        // Use createdAt if available, fallback to purchaseDate
        const dateValue = p.createdAt || p.purchaseDate || '';
        const dateString = String(dateValue).trim();
        if (!dateString) return false;
        const purchaseDate = parseDateString(dateString);
        if (!purchaseDate) return false;
        return purchaseDate >= startDate;
      });

      if (periodPurchases.length === 0) {
        Alert.alert('Info', 'Žádné výkupy k exportu za vybrané období');
        return;
      }

      await sharePurchasesList(periodPurchases, periodName);
    } catch (error) {
      console.error('[Reporty] Chyba při exportu:', error);
      Alert.alert('Chyba', 'Nepodařilo se exportovat report');
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStartDate || !customEndDate) {
      Alert.alert('Chyba', 'Prosím vyberte obě data');
      return;
    }
    const startDate = parseCustomDate(customStartDate);
    const endDate = parseCustomDate(customEndDate);
    if (!startDate || !endDate) {
      Alert.alert('Chyba', 'Neplatný formát datumu (dd.mm.yyyy)');
      return;
    }
    if (startDate > endDate) {
      Alert.alert('Chyba', 'Počáteční datum musí být před koncovým datem');
      return;
    }
    setSelectedPeriod('custom');
    setShowCustomModal(false);
  };

  const renderPeriodButton = (period: ReportPeriod, label: string) => (
    <TouchableOpacity
      style={[
        styles.periodButton,
        { 
          backgroundColor: selectedPeriod === period ? theme.accent : theme.inputBackground,
        }
      ]}
      onPress={() => {
        if (period === 'custom') {
          setShowCustomModal(true);
        } else {
          setSelectedPeriod(period);
        }
      }}
    >
      <Text
        style={[
          styles.periodButtonText,
          { color: selectedPeriod === period ? '#FFFFFF' : theme.text }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderMetricCard = (
    label: string,
    value: string | number,
    icon: string,
    color: string
  ) => (
    <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
      <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[isSplitView ? styles.splitLayout : styles.stackedLayout]}>
        {/* LEFT SIDEBAR - TABLET ONLY */}
        {isSplitView && (
          <View style={[styles.sidebar, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
            <ScrollView style={styles.sidebarScroll} showsVerticalScrollIndicator={false}>
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

              <TouchableOpacity 
                style={[styles.sidebarNavItem, { backgroundColor: theme.accent }]}
                onPress={() => router.push('/(tabs)/reporty')}
              >
                <Ionicons name="document-text" size={20} color="#FFFFFF" />
                <Text style={[styles.sidebarNavItemText, { color: '#FFFFFF' }]}>Reporty</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.sidebarNavItem}
                onPress={() => router.push('/(tabs)/notifications')}
              >
                <Ionicons name="notifications" size={20} color={theme.textSecondary} />
                <Text style={[styles.sidebarNavItemText, { color: theme.text }]}>Notifikace</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* User Profile Section at Bottom */}
            <SidebarUserSection />
          </View>
        )}

        {/* CONTENT */}
        <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: theme.text }]}>Reporty</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              {reportData.startDate} - {reportData.endDate}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: theme.accent }]}
            onPress={handleExport}
          >
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {renderPeriodButton('week', 'Týden')}
          {renderPeriodButton('month', 'Měsíc')}
          {renderPeriodButton('quarter', 'Čtvrtletí')}
          {renderPeriodButton('custom', 'Vlastní')}
        </View>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>
            {reportData.periodLabel}
          </Text>
          <View style={styles.summaryStats}>
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryValue, { color: theme.accent }]}>
                {reportData.total}
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                Výkupů celkem
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: theme.border }]} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryValue, { color: theme.success }]}>
                {reportData.successRate.toFixed(0)}%
              </Text>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                Úspěšnost
              </Text>
            </View>
          </View>
        </View>

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {renderMetricCard('NOVÝ', reportData.byState.new, 'add-circle', theme.accent)}
          {renderMetricCard('ROZJEDNÁNO', reportData.byState.inProgress, 'time', theme.warning)}
          {renderMetricCard('VYKOUPENO', reportData.byState.completed, 'checkmark-circle', theme.success)}
          {renderMetricCard('ODMÍTNUTO', reportData.byState.cancelled, 'close-circle', theme.error)}
        </View>

        {/* Financial Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Finanční souhrn
          </Text>
          <View style={styles.financialRows}>
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: theme.textSecondary }]}>
                Dokončené výkupy
              </Text>
              <Text style={[styles.financialValue, { color: theme.success }]}>
                {formatCurrency(reportData.completedValue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Top Makes */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Top značky vozidel
          </Text>
          {reportData.topMakes.length > 0 ? (
            <View style={styles.makesList}>
              {reportData.topMakes.map(([make, count], index) => (
                <View key={make} style={styles.makeItem}>
                  <View style={styles.makeRank}>
                    <Text style={[styles.makeRankText, { color: theme.textTertiary }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <Text style={[styles.makeName, { color: theme.text }]}>{make}</Text>
                  <Text style={[styles.makeCount, { color: theme.textSecondary }]}>
                    {count} výkupů
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
              Žádná data za vybrané období
            </Text>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Custom Date Range Modal */}
      <Modal
        visible={showCustomModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowCustomModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrapper, { backgroundColor: theme.accent + '20' }]}>
                <Ionicons name="calendar" size={28} color={theme.accent} />
              </View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Vlastní rozsah dat</Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                Vyberte počáteční a koncové datum
              </Text>
            </View>

            <View style={styles.modalForm}>
              <DatePickerField
                label="Počáteční datum"
                value={customStartDate}
                onChange={setCustomStartDate}
                placeholder="dd.mm.yyyy"
              />

              <DatePickerField
                label="Koncové datum"
                value={customEndDate}
                onChange={setCustomEndDate}
                placeholder="dd.mm.yyyy"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButtonSecondary, { backgroundColor: theme.inputBackground }]}
                onPress={() => setShowCustomModal(false)}
              >
                <Text style={[styles.modalButtonSecondaryText, { color: theme.text }]}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButtonPrimary, { backgroundColor: theme.accent }]}
                onPress={handleApplyCustomDates}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonPrimaryText}>Použít</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingHorizontal: 12,
    paddingBottom: 0,
    flexDirection: 'column',
  },
  sidebarScroll: {
    flex: 1,
    paddingTop: 16,
    paddingBottom: 8,
  },
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryDivider: {
    width: 1,
    height: 50,
    marginHorizontal: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
  },
  section: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  financialRows: {
    gap: 0,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  financialLabel: {
    fontSize: 15,
  },
  financialValue: {
    fontSize: 17,
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },
  makesList: {
    gap: 12,
  },
  makeItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  makeRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  makeRankText: {
    fontSize: 14,
    fontWeight: '600',
  },
  makeName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  makeCount: {
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
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
  modalForm: {
    gap: 16,
    marginBottom: 24,
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