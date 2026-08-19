import { DatePickerField } from '@/components/DatePickerField';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SidebarBrand } from '@/components/SidebarBrand';
import { SidebarUserSection } from '@/components/SidebarUserSection';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useUsers } from '@/contexts/UsersContext';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { statisticsService } from '@/services/statisticsService';
import { showAlert } from '@/utils/alert';

type StatisticsMode = 'personal' | 'total';
type StatisticsPeriod = 'week' | 'month' | 'quarter' | 'custom';

export default function StatisticsScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { isSplitView } = useTabletLayout();
  const [mode, setMode] = useState<StatisticsMode>('personal');
  const [period, setPeriod] = useState<StatisticsPeriod>('month');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
  const [datePickerField, setDatePickerField] = useState<'start' | 'end'>('start');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [topMakes, setTopMakes] = useState<Array<any>>([]);
  const [showAllMakes, setShowAllMakes] = useState(false);
  const { users } = useUsers();
  const { user: currentUser } = useAuth();

  // Map period to API timeFilter
  const getTimeFilter = useCallback(() => {
    if (period === 'week') return 'WEEK';
    if (period === 'month') return 'MONTH';
    if (period === 'quarter') return 'QUARTER';
    if (period === 'custom') return 'CUSTOM';
    return 'ALL';
  }, [period]);

  // Convert date format from dd.mm.yyyy to YYYY-MM-DD
  const formatDateForAPI = (dateString: string): string => {
    if (!dateString) return '';
    const parts = dateString.split('.');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  };

  // Load statistics from API
  const loadStatistics = useCallback(async () => {
    setIsLoading(true);
    try {
      const timeFilter = getTimeFilter();
      let fromDate, toDate;

      if (period === 'custom' && customStartDate && customEndDate) {
        fromDate = formatDateForAPI(customStartDate);
        toDate = formatDateForAPI(customEndDate);
      }

      const data = await statisticsService.getStatistics(
        timeFilter,
        undefined, // employeeId
        mode === 'personal', // onlyMyPurchases
        fromDate,
        toDate
      );

      // Transform API response to stats format - convert strings to numbers
      const stateMap: Record<string, number> = {
        NEW: 0,
        IN_PROGRESS: 0,
        COMPLETED: 0,
        CANCELLED: 0,
      };

      let totalAmount = 0;

      data.statsByState?.forEach((s: any) => {
        const count = Number(s.count) || 0;
        if (s.purchase_state === 'NEW') stateMap.NEW = count;
        if (s.purchase_state === 'IN_PROGRESS') stateMap.IN_PROGRESS = count;
        if (s.purchase_state === 'COMPLETED') stateMap.COMPLETED = count;
        if (s.purchase_state === 'CANCELLED') stateMap.CANCELLED = count;
        if (s.total_amount) totalAmount += Number(s.total_amount) || 0;
      });

      const total = stateMap.NEW + stateMap.IN_PROGRESS + stateMap.COMPLETED + stateMap.CANCELLED;

      setStats({
        total,
        new: stateMap.NEW,
        inProgress: stateMap.IN_PROGRESS,
        completed: stateMap.COMPLETED,
        cancelled: stateMap.CANCELLED,
        totalAmount,
        successRate: total > 0 ? Math.round((stateMap.COMPLETED / total) * 100) : 0,
      });

      // Set top makes with completed info
      const makes = (data.topMakes?.map((m: any) => ({
        make: m.make || 'Neznámá',
        total: Number(m.count) || 0,
        completed: Number(m.completed) || 0,
      })) || []) as any[];
      setTopMakes(makes);
    } catch (error) {
      showAlert('Chyba', 'Nepodařilo se načíst statistiky');
    } finally {
      setIsLoading(false);
    }
  }, [period, customStartDate, customEndDate, mode, getTimeFilter]);

  // Initial load and reload on filter change
  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadStatistics();
    setIsRefreshing(false);
  };

  const openDatePicker = (field: 'start' | 'end') => {
    setDatePickerField(field);
    setIsDatePickerVisible(true);
  };

  const onDateChange = (dateString: string) => {
    if (datePickerField === 'start') {
      setCustomStartDate(dateString);
    } else {
      setCustomEndDate(dateString);
    }
    closeDatePicker();
  };

  const closeDatePicker = () => {
    setIsDatePickerVisible(false);
  };

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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            {/* Header */}
            <ScreenHeader title="Statistiky" />

            <ScrollView style={styles.scroll}>
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

              {/* Period Selection */}
              <View style={[styles.periodContainer, { backgroundColor: theme.card }]}>
                {(['week', 'month', 'quarter', 'custom'] as StatisticsPeriod[]).map(p => (
                  <Pressable
                    key={p}
                    style={[
                      styles.periodButton,
                      period === p && [styles.periodButtonActive, { backgroundColor: theme.accent }],
                      { borderColor: theme.border },
                    ]}
                    onPress={() => setPeriod(p)}
                  >
                    <Text
                      style={[
                        styles.periodText,
                        period === p ? { color: '#FFFFFF' } : { color: theme.textSecondary },
                      ]}
                    >
                      {p === 'week' && 'Týden'}
                      {p === 'month' && 'Měsíc'}
                      {p === 'quarter' && 'Čtvrtletí'}
                      {p === 'custom' && 'Vlastní'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Custom Date Pickers */}
              {period === 'custom' && (
                <View style={[styles.customDateContainer, { backgroundColor: theme.card }]}>
                  <View style={{ flex: 1 }}>
                    <DatePickerField
                      label="Od"
                      value={customStartDate}
                      onChange={setCustomStartDate}
                      placeholder="Vyberte datum"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DatePickerField
                      label="Do"
                      value={customEndDate}
                      onChange={setCustomEndDate}
                      placeholder="Vyberte datum"
                    />
                  </View>
                </View>
              )}

              {/* Statistics Content */}
              {isLoading ? (
                <View style={styles.emptyState}>
                  <ActivityIndicator size="large" color={theme.accent} />
                </View>
              ) : stats ? (
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
                          Úspěšnost
                        </Text>
                        <Text style={[styles.mainStatValue, { color: theme.success }]}>
                          {stats.successRate ?? 0}%
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
                      <>
                        <View style={styles.makesList}>
                          {topMakes.slice(0, 10).map((item: any, index: number) => (
                            <View key={item.make} style={styles.makeItem}>
                              <View style={styles.makeRank}>
                                <Text style={[styles.makeRankText, { color: theme.textTertiary }]}>
                                  {index + 1}
                                </Text>
                              </View>
                              <Text style={[styles.makeName, { color: theme.text }]}>{item.make}</Text>
                              <View style={styles.makeCountWrapper}>
                                <Text style={[styles.makeCountCompleted, { color: theme.success }]}>
                                  {item.completed}
                                </Text>
                                <Text style={[styles.makeCountTotal, { color: theme.textSecondary }]}>
                                  / {item.total}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                        {topMakes.length > 10 && (
                          <TouchableOpacity 
                            style={[styles.showMoreButton, { backgroundColor: theme.inputBackground }]}
                            onPress={() => setShowAllMakes(true)}
                          >
                            <Text style={[styles.showMoreText, { color: theme.accent }]}>
                              Zobrazit všechny ({topMakes.length})
                            </Text>
                            <Ionicons name="chevron-forward" size={18} color={theme.accent} />
                          </TouchableOpacity>
                        )}
                      </>
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

            {/* All Makes Modal */}
            <Modal
              visible={showAllMakes}
              transparent
              animationType="fade"
              onRequestClose={() => setShowAllMakes(false)}
            >
              <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
              >
                <TouchableOpacity 
                  style={styles.modalBackdrop} 
                  activeOpacity={1} 
                  onPress={() => setShowAllMakes(false)}
                />
                <View style={[styles.modalContent, { backgroundColor: theme.card, height: '85%' }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.text }]}>Všechny značky vozidel</Text>
                    <TouchableOpacity 
                      style={{ padding: 8 }}
                      onPress={() => setShowAllMakes(false)}
                    >
                      <Ionicons name="close" size={24} color={theme.text} />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} showsVerticalScrollIndicator={true}>
                    <View style={styles.makesList}>
                      {topMakes.map((item: any, index: number) => (
                        <View key={item.make} style={styles.makeItem}>
                          <View style={styles.makeRank}>
                            <Text style={[styles.makeRankText, { color: theme.textTertiary }]}>
                              {index + 1}
                            </Text>
                          </View>
                          <Text style={[styles.makeName, { color: theme.text }]}>{item.make}</Text>
                          <View style={styles.makeCountWrapper}>
                            <Text style={[styles.makeCountCompleted, { color: theme.success }]}>
                              {item.completed}
                            </Text>
                            <Text style={[styles.makeCountTotal, { color: theme.textSecondary }]}>
                              / {item.total}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </Modal>

            {/* Date Picker Modal */}
            <Modal
              visible={isDatePickerVisible}
              transparent
              animationType="slide"
              onRequestClose={closeDatePicker}
            >
              <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                  <DatePickerField
                    label={datePickerField === 'start' ? 'Od' : 'Do'}
                    value={datePickerField === 'start' ? customStartDate : customEndDate}
                    onChange={onDateChange}
                    placeholder="Vyberte datum"
                  />
                  <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={closeDatePicker} style={styles.modalButton}>
                      <Text style={[styles.modalButtonText, { color: theme.accent }]}>Zrušit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </KeyboardAvoidingView>
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
  scroll: {
    flex: 1,
    padding: 16,
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
  periodContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    borderRadius: 12,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  periodButtonActive: {
    borderWidth: 0,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  customDateContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
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
  makeCountWrapper: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  makeCountCompleted: {
    fontSize: 15,
    fontWeight: '700',
  },
  makeCountTotal: {
    fontSize: 14,
    fontWeight: '500',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  showMoreText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    zIndex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 16,
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});