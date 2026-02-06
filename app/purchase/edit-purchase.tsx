import CounterAccountPicker from '@/components/CounterAccountPicker';
import { DatePickerField } from '@/components/DatePickerField';
import { EditableImageGallery } from '@/components/EditableImageGallery';
import { PhoneInput } from '@/components/PhoneInput';
import { SelectionPicker } from '@/components/SelectionPicker';
import { SpzInput } from '@/components/SpzInput';
import { WheelPicker } from '@/components/WheelPicker';
import { ClientType, PurchaseState } from '@/constants/types';
import { VEHICLE_MAKES, VEHICLE_MODELS } from '@/constants/vehicleOptions';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { apiService } from '@/services/apiService';
import { Base44Car } from '@/services/base44Api';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const EDIT_TABS = [
  { key: 'zakladni', title: 'Základní', icon: 'book' as const },
  { key: 'automobil', title: 'Vozidlo', icon: 'car-sport' as const },
  { key: 'stav-soucasti', title: 'Stav součástí', icon: 'list' as const },
  { key: 'foto-vady', title: 'Foto', icon: 'camera' as const },
  // souhrn tab removed to match new-purchase
];

const STATES = ['NOVÝ', 'ROZJEDNÁNO', 'VYKOUPENO', 'ODMÍTNUTO'];
const BUYERS = ['Kuruc Daniel', 'Jan Novák', 'Petr Svoboda', 'Marie Dvořáková'];
const MOTOROVA_VARIANTA = ['---Výběr---', '1.0 TSI', '1.4 TFSI', '1.6 TDI', '2.0 TDI', '2.0 TFSI', '3.0 TDI'];
const PREVODOVKA = ['---Výběr---', 'Manuální', 'Automatická', 'CVT', 'DSG'];
const KAROSERIE = ['---Výběr---', 'Sedan', 'Hatchback', 'Kombi', 'SUV', 'Coupe', 'Cabrio'];
const POHON = ['---Výběr---', 'Přední', 'Zadní', '4x4', 'AWD'];
const PALIVO = ['---Výběr---', 'Benzín', 'Nafta', 'Hybrid', 'Elektro', 'LPG', 'CNG'];
const ODKUD_ZNA = ['---Výběr---', 'Billboardy', 'Doporučení', 'Internet', 'Jiné', 'Rádio', 'Reklama', 'Sociální sítě', 'Vrací se'];

