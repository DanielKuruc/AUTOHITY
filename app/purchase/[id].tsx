import { DatePickerField } from '@/components/DatePickerField';
import { ImageGallery } from '@/components/ImageGallery';
import { formatSpz } from '@/components/SpzInput';
import { mockEmployees } from '@/constants/mockData';
import { ClientType, PurchaseState } from '@/constants/types';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useUsers } from '@/contexts/UsersContext';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { sharePurchaseDetail } from '@/services/exportService';
import { getStkIndicator } from '@/services/stkService';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Image as ExpoImage } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const STATUS_OPTIONS: Record<string, { label: string; color: string }> = {
  excellent: { label: 'Výborné', color: '#34C759' },
  good: { label: 'Dobré', color: '#30D158' },
  fair: { label: 'Přijatelné', color: '#FF9500' },
  poor: { label: 'Špatné', color: '#FF6B35' },
  damaged: { label: 'Poškozené', color: '#FF3B30' },
};

// Country codes for phone display
const COUNTRY_CODES = [
  { code: '+420', flag: '🇨🇿' },
  { code: '+421', flag: '🇸🇰' },
  { code: '+43', flag: '🇦🇹' },
  { code: '+49', flag: '🇩🇪' },
  { code: '+48', flag: '🇵🇱' },
  { code: '+36', flag: '🇭🇺' },
  { code: '+31', flag: '🇳🇱' },
  { code: '+32', flag: '🇧🇪' },
  { code: '+33', flag: '🇫🇷' },
  { code: '+39', flag: '🇮🇹' },
  { code: '+44', flag: '🇬🇧' },
  { code: '+34', flag: '🇪🇸' },
  { code: '+41', flag: '🇨🇭' },
  { code: '+380', flag: '🇺🇦' },
  { code: '+40', flag: '🇷🇴' },
];

