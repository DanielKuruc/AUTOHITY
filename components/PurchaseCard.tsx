import { Purchase, PurchaseState } from "@/constants/types";
import { useTheme } from "@/contexts/ThemeContext";
import { useUsers } from "@/contexts/UsersContext";
import { useTabletLayout } from "@/hooks/useTabletLayout";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  ProgressBarAndroid,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface PurchaseCardProps {
  purchase: Purchase;
  isPending?: boolean;
  progress?: number;
  status?: "uploading" | "success" | "error";
  onRetry?: (id: string) => void;
}

export function PurchaseCard({
  purchase,
  isPending,
  progress = 0,
  status,
  onRetry,
}: PurchaseCardProps) {
  const { theme } = useTheme();
  const { users } = useUsers();
  const { isTablet, isCompact } = useTabletLayout();
  // Najdi zaměstnance podle ID
  const employee = purchase.employeeId
    ? users.find((u) => u.id === purchase.employeeId)
    : null;

  const getStateColor = (state: PurchaseState) => {
    switch (state) {
      case PurchaseState.NEW:
        return theme.accent;
      case PurchaseState.IN_PROGRESS:
        return theme.warning;
      case PurchaseState.COMPLETED:
        return theme.success;
      case PurchaseState.CANCELLED:
        return theme.error;
      default:
        return theme.textTertiary;
    }
  };

  const getStateLabel = (state: PurchaseState) => {
    switch (state) {
      case PurchaseState.NEW:
        return "NOVÝ";
      case PurchaseState.IN_PROGRESS:
        return "ROZJEDNÁNO";
      case PurchaseState.COMPLETED:
        return "VYKOUPENO";
      case PurchaseState.CANCELLED:
        return "ODMÍTNUTO";
      default:
        return state;
    }
  };

  const handlePress = () => {
    router.push(`/purchase/${purchase.id}`);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "";

    // Zkusíme parsovat český formát dd.mm.yyyy
    const czechMatch = dateString.match(
      /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/,
    );
    if (czechMatch) {
      const [, day, month, year, hour = "0", minute = "0"] = czechMatch;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
      );
      if (!isNaN(date.getTime())) {
        return (
          date.toLocaleDateString("cs-CZ", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }) +
          " " +
          date.toLocaleTimeString("cs-CZ", {
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      }
    }

    // Fallback pro ISO formát nebo jiné formáty
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return (
        date.toLocaleDateString("cs-CZ", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }) +
        " " +
        date.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" })
      );
    }

    // Pokud nic nefunguje, vrátíme původní string
    return dateString;
  };

  // Determine which date to display based on purchase state
  const getDisplayDate = () => {
    // COMPLETED - zobrazit datum výkupu
    if (purchase.purchaseState === PurchaseState.COMPLETED) {
      return purchase.purchaseDate;
    }
    // NEW, IN_PROGRESS, CANCELLED - zobrazit datum prohlídky
    return purchase.inspectionDate || purchase.purchaseDate;
  };

  // Determine which time to display based on purchase state
  const getDisplayTime = () => {
    // COMPLETED - zobrazit čas výkupu
    if (purchase.purchaseState === PurchaseState.COMPLETED) {
      return purchase.purchaseTime;
    }
    // NEW, IN_PROGRESS, CANCELLED - zobrazit čas prohlídky
    return purchase.inspectionTime || purchase.purchaseTime;
  };

  const displayDate = getDisplayDate();
  const displayTime = getDisplayTime();

  // Format price with space between thousands
  const formatPrice = (price: number | null | undefined): string => {
    if (!price) return "";
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  };

  // Dim the card if pending upload
  const cardOpacity = isPending ? 0.5 : 1;

  const stateColor = getStateColor(purchase.purchaseState);

  // TABLET LAYOUT - Větší kartou s detaily
  if (isTablet) {
    return (
      <TouchableOpacity
        style={[
          styles.tabletCard,
          isCompact && styles.tabletCardCompact,
          { backgroundColor: theme.card, opacity: cardOpacity, flex: 1 },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={isPending}
      >
        {/* Top - Large Image */}
        <View
          style={[
            styles.tabletImageContainer,
            isCompact && styles.tabletImageContainerCompact,
            { backgroundColor: theme.inputBackground },
          ]}
        >
          {(purchase as any).coverPhotoUri ? (
            <Image
              source={{ uri: (purchase as any).coverPhotoUri }}
              style={styles.tabletThumbnail}
              resizeMode="cover"
            />
          ) : purchase.images && purchase.images.length > 0 ? (
            <Image
              source={{ uri: purchase.images[0] }}
              style={styles.tabletThumbnail}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="car" size={48} color={theme.textTertiary} />
          )}

          {/* Priority Alert Badge */}
          {purchase.isPriority === 1 && (
            <View
              style={[styles.priorityBadge, { backgroundColor: "#FF3B30" }]}
            >
              <Ionicons name="alert-circle" size={16} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Bottom - Info section */}
        <View
          style={[
            styles.tabletInfoSection,
            isCompact && styles.tabletInfoSectionCompact,
          ]}
        >
          {/* Title row - Make/Model + State */}
          <View style={styles.tabletTitleRow}>
            <View style={{ flex: 1 }}>
              {purchase.carDetails && (
                <Text
                  style={[
                    styles.tabletCarName,
                    isCompact && styles.tabletCarNameCompact,
                    { color: theme.text },
                  ]}
                  numberOfLines={1}
                >
                  {purchase.carDetails.make} {purchase.carDetails.model}
                </Text>
              )}
              <Text
                style={[
                  styles.tabletClientName,
                  isCompact && styles.tabletClientNameCompact,
                  { color: "#E30613" },
                ]}
                numberOfLines={1}
              >
                {purchase.clientName}
              </Text>
            </View>
            <View
              style={[
                styles.tabletStateBadge,
                isCompact && styles.tabletStateBadgeCompact,
                { backgroundColor: stateColor },
              ]}
            >
              <Text
                style={[
                  styles.tabletStateText,
                  isCompact && styles.tabletStateTextCompact,
                  { color: "#FFFFFF" },
                ]}
              >
                {getStateLabel(purchase.purchaseState)}
              </Text>
            </View>
          </View>

          {/* Price - if completed, otherwise empty space for alignment */}
          <View style={styles.tabletPriceContainer}>
            {purchase.purchaseState === PurchaseState.COMPLETED &&
              purchase.totalAmount && (
                <Text
                  style={[
                    styles.tabletPrice,
                    isCompact && styles.tabletPriceCompact,
                    { color: "#FFFFFF" },
                  ]}
                >
                  {formatPrice(purchase.totalAmount)} Kč
                </Text>
              )}
          </View>

          {/* Details row - Date, Year, Mileage */}
          <View style={styles.tabletDetailsRow}>
            <View style={styles.detailItem}>
              <Text
                style={[
                  styles.detailLabel,
                  {
                    color: theme.textTertiary,
                    fontSize: 9,
                    fontWeight: "700",
                    textTransform: "uppercase",
                  },
                ]}
              >
                Rok
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  isCompact && styles.detailValueCompact,
                  { color: theme.text },
                ]}
              >
                {(() => {
                  const firstReg = (purchase.carDetails as any)
                    ?.firstRegistration;
                  if (firstReg) {
                    const year = new Date(firstReg).getFullYear();
                    if (!isNaN(year)) return year.toString();
                  }
                  return purchase.carDetails?.year?.toString() || "N/A";
                })()}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text
                style={[
                  styles.detailLabel,
                  {
                    color: theme.textTertiary,
                    fontSize: 9,
                    fontWeight: "700",
                    textTransform: "uppercase",
                  },
                ]}
              >
                Km
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  isCompact && styles.detailValueCompact,
                  { color: theme.text },
                ]}
              >
                {purchase.carDetails?.mileage
                  ? purchase.carDetails.mileage
                      .toString()
                      .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
                  : "N/A"}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text
                style={[
                  styles.detailLabel,
                  {
                    color: theme.textTertiary,
                    fontSize: 9,
                    fontWeight: "700",
                    textTransform: "uppercase",
                  },
                ]}
              >
                Palivo
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  isCompact && styles.detailValueCompact,
                  { color: theme.text, fontSize: isCompact ? 9 : 10 },
                ]}
              >
                {purchase.carDetails?.fuelType || "N/A"}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Text
                style={[
                  styles.detailLabel,
                  {
                    color: theme.textTertiary,
                    fontSize: 9,
                    fontWeight: "700",
                    textTransform: "uppercase",
                  },
                ]}
              >
                Převod
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  isCompact && styles.detailValueCompact,
                  { color: theme.text },
                ]}
              >
                {purchase.carDetails?.transmission?.substring(0, 3) || "N/A"}
              </Text>
            </View>
          </View>

          {/* Badges row */}
          {(purchase.carDetails?.hasServiceBook ||
            purchase.carDetails?.isFirstOwner ||
            purchase.carDetails?.isImport === false ||
            purchase.isVatPayer) && (
            <View style={styles.tabletBadgesRow}>
              {purchase.carDetails?.hasServiceBook && (
                <View style={styles.tabletBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={theme.success}
                  />
                  <Text
                    style={[
                      styles.tabletBadgeText,
                      isCompact && styles.tabletBadgeTextCompact,
                      { color: theme.success },
                    ]}
                  >
                    Servisní kniha
                  </Text>
                </View>
              )}
              {purchase.carDetails?.isFirstOwner && (
                <View style={styles.tabletBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={theme.success}
                  />
                  <Text
                    style={[
                      styles.tabletBadgeText,
                      isCompact && styles.tabletBadgeTextCompact,
                      { color: theme.success },
                    ]}
                  >
                    1. majitel
                  </Text>
                </View>
              )}
              {purchase.carDetails?.isImport === false && (
                <View style={styles.tabletBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={theme.success}
                  />
                  <Text
                    style={[
                      styles.tabletBadgeText,
                      isCompact && styles.tabletBadgeTextCompact,
                      { color: theme.success },
                    ]}
                  >
                    ČR
                  </Text>
                </View>
              )}
              {purchase.isVatPayer && (
                <View style={styles.tabletBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={theme.success}
                  />
                  <Text
                    style={[
                      styles.tabletBadgeText,
                      isCompact && styles.tabletBadgeTextCompact,
                      { color: theme.success },
                    ]}
                  >
                    DPH
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Employee + Inspection Date/Time row - ALL STATES */}
          {(employee || displayDate) && (
            <View style={styles.tabletEmployeeRow}>
              {employee && (
                <View style={styles.employeeInfoRow}>
                  <Ionicons
                    name="person"
                    size={12}
                    color={theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.tabletEmployeeText,
                      isCompact && styles.tabletEmployeeTextCompact,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {employee.lastName}
                  </Text>
                </View>
              )}
              {displayDate && (
                <Text
                  style={[
                    styles.tabletEmployeeText,
                    isCompact && styles.tabletEmployeeTextCompact,
                    { color: theme.textSecondary },
                  ]}
                >
                  {formatDate(displayDate).replace(/\s+\d{1,2}:\d{2}$/, "")} {displayTime}
                </Text>
              )}
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.tabletButtonsRow}>
            {purchase.purchaseState === PurchaseState.IN_PROGRESS && (
              <TouchableOpacity
                style={[
                  styles.tabletActionBtn,
                  { backgroundColor: theme.accent },
                ]}
                onPress={() =>
                  router.push(`/purchase/edit-purchase?id=${purchase.id}`)
                }
              >
                <Ionicons name="pencil" size={isCompact ? 14 : 16} color="#FFFFFF" />
                <Text
                  style={[
                    styles.tabletActionBtnText,
                    isCompact && styles.tabletActionBtnTextCompact,
                  ]}
                >
                  Upravit
                </Text>
              </TouchableOpacity>
            )}
            {(purchase.purchaseState === PurchaseState.NEW ||
              purchase.purchaseState === PurchaseState.IN_PROGRESS ||
              purchase.purchaseState === PurchaseState.CANCELLED) && (
              <TouchableOpacity
                style={[
                  styles.tabletActionBtn,
                  { backgroundColor: theme.success },
                ]}
                onPress={() => {
                  if (purchase.phone) {
                    Linking.openURL(`tel:${purchase.phone}`);
                  }
                }}
              >
                <Ionicons name="call" size={isCompact ? 14 : 16} color="#FFFFFF" />
                <Text
                  style={[
                    styles.tabletActionBtnText,
                    isCompact && styles.tabletActionBtnTextCompact,
                  ]}
                >
                  Zavolat
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isPending && (
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.pendingOverlay,
              {
                backgroundColor: theme.card + "cc",
                borderRadius: 12,
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={{ color: theme.text, marginTop: 8 }}>
              Probíhá nahrávání...
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // PHONE LAYOUT - Original compact design
  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.card, opacity: cardOpacity },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={isPending}
    >
      <View style={styles.cardContent}>
        {/* Left side - Photo thumbnail */}
        <View
          style={[
            styles.imageContainer,
            { backgroundColor: theme.inputBackground },
          ]}
        >
          {(purchase as any).coverPhotoUri ? (
            <Image
              source={{ uri: (purchase as any).coverPhotoUri }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : purchase.images && purchase.images.length > 0 ? (
            <Image
              source={{ uri: purchase.images[0] }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <Ionicons name="car" size={28} color={theme.textTertiary} />
          )}

          {/* Priority Alert Badge */}
          {purchase.isPriority === 1 && (
            <View
              style={[
                styles.phonePriorityBadge,
                { backgroundColor: "#FF3B30" },
              ]}
            >
              <Ionicons name="alert-circle" size={12} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Middle - Info */}
        <View style={styles.infoContainer}>
          {purchase.carDetails && (
            <Text
              style={[styles.carName, { color: theme.text }]}
              numberOfLines={1}
            >
              {purchase.carDetails.make} {purchase.carDetails.model}
              {(() => {
                const firstReg = (purchase.carDetails as any).firstRegistration;
                if (!firstReg) return null;
                const year = new Date(firstReg).getFullYear();
                return isNaN(year) ? null : ` (${year})`;
              })()}
            </Text>
          )}
          <Text
            style={[styles.clientName, { color: theme.accent }]}
            numberOfLines={1}
          >
            {purchase.clientName}
          </Text>
          <View style={styles.dateTimeRow}>
            <Text style={[styles.date, { color: theme.textTertiary }]}>
              {formatDate(displayDate).split(" ")[0]}
            </Text>
            <Text style={[styles.time, { color: theme.textTertiary }]}>
              {" "}
              |{" "}
            </Text>
            <Text style={[styles.time, { color: theme.textTertiary }]}>
              {displayTime}
            </Text>
          </View>
          {/* Cancellation reason */}
          {purchase.purchaseState === PurchaseState.CANCELLED &&
            purchase.notes && (
              <View style={styles.cancellationReasonRow}>
                <Ionicons name="alert-circle" size={12} color={theme.error} />
                <Text
                  style={[
                    styles.cancellationReasonText,
                    { color: theme.error },
                  ]}
                  numberOfLines={1}
                >
                  {purchase.notes.split("Důvod zrušení:")[1]?.trim() ||
                    "Bez uvedeného důvodu"}
                </Text>
              </View>
            )}
          {/* Employee surname */}
          {employee && (
            <View style={styles.employeeRow}>
              <Ionicons name="person" size={12} color={theme.textSecondary} />
              <Text
                style={[styles.employeeText, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {employee.lastName}
              </Text>
            </View>
          )}
          {/* Vehicle badges - Servisní kniha, První majitel, Původ ČR, DPH */}
          <View style={styles.badgesRow}>
            {purchase.carDetails?.hasServiceBook && (
              <View style={styles.badge}>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={theme.success}
                />
                <Text style={[styles.badgeText, { color: theme.success }]}>
                  Servisní kniha
                </Text>
              </View>
            )}
            {purchase.carDetails?.isFirstOwner && (
              <View style={styles.badge}>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={theme.success}
                />
                <Text style={[styles.badgeText, { color: theme.success }]}>
                  1. majitel
                </Text>
              </View>
            )}
            {purchase.carDetails?.isImport === false && (
              <View style={styles.badge}>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={theme.success}
                />
                <Text style={[styles.badgeText, { color: theme.success }]}>
                  ČR
                </Text>
              </View>
            )}
            {purchase.isVatPayer && (
              <View style={styles.badge}>
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={theme.success}
                />
                <Text style={[styles.badgeText, { color: theme.success }]}>
                  DPH
                </Text>
              </View>
            )}
          </View>
          {/* Upload progress and status */}
          {isPending && (
            <View style={styles.uploadStatusContainer}>
              {status === "uploading" && (
                <>
                  <ProgressBarAndroid
                    styleAttr="Horizontal"
                    indeterminate={false}
                    progress={progress}
                    color={theme.accent}
                    style={styles.progressBar}
                  />
                  <Text
                    style={[styles.uploadText, { color: theme.textTertiary }]}
                  >
                    Nahrávání... {Math.round(progress * 100)}%
                  </Text>
                </>
              )}
              {status === "error" && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() => onRetry?.(purchase.id)}
                >
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.retryText}>Zkusit znovu</Text>
                </TouchableOpacity>
              )}
              {status === "success" && (
                <View style={styles.successContainer}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={theme.success}
                  />
                  <Text style={[styles.uploadText, { color: theme.success }]}>
                    Nahráno
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Right side - State and Amount */}
        <View style={styles.rightContainer}>
          <View style={[styles.stateBadge, { backgroundColor: stateColor }]}>
            <Text style={[styles.stateText, { color: "#FFFFFF" }]}>
              {getStateLabel(purchase.purchaseState)}
            </Text>
          </View>
          <View style={styles.buttonsRow}>
            {purchase.purchaseState === PurchaseState.COMPLETED &&
              purchase.totalAmount && (
                <Text style={[styles.amount, { color: theme.text }]}>
                  {formatPrice(purchase.totalAmount)} Kč
                </Text>
              )}
            {purchase.purchaseState === PurchaseState.IN_PROGRESS && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() =>
                  router.push(`/purchase/edit-purchase?id=${purchase.id}`)
                }
              >
                <Ionicons
                  name="pencil"
                  size={14}
                  color={theme.contextbuttons || "#FFFFFF"}
                />
              </TouchableOpacity>
            )}
            {(purchase.purchaseState === PurchaseState.NEW ||
              purchase.purchaseState === PurchaseState.IN_PROGRESS ||
              purchase.purchaseState === PurchaseState.CANCELLED) && (
              <TouchableOpacity
                style={[
                  styles.phoneButton,
                  { borderColor: theme.success, borderWidth: 2 },
                ]}
                onPress={() => {
                  if (purchase.phone) {
                    Linking.openURL(`tel:${purchase.phone}`);
                  }
                }}
              >
                <Ionicons
                  name="call"
                  size={16}
                  color={theme.contextbuttons || "#FFFFFF"}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {isPending && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.pendingOverlay,
            {
              backgroundColor: theme.card + "cc",
              borderRadius: 12,
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={{ color: theme.text, marginTop: 8 }}>
            Probíhá nahrávání...
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // TABLET LAYOUT STYLES
  tabletCard: {
    margin: 8,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#6B7280",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 470,
    maxHeight: 470,
    flexDirection: "column",
  },
  tabletCardCompact: {
    margin: 6,
    minHeight: 480,
    maxHeight: 520,
  },
  tabletImageContainer: {
    position: "relative",
    width: "100%",
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  tabletImageContainerCompact: {
    height: 260,
  },
  tabletThumbnail: {
    width: "100%",
    height: "100%",
  },
  tabletInfoSection: {
    padding: 10,
    gap: 6,
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  tabletInfoSectionCompact: {
    padding: 8,
    gap: 4,
  },
  tabletTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  tabletCarName: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  tabletCarNameCompact: {
    fontSize: 13,
    marginBottom: 1,
    textTransform: "uppercase",
  },
  tabletClientName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  tabletClientNameCompact: {
    fontSize: 12,
    marginBottom: 0,
  },
  tabletStateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    alignSelf: "center",
  },
  tabletStateBadgeCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tabletStateText: {
    fontSize: 13,
    fontWeight: "800",
  },
  tabletStateTextCompact: {
    fontSize: 10,
  },
  tabletPriceContainer: {
    minHeight: 24,
    justifyContent: "center",
  },
  tabletPrice: {
    fontSize: 15,
    fontWeight: "800",
    marginVertical: 2,
  },
  tabletPriceCompact: {
    fontSize: 13,
    marginVertical: 0,
  },
  tabletEmployeeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#00000010",
    marginTop: "auto",
  },
  employeeInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  tabletEmployeeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  tabletEmployeeTextCompact: {
    fontSize: 10,
  },
  tabletDetailsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  detailItem: {
    flex: 1,
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: "500",
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailValueCompact: {
    fontSize: 10,
  },
  tabletBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  tabletBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 5,
  },
  tabletBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  tabletBadgeTextCompact: {
    fontSize: 9,
  },
  tabletDivider: {
    height: 1,
    marginVertical: 4,
  },
  tabletButtonsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    marginBottom: 2,
  },
  tabletActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabletActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  tabletActionBtnTextCompact: {
    fontSize: 11,
  },

  // PHONE LAYOUT STYLES
  card: {
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#6B7280",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    minHeight: 130,
  },
  imageContainer: {
    width: 56,
    height: 56,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    alignSelf: "center",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  phonePriorityBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
  },
  carName: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  clientName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  time: {
    fontSize: 12,
  },
  rightContainer: {
    alignItems: "center",
    marginLeft: 8,
    flexDirection: "column",
    justifyContent: "center",
  },
  stateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
    marginBottom: 8,
  },
  stateText: {
    fontSize: 13,
    fontWeight: "800",
  },
  amount: {
    fontSize: 15,
    fontWeight: "800",
    alignSelf: "center",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
    gap: 8,
  },
  employeeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 4,
  },
  employeeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  cancellationReasonRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 4,
  },
  cancellationReasonText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#E30613",
    borderWidth: 2,
  },
  phoneButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  callButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E30613",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 8,
  },
  uploadStatusContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  priorityBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10,
    zIndex: 10,
  },
  uploadText: {
    fontSize: 12,
    marginTop: 4,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E30613",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 6,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pendingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
