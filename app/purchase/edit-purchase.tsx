import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SelectionPicker } from '@/components/SelectionPicker';
import { WheelPicker } from '@/components/WheelPicker';
import { DatePickerField } from '@/components/DatePickerField';
import { PhoneInput } from '@/components/PhoneInput';
import { SpzInput } from '@/components/SpzInput';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PurchaseState, ClientType } from '@/constants/types';
import { VEHICLE_MAKES, VEHICLE_MODELS } from '@/constants/vehicleOptions';
import { CameraCapture } from '@/components/CameraCapture';
import { EditableImageGallery } from '@/components/EditableImageGallery';
import * as ImagePicker from 'expo-image-picker';
import CounterAccountPicker from '@/components/CounterAccountPicker';
import { Base44Car } from '@/services/base44Api';
import { apiService } from '@/services/apiService';

const EDIT_TABS = [
  { key: 'zakladni', title: 'Základní', icon: 'book' as const },
  { key: 'automobil', title: 'Vozidlo', icon: 'car-sport' as const },
  { key: 'stav-soucasti', title: 'Stav součástí', icon: 'list' as const },
  { key: 'foto-vady', title: 'Foto vady', icon: 'camera' as const },
  // souhrn tab removed to match new-purchase
];

const STATES = ['Nový', 'Probíhá', 'Dokončen', 'Zrušen'];
const BUYERS = ['Kuruc Daniel', 'Jan Novák', 'Petr Svoboda', 'Marie Dvořáková'];
const MOTOROVA_VARIANTA = ['---Výběr---', '1.0 TSI', '1.4 TFSI', '1.6 TDI', '2.0 TDI', '2.0 TFSI', '3.0 TDI'];
const PREVODOVKA = ['---Výběr---', 'Manuální', 'Automatická', 'CVT', 'DSG'];
const KAROSERIE = ['---Výběr---', 'Sedan', 'Hatchback', 'Kombi', 'SUV', 'Coupe', 'Cabrio'];
const POHON = ['---Výběr---', 'Přední', 'Zadní', '4x4', 'AWD'];
const PALIVO = ['---Výběr---', 'Benzín', 'Nafta', 'Hybrid', 'Elektro', 'LPG', 'CNG'];
const ODKUD_ZNA = ['---Výběr---', 'Internet', 'Doporučení', 'Reklama', 'Sociální sítě', 'Jiné'];

const VEHICLE_COMPONENTS = [
  'Motor',
  'Převodovka',
  'Brzdy',
  'Odpružení',
  'Pneumatiky',
  'Baterie',
  'Klimatizace',
  'Elektronika',
  'Interiér',
  'Lak karoserie',
  'Skla/okna',
  'Světla',
];

const STATUS_OPTIONS = [
  { key: 'excellent', label: 'Výborné', color: '#34C759', icon: 'checkmark-circle' },
  { key: 'good', label: 'Dobré', color: '#30D158', icon: 'checkmark-circle-outline' },
  { key: 'fair', label: 'Přijatelné', color: '#FF9500', icon: 'remove-circle' },
  { key: 'poor', label: 'Špatné', color: '#FF6B35', icon: 'close-circle-outline' },
  { key: 'damaged', label: 'Poškozené', color: '#FF3B30', icon: 'close-circle' },
];

interface ComponentStatus {
  component: string;
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'damaged';
  notes: string;
}