const formatPhoneWithFlag = (phone?: string | null): string | null => {
  if (!phone) return null;

  let flagEmoji = '';
  let phoneNumber = phone;

  // Find matching country code and extract flag
  for (const country of COUNTRY_CODES) {
    if (phone.startsWith(country.code)) {
      flagEmoji = country.flag;
      break;
    }
  }

  // Format the phone with spaces every 3 digits
  // Remove all non-digit characters first (except +)
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  // Add spaces after country code prefix
  let formatted = cleaned;
  if (cleaned.startsWith('+')) {
    const match = cleaned.match(/^(\+\d{1,3})(.*)$/);
    if (match) {
      const prefix = match[1];
      const number = match[2];
      // Add spaces every 3 digits in the number part
      const spacedNumber = number.replace(/(\d{3})(?=\d)/g, '$1 ');
      formatted = `${prefix} ${spacedNumber}`;
    }
  } else {
    // No prefix, just add spaces every 3 digits
    formatted = cleaned.replace(/(\d{3})(?=\d)/g, '$1 ');
  }

  return flagEmoji ? `${flagEmoji} ${formatted}` : formatted;
};

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { getPurchaseById, updatePurchase, deletePurchase } = usePurchases();
  const { showToast } = useToast();
  const { users } = useUsers();
  const { user: currentUser } = useAuth();
  const { isSplitView } = useTabletLayout();
  const purchase = getPurchaseById(id);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [selectedDefectImageIndex, setSelectedDefectImageIndex] = useState<number | null>(null);
  const [serviceNotesTemp, setServiceNotesTemp] = useState((purchase as any)?.serviceNotes || '');

  useEffect(() => {
    setServiceNotesTemp((purchase as any)?.serviceNotes || '');
  }, [purchase?.serviceNotes]);
  // State pro modal dokončení výkupu
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completePurchasePrice, setCompletePurchasePrice] = useState('');
  const [completePurchaseDate, setCompletePurchaseDate] = useState('');
  const [completeExpectedSalePrice, setCompleteExpectedSalePrice] = useState('');
  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const CANCEL_REASONS = [
    'Zákazník si to rozmyslel',
    'Nedohoda o ceně',
    'Vozidlo již prodáno',
    'Technický stav nevyhovuje',
    'Nesoulad v dokumentech',
    'Nedorazil na prohlídku',
    'Jiné'
  ];
  const [cancelReason, setCancelReason] = useState<string>(CANCEL_REASONS[0]);
  const [cancelReasonNote, setCancelReasonNote] = useState<string>('');
  if (!purchase) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.notFoundTitle, { color: theme.text }]}>Výkup nenalezen</Text>
          <TouchableOpacity 
            style={[styles.backButtonLarge, { backgroundColor: theme.accent }]} 
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonLargeText}>Zpět na seznam</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    // Zkusíme parsovat český formát dd.mm.yyyy
    const czechMatch = dateString.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (czechMatch) {
      const [, day, month, year] = czechMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('cs-CZ', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      }
    }
    // Fallback pro ISO formát nebo jiné formáty
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('cs-CZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    // Pokud nic nefunguje, vrátíme původní string
    return dateString;
  };

  const formatAmount = (amount?: number | null) => {
    if (!amount) return null;
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency: 'CZK',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStateColor = (state: PurchaseState) => {
    switch (state) {
      case PurchaseState.NEW: return theme.accent;
      case PurchaseState.IN_PROGRESS: return theme.warning;
      case PurchaseState.COMPLETED: return theme.success;
      case PurchaseState.CANCELLED: return theme.error;
      default: return theme.textTertiary;
    }
  };

  const getStateText = (state: PurchaseState) => {
    switch (state) {
      case PurchaseState.NEW: return 'NOVÝ';
      case PurchaseState.IN_PROGRESS: return 'ROZJEDNÁNO';
      case PurchaseState.COMPLETED: return 'VYKOUPENO';
      case PurchaseState.CANCELLED: return 'ODMÍTNUTO';
      default: return state;
    }
  };

  const getPriceLabel = (state: PurchaseState) => {
    return state === PurchaseState.COMPLETED ? 'Cena výkupu' : 'Cena nabídnuta';
  };
  const getNextState = (currentState: PurchaseState): PurchaseState | null => {
    switch (currentState) {
      case PurchaseState.NEW: return PurchaseState.IN_PROGRESS;
      case PurchaseState.IN_PROGRESS: return PurchaseState.COMPLETED;
      default: return null;
    }
  };

  const handleStateUpdate = () => {
    const nextState = getNextState(purchase.purchaseState);
    if (!nextState) return;

    if (nextState === PurchaseState.COMPLETED) {
      // Při dokončení výkupu zobrazit modal pro zadání ceny a datumu
      setCompletePurchasePrice(purchase.totalAmount?.toString() || '');
      
      // Initialize date with time (format: "dd.mm.yyyy hh:mm")
      let dateTimeValue = '';
      if (purchase.purchaseDate && purchase.purchaseTime) {
        dateTimeValue = `${purchase.purchaseDate} ${purchase.purchaseTime}`;
      } else {
        const now = new Date();
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        dateTimeValue = `${now.toLocaleDateString('cs-CZ')} ${time}`;
      }
      setCompletePurchaseDate(dateTimeValue);
      
      setCompleteExpectedSalePrice(purchase.expectedSalePrice?.toString() || '');
      setShowCompleteModal(true);
    } else {
      // Pro ostatní stavy standardní alert
      Alert.alert('Aktualizovat stav', 'Zahájit zpracování tohoto výkupu?', [
        { text: 'Zrušit', style: 'cancel' },
        { 
          text: 'Zahájit zpracování', 
          onPress: async () => {
            await updatePurchase(purchase.id, { purchaseState: nextState });
            showToast('Výkup je nyní v procesu zpracování', 'info');
          }
        }
      ]);
    }
  };

  const handleCompletePurchase = async () => {
    if (!completePurchasePrice.trim()) {
      showToast('Prosím zadejte konečnou cenu výkupu', 'error');
      return;
    }
    if (!completePurchaseDate.trim()) {
      showToast('Prosím zadejte datum výkupu', 'error');
      return;
    }

    const priceValue = parseInt(completePurchasePrice.replace(/\s/g, ''));
    if (isNaN(priceValue) || priceValue <= 0) {
      showToast('Prosím zadejte platnou cenu', 'error');
      return;
    }

    const expectedSaleValue = completeExpectedSalePrice ? parseInt(completeExpectedSalePrice.replace(/\s/g, '')) : undefined;

    // Extract date and time from completePurchaseDate (format: "dd.mm.yyyy hh:mm")
    const [dateStr, timeStr] = completePurchaseDate.split(' ');

    await updatePurchase(purchase.id, { 
      purchaseState: PurchaseState.COMPLETED,
      totalAmount: priceValue,
      purchaseDate: dateStr,
      purchaseTime: timeStr,
      expectedSalePrice: expectedSaleValue,
    });

    setShowCompleteModal(false);
    showToast('Výkup byl úspěšně dokončen ✅', 'success');
  };

  const handleCancelPurchase = () => {
    // Show modal with reasons similar to completion flow
    setCancelReason(CANCEL_REASONS[0]);
    setCancelReasonNote('');
    setShowCancelModal(true);
  };

  const handleConfirmCancelPurchase = async () => {
    if (!cancelReason.trim()) {
      showToast('Prosím vyberte důvod odmítnutí', 'error');
      return;
    }

    const reasonText = cancelReason + (cancelReasonNote ? ` - ${cancelReasonNote}` : '');
    await updatePurchase(purchase.id, { 
      purchaseState: PurchaseState.CANCELLED,
      notes: `Důvod odmítnutí: ${reasonText}`
    });

    setShowCancelModal(false);
    showToast('Výkup byl odmítnut ❌', 'info');
    router.back();
  };

  const handleDeletePurchase = () => {
    Alert.alert(
      'Odstranit výkup',
      `Opravdu chcete trvale odstranit tento výkup?\n\nKlient: ${purchase.clientName}\nSPZ: ${purchase.spz}\n\nTato akce je nevratná.`,
      [
        { text: 'Zrušit', style: 'cancel' },
        { 
          text: 'Odstranit', 
          style: 'destructive', 
          onPress: async () => {
            await deletePurchase(purchase.id);
            router.back();
          }
        }
      ]
    );
  };

  const employee = mockEmployees.find(emp => emp.id === purchase.employeeId);

  // Fallback car details assembled from flat fields if API didn't provide carDetails
  const car = purchase.carDetails || {
    make: (purchase as any).vehicleMake,
    model: (purchase as any).vehicleModel,
    year: (purchase as any).vehicleYear ? Number((purchase as any).vehicleYear) : undefined,
    mileage: (purchase as any).vehicleMileage ? Number((purchase as any).vehicleMileage) : undefined,
  };
  const getCancelReasonText = (): string | null => {
    if (purchase.purchaseState !== PurchaseState.CANCELLED || !purchase.notes) return null;
    const match = purchase.notes.match(/Důvod zrušení:\s*(.+)/i);
    return match?.[1]?.trim() || null;
  };
  const renderInfoRow = (label: string, value?: string | null, icon?: string, onCallPress?: () => void, onCopyPress?: () => void) => {
    if (!value) return null;
    const showWarningIcon = (label === 'Počet vlastníků' || label === 'Počet provozovatelů') && Number(value) >= 3;
    const stkIndicator = label === 'STK' ? getStkIndicator(value) : null;
    return (
      <View style={[styles.infoRow, { borderBottomColor: theme.borderLight }]}>
        {icon && (
          <View style={[styles.infoIcon, { backgroundColor: theme.accentLight }]}>
            <Ionicons name={icon as any} size={16} color={theme.accent} />
          </View>
        )}
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.infoValue, showWarningIcon ? styles.valueWithWarning : { color: theme.text }]}>{value}</Text>
            {showWarningIcon && (
              <Ionicons name="warning-outline" size={16} color="#FF9500" style={styles.warningIndicator} />
            )}
            {stkIndicator && (
              <Ionicons name={stkIndicator.icon} size={16} color={stkIndicator.color} />
            )}
          </View>
        </View>
        {(label === 'Telefon' || label === 'Výkupčí') && onCallPress && (
          <TouchableOpacity
            accessibilityLabel={label === 'Telefon' ? "Zavolat klientovi" : "Zavolat výkupčímu"}
            onPress={onCallPress}
            style={[styles.callButton, { backgroundColor: theme.accent }]}
          >
            <Ionicons name="call" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
        {label === 'VIN' && onCopyPress && (
          <TouchableOpacity
            accessibilityLabel="Kopírovat VIN"
            onPress={onCopyPress}
            style={[styles.callButton, { backgroundColor: theme.accent }]}
          >
            <Ionicons name="copy" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderBooleanRow = (label: string, value?: boolean, icon?: string) => {
    if (value === undefined) return null;
    return (
      <View style={[styles.infoRow, { borderBottomColor: theme.borderLight }]}>
        {icon && (
          <View style={[styles.infoIcon, { backgroundColor: theme.accentLight }]}>
            <Ionicons name={icon as any} size={16} color={theme.accent} />
          </View>
        )}
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
          <View style={styles.booleanValue}>
            <Ionicons 
              name={value ? 'checkmark-circle' : 'close-circle'} 
              size={20} 
              color={value ? theme.success : theme.textTertiary} 
            />
            <Text style={[styles.infoValue, { color: theme.text }]}>{value ? 'Ano' : 'Ne'}</Text>
          </View>
        </View>
      </View>
    );
  };

  const handleExportPurchase = async () => {
    if (!purchase) return;
    await sharePurchaseDetail(purchase);
  };
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: theme.headerButtonBackground }]} 
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={25} color={theme.headerButtonText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Detail výkupu</Text>
        <View style={styles.headerActions}>
          {purchase.purchaseState === PurchaseState.IN_PROGRESS && (
            <TouchableOpacity 
              style={[styles.headerActionButton, styles.headerEditButton, { 
                borderColor: theme.inputBackground,
                backgroundColor: theme.headerButtonBackground
              }]}
              onPress={() => router.push(`/purchase/edit-purchase?id=${purchase.id}`)}
            >
              <Ionicons name="create-outline" size={20} color={theme.headerButtonText} />
            </TouchableOpacity>
          )}
          {purchase.purchaseState === PurchaseState.IN_PROGRESS && (
            <TouchableOpacity 
              style={[styles.headerActionButton, styles.headerCancelButton, { 
                borderColor: theme.error,
                backgroundColor: theme.error
              }]}
              onPress={handleCancelPurchase}
              accessibilityLabel="Odmítnout výkup"
            >
              <Ionicons name="close" size={25} color={theme.headerButtonText} />
            </TouchableOpacity>
          )}
          {getNextState(purchase.purchaseState) && (
            <TouchableOpacity 
              style={[styles.headerActionButton, styles.headerSuccessButton]}
              onPress={handleStateUpdate}
            >
              <Ionicons name={getNextState(purchase.purchaseState) === PurchaseState.IN_PROGRESS ? 'play' : 'checkmark'} size={25} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[isSplitView ? styles.splitDetailLayout : { flex: 1 }]}>
        {/* Sidebar na iPadu - summary info */}
        {isSplitView && (
          <View style={[styles.detailSidebar, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
            <View style={styles.sidebarSummary}>
              <Text style={[styles.sidebarValue, { color: theme.text, fontWeight: '700' }]}>
                {car.make} {car.model}
              </Text>
              <Text style={[styles.sidebarMuted, { color: theme.text, fontWeight: '600' }]}>
                {(car as any)?.fuelType && `${(car as any).fuelType} • `}{(car as any)?.engineSize && `${(car as any).engineSize} • `}{car.year && `${car.year}`}
              </Text>
              <Text style={[styles.sidebarMuted, { color: theme.text, fontWeight: '600', marginTop: 4 }]}>
                {car?.mileage ? Number(car.mileage).toLocaleString() : '—'} km
              </Text>
            </View>
            <View style={[styles.sidebarDivider, { backgroundColor: theme.border }]} />
            <View style={styles.sidebarSummary}>
              <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>KLIENT</Text>
              <Text style={[styles.sidebarValue, { color: theme.text }]}>
                {purchase.clientName}
              </Text>
              <Text style={[styles.sidebarMuted, { color: theme.text, fontWeight: '600' }]}>
                {purchase.clientType === ClientType.COMPANY ? 'Firma' : 'Osoba'}
              </Text>
            </View>
            <View style={[styles.sidebarDivider, { backgroundColor: theme.border }]} />
            <View style={styles.sidebarSummary}>
              <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>
                {purchase.purchaseState === PurchaseState.COMPLETED ? 'VÝKUPNÍ CENA' : 'CENA NABÍDNUTÁ'}
              </Text>
              <Text style={[styles.sidebarValue, { color: theme.text }]}>
                {purchase.purchaseState === PurchaseState.COMPLETED
                  ? formatAmount(purchase.totalAmount) || '—'
                  : formatAmount(purchase.offeredPrice) || formatAmount(purchase.totalAmount) || '—'}
              </Text>
            </View>
            {purchase.customerPrice && (
              <>
                <View style={[styles.sidebarDivider, { backgroundColor: theme.border }]} />
                <View style={styles.sidebarSummary}>
                  <Text style={[styles.sidebarLabel, { color: theme.textSecondary }]}>CENA ZÁKAZNÍK</Text>
                  <Text style={[styles.sidebarValue, { color: theme.text }]}>
                    {formatAmount(purchase.customerPrice)}
                  </Text>
                </View>
              </>
            )}
            {/* Status icons row */}
            {(car?.hasServiceBook || car?.isFirstOwner || car?.isImport === false || purchase.isVatPayer) && (
              <>
                <View style={[styles.sidebarDivider, { backgroundColor: theme.border, marginTop: 12 }]} />
                <View style={styles.sidebarStatusIcons}>
                  {car?.hasServiceBook && (
                    <View style={styles.sidebarStatusIcon}>
                      <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                      <Text style={[styles.sidebarStatusLabel, { color: theme.text }]}>Servisní knížka</Text>
                    </View>
                  )}
                  {car?.isFirstOwner && (
                    <View style={styles.sidebarStatusIcon}>
                      <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                      <Text style={[styles.sidebarStatusLabel, { color: theme.text }]}>1. majitel</Text>
                    </View>
                  )}
                  {car?.isImport === false && (
                    <View style={styles.sidebarStatusIcon}>
                      <Text style={[styles.sidebarStatusEmoji, { fontSize: 20 }]}>🇨🇿</Text>
                      <Text style={[styles.sidebarStatusLabel, { color: theme.text }]}>ČR</Text>
                    </View>
                  )}
                  {purchase.isVatPayer && (
                    <View style={styles.sidebarStatusIcon}>
                      <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                      <Text style={[styles.sidebarStatusLabel, { color: theme.text }]}>DPH</Text>
                    </View>
                  )}
                </View>
              </>
            )}
            {/* Action Buttons in Sidebar */}
            <View style={[styles.sidebarDivider, { backgroundColor: theme.border, marginTop: 16 }]} />
            <View style={styles.sidebarActions}>
              {purchase.purchaseState === PurchaseState.IN_PROGRESS && (
                <TouchableOpacity 
                  style={[styles.sidebarActionButton, { backgroundColor: theme.accent }]}
                  onPress={() => router.push(`/purchase/edit-purchase?id=${purchase.id}`)}
                >
                  <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.sidebarActionButtonText}>Upravit</Text>
                </TouchableOpacity>
              )}
              {purchase.purchaseState === PurchaseState.IN_PROGRESS && (
                <TouchableOpacity 
                  style={[styles.sidebarActionButton, { backgroundColor: theme.error }]}
                  onPress={handleCancelPurchase}
                >
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                  <Text style={styles.sidebarActionButtonText}>Odmítnout</Text>
                </TouchableOpacity>
              )}
              {getNextState(purchase.purchaseState) && (
                <TouchableOpacity 
                  style={[styles.sidebarActionButton, { backgroundColor: theme.success }]}
                  onPress={handleStateUpdate}
                >
                  <Ionicons name={getNextState(purchase.purchaseState) === PurchaseState.IN_PROGRESS ? 'play' : 'checkmark'} size={16} color="#FFFFFF" />
                  <Text style={styles.sidebarActionButtonText}>
                    {getNextState(purchase.purchaseState) === PurchaseState.IN_PROGRESS ? 'Zahájit' : 'Dokončit'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Main content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Photo Gallery - Cover photo first, then vehicle images */}
        {((purchase as any).coverPhotoUri || (purchase.images && purchase.images.length > 0)) && (
          <View style={styles.heroGallery}>
            <TouchableOpacity 
              style={styles.mainImageContainer} 
              onPress={() => {
                if ((purchase as any).coverPhotoUri) {
                  setSelectedImageIndex(-1); // Special index for cover photo
                } else {
                  setSelectedImageIndex(0);
                }
              }} 
              activeOpacity={0.9}
            >
              <ExpoImage 
                source={{ uri: (purchase as any).coverPhotoUri || purchase.images?.[0] }} 
                style={styles.mainImage} 
                contentFit="cover"
                transition={200}
                cachePolicy="memory-disk"
              />
              <View style={styles.imageOverlay}>
                <View style={[styles.statusBadge, { backgroundColor: getStateColor(purchase.purchaseState) }]}>
                  <Text style={styles.statusText}>
                    {purchase.purchaseState === PurchaseState.CANCELLED && getCancelReasonText()
                      ? `ODMÍTNUTO – ${getCancelReasonText()}`
                      : getStateText(purchase.purchaseState)}
                  </Text>
                </View>
                <View style={styles.photoCount}>
                  <Ionicons name="car" size={16} color="#FFFFFF" />
                  <Text style={styles.photoCountText}>{((purchase as any).coverPhotoUri ? 1 : 0) + (purchase.images?.length || 0)}</Text>
                </View>
              </View>
            </TouchableOpacity>
            {/* Thumbnails: cover photo first, then vehicle images */}
            {(((purchase as any).coverPhotoUri && purchase.images && purchase.images.length > 0) || (purchase.images && purchase.images.length > 1)) && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbsRow}>
                {(purchase as any).coverPhotoUri && (
                  <TouchableOpacity 
                    key="cover-photo" 
                    style={styles.thumbSmall} 
                    onPress={() => setSelectedImageIndex(-1)} 
                    activeOpacity={0.8}
                  >
                    <ExpoImage 
                      source={{ uri: (purchase as any).coverPhotoUri }} 
                      style={styles.thumbSmallImage} 
                      contentFit="cover" 
                      transition={150}
                      cachePolicy="memory-disk"
                    />
                  </TouchableOpacity>
                )}
                {purchase.images && purchase.images.map((imageUrl, index) => (
                  <TouchableOpacity 
                    key={`vehicle-${index}`} 
                    style={styles.thumbSmall} 
                    onPress={() => setSelectedImageIndex(index)} 
                    activeOpacity={0.8}
                  >
                    <ExpoImage 
                      source={{ uri: imageUrl }} 
                      style={styles.thumbSmallImage} 
                      contentFit="cover" 
                      transition={150}
                      cachePolicy="memory-disk"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Defect photos section */}
        {purchase.defectImages && purchase.defectImages.length > 0 && (
          <View style={[styles.section, styles.tightSection, { backgroundColor: theme.card }]}> 
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: theme.accentLight }]}> 
                <Ionicons name="warning-outline" size={18} color={theme.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Foto vady</Text>
              <View style={{ flex: 1 }} />
              <View style={[styles.photoCount, { backgroundColor: 'transparent' }]}> 
                <Ionicons name="images" size={16} color={theme.textSecondary} />
                <Text style={[styles.photoCountText, { color: theme.textSecondary }]}>{purchase.defectImages.length}</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.defectThumbsRow}
            >
              {purchase.defectImages.map((imageUrl, index) => (
                <TouchableOpacity 
                  key={`def-${index}`} 
                  style={styles.thumbSmall} 
                  onPress={() => setSelectedDefectImageIndex(index)} 
                  activeOpacity={0.8}
                >
                  <ExpoImage 
                    source={{ uri: imageUrl }} 
                    style={styles.thumbSmallImage} 
                    contentFit="cover" 
                    transition={150}
                    cachePolicy="memory-disk"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.card }]}>
          {!(purchase.images && purchase.images.length > 0) && (
            <View style={[styles.statusBadge, { backgroundColor: getStateColor(purchase.purchaseState), alignSelf: 'flex-start', marginBottom: 12 }]}>
              <Text style={styles.statusText}>
                {purchase.purchaseState === PurchaseState.CANCELLED && getCancelReasonText()
                  ? `ODMÍTNUTO – ${getCancelReasonText()}`
                  : getStateText(purchase.purchaseState)}
              </Text>
            </View>
          )}

          {(car as any) && (car.make || car.model || (car as any).firstRegistration) && (
            <Text style={[styles.vehicleNameLarge, { color: theme.text }]}>
              {car.make} {car.model}
              {(car as any).fuelType && ` ${(car as any).fuelType}`}
              {(car as any).firstRegistration && ` (${new Date((car as any).firstRegistration).getFullYear()})`}
            </Text>
          )}

          <Text style={[styles.spzSmall, { color: theme.textTertiary }]}>🇨🇿 {formatSpz(purchase.spz)}</Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: theme.text }]}>
                {purchase.purchaseState === PurchaseState.COMPLETED
                  ? formatAmount(purchase.totalAmount) || '—'
                  : formatAmount(purchase.offeredPrice) || formatAmount(purchase.totalAmount) || '—'}
              </Text>
              <Text style={[styles.heroStatLabel, { color: theme.textSecondary }]}>
                {purchase.purchaseState === PurchaseState.COMPLETED ? 'Výkupní' : 'Nabídnuta'}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: theme.text }]}>{car?.mileage ? Number(car.mileage).toLocaleString() : '—'}</Text>
              <Text style={[styles.heroStatLabel, { color: theme.textSecondary }]}>Kilometrů</Text>
            </View>
          </View>

          {/* Status Icons Row */}
          <View style={styles.heroStatusIcons}>
            {(car as any)?.hasServiceBook && (
              <View style={styles.statusIconItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                <Text style={[styles.statusIconLabel, { color: theme.textSecondary }]}>Servisní knížka</Text>
              </View>
            )}
            {(car as any)?.isFirstOwner && (
              <View style={styles.statusIconItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                <Text style={[styles.statusIconLabel, { color: theme.textSecondary }]}>1. majitel</Text>
              </View>
            )}
            <View style={styles.statusIconItem}>
              <Text style={[styles.statusIconEmoji, { fontSize: 20 }]}>🇨🇿</Text>
              <Text style={[styles.statusIconLabel, { color: theme.textSecondary }]}>ČR</Text>
            </View>
            {purchase.isVatPayer && (
              <View style={styles.statusIconItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                <Text style={[styles.statusIconLabel, { color: theme.textSecondary }]}>DPH</Text>
              </View>
            )}
          </View>
        </View>

        {/* Základní informace */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrapper, { backgroundColor: theme.accentLight }]}>
              <Ionicons name="document-text" size={18} color={theme.accent} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Základní informace</Text>
          </View>
          {purchase.employeeId && users.find(u => u.id === purchase.employeeId) && 
            (() => {
              const employee = users.find(u => u.id === purchase.employeeId);
              return renderInfoRow(
                'Výkupčí', 
                employee?.lastName, 
                'person-outline',
                employee?.phoneNumber ? () => {
                  console.log('[PurchaseDetail] Calling employee:', employee.phoneNumber);
                  Linking.openURL(`tel:${employee.phoneNumber}`);
                } : undefined
              );
            })()}
          {renderInfoRow('Datum výkupu', formatDate(purchase.purchaseDate), 'calendar-outline')}
          {renderInfoRow('Datum prohlídky', formatDate(purchase.inspectionDate), 'time-outline')}
          {renderInfoRow('Cena zákazník', formatAmount(purchase.customerPrice), 'pricetag-outline')}
          {renderInfoRow('Cena nabídnuta', formatAmount(purchase.offeredPrice), 'cash-outline')}
          {renderInfoRow('Před. cena prodeje', formatAmount(purchase.expectedSalePrice), 'trending-up-outline')}
          {renderBooleanRow('Protiúčet', purchase.isCounterAccount, 'swap-horizontal-outline')}
          {/* VIN Prověřen nadpis a nové checkboxy */}
          {((car as any)?.cebia !== undefined || (car as any)?.caVertical !== undefined) && (
            <>
              <View style={[styles.infoRow, { borderBottomColor: theme.borderLight, paddingVertical: 8 }]}>
                <Text style={[styles.sectionTitle, { color: theme.text, fontSize: 14 }]}>VIN PROVĚŘEN</Text>
              </View>
              {renderBooleanRow('CEBIA', (car as any).cebia, 'checkmark-circle-outline')}
              {renderBooleanRow('CARVERTICAL', (car as any).caVertical, 'checkmark-circle-outline')}
            </>
          )}

          {renderInfoRow('Odkud zná', purchase.sourceKnowledge, 'megaphone-outline')}
        </View>
        {/* Informace o vozidle */}
        {(car && (car.make || car.model || (car as any).vin || car.mileage || (car as any).fuelType || (car as any).transmission || (car as any).bodyType || (car as any).driveType || (car as any).color || (car as any).stk || (car as any).firstRegistration)) && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: theme.accentLight }]}>
                <Ionicons name="car-sport" size={18} color={theme.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Informace o vozidle</Text>
            </View>
            {renderInfoRow('Značka / Model', [car.make, car.model].filter(Boolean).join(' '), 'pricetag-outline')}
            {renderInfoRow('VIN', (car as any).vin, 'barcode-outline', undefined, (car as any).vin ? () => {
              Clipboard.setStringAsync((car as any).vin).then(() => {
                showToast('VIN zkopírován', 'success');
              }).catch(err => {
                console.error('[PurchaseDetail] Copy error:', err);
                showToast('Nepodařilo se kopírovat VIN', 'error');
              });
            } : undefined)}
            {renderInfoRow('Barva', (car as any).color, 'color-palette-outline')}
            {renderInfoRow('Palivo', (car as any).fuelType, 'flame-outline')}
            {renderInfoRow('Výkon', (car as any).engineSize, 'speedometer-outline')}
            {renderInfoRow('Převodovka', (car as any).transmission, 'swap-vertical-outline')}
            {renderInfoRow('Karoserie', (car as any).bodyType, 'cube-outline')}
            {renderInfoRow('Pohon', (car as any).driveType, 'compass-outline')}
            {renderInfoRow('STK', (car as any).stk, 'calendar-outline')}
            {renderInfoRow('První registrace', formatDate((car as any).firstRegistration), 'time-outline')}
            {renderBooleanRow('Dovoz', (car as any).isImport, 'airplane-outline')}
            {renderInfoRow('Počet vlastníků', (car as any).pocetVlastniku, 'people-outline')}
            {renderInfoRow('Počet provozovatelů', (car as any).pocetProvozovatelu, 'people-outline')}
          </View>
        )}

        {/* Poznámky - vždy viditelná (read-only) */}
        {purchase.notes && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: theme.accentLight }]}>
                <Ionicons name="document-text" size={18} color={theme.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Obecná poznámka</Text>
            </View>
            <View style={[styles.notesBox, { backgroundColor: theme.inputBackground }]}>
              <Text style={[styles.notesText, { color: theme.text }]}>{purchase.notes}</Text>
            </View>
          </View>
        )}

        {/* Stav součástí */}
        {Array.isArray((purchase as any).componentStatuses) && (purchase as any).componentStatuses.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: theme.accentLight }]}>
                <Ionicons name="construct-outline" size={18} color={theme.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Stav součástí</Text>
            </View>

            {(() => {
              const removedComponents = ['Brzdy', 'Odpružení', 'Baterie', 'Elektronika'];
              const componentNameMap: Record<string, string> = {
                'Motor': 'Motor',
                'Převodovka': 'Převodovka/Spojka',
                'Pneumatiky': 'Pneumatiky',
                'Klimatizace': 'Klimatizace',
                'Interiér': 'Interiér',
                'Lak karoserie': 'Lak karoserie',
                'Skla/okna': 'Skla/okna',
                'Světla': 'Světla',
                'Podvozek': 'Podvozek/Odpružení',
              };
              const filteredComponents = (purchase as any).componentStatuses.filter(
                (item: any) => !removedComponents.includes(item.component)
              );
              return filteredComponents.map((item: any, idx: number) => {
                const statusKey = String(item.status || 'good');
                const conf = STATUS_OPTIONS[statusKey] || STATUS_OPTIONS['good'];
                const displayName = componentNameMap[item.component] || item.component;
                return (
                  <View key={`${item.component}-${idx}`} style={[styles.componentRow, { borderBottomColor: theme.borderLight }]}>
                    <View style={styles.componentInfo}>
                      <Text style={[styles.componentName, { color: theme.text }]}>{displayName}</Text>
                      {item.notes ? (
                        <View style={[styles.componentNoteBox, { borderColor: theme.border, backgroundColor: theme.inputBackground }]}>
                          <Text style={[styles.componentNoteText, { color: theme.text }]}>{item.notes}</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.componentStatus, { backgroundColor: conf.color + '20' }]}>
                      <View style={[styles.statusDot, { backgroundColor: conf.color }]} />
                      <Text style={[styles.componentStatusText, { color: conf.color }]}>{conf.label}</Text>
                    </View>
                  </View>
                );
              });
            })()}
          </View>
        )}

        {/* Servisní poznámka - moved below component statuses */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrapper, { backgroundColor: theme.accentLight }]}>
              <Ionicons name="document-text" size={18} color={theme.accent} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Servisní poznámka</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}>
            <View style={[{ flex: 1, borderRadius: 10, borderWidth: 1, overflow: 'hidden', backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
              <TextInput
                style={[styles.notesEditInput, { color: theme.text }]}
                value={serviceNotesTemp}
                onChangeText={(newNotes) => {
                  setServiceNotesTemp(newNotes);
                }}
                placeholder="Zadejte servisní poznámku..."
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity 
              style={[styles.notesEditSaveButton, { backgroundColor: theme.success }]}
              onPress={() => {
                updatePurchase(purchase.id, { serviceNotes: serviceNotesTemp });
                showToast('Servisní poznámka uložena', 'success');
              }}
            >
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Klient */}
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconWrapper, { backgroundColor: theme.accentLight }]}>
              <Ionicons name="person" size={18} color={theme.accent} />
            </View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Informace o klientovi</Text>
          </View>
          {renderInfoRow('Jméno', purchase.clientName, 'person-outline')}
          {renderInfoRow('Typ', purchase.clientType === ClientType.COMPANY ? 'Firma' : 'Fyzická osoba', 'business-outline')}
          {renderBooleanRow('Plátce DPH', purchase.isVatPayer, 'receipt-outline')}
          {purchase.companyInfo && (
            <>
              {renderInfoRow('IČO', purchase.companyInfo.ico, 'card-outline')}
              {renderInfoRow('DIČ', purchase.companyInfo.dic, 'document-outline')}
            </>
          )}
          {renderInfoRow(
            'Telefon', 
            formatPhoneWithFlag(purchase.phone), 
            'call-outline',
            purchase.phone ? () => Linking.openURL(`tel:${purchase.phone}`) : undefined
          )}
          {renderInfoRow('Ulice', purchase.street, 'location-outline')}
          {renderInfoRow('Město', purchase.city, 'map-outline')}
          {renderInfoRow('PSČ', purchase.postalCode, 'pin-outline')}
        </View>

        {/* Protiúčet – detail vybraného vozu (moved below Client section) */}
        {purchase.isCounterAccount && (purchase as any).counterAccountCar && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: theme.accentLight }]}>
                <Ionicons name="swap-horizontal" size={18} color={theme.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Protiúčet</Text>
            </View>
            {renderInfoRow('Značka', (purchase as any).counterAccountCar.make, 'car-sport-outline')}
            {renderInfoRow('Model', (purchase as any).counterAccountCar.model, 'car-outline')}
            {renderInfoRow('Motorizace', (purchase as any).counterAccountCar.variant, 'speedometer-outline')}
            {renderInfoRow('Cena', (purchase as any).counterAccountCar.price ?
              new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format((purchase as any).counterAccountCar.price) : undefined, 'cash-outline')}
          </View>
        )}

        {/* Pracovník */}
        {employee && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: theme.accentLight }]}>
                <Ionicons name="people" size={18} color={theme.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Přiřazený pracovník</Text>
            </View>
            <View style={styles.employeeCard}>
              <View style={[styles.employeeAvatar, { backgroundColor: theme.accent }]}>
                <Text style={styles.employeeInitials}>{employee.name.split(' ').map(n => n[0]).join('')}</Text>
              </View>
              <View style={styles.employeeInfo}>
                <Text style={[styles.employeeName, { color: theme.text }]}>{employee.name}</Text>
                <Text style={[styles.employeeRole, { color: theme.textSecondary }]}>{employee.role}</Text>
              </View>
              {currentUser?.phoneNumber && (
                <TouchableOpacity
                  style={[styles.callEmployeeButton, { backgroundColor: theme.accent }]}
                  onPress={() => Linking.openURL(`tel:${currentUser.phoneNumber}`)}
                >
                  <Ionicons name="call" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Akce */}
        <View style={styles.actionsSection}>
          {purchase.purchaseState === PurchaseState.IN_PROGRESS && (
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: theme.card, borderColor: theme.accent }]} 
              onPress={() => router.push(`/purchase/edit-purchase?id=${purchase.id}`)}
            >
              <Ionicons name="create-outline" size={20} color={theme.accent} />
              <Text style={[styles.editButtonText, { color: theme.accent }]}>Upravit výkup</Text>
            </TouchableOpacity>
          )}
          {getNextState(purchase.purchaseState) && (
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: theme.accent }]} onPress={handleStateUpdate}>
              <Ionicons name={getNextState(purchase.purchaseState) === PurchaseState.IN_PROGRESS ? 'play' : 'checkmark'} size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>{getNextState(purchase.purchaseState) === PurchaseState.IN_PROGRESS ? 'Zahájit zpracování' : 'Označit jako dokončený'}</Text>
            </TouchableOpacity>
          )}
          {purchase.purchaseState === PurchaseState.IN_PROGRESS && (
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: theme.error }]} onPress={handleCancelPurchase}>
              <Ionicons name="close" size={20} color={theme.error} />
              <Text style={[styles.secondaryButtonText, { color: theme.error }]}>Odmítnout výkup</Text>
            </TouchableOpacity>
          )}

          {users.find(u => u.id === currentUser?.id)?.isAdmin && (
            <TouchableOpacity style={[styles.deleteButton, { backgroundColor: theme.error + '15' }]} onPress={handleDeletePurchase}>
              <Ionicons name="trash-outline" size={20} color={theme.error} />
              <Text style={[styles.deleteButtonText, { color: theme.error }]}>Odstranit výkup</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>

      {/* Image Gallery Modal - Main photos (cover photo + vehicle images) */}
      {selectedImageIndex !== null && (((purchase as any).coverPhotoUri && selectedImageIndex === -1) || (purchase.images && selectedImageIndex >= 0)) && (
        <ImageGallery
          images={[
            ...(purchase as any).coverPhotoUri ? [(purchase as any).coverPhotoUri] : [],
            ...(purchase.images || [])
          ]}
          visible={true}
          initialIndex={selectedImageIndex === -1 ? 0 : (selectedImageIndex + ((purchase as any).coverPhotoUri ? 1 : 0))}
          onClose={() => setSelectedImageIndex(null)}
        />
      )}

      {/* Image Gallery Modal - Defect photos */}
      {selectedDefectImageIndex !== null && purchase.defectImages && (
        <ImageGallery
          images={purchase.defectImages}
          visible={true}
          initialIndex={selectedDefectImageIndex}
          onClose={() => setSelectedDefectImageIndex(null)}
        />
      )}

      {/* Modal pro dokončení výkupu */}
      <Modal
        visible={showCompleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowCompleteModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrapper, { backgroundColor: theme.success + '20' }]}>
                <Ionicons name="checkmark-circle" size={28} color={theme.success} />
              </View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Dokončit výkup</Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                Zadejte konečnou cenu výkupu a datum
              </Text>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Konečná cena výkupu</Text>
                <View style={[styles.modalInputWrapper, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.modalInput, { color: theme.text }]}
                    value={completePurchasePrice}
                    onChangeText={setCompletePurchasePrice}
                    placeholder="0"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                  <Text style={[styles.modalInputSuffix, { color: theme.textSecondary }]}>Kč</Text>
                </View>
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Datum výkupu</Text>
                <DatePickerField
                  label=""
                  value={completePurchaseDate}
                  onChange={setCompletePurchaseDate}
                  placeholder="dd.mm.yyyy hh:mm"
                  includeTime={true}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Před. cena prodeje</Text>
                <View style={[styles.modalInputWrapper, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <TextInput
                    style={[styles.modalInput, { color: theme.text }]}
                    value={completeExpectedSalePrice}
                    onChangeText={setCompleteExpectedSalePrice}
                    placeholder="0"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="numeric"
                    returnKeyType="done"
                  />
                  <Text style={[styles.modalInputSuffix, { color: theme.textSecondary }]}>Kč</Text>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButtonSecondary, { backgroundColor: theme.inputBackground }]}
                onPress={() => setShowCompleteModal(false)}
              >
                <Text style={[styles.modalButtonSecondaryText, { color: theme.text }]}>Zrušit</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButtonPrimary, { backgroundColor: theme.success }]}
                onPress={handleCompletePurchase}
              >
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonPrimaryText}>Dokončit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal pro zrušení výkupu */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            activeOpacity={1} 
            onPress={() => setShowCancelModal(false)}
          />
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrapper, { backgroundColor: theme.error + '20' }]}>
                <Ionicons name="close-circle" size={28} color={theme.error} />
              </View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Odmítnout výkup</Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Vyberte důvod zrušení</Text>
            </View>

            <View style={styles.modalForm}>
              {/* Reasons list */}
              {CANCEL_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.optionRow, { borderBottomColor: theme.border }]}
                  onPress={() => setCancelReason(reason)}
                >
                  <Text style={[styles.optionLabel, { color: theme.text }]}>{reason}</Text>
                  <Ionicons
                    name={cancelReason === reason ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={theme.accent}
                  />
                </TouchableOpacity>
              ))}

              {/* Note for custom reason */}
              {cancelReason === 'Jiné' && (
                <View style={styles.modalInputGroup}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Upřesnění důvodu</Text>
                  <View style={[styles.modalInputWrapper, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                    <TextInput
                      style={[styles.modalInput, { color: theme.text }]}
                      value={cancelReasonNote}
                      onChangeText={setCancelReasonNote}
                      placeholder="Napište důvod..."
                      placeholderTextColor={theme.textTertiary}
                      returnKeyType="done"
                    />
                  </View>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButtonSecondary, { backgroundColor: theme.inputBackground }]}
                onPress={() => setShowCancelModal(false)}
              >
                <Text style={[styles.modalButtonSecondaryText, { color: theme.text }]}>Zpět</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButtonPrimary, { backgroundColor: theme.error }]}
                onPress={async () => {
                  const reasonText = cancelReason === 'Jiné' && cancelReasonNote.trim() ? cancelReasonNote.trim() : cancelReason;
                  const notesPrefix = purchase.notes ? purchase.notes + '\n' : '';
                  await updatePurchase(purchase.id, { 
                    purchaseState: PurchaseState.CANCELLED,
                    notes: `${notesPrefix}Důvod zrušení: ${reasonText}`,
                  });
                  setShowCancelModal(false);
                  showToast('Výkup byl zrušen', 'warning');
                }}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.modalButtonPrimaryText}>Odmítnout výkup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  splitDetailLayout: { flex: 1, flexDirection: 'row' },
  detailSidebar: { width: 280, borderRightWidth: 1, padding: 16, gap: 16, overflow: 'hidden' },
  sidebarSummary: { paddingHorizontal: 0 },
  sidebarLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, opacity: 0.8 },
  sidebarValue: { fontSize: 19, fontWeight: '700', marginBottom: 4 },
  sidebarMuted: { fontSize: 16, fontWeight: '700' },
  sidebarDivider: { height: 1 },
  sidebarStatusIcons: { gap: 12, paddingHorizontal: 0 },
  sidebarStatusIcon: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  sidebarStatusLabel: { fontSize: 14, fontWeight: '600' },
  sidebarStatusEmoji: { marginRight: 2 },
  sidebarActions: { gap: 8 },
  sidebarActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, gap: 6, flexWrap: 'wrap' },
  sidebarActionButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEditButton: {
    borderWidth: 1.5,
  },
  headerCancelButton: {
    borderWidth: 1.5,
  },
  headerSuccessButton: {
    backgroundColor: '#34C759',
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  scrollContent: { paddingTop: 0 },
  notFoundContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  notFoundTitle: { fontSize: 20, fontWeight: '600', marginTop: 16, marginBottom: 24 },
  backButtonLarge: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  backButtonLargeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  // Hero Gallery
  heroGallery: { marginBottom: 16 },
  mainImageContainer: { width: '100%', aspectRatio: 16/10, position: 'relative' },
  mainImage: { width: '100%', height: '100%' },
  imageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  photoCount: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, gap: 4 },
  photoCountText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  thumbsRow: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  defectThumbsRow: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 0,
    gap: 8,
  },
  thumbSmall: { width: 72, height: 72, borderRadius: 8, overflow: 'hidden' },
  thumbSmallImage: { width: '100%', height: '100%' },
  // Hero Card
  heroCard: { marginHorizontal: 16, marginBottom: 16, padding: 20, borderRadius: 16 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  vehicleNameLarge: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  spzSmall: { fontSize: 14, fontWeight: '500', marginBottom: 20 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  heroStatLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  heroStatDivider: {
    width: 1,
    height: 50,
    marginHorizontal: 16,
  },
  heroStatusIcons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  statusIconItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusIconEmoji: {
    marginRight: 2,
  },
  statusIconLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  section: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  tightSection: {
    paddingBottom: 8,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12, gap: 12 },
  sectionIconWrapper: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  infoIcon: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, marginBottom: 2, fontWeight: '700', textTransform: 'uppercase' },
  infoValue: { fontSize: 15, fontWeight: '500' },
  booleanValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valueWithWarning: { fontSize: 15, fontWeight: '500', color: '#FF9500' },
  warningIndicator: { marginLeft: 2 },
  componentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  componentInfo: { flex: 1, marginRight: 12 },
  componentName: { fontSize: 15, fontWeight: '500' },
  componentNotes: { fontSize: 12, marginTop: 2 },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  noteHeaderText: { fontSize: 12, fontWeight: '600' },
  componentNoteBox: { marginTop: 6, padding: 10, borderRadius: 10, borderWidth: 1 },
  componentNoteText: { fontSize: 13, lineHeight: 18 },
  componentStatus: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  componentStatusText: { fontSize: 12, fontWeight: '600' },
  employeeCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  employeeAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  employeeInitials: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  employeeRole: { fontSize: 14 },
  callEmployeeButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  notesBox: { marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 10 },
  notesText: { fontSize: 15, lineHeight: 22 },
  notesEditInput: { flex: 1, padding: 12, fontSize: 14, minHeight: 100, maxHeight: 150 },
  notesEditSaveButton: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  notesEditInput: { fontSize: 15, lineHeight: 22, padding: 14 },
  defectPhotosRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  defectPhotoThumbnail: { width: 140, height: 140, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  defectPhotoImage: { width: '100%', height: '100%' },
  defectPhotoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  actionsSection: { paddingHorizontal: 16, gap: 12 },
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 1.5, gap: 8 },
  editButtonText: { fontSize: 16, fontWeight: '600' },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, borderWidth: 1.5, gap: 8 },
  secondaryButtonText: { fontSize: 16, fontWeight: '600' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8, marginTop: 8 },
  deleteButtonText: { fontSize: 16, fontWeight: '600' },
  bottomSpacer: { height: 32 },
  // Modal styles
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '90%', maxWidth: 400, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
  modalHeader: { alignItems: 'center', marginBottom: 24 },
  modalIconWrapper: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, textAlign: 'center' },
  modalForm: { marginBottom: 24 },
  modalInputGroup: { marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  modalInputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16 },
  modalInput: { flex: 1, fontSize: 18, fontWeight: '600', paddingVertical: 14 },
  modalInputSuffix: { fontSize: 16, fontWeight: '500', marginLeft: 8 },
  dateTimeRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalButtonSecondary: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalButtonSecondaryText: { fontSize: 16, fontWeight: '600' },
  modalButtonPrimary: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  modalButtonPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, paddingHorizontal: 12 },
  optionLabel: { fontSize: 15 },
  callButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
});