const VEHICLE_COMPONENTS = [
  'Motor',
  'Převodovka/Spojka',
  'Podvozek/Odpružení',
  'Klimatizace',
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
  const { isSplitView, photoGridColumns } = useTabletLayout();
  const themeContext = useTheme();
  const theme = themeContext?.theme || {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    text: '#000000',
    textSecondary: '#666666',
    textTertiary: '#999999',
    accent: '#FF3B30',
    accentLight: '#FFE5E5',
    inputBackground: '#F2F2F7',
    border: '#E5E5E7',
    error: '#FF3B30',
  };
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
  const [images, setImages] = useState<string[]>([]);
  const [defectImages, setDefectImages] = useState<string[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showCounterPicker, setShowCounterPicker] = useState(false);
  const [counterCar, setCounterCar] = useState<Base44Car | null>(null);
  const [coverPhotoUri, setCoverPhotoUri] = useState<string | null>(null);
  // Refs to mimic new-purchase behavior
  const zakladniRef = useRef<ScrollView | null>(null);
  const automobilRef = useRef<ScrollView | null>(null);
  const stavSoucastiRef = useRef<ScrollView | null>(null);
  const fotoVadyRef = useRef<ScrollView | null>(null);
  // souhrnRef removed to match new-purchase
  const tabsScrollRef = useRef<ScrollView | null>(null);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});

  // Form state - všechna pole ze zadávání výkupu
  const [formData, setFormData] = useState({
    // Základní informace
    stav: 'ROZJEDNÁNO',
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
    prevodovka: '---Výběr---',
    pohon: '---Výběr---',
    barva: '',
    vin: '',
    stk: '',
    doProvozu: '',
    pocetVlastniku: '',
    pocetProvozovatelu: '',
    dovoz: false,
    prvniMajitel: false,
    servisniKnizka: false,
    bezpecnostniSrouby: false,
    kolaAI: false,
    vinProveren: false,
    protiucet: false,
    cebia: false,
    caVertical: false,
  });

  const [componentStatuses, setComponentStatuses] = useState<ComponentStatus[]>(
    VEHICLE_COMPONENTS.map(component => ({
      component,
      status: 'good' as const,
      notes: '',
    }))
  );

  const [generalNotes, setGeneralNotes] = useState('');
  const [serviceNotes, setServiceNotes] = useState('');

  // Validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
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
      [PurchaseState.IN_PROGRESS]: 'ROZJEDNÁNO',
      [PurchaseState.COMPLETED]: 'VYKOUPENO',
      [PurchaseState.CANCELLED]: 'ODMÍTNUTO',
    };

    setFormData({
      stav: stateMap[purchase.purchaseState] || 'ROZJEDNÁNO',
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
      motorovaVarianta: purchase.carDetails?.fuelType || '---Výběr---', // load from fuel_type
      km: purchase.carDetails?.mileage?.toString() || '',
      vykon: purchase.carDetails?.engineSize?.replace(' kW', '') || '',
      prevodovka: purchase.carDetails?.transmission || '---Výběr---',
      pohon: purchase.carDetails?.driveType || '---Výběr---',
      barva: purchase.carDetails?.color || '',
      vin: purchase.carDetails?.vin || '',
      stk: formatDate(purchase.carDetails?.stk || ''),
      doProvozu: formatDate(purchase.carDetails?.firstRegistration || ''),
      pocetVlastniku: purchase.carDetails?.pocetVlastniku?.toString() || '',
      pocetProvozovatelu: purchase.carDetails?.pocetProvozovatelu?.toString() || '',
      dovoz: purchase.carDetails?.isImport || false,
      prvniMajitel: purchase.carDetails?.isFirstOwner || false,
      servisniKnizka: purchase.carDetails?.hasServiceBook || false,
      bezpecnostniSrouby: purchase.carDetails?.hasSecurityScrews || false,
      kolaAI: purchase.carDetails?.hasAiWheels || false,
      vinProveren: purchase.vinVerified || false,
      protiucet: purchase.isCounterAccount || false,
      cebia: (purchase.carDetails as any)?.cebia || false,
      caVertical: (purchase.carDetails as any)?.caVertical || false,
    });

    // Load component statuses - filter out removed components
    const removedComponents = ['Brzdy', 'Odpružení', 'Baterie', 'Elektronika'];
    if (purchase.componentStatuses && purchase.componentStatuses.length > 0) {
      const filtered = purchase.componentStatuses.filter(cs => !removedComponents.includes(cs.component));
      setComponentStatuses(filtered.length > 0 ? filtered.map(cs => ({
        component: cs.component,
        status: cs.status,
        notes: cs.notes || '',
      })) : VEHICLE_COMPONENTS.map(component => ({
        component,
        status: 'good' as const,
        notes: '',
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
    if ((purchase as any).counterAccountCar) {
      setCounterCar({
        id: (purchase as any).counterAccountCar.id,
        make: (purchase as any).counterAccountCar.make,
        model: (purchase as any).counterAccountCar.model,
        variant: (purchase as any).counterAccountCar.variant,
        price: (purchase as any).counterAccountCar.price ?? undefined,
      });
    } else {
      setCounterCar(null);
    }

    // Load cover photo if available
    if ((purchase as any).coverPhotoUri) {
      setCoverPhotoUri((purchase as any).coverPhotoUri);
    } else {
      setCoverPhotoUri(null);
    }

    // Load general notes from notes field
    if ((purchase as any).notes) {
      setGeneralNotes((purchase as any).notes);
    } else {
      setGeneralNotes('');
    }

    // Load service notes from service_notes field in purchases table
    if ((purchase as any).serviceNotes) {
      setServiceNotes((purchase as any).serviceNotes);
    } else {
      setServiceNotes('');
    }

    setInitialLoading(false);
  }, [id, getPurchaseById]);

  // Center active chip and reset vertical scroll on tab change
  useEffect(() => {
    const refMap: Record<string, React.RefObject<ScrollView | null>> = {
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
    // Clear validation error on change
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
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

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.spz.trim()) {
      errors.spz = 'SPZ je povinné pole';
    }
    if (formData.firma) {
      if (!formData.nazevFirmy.trim()) {
        errors.nazevFirmy = 'Název firmy je povinný';
      }
    } else {
      if (!formData.jmeno.trim()) {
        errors.jmeno = 'Jméno je povinné';
      }
      if (!formData.prijmeni.trim()) {
        errors.prijmeni = 'Příjmení je povinné';
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Chyba', 'Prosím opravte chyby ve formuláři');
      return;
    }

    setLoading(true);
    try {
      // Rozděl fotky na existující (URL) a nové (lokální uri)
      const isRemote = (u: string) => {
        // Považujeme za vzdálené jen http/https a absolutní serverové cesty
        if (u.startsWith('http://') || u.startsWith('https://')) return true;
        if (u.startsWith('/')) return true; // server relative
        // blob:, file:, content: = lokální (nutno nahrát)
        return false;
      };
      
      // Handle cover photo upload first
      let uploadedCoverPhotoUrl: string | undefined = undefined;
      if (coverPhotoUri && !isRemote(coverPhotoUri)) {
        try {
          const res = await apiService.uploadPhotos(String(id), [coverPhotoUri]);
          if (res.files && res.files.length > 0) {
            uploadedCoverPhotoUrl = res.files[0];
            console.log('[EditPurchase] Cover photo uploaded:', uploadedCoverPhotoUrl);
          }
        } catch (e) {
          console.warn('[EditPurchase] Cover photo upload failed:', e);
        }
      }
      
      const vehicleExisting = images.filter(isRemote);
      const vehicleNew = images.filter((u) => !isRemote(u));
      const defectExisting = defectImages.filter(isRemote);
      const defectNew = defectImages.filter((u) => !isRemote(u));

      // Nahraj nové fotografie
      let uploadedVehicle: string[] = [];
      let uploadedDefects: string[] = [];
      console.log('[EditPurchase] vehicleNew:', vehicleNew.length, 'defectNew:', defectNew.length);
      if (vehicleNew.length > 0) {
        try {
          const res = await apiService.uploadPhotos(String(id), vehicleNew);
          console.log('[EditPurchase] Vehicle upload result:', res);
          uploadedVehicle = res.files || [];
        } catch (e) {
          console.error('[EditPurchase] Upload vehicle images failed:', e);
        }
      }
      if (defectNew.length > 0) {
        try {
          const res = await apiService.uploadDefectPhotos(String(id), defectNew);
          console.log('[EditPurchase] Defect upload result:', res);
          uploadedDefects = res.files || [];
        } catch (e) {
          console.error('[EditPurchase] Upload defect images failed:', e);
        }
      }

      const mergedVehicleImages = [...vehicleExisting, ...uploadedVehicle];
      const mergedDefectImages = [...defectExisting, ...uploadedDefects];
      const finalCoverPhotoUri = uploadedCoverPhotoUrl || (isRemote(coverPhotoUri || '') ? coverPhotoUri : undefined);
      
      // Extract time from datumProhlidky for inspectionTime
      // IMPORTANT: Only update inspectionTime if a new time was provided
      // Otherwise preserve the existing time from DB to avoid clearing it
      const extractTime = (dateTimeStr: string): string | undefined => {
        if (!dateTimeStr) return undefined;
        const timeMatch = dateTimeStr.match(/(\d{1,2}:\d{2})/);
        return timeMatch ? timeMatch[1] : undefined;
      };

      const newInspectionTime = extractTime(formData.datumProhlidky);
      const purchase = getPurchaseById(id);
      // Only set inspectionTime if we have a new time, otherwise keep existing
      const inspectionTime = newInspectionTime !== undefined ? newInspectionTime : purchase?.inspectionTime;

      const stateMap: Record<string, PurchaseState> = {
        'Nový': PurchaseState.NEW,
        'ROZJEDNÁNO': PurchaseState.IN_PROGRESS,
        'VYKOUPENO': PurchaseState.COMPLETED,
        'ODMÍTNUTO': PurchaseState.CANCELLED,
      };

      const clientName = formData.firma 
        ? formData.nazevFirmy 
        : `${formData.jmeno} ${formData.prijmeni}`.trim();

      let carYear = new Date().getFullYear();
      if (formData.doProvozu) {
        const match = formData.doProvozu.match(/(\d{4})/);
        if (match) carYear = parseInt(match[1]);
      }

      const updatePayload: any = {
        clientName: clientName || 'Neznámý klient',
        clientType: formData.firma ? ClientType.COMPANY : ClientType.PERSONAL,
        purchaseState: stateMap[formData.stav] || PurchaseState.IN_PROGRESS,
        spz: formData.spz,
        purchaseDate: formData.datumVykupu || undefined,
        // IMPORTANT: Only include inspectionDate/inspectionTime if they have actually changed
        // This prevents clearing them during partial updates of other fields
        customerPrice: formData.cenaZakaznik ? parseInt(formData.cenaZakaznik) : undefined,
        offeredPrice: formData.cenaNabidnuta ? parseInt(formData.cenaNabidnuta) : undefined,
        // Souhrn fields removed to match new-purchase
        isVatPayer: formData.platceDPH,
        isCounterAccount: formData.protiucet,
        vinVerified: formData.vinProveren,
        sourceKnowledge: formData.odkudZna !== '---Výběr---' ? formData.odkudZna : undefined,
        phone: formData.telefon || undefined,
        street: formData.ulice || undefined,
        city: formData.mesto || undefined,
        postalCode: formData.psc || undefined,
        notes: generalNotes || undefined,
        serviceNotes: serviceNotes || undefined,
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
          engineSize: formData.vykon ? `${formData.vykon} kW` : undefined,
          // Map Motorová varianta -> fuel_type (DB)
          fuelType: formData.motorovaVarianta !== '---Výběr---' ? formData.motorovaVarianta : undefined,
          transmission: formData.prevodovka !== '---Výběr---' ? formData.prevodovka : undefined,
          driveType: formData.pohon !== '---Výběr---' ? formData.pohon : undefined,
          stk: formData.stk || undefined,
          firstRegistration: formData.doProvozu || undefined,
          pocetVlastniku: formData.pocetVlastniku ? parseInt(formData.pocetVlastniku) : undefined,
          pocetProvozovatelu: formData.pocetProvozovatelu ? parseInt(formData.pocetProvozovatelu) : undefined,
          isImport: formData.dovoz,
          isFirstOwner: formData.prvniMajitel,
          hasServiceBook: formData.servisniKnizka,
          hasSecurityScrews: formData.bezpecnostniSrouby,
          hasAiWheels: formData.kolaAI,
          cebia: formData.cebia,
          caVertical: formData.caVertical,
          condition: 'USED' as any,
        },
        componentStatuses: componentStatuses.length > 0 ? componentStatuses : undefined,
      };

      // Only include inspection date/time if they were actually changed/provided
      if (formData.datumProhlidky) {
        updatePayload.inspectionDate = formData.datumProhlidky;
        if (inspectionTime !== undefined) {
          updatePayload.inspectionTime = inspectionTime;
        }
      }

      updatePurchase(id, updatePayload);

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
        style={[
          styles.input, 
          { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text },
          validationErrors[field] ? { borderColor: '#FF3B30' } : null
        ]}
        value={String(formData[field as keyof typeof formData] || '')}
        onChangeText={(text) => updateField(field, text)}
        placeholder={options?.placeholder}
        placeholderTextColor={theme.textTertiary}
        keyboardType={options?.keyboardType || 'default'}
        returnKeyType="done"
      />
      {validationErrors[field] && (
        <Text style={{ color: '#FF3B30', marginTop: 4, fontSize: 12 }}>{validationErrors[field]}</Text>
      )}
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
      {/* Cover Photo Section */}
      <View style={[styles.coverPhotoSection, { backgroundColor: theme.card }]}>
        <Text style={[styles.coverPhotoTitle, { color: theme.text }]}>Úvodní fotka vozidla</Text>
        <Text style={[styles.coverPhotoDesc, { color: theme.textSecondary }]}>Vyfotit fotku vozidla pro náhled v seznamu výkupů</Text>

        {!coverPhotoUri ? (
          <View style={styles.coverPhotoButtons}>
            <TouchableOpacity 
              style={[styles.coverPhotoBtnPrimary, { backgroundColor: theme.accent }]}
              onPress={async () => {
                try {
                  const result = await ImagePicker.launchCameraAsync({
                    allowsEditing: true,
                    aspect: [16, 9],
                    quality: 0.8,
                  });
                  if (!result.canceled && result.assets && result.assets.length > 0) {
                    setCoverPhotoUri(result.assets[0].uri);
                  }
                } catch (e) {
                  console.error('Camera error:', e);
                }
              }}
            >
              <Ionicons name="camera" size={20} color="#FFFFFF" />
              <Text style={styles.coverPhotoBtnText}>Vyfotit z kamery</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.coverPhotoBtnSecondary, { borderColor: theme.accent }]}
              onPress={async () => {
                try {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [16, 9],
                    quality: 0.8,
                  });
                  if (!result.canceled && result.assets && result.assets.length > 0) {
                    setCoverPhotoUri(result.assets[0].uri);
                  }
                } catch (e) {
                  console.error('Gallery error:', e);
                }
              }}
            >
              <Ionicons name="images" size={20} color={theme.accent} />
              <Text style={[styles.coverPhotoBtnTextSecondary, { color: theme.accent }]}>Vybrat z galerie</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Image 
              source={{ uri: coverPhotoUri }} 
              style={{ width: '100%', height: 200, borderRadius: 8, backgroundColor: theme.inputBackground }}
            />
            <TouchableOpacity 
              style={[styles.removePhotoBtn, { backgroundColor: theme.error }]}
              onPress={() => setCoverPhotoUri(null)}
            >
              <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
              <Text style={styles.removePhotoBtnText}>Odebrat</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Základní informace</Text>

      {/* Výkupčí - read-only display */}
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.text }]}>Výkupčí</Text>
        <View style={[styles.readOnlyField, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
          <Text style={[styles.readOnlyText, { color: theme.text }]}>{formData.vykupci}</Text>
        </View>
      </View>

      <DatePickerField
        label="Datum prohlídky"
        value={formData.datumProhlidky}
        onChange={(val) => updateField('datumProhlidky', formatDate(val))}
        placeholder="dd.mm.yyyy hh:mm"
        includeTime={true}
      />

      {renderInput('Cena zákazník', 'cenaZakaznik', { placeholder: '0', keyboardType: 'numeric' })}
      {renderInput('Cena nabídnuta', 'cenaNabidnuta', { placeholder: '0', keyboardType: 'numeric' })}

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

      {/* Ulice, Město, PSČ - pouze pro firmy */}
      {formData.firma && (
        <>
          {renderInput('Ulice', 'ulice', { placeholder: 'Zadejte ulici...' })}
          {renderInput('Město', 'mesto', { placeholder: 'Zadejte město...' })}
          {renderInput('PSČ', 'psc', { placeholder: 'Zadejte PSČ...' })}
        </>
      )}

      <SelectionPicker
        label="Odkud zná"
        value={formData.odkudZna}
        options={ODKUD_ZNA}
        onSelect={(val) => updateField('odkudZna', val)}
        placeholder="---Výběr---"
      />

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
      {validationErrors.spz && (
        <Text style={{ color: '#FF3B30', marginTop: 4, fontSize: 12, paddingHorizontal: 16 }}>{validationErrors.spz}</Text>
      )}

      <WheelPicker
        label="Motorová varianta"
        value={formData.motorovaVarianta}
        options={MOTOROVA_VARIANTA}
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
        label="Převodovka/Spojka"
        value={formData.prevodovka}
        options={PREVODOVKA}
        onSelect={(val) => updateField('prevodovka', val)}
        placeholder="---Výběr---"
      />

      <SelectionPicker
        label="Pohon"
        value={formData.pohon}
        options={POHON}
        onSelect={(val) => updateField('pohon', val)}
        placeholder="---Výběr---"
      />

      <DatePickerField
        label="Do provozu"
        value={formData.doProvozu}
        onChange={(val) => updateField('doProvozu', formatDate(val))}
        placeholder="dd.mm.yyyy"
      />

      {renderInput('Počet vlastníků', 'pocetVlastniku', { placeholder: '', keyboardType: 'numeric' })}
      {renderInput('Počet provozovatelů', 'pocetProvozovatelu', { placeholder: '', keyboardType: 'numeric' })}

      {renderToggle('Dovoz', 'dovoz')}
      {renderToggle('První majitel', 'prvniMajitel')}
      {renderToggle('Servisní knížka', 'servisniKnizka')}

      {renderToggle('Protiúčet', 'protiucet')}

      <Text style={[styles.vinSectionTitle, { color: theme.text }]}>VIN prověřeno</Text>
      {renderToggle('Cebia', 'cebia')}
      {renderToggle('CaVertical', 'caVertical')}

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

      {/* General Notes Section */}
      <View style={[styles.blockCard, { backgroundColor: theme.card, borderColor: theme.border, marginHorizontal: 16, marginTop: 16 }]}>
        <Text style={[styles.blockTitle, { color: theme.text }]}>Obecná poznámka</Text>
        <Text style={[styles.blockDesc, { color: theme.textSecondary }]}>Poznámky k celkovému stavu vozidla</Text>
        <TextInput
          style={[styles.componentNotes, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text, minHeight: 100 }]}
          value={generalNotes}
          onChangeText={setGeneralNotes}
          placeholder="Zadejte poznámky..."
          placeholderTextColor={theme.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Service Notes Section */}
      <View style={[styles.blockCard, { backgroundColor: theme.card, borderColor: theme.border, marginHorizontal: 16, marginTop: 16 }]}>
        <Text style={[styles.blockTitle, { color: theme.text }]}>Servisní poznámka</Text>
        <Text style={[styles.blockDesc, { color: theme.textSecondary }]}>Poznámky k servisní historii vozidla</Text>
        <TextInput
          style={[styles.componentNotes, { backgroundColor: theme.inputBackground, borderColor: theme.border, color: theme.text, minHeight: 100 }]}
          value={serviceNotes}
          onChangeText={setServiceNotes}
          placeholder="Zadejte servisní poznámky..."
          placeholderTextColor={theme.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderFotoVadyTab = () => (
    <ScrollView ref={fotoVadyRef} style={[styles.tabContent, { backgroundColor: theme.background }]} contentContainerStyle={styles.tabInner} showsVerticalScrollIndicator={false}>
      {/* Foto vozidla section */}
      <View style={[styles.fotoSection, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>FOTO VOZIDLA</Text>
        <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
          Zachyťte exteriér, interiér a všechny detaily vozidla
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.photoButton, { borderColor: theme.accent }]} 
            onPress={() => openCamera('vehicle')}
          >
            <Ionicons name="camera" size={20} color={theme.accent} />
            <Text style={[styles.photoButtonText, { color: theme.accent }]}>Vyfotit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.photoButton, { borderColor: theme.accent }]} 
            onPress={() => openGallery('vehicle', 20)}
          >
            <Ionicons name="images" size={20} color={theme.accent} />
            <Text style={[styles.photoButtonText, { color: theme.accent }]}>Vybrat</Text>
          </TouchableOpacity>
        </View>
        {images.length > 0 && (
          <View style={[styles.thumbGrid, { columnCount: photoGridColumns }]}>
            {images.map((u, i) => renderThumb(u, i, 'vehicle'))}
          </View>
        )}
      </View>

      {/* Foto vady section */}
      <View style={[styles.fotoSection, { backgroundColor: theme.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>FOTO VADY</Text>
        <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
          Zdokumentujte škrábance, promáčknutí, rez nebo jiné problémy
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.photoButton, { borderColor: theme.error }]} 
            onPress={() => openCamera('defect')}
          >
            <Ionicons name="camera" size={20} color={theme.error} />
            <Text style={[styles.photoButtonText, { color: theme.error }]}>Vyfotit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.photoButton, { borderColor: theme.error }]} 
            onPress={() => openGallery('defect', 20)}
          >
            <Ionicons name="images" size={20} color={theme.error} />
            <Text style={[styles.photoButtonText, { color: theme.error }]}>Vybrat</Text>
          </TouchableOpacity>
        </View>
        {defectImages.length > 0 && (
          <View style={[styles.thumbGrid, { columnCount: photoGridColumns }]}>
            {defectImages.map((u, i) => renderThumb(u, i, 'defect'))}
          </View>
        )}
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );

  const renderThumb = (uri: string, index: number, target: 'vehicle' | 'defect') => (
    <View style={[styles.thumbItem, { width: `${100 / photoGridColumns}%` }]}>
      <TouchableOpacity style={styles.thumbImage} onPress={() => setSelectedImageIndex(index)}>
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
        <TouchableOpacity 
          style={styles.removeBtn} 
          onPress={() => {
            if (target === 'vehicle') setImages(prev => prev.filter((_, i) => i !== index));
            else setDefectImages(prev => prev.filter((_, i) => i !== index));
          }}
        >
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );

  const openCamera = async (target: 'vehicle' | 'defect') => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        if (target === 'vehicle') {
          setImages(prev => [...prev, result.assets[0].uri]);
        } else {
          setDefectImages(prev => [...prev, result.assets[0].uri]);
        }
      }
    } catch (e) {
      console.error('[EditPurchase] Camera error:', e);
    }
  };

  const openGallery = async (target: 'vehicle' | 'defect', limit: number = 20) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: limit,
        quality: 0.85,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map(a => a.uri);
        console.log(`[EditPurchase] Got ${uris.length} images from picker`);

        if (target === 'vehicle') {
          setImages(prev => [...prev, ...uris]);
        } else {
          setDefectImages(prev => [...prev, ...uris]);
        }
      }
    } catch (error) {
      console.error('[EditPurchase] Gallery error:', error);
    }
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

        {/* Tablet Split-view or Phone stacked layout */}
        <View style={[isSplitView ? styles.splitContainer : styles.stackedContainer]}>
          {/* Left Sidebar - Vertical Tabs (ONLY on tablet) */}
          {isSplitView && (
            <View style={[styles.sidebarTabs, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
              {EDIT_TABS.map((tab) => {
                const isSelected = selectedTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.sidebarTabItem,
                      { backgroundColor: isSelected ? theme.accent : 'transparent' }
                    ]}
                    onPress={() => setSelectedTab(tab.key)}
                  >
                    <Ionicons 
                      name={tab.icon} 
                      size={22} 
                      color={isSelected ? "#FFFFFF" : theme.textSecondary} 
                    />
                    <Text style={[
                      styles.sidebarTabText,
                      { color: isSelected ? "#FFFFFF" : theme.textSecondary }
                    ]}>
                      {tab.title}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Right Content - Phone horizontal tabs OR Tablet full content */}
          <View style={{ flex: 1 }}>
            {/* Tab Bar (chip style like new-purchase) - ONLY on phone */}
            {!isSplitView && (
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
            )}

            {/* Tab Content */}
            {selectedTab === 'zakladni' && renderZakladniTab()}
            {selectedTab === 'automobil' && renderAutomobilTab()}
            {selectedTab === 'stav-soucasti' && renderStavSoucastiTab()}
            {selectedTab === 'foto-vady' && renderFotoVadyTab()}
            {/* souhrn tab removed to match new-purchase */}
          </View>
        </View>
      </KeyboardAvoidingView>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 16 },
  splitContainer: { flex: 1, flexDirection: 'row' },
  stackedContainer: { flex: 1, flexDirection: 'column' },
  sidebarTabs: { width: 280, borderRightWidth: 1, paddingTop: 12, paddingBottom: 12 },
  sidebarTabItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, marginHorizontal: 8, marginVertical: 4, borderRadius: 12 },
  sidebarTabText: { fontSize: 15, fontWeight: '500' },
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
  vinSectionTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 0, paddingVertical: 12, marginTop: 4, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#E5E5E7' },
  inputGroup: { paddingHorizontal: 0, paddingVertical: 12, borderBottomWidth: 1 },
  label: { fontSize: 14, fontWeight: 500 as any, marginBottom: 8 },
  input: { fontSize: 17, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  readOnlyField: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 },
  readOnlyText: { fontSize: 17 },
  dateTimeRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  timeInput: { width: 80, fontSize: 17, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  timeButton: { width: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  timeButtonText: { fontSize: 16, fontWeight: '600' },
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
  rowButtons: { flexDirection: 'row', gap: 16, alignItems: 'center', marginBottom: 12 },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  photoButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8, borderWidth: 2 },
  photoButtonText: { fontSize: 15, fontWeight: '600' },
  actionInline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionInlineText: { fontSize: 16, fontWeight: '600' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  massPickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 12, marginHorizontal: 16, marginBottom: 12 },
  massPickText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  badge: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  photosList: { paddingTop: 8 },
  fotoSection: { backgroundColor: '#FFFFFF', marginVertical: 8, marginHorizontal: 16, borderRadius: 8, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 },
  sectionDescription: { fontSize: 14, color: '#8E8E93', marginBottom: 16, lineHeight: 20 },
  thumbGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumbItem: { aspectRatio: 1, borderRadius: 8, overflow: 'hidden', position: 'relative', paddingHorizontal: 4 },
  thumbImage: { width: '100%', height: '100%', position: 'relative' },
  removeBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, padding: 4 },
  coverPhotoSection: { marginVertical: 8, marginHorizontal: 16, borderRadius: 8, padding: 16 },
  coverPhotoTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  coverPhotoDesc: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  coverPhotoButtons: { gap: 12 },
  coverPhotoBtnPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8 },
  coverPhotoBtnSecondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8, borderWidth: 2 },
  coverPhotoBtnText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  coverPhotoBtnTextSecondary: { fontSize: 15, fontWeight: '600' },
  removePhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8 },
  removePhotoBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});