export default function EditPurchaseScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPurchaseById, updatePurchase } = usePurchases();
  // Helper: normalize various date strings to dd.mm.yyyy
  const formatDate = (val?: string | null): string => {
    if (!val) return '';
    let s = String(val).trim();
    // Replace slashes with dots
    s = s.replace(/[\/]/g, '.');
    // If already dd.mm.yyyy -> return
    const ddmmyyyy = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
    const mmyyyy = /^(\d{1,2})\.(\d{4})$/; // e.g., 06.2026
    const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})/; // ISO
    const mm_yyyy_slash = /^(\d{1,2})\/(\d{4})$/;
    const match1 = s.match(ddmmyyyy);
    if (match1) {
      const d = match1[1].padStart(2, '0');
      const m = match1[2].padStart(2, '0');
      return `${d}.${m}.${match1[3]}`;
    }
    const matchMMYYYY = s.match(mmyyyy) || s.match(mm_yyyy_slash);
    if (matchMMYYYY) {
      const m = matchMMYYYY[1].padStart(2, '0');
      const y = matchMMYYYY[2];
      return `01.${m}.${y}`; // assume first day
    }
    const matchISO = s.match(yyyymmdd);
    if (matchISO) {
      const y = matchISO[1];
      const m = matchISO[2];
      const d = matchISO[3];
      return `${d}.${m}.${y}`;
    }
    // Fallback: try Date parse
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      return `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}`;
    }
    return s; // leave as is if unknown
  };
  const [selectedTab, setSelectedTab] = useState('zakladni');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'vehicle' | 'defect'>('vehicle');
  const [images, setImages] = useState<string[]>([]);
  const [defectImages, setDefectImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showCounterPicker, setShowCounterPicker] = useState(false);
  const [counterCar, setCounterCar] = useState<Base44Car | null>(null);
  // Refs to mimic new-purchase behavior
  const zakladniRef = useRef<ScrollView>(null);
  const automobilRef = useRef<ScrollView>(null);
  const stavSoucastiRef = useRef<ScrollView>(null);
  const fotoVadyRef = useRef<ScrollView>(null);
  // souhrnRef removed to match new-purchase
  const tabsScrollRef = useRef<ScrollView>(null);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});

  // Form state - všechna pole ze zadávání výkupu
  const [formData, setFormData] = useState({
    // Základní informace
    stav: 'Probíhá',
    vykupci: 'Kuruc Daniel',
    datumProhlidky: '',
    datumVykupu: '',
    cenaZakaznik: '',
    cenaNabidnuta: '',
    firma: false,
    platceDPH: false,
    jmeno: '',
    prijmeni: '',
    nazevFirmy: '',
    telefon: '',
    ico: '',
    dic: '',
    ulice: '',
    mesto: '',
    psc: '',
    odkudZna: '---Výběr---',
    // Vozidlo
    znacka: '---Výběr---',
    model: '---Výběr---',
    spz: '',
    motorovaVarianta: '---Výběr---',
    km: '',
    vykon: '',
    palivo: '---Výběr---',
    prevodovka: '---Výběr---',
    karoserie: '---Výběr---',
    pohon: '---Výběr---',
    barva: '',
    vin: '',
    stk: '',
    doProvozu: '',
    dovoz: false,
    prvniMajitel: false,
    servisniKnizka: false,
    bezpecnostniSrouby: false,
    kolaAI: false,
    vinProveren: false,
    protiucet: false,
    // Souhrn fields removed to match new-purchase
  });

  const [componentStatuses, setComponentStatuses] = useState<ComponentStatus[]>(
    VEHICLE_COMPONENTS.map(component => ({
      component,
      status: 'good' as const,
      notes: '',
    }))
  );

  // Load purchase data
  useEffect(() => {
    const purchase = getPurchaseById(id);
    if (!purchase) {
      Alert.alert('Chyba', 'Výkup nebyl nalezen', [
        { text: 'OK', onPress: () => router.back() }
      ]);
      return;
    }

    // Parse client name
    const nameParts = purchase.clientName?.split(' ') || [];
    const isCompany = purchase.clientType === ClientType.COMPANY;

    // Map purchase state
    const stateMap: Record<PurchaseState, string> = {
      [PurchaseState.NEW]: 'Nový',
      [PurchaseState.IN_PROGRESS]: 'Probíhá',
      [PurchaseState.COMPLETED]: 'Dokončen',
      [PurchaseState.CANCELLED]: 'Zrušen',
    };

    setFormData({
      stav: stateMap[purchase.purchaseState] || 'Probíhá',
      vykupci: 'Kuruc Daniel', // TODO: načíst z purchase.employeeId
      datumProhlidky: formatDate(purchase.inspectionDate),
      datumVykupu: formatDate(purchase.purchaseDate),
      cenaZakaznik: purchase.customerPrice?.toString() || '',
      cenaNabidnuta: purchase.offeredPrice?.toString() || '',
      firma: isCompany,
      platceDPH: purchase.isVatPayer || false,
      jmeno: isCompany ? '' : (nameParts[0] || ''),
      prijmeni: isCompany ? '' : (nameParts.slice(1).join(' ') || ''),
      nazevFirmy: isCompany ? (purchase.companyInfo?.companyName || purchase.clientName || '') : '',
      telefon: purchase.phone || '',
      ico: purchase.companyInfo?.ico || '',
      dic: purchase.companyInfo?.dic || '',
      ulice: purchase.street || '',
      mesto: purchase.city || '',
      psc: purchase.postalCode || '',
      odkudZna: purchase.sourceKnowledge || '---Výběr---',
      znacka: purchase.carDetails?.make || '---Výběr---',
      model: purchase.carDetails?.model || '---Výběr---',
      spz: purchase.spz || '',
      motorovaVarianta: '---Výběr---', // TODO: přidat do typu Car
      km: purchase.carDetails?.mileage?.toString() || '',
      vykon: purchase.carDetails?.engineSize?.replace(' kW', '') || '',
      palivo: purchase.carDetails?.fuelType || '---Výběr---',
      prevodovka: purchase.carDetails?.transmission || '---Výběr---',
      karoserie: purchase.carDetails?.bodyType || '---Výběr---',
      pohon: purchase.carDetails?.driveType || '---Výběr---',
      barva: purchase.carDetails?.color || '',
      vin: purchase.carDetails?.vin || '',
      stk: formatDate(purchase.carDetails?.stk || ''),
      doProvozu: formatDate(purchase.carDetails?.firstRegistration || ''),
      dovoz: purchase.carDetails?.isImport || false,
      prvniMajitel: purchase.carDetails?.isFirstOwner || false,
      servisniKnizka: purchase.carDetails?.hasServiceBook || false,
      bezpecnostniSrouby: purchase.carDetails?.hasSecurityScrews || false,
      kolaAI: purchase.carDetails?.hasAiWheels || false,
      vinProveren: purchase.vinVerified || false,
      protiucet: purchase.isCounterAccount || false,
      // Souhrn fields removed to match new-purchase
    });

    // Load component statuses
    if (purchase.componentStatuses && purchase.componentStatuses.length > 0) {
      setComponentStatuses(purchase.componentStatuses.map(cs => ({
        component: cs.component,
        status: cs.status,
        notes: cs.notes || '',
      })));
    }

    // Load images if available
    if (purchase.images && Array.isArray(purchase.images)) {
      setImages(purchase.images);
    }

    // Load defect images if available
    if (purchase.defectImages && Array.isArray(purchase.defectImages)) {
      setDefectImages(purchase.defectImages);
    }

    // Load counter account car if available
    if (purchase.counterAccountCar) {
      setCounterCar({
        id: purchase.counterAccountCar.id,
        make: purchase.counterAccountCar.make,
        model: purchase.counterAccountCar.model,
        variant: purchase.counterAccountCar.variant,
        price: purchase.counterAccountCar.price ?? undefined,
      });
    } else {
      setCounterCar(null);
    }
    setInitialLoading(false);
  }, [id]);

  // Center active chip and reset vertical scroll on tab change
  useEffect(() => {
    const refMap: Record<string, React.RefObject<ScrollView>> = {
      zakladni: zakladniRef,
      automobil: automobilRef,
      'stav-soucasti': stavSoucastiRef,
      'foto-vady': fotoVadyRef,
      // souhrn removed to match new-purchase
    };
    refMap[selectedTab]?.current?.scrollTo({ y: 0, animated: false });

    const layout = tabLayoutsRef.current[selectedTab];
    if (layout && tabsScrollRef.current) {
      const screenW = Dimensions.get('window').width;
      const targetX = Math.max(0, layout.x + layout.width / 2 - screenW / 2);
      tabsScrollRef.current.scrollTo({ x: targetX, animated: true });
    }
  }, [selectedTab]);

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'protiucet') {
      const enabled = Boolean(value);
      if (enabled) setShowCounterPicker(true);
      if (!enabled) setCounterCar(null);
    }
  };

  const updateComponentStatus = (index: number, status: ComponentStatus['status']) => {
    setComponentStatuses(prev => prev.map((item, i) => 
      i === index ? { ...item, status } : item
    ));
  };

  const updateComponentNotes = (index: number, notes: string) => {
    setComponentStatuses(prev => prev.map((item, i) => 
      i === index ? { ...item, notes } : item
    ));
  };

  const getStatusOption = (status: ComponentStatus['status']) => {
    return STATUS_OPTIONS.find(option => option.key === status) || STATUS_OPTIONS[1];
  };

  const getAvailableModels = () => {
    if (!formData.znacka || formData.znacka === '---Výběr---') return ['---Výběr---'];
    return ['---Výběr---', ...(VEHICLE_MODELS[formData.znacka] || [])];
  };

  const handleSave = async () => {
    if (!formData.spz.trim()) {
      Alert.alert('Chyba', 'SPZ je povinné pole');
      return;
    }

    setLoading(true);
    try {
      // Rozděl fotky na existující (URL) a nové (lokální uri)
      const isRemote = (u: string) => u.startsWith('http') || u.startsWith('/');
      const vehicleExisting = images.filter(isRemote);
      const vehicleNew = images.filter((u) => !isRemote(u));
      const defectExisting = defectImages.filter(isRemote);
      const defectNew = defectImages.filter((u) => !isRemote(u));

      // Nahraj nové fotografie
      let uploadedVehicle: string[] = [];
      let uploadedDefects: string[] = [];
      if (vehicleNew.length > 0) {
        try {
          const res = await apiService.uploadPhotos(String(id), vehicleNew);
          uploadedVehicle = res.files || [];
        } catch (e) {
          console.error('[EditPurchase] Upload vehicle images failed:', e);
        }
      }
      if (defectNew.length > 0) {
        try {
          const res = await apiService.uploadDefectPhotos(String(id), defectNew);
          uploadedDefects = res.files || [];
        } catch (e) {
          console.error('[EditPurchase] Upload defect images failed:', e);
        }
      }

      const mergedVehicleImages = [...vehicleExisting, ...uploadedVehicle];
      const mergedDefectImages = [...defectExisting, ...uploadedDefects];
      const stateMap: Record<string, PurchaseState> = {
        'Nový': PurchaseState.NEW,
        'Probíhá': PurchaseState.IN_PROGRESS,
        'Dokončen': PurchaseState.COMPLETED,
        'Zrušen': PurchaseState.CANCELLED,
      };

      const clientName = formData.firma 
        ? formData.nazevFirmy 
        : `${formData.jmeno} ${formData.prijmeni}`.trim();

      let carYear = new Date().getFullYear();
      if (formData.doProvozu) {
        const match = formData.doProvozu.match(/(\d{4})/);
        if (match) carYear = parseInt(match[1]);
      }

      updatePurchase(id, {
        clientName: clientName || 'Neznámý klient',
        clientType: formData.firma ? ClientType.COMPANY : ClientType.PERSONAL,
        purchaseState: stateMap[formData.stav] || PurchaseState.IN_PROGRESS,
        spz: formData.spz,
        purchaseDate: formData.datumVykupu || undefined,
        inspectionDate: formData.datumProhlidky || undefined,
        customerPrice: formData.cenaZakaznik ? parseInt(formData.cenaZakaznik) : undefined,
        offeredPrice: formData.cenaNabidnuta ? parseInt(formData.cenaNabidnuta) : undefined,
        // Souhrn fields removed to match new-purchase
        isVatPayer: formData.platceDPH,
        isCounterAccount: formData.protiucet,
        vinVerified: formData.vinProveren,
        counterAccountCar: counterCar ? {
          id: counterCar.id,
          make: counterCar.make,
          model: counterCar.model,
          variant: counterCar.variant,
          price: counterCar.price ?? undefined,
        } : undefined,
        sourceKnowledge: formData.odkudZna !== '---Výběr---' ? formData.odkudZna : undefined,
        phone: formData.telefon || undefined,
        street: formData.ulice || undefined,
        city: formData.mesto || undefined,
        postalCode: formData.psc || undefined,
        notes: undefined,
        images: mergedVehicleImages.length > 0 ? mergedVehicleImages : undefined,
        defectImages: mergedDefectImages.length > 0 ? mergedDefectImages : undefined,
        companyInfo: formData.firma ? {
          companyName: formData.nazevFirmy,
          ico: formData.ico || undefined,
          dic: formData.dic || undefined,
        } : undefined,
        carDetails: {
          id: id,
          make: formData.znacka !== '---Výběr---' ? formData.znacka : 'Neznámá',
          model: formData.model !== '---Výběr---' ? formData.model : 'Neznámý',
          year: carYear,
          vin: formData.vin || undefined,
          color: formData.barva || undefined,
          mileage: formData.km ? parseInt(formData.km) : undefined,
          fuelType: formData.palivo !== '---Výběr---' ? formData.palivo : undefined,
          engineSize: formData.vykon ? `${formData.vykon} kW` : undefined,
          transmission: formData.prevodovka !== '---Výběr---' ? formData.prevodovka : undefined,
          bodyType: formData.karoserie !== '---Výběr---' ? formData.karoserie : undefined,
          driveType: formData.pohon !== '---Výběr---' ? formData.pohon : undefined,
          stk: formData.stk || undefined,
          firstRegistration: formData.doProvozu || undefined,
          isImport: formData.dovoz,
          isFirstOwner: formData.prvniMajitel,
          hasServiceBook: formData.servisniKnizka,
          hasSecurityScrews: formData.bezpecnostniSrouby,
          hasAiWheels: formData.kolaAI,
          condition: 'USED' as any,
        },
        componentStatuses: componentStatuses.length > 0 ? componentStatuses : undefined,
      });

      Alert.alert('Úspěch', 'Výkup byl úspěšně uložen', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('[EditPurchase] Chyba při ukládání:', error);
      Alert.alert('Chyba', 'Nepodařilo se uložit změny');
    } finally {
      setLoading(false);
    }
  };

  // Render helpers
  const renderInput = (label: string, field: string, options?: { 
    placeholder?: string; 
    keyboardType?: 'default' | 'numeric';
  }) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
        value={String(formData[field as keyof typeof formData] || '')}
        onChangeText={(text) => updateField(field, text)}
        placeholder={options?.placeholder}
        placeholderTextColor={theme.textTertiary}
        keyboardType={options?.keyboardType || 'default'}
        returnKeyType="done"
      />
    </View>
  );

  const renderToggle = (label: string, field: string) => (
    <View style={styles.toggleRow}>
      <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
      <Switch
        value={Boolean(formData[field as keyof typeof formData])}
        onValueChange={(value) => updateField(field, value)}
        trackColor={{ false: '#E5E5E7', true: theme.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  // Tab content renderers
  const renderZakladniTab = () => (
    <ScrollView
      ref={zakladniRef}
      style={[styles.tabContent, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.tabInner}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Základní informace</Text>

      <SelectionPicker
        label="Stav"
        value={formData.stav}
        options={STATES}
        onSelect={(val) => updateField('stav', val)}
        placeholder="---Výběr---"
      />

      <SelectionPicker
        label="Výkupčí"
        value={formData.vykupci}
        options={BUYERS}
        onSelect={(val) => updateField('vykupci', val)}
        placeholder="Vyberte výkupčího..."
      />

      <DatePickerField
        label="Datum prohlídky"
        value={formData.datumProhlidky}
        onChange={(val) => updateField('datumProhlidky', formatDate(val))}
        placeholder="dd.mm.yyyy"
      />

      <DatePickerField
        label="Datum výkupu"
        value={formData.datumVykupu}
        onChange={(val) => updateField('datumVykupu', formatDate(val))}
        placeholder="dd.mm.yyyy"
      />

      {renderInput('Cena zákazník', 'cenaZakaznik', { placeholder: '0', keyboardType: 'numeric' })}
      {renderInput('Cena nabídnuta', 'cenaNabidnuta', { placeholder: '0', keyboardType: 'numeric' })}

      <Text style={[styles.sectionTitle, { marginTop: 24, color: theme.textSecondary }]}>Informace o klientovi</Text>
      {renderToggle('Firma', 'firma')}
      {renderToggle('Plátce DPH', 'platceDPH')}

      {formData.firma ? (
        <>
          {renderInput('Název firmy', 'nazevFirmy', { placeholder: 'Zadejte název firmy...' })}
          {renderInput('IČO', 'ico', { placeholder: 'Zadejte IČO...' })}
          {renderInput('DIČ', 'dic', { placeholder: 'Zadejte DIČ...' })}
        </>
      ) : (
        <>
          {renderInput('Jméno', 'jmeno', { placeholder: 'Zadejte jméno...' })}
          {renderInput('Příjmení', 'prijmeni', { placeholder: 'Zadejte příjmení...' })}
        </>
      )}

      <PhoneInput
        label="Telefon"
        value={formData.telefon}
        onChangeText={(text) => updateField('telefon', text)}
        placeholder="xxx xxx xxx"
      />

      {renderInput('Ulice', 'ulice', { placeholder: 'Zadejte ulici...' })}
      {renderInput('Město', 'mesto', { placeholder: 'Zadejte město...' })}
      {renderInput('PSČ', 'psc', { placeholder: 'Zadejte PSČ...' })}

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderAutomobilTab = () => (
    <ScrollView
      ref={automobilRef}
      style={[styles.tabContent, { backgroundColor: theme.background }]}
      contentContainerStyle={styles.tabInner}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Údaje o vozidle</Text>

      {/* VIN block with Load button */}
      <View style={[styles.vinBlock, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <Text style={[styles.label, { color: theme.textSecondary }]}>VIN</Text>
        <View style={styles.vinRow}>
          <TextInput
            style={[styles.vinInput, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
            value={formData.vin}
            onChangeText={(t) => updateField('vin', t)}
            placeholder="Zadejte 17-místný VIN..."
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="characters"
            maxLength={17}
          />
          <TouchableOpacity style={[styles.vinBtn, { backgroundColor: theme.accent }]} onPress={() => Alert.alert('Načíst VIN', 'Funkce načtení VIN bude doplněna.') }>
            <Ionicons name="search" size={18} color="#FFFFFF" />
            <Text style={styles.vinBtnText}>Načíst</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.vinHelp, { color: theme.textTertiary }]}>Zadejte VIN a klikněte na "Načíst" pro automatické doplnění údajů o vozidle</Text>
      </View>
      <View style={{ height: 16 }} />
      <SelectionPicker
        label="Značka"
        value={formData.znacka}
        options={['---Výběr---', ...VEHICLE_MAKES]}
        onSelect={(val) => {
          updateField('znacka', val);
          updateField('model', '---Výběr---');
        }}
        placeholder="---Výběr---"
      />

      <SelectionPicker
        label="Model"
        value={formData.model}
        options={getAvailableModels()}
        onSelect={(val) => updateField('model', val)}
        placeholder="---Výběr---"
      />

      {/* SPZ with country badge */}
      <SpzInput
        label="SPZ"
        value={formData.spz}
        onChangeText={(text) => updateField('spz', text)}
      />

      <WheelPicker
        label="Motorová varianta"
        value={formData.motorovaVarianta}
        options={[]}
        onSelect={(val) => updateField('motorovaVarianta', val)}
        placeholder="---Výběr---"
      />

      {renderInput('Km', 'km', { placeholder: '', keyboardType: 'numeric' })}

      <DatePickerField
        label="STK"
        value={formData.stk}
        onChange={(val) => updateField('stk', formatDate(val))}
        placeholder="dd.mm.yyyy"
      />

      {renderInput('Výkon (kW)', 'vykon', { placeholder: '', keyboardType: 'numeric' })}

      <SelectionPicker
        label="Převodovka"
        value={formData.prevodovka}
        options={PREVODOVKA}
        onSelect={(val) => updateField('prevodovka', val)}
        placeholder="---Výběr---"
      />

      <SelectionPicker
        label="Karoserie"
        value={formData.karoserie}
        options={KAROSERIE}
        onSelect={(val) => updateField('karoserie', val)}
        placeholder="---Výběr---"
      />

      <SelectionPicker
        label="Pohon"
        value={formData.pohon}
        options={POHON}
        onSelect={(val) => updateField('pohon', val)}
        placeholder="---Výběr---"
      />

      {renderToggle('Kola AI', 'kolaAI')}

      <DatePickerField
        label="Do provozu"
        value={formData.doProvozu}
        onChange={(val) => updateField('doProvozu', formatDate(val))}
        placeholder="dd.mm.yyyy"
      />
      {renderToggle('Dovoz', 'dovoz')}
      {renderToggle('První majitel', 'prvniMajitel')}
      {renderToggle('Servisní knížka', 'servisniKnizka')}
      {renderToggle('Bezpečnostní šrouby', 'bezpecnostniSrouby')}
      {renderToggle('VIN prověřen', 'vinProveren')}
      {renderToggle('Protiúčet', 'protiucet')}

      {counterCar && (
        <View style={[styles.blockCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <Text style={[styles.blockTitle, { color: theme.text }]}>Vybraný protiúčet</Text>
          <Text style={{ color: theme.text }}>{counterCar.make} {counterCar.model}</Text>
          {!!counterCar.variant && <Text style={{ color: theme.textSecondary }}>{counterCar.variant}</Text>}
          {!!counterCar.price && <Text style={{ color: theme.text }}>{counterCar.price.toLocaleString('cs-CZ')} Kč</Text>}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <TouchableOpacity onPress={() => setShowCounterPicker(true)} style={[styles.vinBtn, { backgroundColor: theme.accent }]}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.vinBtnText}>Změnit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setCounterCar(null); updateField('protiucet', false); }} style={[styles.vinBtn, { backgroundColor: theme.inputBackground }] }>
              <Text style={[styles.vinBtnText, { color: theme.text }]}>Odebrat</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderStavSoucastiTab = () => (
    <ScrollView ref={stavSoucastiRef} style={[styles.tabContent, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary, paddingHorizontal: 16, paddingVertical: 8 }]}>Stav součástí vozidla</Text>
      <Text style={[styles.sectionDesc, { color: theme.textSecondary, paddingHorizontal: 16 }]}>
        Vyhodnoťte stav každé součásti
      </Text>

      {componentStatuses.map((item, index) => (
        <View key={item.component} style={[styles.componentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.componentHeader}>
            <Text style={[styles.componentName, { color: theme.text }]}>{item.component}</Text>
            <View style={styles.statusSelector}>
              {STATUS_OPTIONS.map((statusOption) => {
                const isSelected = item.status === statusOption.key;
                return (
                  <TouchableOpacity
                    key={statusOption.key}
                    style={[
                      styles.statusBtn,
                      { borderColor: statusOption.color },
                      isSelected && { backgroundColor: statusOption.color }
                    ]}
                    onPress={() => updateComponentStatus(index, statusOption.key as ComponentStatus['status'])}
                  >
                    <Ionicons
                      name={statusOption.icon as any}
                      size={16}
                      color={isSelected ? '#FFFFFF' : statusOption.color}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: getStatusOption(item.status).color }]} />
            <Text style={[styles.statusLabel, { color: theme.text }]}>
              {getStatusOption(item.status).label}
            </Text>
          </View>
          <TextInput
            style={[styles.componentNotes, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text }]}
            value={item.notes}
            onChangeText={(text) => updateComponentNotes(index, text)}
            placeholder="Poznámky k součásti..."
            placeholderTextColor={theme.textTertiary}
            multiline
            numberOfLines={2}
          />
        </View>
      ))}
      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderFotoVadyTab = () => (
    <ScrollView ref={fotoVadyRef} style={[styles.tabContent, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>
      {/* Overview */}
      <View style={[styles.blockCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <Text style={[styles.blockTitle, { color: theme.text }]}>Přehled fotografií</Text>
        <View style={styles.overviewRow}>
          <Ionicons name="image" size={20} color={theme.accent} />
          <Text style={[styles.overviewText, { color: theme.textSecondary }]}>
            {images.length + defectImages.length} fotografií pořízeno
          </Text>
        </View>
      </View>

      {/* Vehicle photos */}
      <View style={[styles.blockCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <Text style={[styles.blockTitle, { color: theme.text }]}>Foto vozidla</Text>
        <Text style={[styles.blockDesc, { color: theme.textSecondary }]}>Zachyťte exteriér, interiér a detaily</Text>

        <Text style={[styles.blockSubTitle, { color: theme.text }]}>Fotografie ({images.length})</Text>
        <Text style={[styles.blockHint, { color: theme.textSecondary }]}>Přidejte fotografie vozidla</Text>

        <View style={styles.rowButtons}>
          <TouchableOpacity style={styles.actionInline} onPress={() => openCamera('vehicle')}>
            <Ionicons name="camera" size={20} color={theme.accent} />
            <Text style={[styles.actionInlineText, { color: theme.accent }]}>Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionInline} onPress={() => openGallery('vehicle')}>
            <Ionicons name="images" size={20} color={theme.accent} />
            <Text style={[styles.actionInlineText, { color: theme.accent }]}>Galerie</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.massPickBtn, { backgroundColor: theme.accent }]}
          onPress={() => openGallery('vehicle', 20)}>
          <Ionicons name="albums" size={20} color="#FFFFFF" />
          <Text style={styles.massPickText}>Hromadný výběr fotek</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>max 20</Text></View>
        </TouchableOpacity>

        {images.length > 0 && (
          <FlatList
            data={images}
            renderItem={({ item, index }) => renderThumb(item, index, 'vehicle')}
            keyExtractor={(_, i) => `v-${i}`}
            scrollEnabled={false}
            contentContainerStyle={styles.photosList}
          />
        )}
      </View>

      {/* Defect photos */}
      <View style={[styles.blockCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
        <Text style={[styles.blockTitle, { color: theme.text }]}>Foto vady</Text>
        <Text style={[styles.blockDesc, { color: theme.textSecondary }]}>Zdokumentujte škrábance, promáčknutí, rez nebo jiné problémy</Text>

        <Text style={[styles.blockSubTitle, { color: theme.text }]}>Fotografie ({defectImages.length})</Text>
        <Text style={[styles.blockHint, { color: theme.textSecondary }]}>Přidejte fotografie vozidla</Text>

        <View style={styles.rowButtons}>
          <TouchableOpacity style={styles.actionInline} onPress={() => openCamera('defect')}>
            <Ionicons name="camera" size={20} color={theme.accent} />
            <Text style={[styles.actionInlineText, { color: theme.accent }]}>Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionInline} onPress={() => openGallery('defect')}>
            <Ionicons name="images" size={20} color={theme.accent} />
            <Text style={[styles.actionInlineText, { color: theme.accent }]}>Galerie</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.massPickBtn, { backgroundColor: theme.accent }]} onPress={() => openGallery('defect', 20)}>
          <Ionicons name="albums" size={20} color="#FFFFFF" />
          <Text style={styles.massPickText}>Hromadný výběr fotek</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>max 20</Text></View>
        </TouchableOpacity>

        {defectImages.length > 0 && (
          <FlatList
            data={defectImages}
            renderItem={({ item, index }) => renderThumb(item, index, 'defect')}
            keyExtractor={(_, i) => `d-${i}`}
            scrollEnabled={false}
            contentContainerStyle={styles.photosList}
          />
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderThumb = (uri: string, index: number, target: 'vehicle' | 'defect') => (
    <View style={styles.photoRow}>
      <TouchableOpacity style={styles.photoThumbnail} onPress={() => setSelectedImageIndex(index)}>
        <Image source={{ uri }} style={styles.photoImage} />
        <View style={styles.photoOverlay}>
          <Ionicons name="expand" size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.photoDeleteBtn, { backgroundColor: theme.accentLight, borderColor: theme.error }]}
        onPress={() => {
          Alert.alert('Smazat fotografii', 'Opravdu chcete smazat tuto fotografii?', [
            { text: 'Zrušit', style: 'cancel' },
            {
              text: 'Smazat',
              style: 'destructive',
              onPress: () => {
                if (target === 'vehicle') setImages(prev => prev.filter((_, i) => i !== index));
                else setDefectImages(prev => prev.filter((_, i) => i !== index));
              },
            },
          ]);
        }}
      >
        <Ionicons name="trash-outline" size={18} color={theme.error} />
        <Text style={[styles.photoDeleteBtnText, { color: theme.error }]}>Smazat</Text>
      </TouchableOpacity>
    </View>
  );

  const openCamera = (target: 'vehicle' | 'defect') => {
    setCameraTarget(target);
    setShowCamera(true);
  };

  const openGallery = async (target: 'vehicle' | 'defect', limit: number = 1) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      selectionLimit: limit,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newUris = result.assets.map(a => a.uri);
      if (target === 'vehicle') setImages(prev => [...prev, ...newUris]);
      else setDefectImages(prev => [...prev, ...newUris]);
    }
  };

  const handleAddPhoto = async () => openGallery('vehicle', 20);
  const handleCameraCapture = (uri: string) => {
    if (cameraTarget === 'vehicle') setImages(prev => [...prev, uri]);
    else setDefectImages(prev => [...prev, uri]);
    setShowCamera(false);
  };

  const handleImagesChange = (newImages: string[]) => {
    setImages(newImages);
  };
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textTertiary }]}>Načítání...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Upravit výkup</Text>
          <TouchableOpacity 
            style={[styles.headerSaveBtn, { backgroundColor: theme.accent }, loading && styles.headerBtnDisabled]} 
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.headerSaveText}>Uložit</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab Bar (chip style like new-purchase) */}
        <View style={[styles.tabChipsContainer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <ScrollView
            ref={tabsScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            {EDIT_TABS.map((tab) => {
              const isSelected = selectedTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.tabItem,
                    { backgroundColor: isSelected ? theme.accent : theme.inputBackground },
                  ]}
                  onPress={() => setSelectedTab(tab.key)}
                  onLayout={(e) => {
                    const { x, width } = e.nativeEvent.layout;
                    tabLayoutsRef.current[tab.key] = { x, width };
                  }}
                >
                  <Ionicons name={tab.icon} size={16} color={isSelected ? '#FFFFFF' : theme.textSecondary} />
                  <Text style={[styles.tabChipText, { color: isSelected ? '#FFFFFF' : theme.textSecondary }]}>
                    {tab.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab Content */}
        {selectedTab === 'zakladni' && renderZakladniTab()}
        {selectedTab === 'automobil' && renderAutomobilTab()}
        {selectedTab === 'stav-soucasti' && renderStavSoucastiTab()}
        {selectedTab === 'foto-vady' && renderFotoVadyTab()}
        {/* souhrn tab removed to match new-purchase */}

        {/* Camera Modal */}
        {showCamera && (
          <CameraCapture
            onCapture={handleCameraCapture}
            onClose={() => setShowCamera(false)}
          />
        )}

        <CounterAccountPicker
          visible={showCounterPicker}
          onClose={() => setShowCounterPicker(false)}
          onSelect={(car) => { setCounterCar(car); updateField('protiucet', true); }}
        />

        {/* Photo Gallery Modal */}
        {selectedImageIndex !== null && (
          <EditableImageGallery
            images={images}
            visible={true}
            initialIndex={selectedImageIndex}
            onClose={() => setSelectedImageIndex(null)}
            onImagesChange={handleImagesChange}
            isEditing={true}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerIconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerSaveBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FF3B30' },
  headerSaveText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  headerBtnDisabled: { opacity: 0.5 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  tabChipsContainer: { borderBottomWidth: 1, paddingVertical: 8 },
  tabScrollContent: { paddingHorizontal: 12, gap: 8 },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  tabChipText: { fontSize: 13, fontWeight: '600' },
  tabInner: { paddingHorizontal: 16 },
  vinBlock: { borderWidth: 1, borderRadius: 12, padding: 12, marginHorizontal: 0, marginTop: 8 },
  vinRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vinInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  vinBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, gap: 6 },
  vinBtnText: { color: '#FFFFFF', fontWeight: '600' },
  vinHelp: { fontSize: 12, marginTop: 8 },
  tabContent: { flex: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, paddingVertical: 8, marginTop: 20 },
  sectionDesc: { fontSize: 14, marginBottom: 16, marginTop: -8 },
  inputGroup: { paddingHorizontal: 0, paddingVertical: 12, borderBottomWidth: 1 },
  label: { fontSize: 14, fontWeight: 500 as any, marginBottom: 8 },
  input: { fontSize: 17, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 0, paddingVertical: 12, borderBottomWidth: 1 },
  toggleLabel: { fontSize: 17, fontWeight: '500' },
  // Component status styles
  componentCard: { padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, marginHorizontal: 16 },
  componentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  componentName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 4,
  },
  statusBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  componentNotes: { fontSize: 14, padding: 10, borderRadius: 8, borderWidth: 1, minHeight: 40, textAlignVertical: 'top' },
  gallerySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  photoThumbnail: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoDeleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoDeleteBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 8,
  },
  addPhotoBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  emptyPhotoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 12,
  },
  emptyPhotoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyPhotoDesc: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  blockCard: { borderWidth: 1, borderRadius: 12, padding: 16, marginHorizontal: 16, marginTop: 12 },
  blockTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  blockDesc: { fontSize: 14, marginBottom: 12 },
  blockSubTitle: { fontSize: 16, fontWeight: '600', marginTop: 8 },
  blockHint: { fontSize: 13, marginBottom: 12 },
  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  overviewText: { fontSize: 14 },
  rowButtons: { flexDirection: 'row', gap: 24, marginBottom: 12, paddingHorizontal: 16 },
  actionInline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionInlineText: { fontSize: 16, fontWeight: '600' },
  massPickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 12, marginHorizontal: 16, marginBottom: 12 },
  massPickText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  badge: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  photosList: { paddingTop: 8 },
});