import React, { useState } from 'react';
import { 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  View, 
  Text,
  Image,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PurchaseState, ClientType } from '@/constants/types';
import { mockEmployees } from '@/constants/mockData';
import { ImageGallery } from '@/components/ImageGallery';
import { DatePickerField } from '@/components/DatePickerField';
import { formatSpz } from '@/components/SpzInput';

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

const formatPhoneWithFlag = (phone?: string): string | null => {
  if (!phone) return null;
  // Find matching country code
  for (const country of COUNTRY_CODES) {
    if (phone.startsWith(country.code)) {
      return `${country.flag} ${phone}`;
    }
  }
  // Return phone as-is if no matching prefix
  return phone;
};

export default function PurchaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { getPurchaseById, updatePurchase, deletePurchase } = usePurchases();
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  // State pro modal dokončení výkupu
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completePurchasePrice, setCompletePurchasePrice] = useState('');
  const [completePurchaseDate, setCompletePurchaseDate] = useState('');
  const [completeExpectedSalePrice, setCompleteExpectedSalePrice] = useState('');
  const purchase = getPurchaseById(id);
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    // Zkusíme parsovat český formát dd.mm.yyyy
    const czechMatch = dateString.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (czechMatch) {
      const [, day, month, year] = czechMatch;
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('cs-CZ', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      }
    }
    // Fallback pro ISO formát nebo jiné formáty
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('cs-CZ', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }
    // Pokud nic nefunguje, vrátíme původní string
    return dateString;
  };

  const formatAmount = (amount?: number) => {
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
      case PurchaseState.NEW: return 'Nový';
      case PurchaseState.IN_PROGRESS: return 'Probíhá';
      case PurchaseState.COMPLETED: return 'Dokončen';
      case PurchaseState.CANCELLED: return 'Zrušen';
      default: return state;
    }
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
      setCompletePurchaseDate(purchase.purchaseDate || new Date().toLocaleDateString('cs-CZ'));
      setCompleteExpectedSalePrice(purchase.expectedSalePrice?.toString() || '');
      setShowCompleteModal(true);
    } else {
      // Pro ostatní stavy standardní alert
      Alert.alert('Aktualizovat stav', 'Zahájit zpracování tohoto výkupu?', [
        { text: 'Zrušit', style: 'cancel' },
        { text: 'Zahájit zpracování', onPress: () => updatePurchase(purchase.id, { purchaseState: nextState }) }
      ]);
    }
  };

  const handleCompletePurchase = () => {
    if (!completePurchasePrice.trim()) {
      Alert.alert('Chyba', 'Prosím zadejte konečnou cenu výkupu');
      return;
    }
    if (!completePurchaseDate.trim()) {
      Alert.alert('Chyba', 'Prosím zadejte datum výkupu');
      return;
    }

    const priceValue = parseInt(completePurchasePrice.replace(/\s/g, ''));
    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert('Chyba', 'Prosím zadejte platnou cenu');
      return;
    }

    const expectedSaleValue = completeExpectedSalePrice ? parseInt(completeExpectedSalePrice.replace(/\s/g, '')) : undefined;

    updatePurchase(purchase.id, { 
      purchaseState: PurchaseState.COMPLETED,
      totalAmount: priceValue,
      purchaseDate: completePurchaseDate,
      expectedSalePrice: expectedSaleValue,
    });

    setShowCompleteModal(false);
    Alert.alert('Úspěch', 'Výkup byl úspěšně dokončen');
  };

  const handleCancelPurchase = () => {
    Alert.alert('Zrušit výkup', 'Opravdu chcete zrušit tento výkup?', [
      { text: 'Ne', style: 'cancel' },
      { text: 'Ano, zrušit', style: 'destructive', onPress: () => updatePurchase(purchase.id, { purchaseState: PurchaseState.CANCELLED }) }
    ]);
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
          onPress: () => {
            deletePurchase(purchase.id);
            router.back();
          }
        }
      ]
    );
  };

  const employee = mockEmployees.find(emp => emp.id === purchase.employeeId);

  const renderInfoRow = (label: string, value?: string | null, icon?: string) => {
    if (!value) return null;
    return (
      <View style={[styles.infoRow, { borderBottomColor: theme.borderLight }]}>
        {icon && (
          <View style={[styles.infoIcon, { backgroundColor: theme.accentLight }]}>
            <Ionicons name={icon as any} size={16} color={theme.accent} />
          </View>
        )}
        <View style={styles.infoContent}>
          <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{label}</Text>
          <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
        </View>
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.inputBackground }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Detail výkupu</Text>
        {purchase.purchaseState === PurchaseState.IN_PROGRESS ? (
          <TouchableOpacity 
            style={[styles.moreButton, { backgroundColor: theme.inputBackground }]} 
            onPress={() => router.push(`/purchase/edit-purchase?id=${purchase.id}`)}
          >
            <Ionicons name="create-outline" size={20} color={theme.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.moreButton} />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Photo Gallery - First */}
        {purchase.images && purchase.images.length > 0 && (
          <View style={styles.heroGallery}>
            <TouchableOpacity 
              style={styles.mainImageContainer} 
              onPress={() => setSelectedImageIndex(0)} 
              activeOpacity={0.9}
            >
              <Image source={{ uri: purchase.images[0] }} style={styles.mainImage} resizeMode="cover" />
              <View style={styles.imageOverlay}>
                <View style={[styles.statusBadge, { backgroundColor: getStateColor(purchase.purchaseState) }]}>
                  <Text style={styles.statusText}>{getStateText(purchase.purchaseState)}</Text>
                </View>
                <View style={styles.photoCount}>
                  <Ionicons name="images" size={16} color="#FFFFFF" />
                  <Text style={styles.photoCountText}>{purchase.images.length}</Text>
                </View>
              </View>
            </TouchableOpacity>
            {purchase.images.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbsRow}>
                {purchase.images.slice(1).map((imageUrl, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.thumbSmall} 
                    onPress={() => setSelectedImageIndex(index + 1)} 
                    activeOpacity={0.8}
                  >
                    <Image source={{ uri: imageUrl }} style={styles.thumbSmallImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: theme.card }]}>
          {!(purchase.images && purchase.images.length > 0) && (
            <View style={[styles.statusBadge, { backgroundColor: getStateColor(purchase.purchaseState), alignSelf: 'flex-start', marginBottom: 12 }]}>
              <Text style={styles.statusText}>{getStateText(purchase.purchaseState)}</Text>
            </View>
          )}

          {purchase.carDetails && (
            <Text style={[styles.vehicleNameLarge, { color: theme.text }]}>
              {purchase.carDetails.make} {purchase.carDetails.model}
              {purchase.carDetails.year && ` (${purchase.carDetails.year})`}
            </Text>
          )}

          <Text style={[styles.spzSmall, { color: theme.textTertiary }]}>🇨🇿 {formatSpz(purchase.spz)}</Text>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: theme.text }]}>{formatAmount(purchase.totalAmount) || '—'}</Text>
              <Text style={[styles.heroStatLabel, { color: theme.textSecondary }]}>Cena výkupu</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: theme.border }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: theme.text }]}>{purchase.carDetails?.mileage?.toLocaleString() || '—'}</Text>
              <Text style={[styles.heroStatLabel, { color: theme.textSecondary }]}>Kilometrů</Text>
            </View>
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
          {renderInfoRow('Datum výkupu', formatDate(purchase.purchaseDate), 'calendar-outline')}
          {renderInfoRow('Datum prohlídky', formatDate(purchase.inspectionDate), 'time-outline')}
          {renderInfoRow('Cena zákazník', formatAmount(purchase.customerPrice), 'pricetag-outline')}
          {renderInfoRow('Cena nabídnuta', formatAmount(purchase.offeredPrice), 'cash-outline')}
          {renderInfoRow('Před. cena prodeje', formatAmount(purchase.expectedSalePrice), 'trending-up-outline')}
          {renderBooleanRow('Protiúčet', purchase.isCounterAccount, 'swap-horizontal-outline')}
          {renderBooleanRow('VIN prověřen', purchase.vinVerified, 'shield-checkmark-outline')}
          {renderInfoRow('Odkud zná', purchase.sourceKnowledge, 'megaphone-outline')}
        </View>

        {/* Vozidlo */}
        {purchase.carDetails && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: theme.accentLight }]}>
                <Ionicons name="car-sport" size={18} color={theme.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Údaje o vozidle</Text>
            </View>
            {renderInfoRow('Značka', purchase.carDetails.make, 'logo-model-s')}
            {renderInfoRow('Model', purchase.carDetails.model, 'car-outline')}
            {renderInfoRow('VIN', purchase.carDetails.vin, 'barcode-outline')}
            {renderInfoRow('Rok výroby', purchase.carDetails.year?.toString(), 'calendar-number-outline')}
            {renderInfoRow('Barva', purchase.carDetails.color, 'color-palette-outline')}
            {renderInfoRow('Palivo', purchase.carDetails.fuelType, 'flash-outline')}
            {renderInfoRow('Výkon', purchase.carDetails.engineSize, 'speedometer-outline')}
            {renderInfoRow('Převodovka', purchase.carDetails.transmission, 'cog-outline')}
            {renderInfoRow('Karoserie', purchase.carDetails.bodyType, 'cube-outline')}
            {renderInfoRow('Pohon', purchase.carDetails.driveType, 'git-branch-outline')}
            {renderInfoRow('Kilometry', purchase.carDetails.mileage ? `${purchase.carDetails.mileage.toLocaleString()} km` : undefined, 'navigate-outline')}
            {renderInfoRow('STK do', purchase.carDetails.stk, 'shield-outline')}
            {renderInfoRow('Do provozu', purchase.carDetails.firstRegistration, 'flag-outline')}
            {renderBooleanRow('Dovoz', purchase.carDetails.isImport, 'airplane-outline')}
            {renderBooleanRow('První majitel', purchase.carDetails.isFirstOwner, 'person-add-outline')}
            {renderBooleanRow('Servisní knížka', purchase.carDetails.hasServiceBook, 'book-outline')}
            {renderBooleanRow('Bezp. šrouby', purchase.carDetails.hasSecurityScrews, 'lock-closed-outline')}
            {renderBooleanRow('Kola AI', purchase.carDetails.hasAiWheels, 'ellipse-outline')}
          </View>
        )}

        {/* Stav součástí */}
        {purchase.componentStatuses && purchase.componentStatuses.length > 0 && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: theme.accentLight }]}>
                <Ionicons name="list" size={18} color={theme.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Stav součástí</Text>
            </View>
            {purchase.componentStatuses.map((cs, index) => {
              const statusInfo = STATUS_OPTIONS[cs.status] || STATUS_OPTIONS.good;
              return (
                <View key={index} style={[styles.componentRow, { borderBottomColor: theme.borderLight }]}>
                  <View style={styles.componentInfo}>
                    <Text style={[styles.componentName, { color: theme.text }]}>{cs.component}</Text>
                    {cs.notes && <Text style={[styles.componentNotes, { color: theme.textTertiary }]}>{cs.notes}</Text>}
                  </View>
                  <View style={[styles.componentStatus, { backgroundColor: statusInfo.color + '20' }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
                    <Text style={[styles.componentStatusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Poznámky - moved before Klient */}
        {purchase.notes && (
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: theme.accentLight }]}>
                <Ionicons name="document-text" size={18} color={theme.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Poznámky</Text>
            </View>
            <View style={[styles.notesBox, { backgroundColor: theme.inputBackground }]}>
              <Text style={[styles.notesText, { color: theme.text }]}>{purchase.notes}</Text>
            </View>
          </View>
        )}

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
          {renderInfoRow('Telefon', formatPhoneWithFlag(purchase.phone), 'call-outline')}
          {renderInfoRow('Ulice', purchase.street, 'location-outline')}
          {renderInfoRow('Město', purchase.city, 'map-outline')}
          {renderInfoRow('PSČ', purchase.postalCode, 'pin-outline')}
        </View>

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
              <Text style={[styles.secondaryButtonText, { color: theme.error }]}>Zrušit výkup</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.deleteButton, { backgroundColor: theme.error + '15' }]} onPress={handleDeletePurchase}>
            <Ionicons name="trash-outline" size={20} color={theme.error} />
            <Text style={[styles.deleteButtonText, { color: theme.error }]}>Odstranit výkup</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Image Gallery Modal */}
      {selectedImageIndex !== null && purchase.images && (
        <ImageGallery
          images={purchase.images}
          visible={true}
          initialIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
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

              <DatePickerField
                label="Datum výkupu"
                value={completePurchaseDate}
                onChange={setCompletePurchaseDate}
                placeholder="dd.mm.yyyy"
              />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  moreButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
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
  heroStatLabel: { fontSize: 13 },
  heroStatDivider: { width: 1, height: 40, marginHorizontal: 16 },
  section: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12, gap: 12 },
  sectionIconWrapper: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  infoIcon: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '500' },
  booleanValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  componentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  componentInfo: { flex: 1, marginRight: 12 },
  componentName: { fontSize: 15, fontWeight: '500' },
  componentNotes: { fontSize: 12, marginTop: 2 },
  componentStatus: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  componentStatusText: { fontSize: 12, fontWeight: '600' },
  employeeCard: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  employeeAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  employeeInitials: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  employeeRole: { fontSize: 14 },
  notesBox: { marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 10 },
  notesText: { fontSize: 15, lineHeight: 22 },
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
  modalActions: { flexDirection: 'row', gap: 12 },
  modalButtonSecondary: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalButtonSecondaryText: { fontSize: 16, fontWeight: '600' },
  modalButtonPrimary: { flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 },
  modalButtonPrimaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});