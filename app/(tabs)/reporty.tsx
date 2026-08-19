import { DatePickerField } from "@/components/DatePickerField";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SidebarBrand } from "@/components/SidebarBrand";
import { SidebarUserSection } from "@/components/SidebarUserSection";
import { useTheme } from "@/contexts/ThemeContext";
import { useUsers } from "@/contexts/UsersContext";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { shareCompleteReport } from "@/services/exportService";
import { reportsService } from "@/services/reportsService";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { showAlert } from '@/utils/alert';

type ReportPeriod = "week" | "month" | "year" | "custom";

export default function ReportyScreen() {
  const { theme } = useTheme();
  const { users } = useUsers();
  const { isSplitView } = useTabletLayout();
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>("month");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [showAllMakes, setShowAllMakes] = useState(false);

  // Map period to API timeFilter
  const getTimeFilter = useCallback(() => {
    if (selectedPeriod === "week") return "WEEK";
    if (selectedPeriod === "month") return "MONTH";
    if (selectedPeriod === "year") return "YEAR";
    if (selectedPeriod === "custom") return "CUSTOM";
    return "ALL";
  }, [selectedPeriod]);

  // Convert date format from dd.mm.yyyy to YYYY-MM-DD
  const formatDateForAPI = (dateString: string): string => {
    if (!dateString) return "";
    const parts = dateString.split(".");
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateString;
  };

  // Load report data from API
  const loadReportData = useCallback(async () => {
    setIsLoading(true);
    try {
      const timeFilter = getTimeFilter();
      let fromDate, toDate;

      if (selectedPeriod === "custom") {
        if (customStartDate) fromDate = formatDateForAPI(customStartDate);
        if (customEndDate) toDate = formatDateForAPI(customEndDate);
      }

      const data = await reportsService.getReportData(
        timeFilter,
        undefined,
        false,
        fromDate,
        toDate,
      );

      // Transform API response
      const now = new Date();
      let startDate: Date;
      let periodLabel: string;

      switch (selectedPeriod) {
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          periodLabel = "Týdenní report";
          break;
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = "Měsíční report";
          break;
        case "year":
          startDate = new Date(now.getFullYear(), 0, 1);
          periodLabel = "Roční report";
          break;
        case "custom":
          startDate = fromDate
            ? new Date(fromDate)
            : new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = "Vlastní report";
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          periodLabel = "Měsíční report";
      }

      const purchases = data.purchases || [];
      const endDate = now;

      // Calculate stats by state
      const byState = {
        new: purchases.filter((p: any) => p.purchase_state === "NEW").length,
        inProgress: purchases.filter(
          (p: any) => p.purchase_state === "IN_PROGRESS",
        ).length,
        completed: purchases.filter(
          (p: any) => p.purchase_state === "COMPLETED",
        ).length,
        cancelled: purchases.filter(
          (p: any) => p.purchase_state === "CANCELLED",
        ).length,
      };

      // Calculate totals - convert to numbers since API returns strings
      const totalValue = purchases.reduce(
        (sum: number, p: any) => sum + (Number(p.total_amount) || 0),
        0,
      );
      const completedValue = purchases
        .filter((p: any) => p.purchase_state === "COMPLETED")
        .reduce(
          (sum: number, p: any) => sum + (Number(p.total_amount) || 0),
          0,
        );

      // Use topMakes directly from API - include both total and completed
      const topMakes = (data.topMakes || []).map((item: any) => ({
        make: item.make || "Neznámá",
        total: Number(item.count) || 0,
        completed: Number(item.completed) || 0,
      }));

      // Use topEmployees directly from API
      const topEmployees = data.topEmployees || [];

      setReportData({
        periodLabel,
        startDate: startDate.toLocaleDateString("cs-CZ"),
        endDate: endDate.toLocaleDateString("cs-CZ"),
        total: purchases.length,
        byState,
        totalValue,
        completedValue,
        avgValue: purchases.length > 0 ? totalValue / purchases.length : 0,
        successRate:
          purchases.length > 0
            ? (byState.completed / purchases.length) * 100
            : 0,
        topMakes,
        topEmployees,
        topSuppliers: data.topSuppliers || [],
        purchases,
      });
    } catch (error) {
      showAlert("Chyba", "Nepodařilo se načíst report data");
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, customStartDate, customEndDate, getTimeFilter]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("cs-CZ", {
      style: "currency",
      currency: "CZK",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleExport = async () => {
    if (!reportData) {
      showAlert("Info", "Žádná data k exportu za vybrané období");
      return;
    }
    try {
      const periodName = reportData.periodLabel;
      await shareCompleteReport(reportData, periodName);
    } catch (error) {
      showAlert("Chyba", "Nepodařilo se exportovat report");
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStartDate || !customEndDate) {
      showAlert("Chyba", "Prosím vyberte obě data");
      return;
    }
    setSelectedPeriod("custom");
    setShowCustomModal(false);
  };

  const renderPeriodButton = (period: ReportPeriod, label: string) => (
    <TouchableOpacity
      style={[
        styles.periodButton,
        {
          backgroundColor:
            selectedPeriod === period ? theme.accent : theme.inputBackground,
        },
      ]}
      onPress={() => {
        if (period === "custom") {
          setShowCustomModal(true);
        } else {
          setSelectedPeriod(period);
        }
      }}
    >
      <Text
        style={[
          styles.periodButtonText,
          { color: selectedPeriod === period ? "#FFFFFF" : theme.text },
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
    color: string,
  ) => (
    <View style={[styles.metricCard, { backgroundColor: theme.card }]}>
      <View style={[styles.metricIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.metricValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <View style={[isSplitView ? styles.splitLayout : styles.stackedLayout]}>
        {/* LEFT SIDEBAR - TABLET ONLY */}
        {isSplitView && (
          <View
            style={[
              styles.sidebar,
              {
                backgroundColor: theme.surface,
                borderRightColor: theme.border,
              },
            ]}
          >
            <SidebarBrand />

            <ScrollView
              style={styles.sidebarScroll}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={[
                  styles.sidebarNavItem,
                  { backgroundColor: theme.inputBackground },
                ]}
                onPress={() => router.push("/(tabs)")}
              >
                <Ionicons name="car" size={20} color={theme.textSecondary} />
                <Text
                  style={[styles.sidebarNavItemText, { color: theme.text }]}
                >
                  Výkupy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sidebarNavItem}
                onPress={() => router.push("/(tabs)/statistiky")}
              >
                <Ionicons
                  name="bar-chart"
                  size={20}
                  color={theme.textSecondary}
                />
                <Text
                  style={[styles.sidebarNavItemText, { color: theme.text }]}
                >
                  Statistiky
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sidebarNavItem,
                  { backgroundColor: theme.accent },
                ]}
                onPress={() => router.push("/(tabs)/reporty")}
              >
                <Ionicons name="document-text" size={20} color="#FFFFFF" />
                <Text style={[styles.sidebarNavItemText, { color: "#FFFFFF" }]}>
                  Reporty
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sidebarNavItem}
                onPress={() => router.push("/(tabs)/notifications")}
              >
                <Ionicons
                  name="notifications"
                  size={20}
                  color={theme.textSecondary}
                />
                <Text
                  style={[styles.sidebarNavItemText, { color: theme.text }]}
                >
                  Notifikace
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* User Profile Section at Bottom */}
            <SidebarUserSection />
          </View>
        )}

        {/* CONTENT */}
        <View style={{ flex: 1 }}>
          {/* Header */}
          <ScreenHeader
            title="Reporty"
            subtitle={`${reportData?.startDate || ""} - ${reportData?.endDate || ""}`}
            actions={
              <TouchableOpacity
                style={[styles.exportButton, { backgroundColor: theme.accent }]}
                onPress={handleExport}
              >
                <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                <Text style={styles.exportButtonText}>Export</Text>
              </TouchableOpacity>
            }
          />

          {isLoading ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <ActivityIndicator size="large" color={theme.accent} />
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Period Selector */}
              <View style={styles.periodSelector}>
                {renderPeriodButton("week", "Týden")}
                {renderPeriodButton("month", "Měsíc")}
                {renderPeriodButton("year", "Rok")}
                {renderPeriodButton("custom", "Vlastní")}
              </View>

              {/* Summary Card */}
              <View
                style={[styles.summaryCard, { backgroundColor: theme.card }]}
              >
                <Text style={[styles.summaryTitle, { color: theme.text }]}>
                  {reportData?.periodLabel || ""}
                </Text>
                <View style={styles.summaryStats}>
                  <View style={styles.summaryStat}>
                    <Text
                      style={[styles.summaryValue, { color: theme.accent }]}
                    >
                      {reportData?.total ?? 0}
                    </Text>
                    <Text
                      style={[
                        styles.summaryLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Výkupů celkem
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.summaryDivider,
                      { backgroundColor: theme.border },
                    ]}
                  />
                  <View style={styles.summaryStat}>
                    <Text
                      style={[styles.summaryValue, { color: theme.success }]}
                    >
                      {reportData?.successRate
                        ? reportData.successRate.toFixed(0)
                        : "0"}
                      %
                    </Text>
                    <Text
                      style={[
                        styles.summaryLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Úspěšnost
                    </Text>
                  </View>
                </View>
              </View>

              {/* Metrics Grid - 2x2 */}
              <View style={styles.metricsGrid}>
                {renderMetricCard(
                  "NOVÝ",
                  reportData?.byState?.new ?? 0,
                  "add-circle",
                  theme.accent,
                )}
                {renderMetricCard(
                  "ROZJEDNÁNO",
                  reportData?.byState?.inProgress ?? 0,
                  "time",
                  theme.warning,
                )}
                {renderMetricCard(
                  "VYKOUPENO",
                  reportData?.byState?.completed ?? 0,
                  "checkmark-circle",
                  theme.success,
                )}
                {renderMetricCard(
                  "ODMÍTNUTO",
                  reportData?.byState?.cancelled ?? 0,
                  "close-circle",
                  theme.error,
                )}
              </View>

              {/* Výkupy podle výkupčího */}
              <View style={[styles.section, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Výkupy podle výkupčího
                </Text>
                {reportData?.topEmployees &&
                reportData.topEmployees.length > 0 ? (
                  <>
                    <View style={styles.suppliersList}>
                      {reportData.topEmployees.map((employee: any) => (
                        <View
                          key={employee.name}
                          style={[
                            styles.supplierItem,
                            { borderBottomColor: theme.border },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.supplierName,
                                { color: theme.text },
                              ]}
                            >
                              {employee.name}
                            </Text>
                            <View style={styles.makeCountWrapper}>
                              <Text
                                style={[
                                  styles.makeCountCompleted,
                                  { color: theme.success },
                                ]}
                              >
                                {employee.completed}
                              </Text>
                              <Text
                                style={[
                                  styles.makeCountTotal,
                                  { color: theme.textSecondary },
                                ]}
                              >
                                / {employee.count}
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[
                              styles.supplierValue,
                              { color: theme.success },
                            ]}
                          >
                            {formatCurrency(employee.value)}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {/* Summary row */}
                    <View
                      style={[
                        styles.supplierItem,
                        {
                          paddingTop: 12,
                          borderTopWidth: 1,
                          borderTopColor: theme.border,
                          marginTop: 12,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.supplierName,
                          { color: theme.text, fontWeight: "700" },
                        ]}
                      >
                        Celkem
                      </Text>
                      <Text
                        style={[
                          styles.supplierValue,
                          { color: theme.success, fontWeight: "700" },
                        ]}
                      >
                        {formatCurrency(
                          reportData.topEmployees.reduce(
                            (sum: number, e: any) => sum + (e.value || 0),
                            0,
                          ),
                        )}
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text
                    style={[styles.emptyText, { color: theme.textTertiary }]}
                  >
                    Žádná data za vybrané období
                  </Text>
                )}
              </View>

              {/* Top Suppliers */}
              {reportData?.topSuppliers &&
                reportData.topSuppliers.length > 0 && (
                  <View
                    style={[styles.section, { backgroundColor: theme.card }]}
                  >
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                      Dodavatelé
                    </Text>
                    <View style={styles.suppliersList}>
                      {reportData.topSuppliers.map(
                        (supplier: any, index: number) => (
                          <View
                            key={supplier.id}
                            style={[
                              styles.supplierItem,
                              { borderBottomColor: theme.border },
                            ]}
                          >
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.supplierName,
                                  { color: theme.text },
                                ]}
                              >
                                {supplier.name}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.supplierValue,
                                { color: theme.success },
                              ]}
                            >
                              {formatCurrency(supplier.value)}
                            </Text>
                          </View>
                        ),
                      )}
                    </View>
                    {/* Summary row */}
                    <View
                      style={[
                        styles.supplierItem,
                        {
                          paddingTop: 12,
                          borderTopWidth: 1,
                          borderTopColor: theme.border,
                          marginTop: 12,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.supplierName,
                          { color: theme.text, fontWeight: "700" },
                        ]}
                      >
                        Celkem
                      </Text>
                      <Text
                        style={[
                          styles.supplierValue,
                          { color: theme.success, fontWeight: "700" },
                        ]}
                      >
                        {formatCurrency(
                          reportData.topSuppliers.reduce(
                            (sum: number, s: any) => sum + (s.value || 0),
                            0,
                          ),
                        )}
                      </Text>
                    </View>
                  </View>
                )}

              {/* Financial Section */}
              <View style={[styles.section, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Finanční souhrn
                </Text>
                <View style={styles.financialRows}>
                  <View style={styles.financialRow}>
                    <Text
                      style={[
                        styles.financialLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Dokončené výkupy
                    </Text>
                    <Text
                      style={[styles.financialValue, { color: theme.success }]}
                    >
                      {formatCurrency(reportData?.completedValue ?? 0)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Top Makes */}
              <View style={[styles.section, { backgroundColor: theme.card }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Top značky vozidel
                </Text>
                {reportData?.topMakes && reportData.topMakes.length > 0 ? (
                  <>
                    <View style={styles.makesList}>
                      {reportData.topMakes
                        .slice(0, 10)
                        .map((item: any, index: number) => (
                          <View key={item.make} style={styles.makeItem}>
                            <View style={styles.makeRank}>
                              <Text
                                style={[
                                  styles.makeRankText,
                                  { color: theme.textTertiary },
                                ]}
                              >
                                {index + 1}
                              </Text>
                            </View>
                            <Text
                              style={[styles.makeName, { color: theme.text }]}
                            >
                              {item.make}
                            </Text>
                            <View style={styles.makeCountWrapper}>
                              <Text
                                style={[
                                  styles.makeCountCompleted,
                                  { color: theme.success },
                                ]}
                              >
                                {item.completed}
                              </Text>
                              <Text
                                style={[
                                  styles.makeCountTotal,
                                  { color: theme.textSecondary },
                                ]}
                              >
                                / {item.total}
                              </Text>
                            </View>
                          </View>
                        ))}
                    </View>
                    {reportData.topMakes.length > 10 && (
                      <TouchableOpacity
                        style={[
                          styles.showMoreButton,
                          { backgroundColor: theme.inputBackground },
                        ]}
                        onPress={() => setShowAllMakes(true)}
                      >
                        <Text
                          style={[styles.showMoreText, { color: theme.accent }]}
                        >
                          Zobrazit všechny ({reportData.topMakes.length})
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={theme.accent}
                        />
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <Text
                    style={[styles.emptyText, { color: theme.textTertiary }]}
                  >
                    Žádná data za vybrané období
                  </Text>
                )}
              </View>

              {/* Refresh Button */}
              <View style={styles.refreshButtonContainer}>
                <TouchableOpacity
                  style={[
                    styles.refreshButton,
                    { backgroundColor: theme.accent },
                  ]}
                  onPress={loadReportData}
                >
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <Text style={styles.refreshButtonText}>Obnovit</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.bottomSpacer} />
            </ScrollView>
          )}
          {/* All Makes Modal */}
          <Modal
            visible={showAllMakes}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAllMakes(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalOverlay}
            >
              <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={() => setShowAllMakes(false)}
              />
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: theme.card, height: "85%" },
                ]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    Všechny značky vozidel
                  </Text>
                  <TouchableOpacity
                    style={{ padding: 8 }}
                    onPress={() => setShowAllMakes(false)}
                  >
                    <Ionicons name="close" size={24} color={theme.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={{ flex: 1, paddingHorizontal: 20 }}
                  showsVerticalScrollIndicator={true}
                >
                  <View style={styles.makesList}>
                    {reportData?.topMakes &&
                      reportData.topMakes.map((item: any, index: number) => (
                        <View key={item.make} style={styles.makeItem}>
                          <View style={styles.makeRank}>
                            <Text
                              style={[
                                styles.makeRankText,
                                { color: theme.textTertiary },
                              ]}
                            >
                              {index + 1}
                            </Text>
                          </View>
                          <Text
                            style={[styles.makeName, { color: theme.text }]}
                          >
                            {item.make}
                          </Text>
                          <View style={styles.makeCountWrapper}>
                            <Text
                              style={[
                                styles.makeCountCompleted,
                                { color: theme.success },
                              ]}
                            >
                              {item.completed}
                            </Text>
                            <Text
                              style={[
                                styles.makeCountTotal,
                                { color: theme.textSecondary },
                              ]}
                            >
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

          {/* Custom Date Range Modal */}
          <Modal
            visible={showCustomModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCustomModal(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalOverlay}
            >
              <TouchableOpacity
                style={styles.modalBackdrop}
                activeOpacity={1}
                onPress={() => setShowCustomModal(false)}
              />
              <View
                style={[styles.modalContent, { backgroundColor: theme.card }]}
              >
                <View style={styles.modalHeader}>
                  <View
                    style={[
                      styles.modalIconWrapper,
                      { backgroundColor: theme.accent + "20" },
                    ]}
                  >
                    <Ionicons name="calendar" size={28} color={theme.accent} />
                  </View>
                  <Text style={[styles.modalTitle, { color: theme.text }]}>
                    Vlastní rozsah dat
                  </Text>
                  <Text
                    style={[
                      styles.modalSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
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
                    style={[
                      styles.modalButtonSecondary,
                      { backgroundColor: theme.inputBackground },
                    ]}
                    onPress={() => setShowCustomModal(false)}
                  >
                    <Text
                      style={[
                        styles.modalButtonSecondaryText,
                        { color: theme.text },
                      ]}
                    >
                      Zrušit
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButtonPrimary,
                      { backgroundColor: theme.accent },
                    ]}
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
    flexDirection: "row",
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
    flexDirection: "column",
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sidebarUserInfo: {
    flex: 1,
  },
  sidebarUserName: {
    fontSize: 13,
    fontWeight: "600",
  },
  sidebarUserEmail: {
    fontSize: 11,
    fontWeight: "400",
  },
  sidebarUserId: {
    fontSize: 10,
    fontWeight: "400",
    fontFamily: "monospace",
  },
  sidebarUserNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  adminTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  sidebarNavItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 12,
    marginHorizontal: 4,
    marginVertical: 4,
  },
  sidebarNavItemText: {
    fontSize: 14,
    fontWeight: "500",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  exportButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    paddingTop: 16,
  },
  periodSelector: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  summaryStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryStat: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: "700",
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
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 8,
    justifyContent: "space-between",
  },
  metricCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  metricIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
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
    fontWeight: "600",
    marginBottom: 16,
  },
  financialRows: {
    gap: 0,
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  financialLabel: {
    fontSize: 15,
  },
  financialValue: {
    fontSize: 17,
    fontWeight: "600",
  },
  divider: {
    height: 1,
  },
  makesList: {
    gap: 12,
  },
  makeItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  makeRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  makeRankText: {
    fontSize: 14,
    fontWeight: "600",
  },
  makeName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  makeCountWrapper: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  makeCountCompleted: {
    fontSize: 15,
    fontWeight: "700",
  },
  makeCountTotal: {
    fontSize: 14,
    fontWeight: "500",
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  showMoreText: {
    fontSize: 15,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
  },
  bottomSpacer: {
    height: 32,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
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
    alignItems: "center",
    marginBottom: 24,
  },
  modalIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
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
    flexDirection: "row",
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  modalButtonPrimaryText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  suppliersList: {
    gap: 0,
  },
  supplierItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  supplierName: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  supplierSubtitle: {
    fontSize: 13,
  },
  supplierValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  refreshButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  refreshButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
