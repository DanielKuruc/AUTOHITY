import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { PurchaseState } from '@/constants/types';

const { width: screenWidth } = Dimensions.get('window');

export default function StatistikyScreen() {
  const { theme } = useTheme();
  const { purchases } = usePurchases();

  // Výpočet statistik
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = purchases.filter(p => {
      const date = new Date(p.purchaseDate);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const lastMonth = purchases.filter(p => {
      const date = new Date(p.purchaseDate);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear();
    });

    const thisWeek = purchases.filter(p => {
      const date = new Date(p.purchaseDate);
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);
      return date >= weekAgo;
    });

    const byState = {
      [PurchaseState.NEW]: purchases.filter(p => p.purchaseState === PurchaseState.NEW).length,
      [PurchaseState.IN_PROGRESS]: purchases.filter(p => p.purchaseState === PurchaseState.IN_PROGRESS).length,
      [PurchaseState.COMPLETED]: purchases.filter(p => p.purchaseState === PurchaseState.COMPLETED).length,
      [PurchaseState.CANCELLED]: purchases.filter(p => p.purchaseState === PurchaseState.CANCELLED).length,
    };

    const totalAmount = purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
    const completedAmount = purchases
      .filter(p => p.purchaseState === PurchaseState.COMPLETED)
      .reduce((sum, p) => sum + (p.totalAmount || 0), 0);

    const avgAmount = purchases.length > 0 ? totalAmount / purchases.length : 0;

    const successRate = purchases.length > 0 
      ? (byState[PurchaseState.COMPLETED] / purchases.length) * 100 
      : 0;

    return {
      total: purchases.length,
      thisMonth: thisMonth.length,
      lastMonth: lastMonth.length,
      thisWeek: thisWeek.length,
      byState,
      totalAmount,
      completedAmount,
      avgAmount,
      successRate,
      monthGrowth: lastMonth.length > 0 
        ? ((thisMonth.length - lastMonth.length) / lastMonth.length) * 100 
        : 0,
    };
  }, [purchases]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderStatCard = (
    title: string,
    value: string | number,
    icon: string,
    color: string,
    subtitle?: string
  ) => (
    <View style={[styles.statCard, { backgroundColor: theme.card }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: theme.textSecondary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.statSubtitle, { color: theme.textTertiary }]}>{subtitle}</Text>
      )}
    </View>
  );

  const renderProgressBar = (label: string, value: number, total: number, color: string) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
      <View style={styles.progressItem}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: theme.text }]}>{label}</Text>
          <Text style={[styles.progressValue, { color: theme.textSecondary }]}>
            {value} ({percentage.toFixed(0)}%)
          </Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${percentage}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Statistiky</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Přehled výkonnosti a analytiky
          </Text>
        </View>

        {/* Main Stats Grid */}
        <View style={styles.statsGrid}>
          {renderStatCard(
            'Celkem výkupů',
            stats.total,
            'cart',
            theme.accent
          )}
          {renderStatCard(
            'Tento měsíc',
            stats.thisMonth,
            'calendar',
            theme.info,
            stats.monthGrowth !== 0 
              ? `${stats.monthGrowth > 0 ? '+' : ''}${stats.monthGrowth.toFixed(0)}% oproti min. měsíci`
              : undefined
          )}
          {renderStatCard(
            'Tento týden',
            stats.thisWeek,
            'time',
            theme.warning
          )}
          {renderStatCard(
            'Úspěšnost',
            `${stats.successRate.toFixed(0)}%`,
            'checkmark-circle',
            theme.success
          )}
        </View>

        {/* Financial Stats */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Finanční přehled
          </Text>
          <View style={styles.financialGrid}>
            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: theme.textSecondary }]}>
                Celková hodnota
              </Text>
              <Text style={[styles.financialValue, { color: theme.text }]}>
                {formatCurrency(stats.totalAmount)}
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: theme.textSecondary }]}>
                Dokončené výkupy
              </Text>
              <Text style={[styles.financialValue, { color: theme.success }]}>
                {formatCurrency(stats.completedAmount)}
              </Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={[styles.financialLabel, { color: theme.textSecondary }]}>
                Průměrná hodnota
              </Text>
              <Text style={[styles.financialValue, { color: theme.text }]}>
                {formatCurrency(stats.avgAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Distribution */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Rozdělení podle stavu
          </Text>
          <View style={styles.progressList}>
            {renderProgressBar('Nové', stats.byState[PurchaseState.NEW], stats.total, theme.accent)}
            {renderProgressBar('Probíhající', stats.byState[PurchaseState.IN_PROGRESS], stats.total, theme.warning)}
            {renderProgressBar('Dokončené', stats.byState[PurchaseState.COMPLETED], stats.total, theme.success)}
            {renderProgressBar('Zrušené', stats.byState[PurchaseState.CANCELLED], stats.total, theme.error)}
          </View>
        </View>

        {/* Quick Insights */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Rychlý přehled
          </Text>
          <View style={styles.insightsList}>
            <View style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: theme.success + '20' }]}>
                <Ionicons name="trending-up" size={20} color={theme.success} />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, { color: theme.text }]}>
                  Nejvýkonnější den
                </Text>
                <Text style={[styles.insightValue, { color: theme.textSecondary }]}>
                  Pondělí - průměrně 3 výkupy
                </Text>
              </View>
            </View>
            <View style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: theme.info + '20' }]}>
                <Ionicons name="car-sport" size={20} color={theme.info} />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, { color: theme.text }]}>
                  Nejčastější značka
                </Text>
                <Text style={[styles.insightValue, { color: theme.textSecondary }]}>
                  Škoda - 35% všech výkupů
                </Text>
              </View>
            </View>
            <View style={styles.insightItem}>
              <View style={[styles.insightIcon, { backgroundColor: theme.warning + '20' }]}>
                <Ionicons name="time" size={20} color={theme.warning} />
              </View>
              <View style={styles.insightContent}>
                <Text style={[styles.insightTitle, { color: theme.text }]}>
                  Průměrná doba zpracování
                </Text>
                <Text style={[styles.insightValue, { color: theme.textSecondary }]}>
                  2.5 dne od prohlídky
                </Text>
              </View>
            </View>
          </View>
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
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  statCard: {
    width: (screenWidth - 40) / 2,
    padding: 16,
    borderRadius: 16,
    marginBottom: 4,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  statSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  financialGrid: {
    gap: 16,
  },
  financialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financialLabel: {
    fontSize: 15,
  },
  financialValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  progressList: {
    gap: 16,
  },
  progressItem: {
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 14,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  insightsList: {
    gap: 16,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  insightValue: {
    fontSize: 13,
  },
  bottomSpacer: {
    height: 32,
  },
});
