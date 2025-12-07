import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { PurchaseState } from '@/constants/types';

type ReportPeriod = 'week' | 'month' | 'quarter';

export default function ReportyScreen() {
  const { theme } = useTheme();
  const { purchases } = usePurchases();
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('month');

  const reportData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
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
    }

    const periodPurchases = purchases.filter(p => new Date(p.purchaseDate) >= startDate);

    const byState = {
      new: periodPurchases.filter(p => p.purchaseState === PurchaseState.NEW).length,
      inProgress: periodPurchases.filter(p => p.purchaseState === PurchaseState.IN_PROGRESS).length,
      completed: periodPurchases.filter(p => p.purchaseState === PurchaseState.COMPLETED).length,
      cancelled: periodPurchases.filter(p => p.purchaseState === PurchaseState.CANCELLED).length,
    };

    const totalValue = periodPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const completedValue = periodPurchases
      .filter(p => p.purchaseState === PurchaseState.COMPLETED)
      .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

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
      endDate: now.toLocaleDateString('cs-CZ'),
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
  }, [purchases, selectedPeriod]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const generateReportText = () => {
    return `
${reportData.periodLabel}
Období: ${reportData.startDate} - ${reportData.endDate}

SOUHRN VÝKUPŮ
━━━━━━━━━━━━━━━━━━━━
Celkem výkupů: ${reportData.total}
• Nové: ${reportData.byState.new}
• Probíhající: ${reportData.byState.inProgress}
• Dokončené: ${reportData.byState.completed}
• Zrušené: ${reportData.byState.cancelled}

FINANČNÍ ÚDAJE
━━━━━━━━━━━━━━━━━━━━
Celková hodnota: ${formatCurrency(reportData.totalValue)}
Dokončené: ${formatCurrency(reportData.completedValue)}
Průměrná hodnota: ${formatCurrency(reportData.avgValue)}
Úspěšnost: ${reportData.successRate.toFixed(1)}%

TOP ZNAČKY
━━━━━━━━━━━━━━━━━━━━
${reportData.topMakes.map((m, i) => `${i + 1}. ${m[0]}: ${m[1]} výkupů`).join('\n')}

━━━━━━━━━━━━━━━━━━━━
Vygenerováno: ${new Date().toLocaleString('cs-CZ')}
AutoHity - Systém výkupů
    `.trim();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: generateReportText(),
        title: reportData.periodLabel,
      });
    } catch (error) {
      Alert.alert('Chyba', 'Nepodařilo se sdílet report');
    }
  };

  const handleExport = () => {
    Alert.alert(
      'Export reportu',
      'Vyberte formát exportu:',
      [
        { text: 'Zrušit', style: 'cancel' },
        { text: 'Sdílet text', onPress: handleShare },
        { 
          text: 'PDF (brzy)', 
          onPress: () => Alert.alert('Info', 'Export do PDF bude dostupný v další verzi.')
        },
      ]
    );
  };

  const renderPeriodButton = (period: ReportPeriod, label: string) => (
    <TouchableOpacity
      style={[
        styles.periodButton,
        { 
          backgroundColor: selectedPeriod === period ? theme.accent : theme.inputBackground,
        }
      ]}
      onPress={() => setSelectedPeriod(period)}
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
          {renderMetricCard('Nové', reportData.byState.new, 'add-circle', theme.accent)}
          {renderMetricCard('Probíhá', reportData.byState.inProgress, 'time', theme.warning)}
          {renderMetricCard('Dokončeno', reportData.byState.completed, 'checkmark-circle', theme.success)}
          {renderMetricCard('Zrušeno', reportData.byState.cancelled, 'close-circle', theme.error)}
        </View>

        {/* Financial Section */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Finanční souhrn
          </Text>
          <View style={styles.financialRows}>
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: theme.textSecondary }]}>
                Celková hodnota výkupů
              </Text>
              <Text style={[styles.financialValue, { color: theme.text }]}>
                {formatCurrency(reportData.totalValue)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: theme.textSecondary }]}>
                Dokončené výkupy
              </Text>
              <Text style={[styles.financialValue, { color: theme.success }]}>
                {formatCurrency(reportData.completedValue)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.financialRow}>
              <Text style={[styles.financialLabel, { color: theme.textSecondary }]}>
                Průměrná hodnota
              </Text>
              <Text style={[styles.financialValue, { color: theme.text }]}>
                {formatCurrency(reportData.avgValue)}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  metricCard: {
    width: '48%',
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
});
