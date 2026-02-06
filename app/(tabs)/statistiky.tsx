import { SidebarUserSection } from '@/components/SidebarUserSection';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUsers } from '@/contexts/UsersContext';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type StatisticsMode = 'personal' | 'total';

export default function StatisticsScreen() {
  const { userStats, allStats, loadUserStats, loadAllStats, isLoading: authLoading, user } = useAuth();
  const { purchases } = usePurchases();
  const { theme } = useTheme();
  const { isSplitView } = useTabletLayout();
  const [mode, setMode] = useState<StatisticsMode>('personal');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { users } = useUsers();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadUserStats();
    loadAllStats();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadUserStats(), loadAllStats()]);
    setIsRefreshing(false);
  };

  const stats = mode === 'personal' ? userStats : allStats;

  // Calculate top makes
  const topMakes = useMemo(() => {
    const relevantPurchases = mode === 'personal' && user
      ? purchases.filter(p => p.employeeId === user.id)
      : purchases;

    const byMake: Record<string, number> = {};
    relevantPurchases.forEach(p => {
      const make = p.carDetails?.make || 'Neznámá';
      byMake[make] = (byMake[make] || 0) + 1;
    });

    return Object.entries(byMake)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [purchases, mode, user]);

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
                style={[styles.sidebarNavItem, { backgroundColor: theme.accent }]}
                onPress={() => router.push('/(tabs)/statistiky')}
              >
                <Ionicons name="bar-chart" size={20} color="#FFFFFF" />
                <Text style={[styles.sidebarNavItemText, { color: '#FFFFFF' }]}>Statistiky</Text>
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
            </ScrollView>

            {/* User Profile Section at Bottom */}
            <SidebarUserSection />
          </View>
        )}

        {/* CONTENT */}
        <View style={{ flex: 1 }}>
      <ScrollView style={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Statistiky</Text>
        </View>

        {/* Mode Toggle */}
        <View style={[styles.toggleContainer, { backgroundColor: theme.card }]}>
          <Pressable
            style={[
              styles.toggleButton,
              mode === 'personal' && [styles.toggleButtonActive, { backgroundColor: theme.accent }],
              { borderColor: theme.border },
            ]}
            onPress={() => setMode('personal')}
          >
            <Text
              style={[
                styles.toggleText,
                mode === 'personal' ? { color: '#FFFFFF' } : { color: theme.textSecondary },
              ]}
            >
              Moje
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.toggleButton,
              mode === 'total' && [styles.toggleButtonActive, { backgroundColor: theme.accent }],
              { borderColor: theme.border },
            ]}
            onPress={() => setMode('total')}
          >
            <Text
              style={[
                styles.toggleText,
                mode === 'total' ? { color: '#FFFFFF' } : { color: theme.textSecondary },
              ]}
            >
              Celkové
            </Text>
          </Pressable>
        </View>

        {/* Statistics Content */}
        {stats ? (
          <View>
            {/* Main Stats Cards */}
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <View style={styles.mainStatContainer}>
                <View style={styles.mainStatItem}>
                  <Text style={[styles.mainStatLabel, { color: theme.textSecondary }]}>
                    Celkem
                  </Text>
                  <Text style={[styles.mainStatValue, { color: theme.accent }]}>
                    {stats.total}
                  </Text>
                </View>

                <View style={[styles.mainStatDivider, { backgroundColor: theme.border }]} />

                <View style={styles.mainStatItem}>
                  <Text style={[styles.mainStatLabel, { color: theme.textSecondary }]}>
                    Průměr/den
                  </Text>
                  <Text style={[styles.mainStatValue, { color: theme.accent }]}>
                    {stats.total > 0 ? (stats.total / 30).toFixed(1) : '0'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Detailed Stats Grid */}
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Rozpad podle stavu</Text>

              <View style={styles.statsGrid}>
                {/* New */}
                <View style={[styles.statBox, { borderColor: '#FF9500', backgroundColor: '#FF9500' + '15' }]}>
                  <View style={styles.statBoxHeader}>
                    <Ionicons name="star" size={20} color="#FF9500" />
                    <Text style={[styles.statBoxLabel, { color: '#FF9500' }]}>NOVÝ</Text>
                  </View>
                  <Text style={[styles.statBoxValue, { color: theme.text }]}>
                    {stats.new}
                  </Text>
                  <Text style={[styles.statBoxPercent, { color: theme.textSecondary }]}>
                    {stats.total > 0 ? Math.round((stats.new / stats.total) * 100) : 0}%
                  </Text>
                </View>

                {/* In Progress */}
                <View style={[styles.statBox, { borderColor: '#0066FF', backgroundColor: '#0066FF' + '15' }]}>
                  <View style={styles.statBoxHeader}>
                    <Ionicons name="sync" size={20} color="#0066FF" />
                    <Text style={[styles.statBoxLabel, { color: '#0066FF' }]}>ROZJEDNÁNO</Text>
                  </View>
                  <Text style={[styles.statBoxValue, { color: theme.text }]}>
                    {stats.inProgress}
                  </Text>
                  <Text style={[styles.statBoxPercent, { color: theme.textSecondary }]}>
                    {stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%
                  </Text>
                </View>

                {/* Completed */}
                <View style={[styles.statBox, { borderColor: '#00C851', backgroundColor: '#00C851' + '15' }]}>
                  <View style={styles.statBoxHeader}>
                    <Ionicons name="checkmark-circle" size={20} color="#00C851" />
                    <Text style={[styles.statBoxLabel, { color: '#00C851' }]}>VYKOUPENO</Text>
                  </View>
                  <Text style={[styles.statBoxValue, { color: theme.text }]}>
                    {stats.completed}
                  </Text>
                  <Text style={[styles.statBoxPercent, { color: theme.textSecondary }]}>
                    {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                  </Text>
                </View>

                {/* Cancelled */}
                <View style={[styles.statBox, { borderColor: '#DD2C00', backgroundColor: '#DD2C00' + '15' }]}>
                  <View style={styles.statBoxHeader}>
                    <Ionicons name="close-circle" size={20} color="#DD2C00" />
                    <Text style={[styles.statBoxLabel, { color: '#DD2C00' }]}>ODMÍTNUTO</Text>
                  </View>
                  <Text style={[styles.statBoxValue, { color: theme.text }]}>
                    {stats.cancelled ?? 0}
                  </Text>
                  <Text style={[styles.statBoxPercent, { color: theme.textSecondary }]}>
                    {stats.total > 0 ? Math.round(((stats.cancelled ?? 0) / stats.total) * 100) : 0}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Vizuální přehled</Text>

              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: theme.border, height: 20, borderRadius: 10, overflow: 'hidden' }]}>
                  {stats.total > 0 && (
                    <>
                      <View
                        style={[
                          styles.progressSegment,
                          { width: `${(stats.new / stats.total) * 100}%`, backgroundColor: '#FF9500' },
                        ]}
                      />
                      <View
                        style={[
                          styles.progressSegment,
                          { width: `${(stats.inProgress / stats.total) * 100}%`, backgroundColor: '#0066FF' },
                        ]}
                      />
                      <View
                        style={[
                          styles.progressSegment,
                          { width: `${(stats.completed / stats.total) * 100}%`, backgroundColor: '#00C851' },
                        ]}
                      />
                      <View
                        style={[
                          styles.progressSegment,
                          { width: `${((stats.cancelled ?? 0) / stats.total) * 100}%`, backgroundColor: '#DD2C00' },
                        ]}
                      />
                    </>
                  )}
                </View>
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
                  <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>NOVÝ</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#0066FF' }]} />
                  <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>ROZJEDNÁNO</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#00C851' }]} />
                  <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>VYKOUPENO</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#DD2C00' }]} />
                  <Text style={[styles.legendLabel, { color: theme.textSecondary }]}>ODMÍTNUTO</Text>
                </View>
              </View>
            </View>

            {/* Top Vehicle Makes */}
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Top značky vozidel</Text>
              {topMakes.length > 0 ? (
                <View style={styles.makesList}>
                  {topMakes.map(([make, count], index) => (
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
                  Žádná data k zobrazení
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
              Žádná data k zobrazení
            </Text>
          </View>
        )}

        {/* Refresh Button */}
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: theme.accent }]}
          onPress={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.refreshText}>Obnovit</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  toggleButtonActive: {
    borderWidth: 0,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
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
  mainStatContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  mainStatItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainStatLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  mainStatValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  mainStatDivider: {
    width: 1,
    height: 60,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
  },
  statBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statBoxLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statBoxValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statBoxPercent: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    flexDirection: 'row',
    width: '100%',
  },
  progressSegment: {
    flex: 0,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 32,
  },
  refreshText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
});