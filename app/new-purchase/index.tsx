// @ts-nocheck
import { ConfirmDialog } from '@/components/ConfirmDialog';
import CounterAccountPicker from '@/components/CounterAccountPicker';
import { DatePickerField } from '@/components/DatePickerField';
import { PhoneInput } from '@/components/PhoneInput';
import { SelectionPicker } from '@/components/SelectionPicker';
import { SpzInput } from '@/components/SpzInput';
import { WheelPicker } from '@/components/WheelPicker';
import {
  VEHICLE_MAKES,
  VEHICLE_MODELS,
} from '@/constants/vehicleOptions';
import { useAuth } from '@/contexts/AuthContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { apiService as apiServiceUntyped } from '@/services/apiService';
import {
  fetchCompanyByIco,
  validateIco
} from '@/services/aresApi';
import { Base44Car } from '@/services/base44Api';
import {
  fetchVehicleDataByVin,
  hasApiKey,
  validateVin
} from '@/services/vehicleDataApi';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const apiService = apiServiceUntyped as any;

const PURCHASE_TABS = [
  { 
    key: 'zakladni', 
    title: 'Základní', 
    icon: 'book' as const
  },
  { 
    key: 'automobil', 
    title: 'Vozidlo', 
    icon: 'car-sport' as const
  },
  { 
    key: 'stav-soucasti', 
    title: 'Stav součástí', 
    icon: 'list' as const
  },
  { 
    key: 'foto-vady', 
    title: 'Foto', 
    icon: 'camera' as const
  },
];

// Removed STATES array as 'Stav' field is removed from form
const BUYERS = ['Kuruc Daniel', 'Jan Novák', 'Petr Svoboda', 'Marie Dvořáková'];
const MOTOROVA_VARIANTA = ['---Výběr---', '1.0 TSI', '1.4 TFSI', '1.6 TDI', '2.0 TDI', '2.0 TFSI', '3.0 TDI'];
const PREVODOVKA = ['---Výběr---', 'Automatická', 'Manuální'];
const POHON = ['---Výběr---', 'Přední', 'Zadní', '4x4'];
const ODKUD_ZNA = ['---Výběr---', 'Billboardy', 'Doporučení', 'Internet', 'Jiné', 'Rádio', 'Reklama', 'Sociální sítě', 'Vrací se'];

// Helper functions for mapping API values to our dropdowns
const normalizeZnacka = (apiZnacka: string): string => {
  if (!apiZnacka) return '---Výběr---';

  // Normalize to title case and find match
  const normalized = apiZnacka.trim();

  // Direct mapping for common variations
  const brandMap: Record<string, string> = {
    'MERCEDES-BENZ': 'Mercedes-Benz',
    'MERCEDES BENZ': 'Mercedes-Benz',
    'MERCEDES': 'Mercedes-Benz',
    'BMW': 'BMW',
    'AUDI': 'Audi',
    'VOLKSWAGEN': 'Volkswagen',
    'VW': 'Volkswagen',
    'FORD': 'Ford',
    'TOYOTA': 'Toyota',
    'HONDA': 'Honda',
    'NISSAN': 'Nissan',
    'HYUNDAI': 'Hyundai',
    'KIA': 'Kia',
    'MAZDA': 'Mazda',
    'SUZUKI': 'Suzuki',
    'PEUGEOT': 'Peugeot',
    'RENAULT': 'Renault',
    'CITROEN': 'Citroen',
    'CITROËN': 'Citroen',
    'FIAT': 'Fiat',
    'ALFA ROMEO': 'Alfa Romeo',
    'VOLVO': 'Volvo',
    'PORSCHE': 'Porsche',
    'JAGUAR': 'Jaguar',
    'LAND ROVER': 'Land Rover',
    'LEXUS': 'Lexus',
    'TESLA': 'Tesla',
    'SKODA': 'Škoda',
    'ŠKODA': 'Škoda',
    'SEAT': 'Seat',
    'OPEL': 'Opel',
    'DACIA': 'Dacia',
    'MINI': 'Mini',
    'JEEP': 'Jeep',
    'CHEVROLET': 'Chevrolet',
    'MITSUBISHI': 'Mitsubishi',
    'SUBARU': 'Subaru',
  };

  // Try exact match first (uppercase)
  const upperNormalized = normalized.toUpperCase();
  if (brandMap[upperNormalized]) {
    return brandMap[upperNormalized];
  }

  // Try to find in VEHICLE_MAKES (case-insensitive)
  const found = VEHICLE_MAKES.find(make => 
    make.toLowerCase() === normalized.toLowerCase()
  );
  if (found) return found;

  // Return original with title case as fallback
  return normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase();
};

const findMatchingModel = (znacka: string, apiModel: string): string => {
  if (!apiModel || !znacka || znacka === '---Výběr---') return '---Výběr---';

  const models = VEHICLE_MODELS[znacka] || [];
  if (models.length === 0) return '---Výběr---';

  const normalizedApiModel = apiModel.toUpperCase().trim();

  // Try exact match
  const exactMatch = models.find(m => m.toUpperCase() === normalizedApiModel);
  if (exactMatch) return exactMatch;

  // Try partial match (API model contains our model name)
  const partialMatch = models.find(m => 
    normalizedApiModel.includes(m.toUpperCase()) || 
    m.toUpperCase().includes(normalizedApiModel)
  );
  if (partialMatch) return partialMatch;

  // Try matching first word/number
  const apiFirstPart = normalizedApiModel.split(/[\s-]/)[0];
  const firstPartMatch = models.find(m => 
    m.toUpperCase().startsWith(apiFirstPart) ||
    apiFirstPart.includes(m.toUpperCase().replace(/[^A-Z0-9]/g, ''))
  );
  if (firstPartMatch) return firstPartMatch;

  return '---Výběr---';
};

const mapFuelToWheelPicker = (apiFuel: string, objemMotoru?: number): string => {
  if (!apiFuel) return '---Výběr---';

  // Map fuel type to our WheelPicker format: "objem palivo"
  const fuelMap: Record<string, string> = {
    'Benzín': 'Benzín',
    'Nafta': 'Diesel',
    'Diesel': 'Diesel',
    'LPG': 'LPG',
    'CNG': 'CNG',
    'Elektro': 'Elektro',
    'Hybrid': 'Hybrid',
    'Plug-in Hybrid': 'Hybrid',
  };

  const normalizedFuel = fuelMap[apiFuel] || 'Benzín';

  // Calculate engine size in liters
  let engineSize = '1.5';
  if (objemMotoru) {
    // API returns volume in cm³, convert to liters
    const liters = objemMotoru / 1000;
    // Round to nearest 0.1
    engineSize = liters.toFixed(1);
  }

  return `${engineSize} ${normalizedFuel}`;
};

const mapKaroserie = (apiKaroserie: string): string => {
  if (!apiKaroserie) return '---Výběr---';

  const normalized = apiKaroserie.toUpperCase().trim();

  // Map API karoserie values to our options
  const karoserieMap: Record<string, string> = {
    'SEDAN': 'Sedan',
    'HATCHBACK': 'Hatchback',
    'KOMBI': 'Kombi',
    'SUV': 'SUV',
    'COUPE': 'Coupe',
    'COUPÉ': 'Coupe',
    'KUPÉ': 'Coupe',
    'KUPE': 'Coupe',
    'CABRIO': 'Cabrio',
    'CABRIOLET': 'Cabrio',
    'KABRIOLET': 'Cabrio',
    'MPV': 'SUV', // Map MPV to SUV as closest match
    'LIFTBACK': 'Hatchback',
    'FASTBACK': 'Hatchback',
    'STATION WAGON': 'Kombi',
    'ESTATE': 'Kombi',
    'CROSSOVER': 'SUV',
    'PICKUP': 'SUV',
    'TERÉNNÍ': 'SUV',
    'TERENNI': 'SUV',
  };

  // Try exact match
  if (karoserieMap[normalized]) {
    return karoserieMap[normalized];
  }

  // Try partial match - check if any key is contained in the API value
  for (const [key, value] of Object.entries(karoserieMap)) {
    if (normalized.includes(key)) {
      return value;
    }
  }

  return '---Výběr---';
};

const mapPrevodovka = (apiPrevodovka: string): string => {
  if (!apiPrevodovka) return '---Výběr---';

  const normalized = apiPrevodovka.toUpperCase().trim();

  if (normalized.includes('AUTO') || normalized.includes('DSG') || 
      normalized.includes('CVT') || normalized.includes('TIPTRONIC')) {
    return 'Automatická';
  }
  if (normalized.includes('MANU')) {
    return 'Manuální';
  }

  return '---Výběr---';
};

const mapPohon = (apiPohon: string): string => {
  if (!apiPohon) return '---Výběr---';

  const normalized = apiPohon.toUpperCase().trim();

  if (normalized.includes('4X4') || normalized.includes('AWD') || 
      normalized.includes('4WD') || normalized.includes('QUATTRO') ||
      normalized.includes('XDRIVE') || normalized.includes('4MATIC')) {
    return '4x4';
  }
  if (normalized.includes('ZADN') || normalized.includes('REAR') || normalized.includes('RWD')) {
    return 'Zadní';
  }
  if (normalized.includes('PŘEDN') || normalized.includes('FRONT') || normalized.includes('FWD')) {
    return 'Přední';
  }

  return '---Výběr---';
};
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

const DRAFT_STORAGE_KEY = 'new_purchase_draft';

// Helper functions to save/load draft
const saveDraftData = async (data: any) => {
  try {
    await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
  }
};

const loadDraftData = async () => {
  try {
    const saved = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
  }
  return null;
};

const clearDraftData = async () => {
  try {
    await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (error) {
  }
};

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

// Helper function declared outside component to avoid type issues
const uploadPurchaseInBackgroundHelper = async (
  pendingId: string,
  payload: any,
  vehicleImages: string[],
  defectImages: string[],
  interiorImages: string[],
  coverPhotoUri: string | null | undefined,
  apiService: any,
  updatePurchaseProgress: any,
  markUploadSuccess: any,
  markUploadError: any,
  updatePurchase: any
): Promise<void> => {
  try {

    // 1️⃣ CREATE PURCHASE ON API
    const createResult = await apiService.createPurchase(payload);

    const serverId = String(createResult?.id || createResult?.data?.id);
    if (!serverId || serverId === 'null') {
      throw new Error('API vrátilo neplatné ID: ' + JSON.stringify(createResult));
    }


    // WAIT FOR DB COMMIT - Small delay to ensure createPurchase transaction is fully committed
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2️⃣ UPLOAD COVER PHOTO FIRST if exists
    let uploadedCoverUri: string | undefined;
    if (coverPhotoUri) {
      try {
        const coverResult = await apiService.uploadPhotos(serverId, [coverPhotoUri]);
        if (coverResult?.files && coverResult.files.length > 0) {
          uploadedCoverUri = coverResult.files[0];
        }
      } catch (e) {
      }
    }

    // 3️⃣ UPLOAD VEHICLE PHOTOS
    if (vehicleImages.length > 0) {
      try {
        const vehResult = await apiService.uploadPhotos(serverId, vehicleImages);
        updatePurchaseProgress(pendingId, 50);
      } catch (e) {
      }
    }

    // 4️⃣ UPLOAD DEFECT PHOTOS
    if (defectImages.length > 0) {
      try {
        const defResult = await apiService.uploadDefectPhotos(serverId, defectImages);
        updatePurchaseProgress(pendingId, 75);
      } catch (e) {
      }
    }

    // 5️⃣ UPDATE COVER PHOTO URI IN DB (if was uploaded)
    if (uploadedCoverUri) {
      try {
        // Only update coverPhotoUri field - don't touch other fields!
        const coverUpdatePayload = { coverPhotoUri: uploadedCoverUri };
        await apiService.updatePurchase(serverId, coverUpdatePayload);
      } catch (e) {
      }
    }

    // 6️⃣ RELOAD & UPDATE CONTEXT with latest data from DB
    const savedPurchase = await apiService.getPurchaseById(serverId);
    if (savedPurchase.carDetails) {
    }

    // 7️⃣ UPDATE CONTEXT so UI shows latest data
    if (savedPurchase) {
      // savedPurchase je ALREADY transformován z getPurchaseById
      // Jen updatuj všechna pole aby si UI sebralo latest data
      updatePurchase(serverId, savedPurchase);
    }

    markUploadSuccess(pendingId);
  } catch (error: any) {
    markUploadError(pendingId, error?.message || 'Chyba při nahrávání');
  }
};

export default function NewPurchaseScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { isTablet, isSplitView } = useTabletLayout();
  const { initData, clearInitData } = usePurchases();
  const [selectedTab, setSelectedTab] = useState('zakladni');
  // Refs for vertical scroll reset per tab
  const zakladniRef = useRef<ScrollView>(null);
  const automobilRef = useRef<ScrollView>(null);
  const stavSoucastiRef = useRef<ScrollView>(null);
  const fotoVadyRef = useRef<ScrollView>(null);
  // Ref and layout cache to center active tab in header
  const tabsScrollRef = useRef<ScrollView>(null);
  const tabLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});

  // ConfirmDialog state for save confirmation
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmOnConfirm, setConfirmOnConfirm] = useState<() => void>(() => {});
  const [confirmCancelText, setConfirmCancelText] = useState('Zrušit');
  const [confirmConfirmText, setConfirmConfirmText] = useState('Uložit');

  // Added state for close confirmation dialog visibility
  const [closeConfirmVisible, setCloseConfirmVisible] = useState(false);

  // Counter-account selection
  const [showCounterPicker, setShowCounterPicker] = useState(false);
  const [counterCar, setCounterCar] = useState<Base44Car | null>(null);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  // Validation state for zakladniData fields
  const [zakladniValidation, setZakladniValidation] = useState({
    nazevFirmy: false,
    jmeno: false,
    prijmeni: false,
    spz: false,
  });
  // Helper to format today's date as dd.mm.yyyy hh:mm
  const formatToday = () => {
    const d = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const date = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return `${date} ${time}`;
  };
  // Form data for all tabs
  const [zakladniData, setZakladniData] = useState({
    // Removed 'vykupci' field from state as per update instructions
    datumProhlidky: formatToday(),
    cenaZakaznik: '',
    cenaNabidnuta: '',
    firma: false,
    platceDPH: false,
    jmeno: '',
    prijmeni: '',
    nazevFirmy: '',
    telefon: '',
    ico: '',
    ulice: '',
    mesto: '',
    psc: '',
  });

  const [automobilData, setAutomobilData] = useState({
    znacka: '---Výběr---',
    model: '---Výběr---',
    spz: '',
    motorovaVarianta: '---Výběr---',
    km: '',
    stk: '',
    vykon: '',
    prevodovka: '---Výběr---',
    pohon: '---Výběr---',
    doProvozu: '',
    pocetVlastniku: '',
    pocetProvozovatelu: '',
    dovoz: false,
    prvniMajitel: false,
    servisniKnizka: false,
    cebia: false,
    caVertical: false,
    protiucet: false,
  });

  const [stavSoucastiData, setStavSoucastiData] = useState<ComponentStatus[]>(
    VEHICLE_COMPONENTS.map(component => ({
      component,
      status: 'good' as const,
      notes: '',
    }))
  );

  // Photo states
  const [coverPhotoUri, setCoverPhotoUri] = useState<string | null>(null);
  const [vehicleImages, setVehicleImages] = useState<string[]>([]);
  const [defectImages, setDefectImages] = useState<string[]>([]);
  const [interiorImages, setInteriorImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [vinLoading, setVinLoading] = useState(false);
  const [icoLoading, setIcoLoading] = useState(false);

  const { addPurchase, addPendingUpload, updatePurchaseProgress, markUploadSuccess, markUploadError, updatePurchase, setAutomobilData: setContextAutomobilData, setGeneralNotes: setContextGeneralNotes, setServiceNotes: setContextServiceNotes } = usePurchases();

  const [souhrnData, setSouhrnData] = useState({
    vin: '',
    vinProveren: false,
    cenaVykupu: '',
    protiucet: false,
    predCenaProdeje: '',
    odkudZna: '---Výběr---',
  });

  // Validation errors state consolidated here
  const [validationErrors, setValidationErrors] = useState<Record<string, boolean>>({});

  // Initialize form from initData in context on mount
  useEffect(() => {

    const hasInitData = initData?.vin || initData?.firstName || initData?.companyName || initData?.vehicleData;
    if (!hasInitData) {
      // Important: Do NOT load draft automatically here to avoid persisting old test values
      return;
    }


    // Set basic client info
    if (initData.firstName || initData.lastName || initData.companyName) {
      setZakladniData(prev => ({
        ...prev,
        jmeno: initData.firstName || '',
        prijmeni: initData.lastName || '',
        nazevFirmy: initData.companyName || '',
        firma: initData.isCompany || false,
        ico: initData.ico || '',
        telefon: initData.phone || '',
      }));
    }

    // Set VIN
    if (initData.vin) {
      setSouhrnData(prev => ({ ...prev, vin: initData.vin || '' }));
    }

    // Set vehicle data from API
    if (initData.vehicleData) {
      const vd = initData.vehicleData;
      const znacka = normalizeZnacka(vd.znacka || '');
      const model = findMatchingModel(znacka, vd.model || '');

      setAutomobilData(prev => ({
        ...prev,
        znacka,
        model,
        motorovaVarianta: mapFuelToWheelPicker(vd.palivo || '', vd.objemMotoru),
        vykon: vd.vykonKw?.toString() || '',
        stk: vd.stk || '',
        doProvozu: vd.datumPrvniRegistrace || '',
        prevodovka: mapPrevodovka(vd.prevodovka || ''),
        pohon: mapPohon(vd.pohon || ''),
        pocetVlastniku: vd.pocetVlastniku?.toString() || '',
        pocetProvozovatelu: vd.pocetProvozovatelu?.toString() || '',
      }));
      setSouhrnData(prev => ({ ...prev, vinProveren: true }));
    }

    // Set company data from ARES
    if (initData.companyData) {
      const cd = initData.companyData;
      setZakladniData(prev => ({
        ...prev,
        nazevFirmy: cd.nazev || prev.nazevFirmy,
        ico: cd.ico || prev.ico,
        ulice: cd.ulice || prev.ulice,
        mesto: cd.mesto || prev.mesto,
        psc: cd.psc?.replace(/\s/g, '') || prev.psc,
        platceDPH: cd.platceDPH || prev.platceDPH,
      }));
    }

    // Clear initData after using it
    clearInitData();
  }, []);

  // Get generalNotes and serviceNotes from context
  const { generalNotes, serviceNotes } = usePurchases();

  // Auto-save draft when any data changes
  useEffect(() => {
    const draftToSave = {
      zakladniValidation,
      zakladniData,
      automobilData,
      stavSoucastiData,
      generalNotes,
      serviceNotes,
      coverPhotoUri,
      vehicleImages,
      defectImages,
      interiorImages,
      souhrnData,
    };
    saveDraftData(draftToSave);
  }, [zakladniValidation, zakladniData, automobilData, stavSoucastiData, generalNotes, serviceNotes, coverPhotoUri, vehicleImages, defectImages, interiorImages, souhrnData]);

  const handleTabPress = (tab: typeof PURCHASE_TABS[0]) => {
    setSelectedTab(tab.key);
  };

  // When selectedTab changes: scroll content to top and center active tab chip
  useEffect(() => {
    // Vertical reset
    const refMap: Record<string, React.RefObject<ScrollView | null>> = {
      zakladni: zakladniRef,
      automobil: automobilRef,
      'stav-soucasti': stavSoucastiRef,
      'foto-vady': fotoVadyRef,
    };
    const targetRef = refMap[selectedTab];
    targetRef?.current?.scrollTo({ y: 0, animated: false });

    // Center active tab in horizontal bar
    const layout = tabLayoutsRef.current[selectedTab];
    if (layout && tabsScrollRef.current) {
      const screenW = Dimensions.get('window').width;
      const targetX = Math.max(0, layout.x + layout.width / 2 - screenW / 2);
      tabsScrollRef.current.scrollTo({ x: targetX, animated: true });
    }
  }, [selectedTab]);

  const handleClose = () => {
    setCloseConfirmVisible(true);
  };

  const handleFetchVehicleData = async () => {
    const validation = validateVin(souhrnData.vin);
    if (!validation.valid) {
      Alert.alert('Chyba', validation.message || 'Neplatný VIN');
      return;
    }

    if (!hasApiKey()) {
      Alert.alert(
        'API klíč není nastaven',
        'Pro načtení dat o vozidle je potřeba nastavit API klíč. Kontaktujte administrátora.',
        [{ text: 'OK' }]
      );
      return;
    }

    setVinLoading(true);
    try {
      const vehicleData = await fetchVehicleDataByVin(souhrnData.vin);

      // Normalize brand and model using helper functions
      const normalizedZnacka = normalizeZnacka(vehicleData.znacka || '');
      const normalizedModel = findMatchingModel(normalizedZnacka, vehicleData.model || '');

      // Map fuel to motorovaVarianta
      const motorovaVarianta = mapFuelToWheelPicker(vehicleData.palivo || '', vehicleData.objemMotoru);

      // Map prevodovka
      const prevodovka = mapPrevodovka(vehicleData.prevodovka || '');

      // Map pohon
      const pohon = mapPohon(vehicleData.pohon || '');
      // Process STK date - ensure correct format dd.mm.yyyy
      let stkValue = vehicleData.stk;
      if (stkValue) {
        // STK by mělo být ve formátu dd.mm.yyyy - ověříme
        if (!stkValue.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
          // Zkusíme parsovat a přeformátovat
          const stkDate = new Date(stkValue);
          if (!isNaN(stkDate.getTime())) {
            stkValue = stkDate.toLocaleDateString('cs-CZ');
          }
        }
      }

      // Process doProvozu date
      let doProvozuValue = vehicleData.datumPrvniRegistrace;
      if (doProvozuValue) {
      }

      // Aktualizovat data automobilu z API
      setAutomobilData(prev => {
        const updated = {
          ...prev,
          znacka: normalizedZnacka || prev.znacka,
          model: normalizedModel || prev.model,
          motorovaVarianta: motorovaVarianta || prev.motorovaVarianta,
          vykon: vehicleData.vykonKw?.toString() || prev.vykon,
          stk: stkValue || prev.stk,
          doProvozu: doProvozuValue || prev.doProvozu,
          prevodovka: prevodovka || prev.prevodovka,
          pohon: pohon || prev.pohon,
          pocetVlastniku: vehicleData.pocetVlastniku?.toString() || prev.pocetVlastniku,
          pocetProvozovatelu: vehicleData.pocetProvozovatelu?.toString() || prev.pocetProvozovatelu,
        };
        // Uložit do contextu
        setContextAutomobilData(updated);
        return updated;
      });

      // Označit VIN jako prověřený
      setSouhrnData(prev => ({
        ...prev,
        vinProveren: true,
      }));

      // Sestavit zprávu s načtenými údaji
      const loadedFields = [];
      if (vehicleData.znacka) loadedFields.push(`Značka: ${vehicleData.znacka}`);
      if (vehicleData.model) loadedFields.push(`Model: ${vehicleData.model}`);
      if (vehicleData.rokVyroby) loadedFields.push(`Rok: ${vehicleData.rokVyroby}`);
      if (vehicleData.palivo) loadedFields.push(`Palivo: ${vehicleData.palivo}`);
      if (vehicleData.vykonKw) loadedFields.push(`Výkon: ${vehicleData.vykonKw} kW`);
      if (vehicleData.karoserie) loadedFields.push(`Karoserie: ${vehicleData.karoserie}`);
      if (stkValue) loadedFields.push(`STK: ${stkValue}`);
      if (doProvozuValue) loadedFields.push(`Do provozu: ${doProvozuValue}`);
      if (vehicleData.pohon) loadedFields.push(`Pohon: ${vehicleData.pohon}`);
      Alert.alert(
        'Úspěch',
        `Data o vozidle byla načtena:\n\n${loadedFields.join('\n')}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Chyba',
        error.message || 'Nepodařilo se načíst data o vozidle',
        [{ text: 'OK' }]
      );
    } finally {
      setVinLoading(false);
    }
  };

  const handleFetchIco = async () => {
    const validation = validateIco(zakladniData.ico);
    if (!validation.valid) {
      Alert.alert('Chyba', validation.message || 'Neplatné IČO');
      return;
    }
    setIcoLoading(true);
    try {
      const companyData = await fetchCompanyByIco(zakladniData.ico);
      if (companyData && companyData.success) {
        // Aktualizovat všechna pole včetně adresy a platceDPH
        setZakladniData(prev => {
          const updated = {
            ...prev,
            nazevFirmy: companyData.nazev || prev.nazevFirmy,
            ulice: companyData.ulice || prev.ulice,
            mesto: companyData.mesto || prev.mesto,
            psc: companyData.psc?.replace(/\s/g, '') || prev.psc, // Odstranit mezery z PSČ
            platceDPH: companyData.platceDPH || prev.platceDPH,
          };
          return updated;
        });
        // Sestavit zprávu s načtenými údaji
        const loadedFields = [];
        if (companyData.nazev) loadedFields.push(`Název: ${companyData.nazev}`);
        if (companyData.ulice) loadedFields.push(`Ulice: ${companyData.ulice}`);
        if (companyData.mesto) loadedFields.push(`Město: ${companyData.mesto}`);
        if (companyData.psc) loadedFields.push(`PSČ: ${companyData.psc}`);
        loadedFields.push(`Plátce DPH: ${companyData.platceDPH ? 'Ano ✓' : 'Ne'}`);
        Alert.alert(
          'Úspěch', 
          `Data firmy byla načtena z ARES:\n\n${loadedFields.join('\n')}`
        );
      } else {
        Alert.alert('Chyba', 'Firma s tímto IČO nebyla nalezena');
      }
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se načíst data firmy');
    } finally {
      setIcoLoading(false);
    }
  };

  const handleIcoSearch = handleFetchIco;

  const handleSave = async () => {
    // Reset validation state
    setZakladniValidation({
      nazevFirmy: false,
      jmeno: false,
      prijmeni: false,
      spz: false,
    });
    // Validate required fields
    if (zakladniData.firma) {
      if (!zakladniData.nazevFirmy.trim()) {
        setZakladniValidation(prev => ({ ...prev, nazevFirmy: true }));
        setConfirmMessage('Prosím vyplňte název firmy');
        setConfirmOnConfirm(() => () => setSelectedTab('zakladni'));
        setConfirmVisible(true);
        return;
      }
    } else {
      if (!zakladniData.jmeno.trim() || !zakladniData.prijmeni.trim()) {
        setZakladniValidation(prev => ({ ...prev, jmeno: !zakladniData.jmeno.trim(), prijmeni: !zakladniData.prijmeni.trim() }));
        setConfirmMessage('Prosím vyplňte jméno a příjmení klienta');
        setConfirmOnConfirm(() => () => setSelectedTab('zakladni'));
        setConfirmVisible(true);
        return;
      }
    }

    if (!automobilData.spz.trim()) {
      setZakladniValidation(prev => ({ ...prev, spz: true }));
      setConfirmMessage('Prosím vyplňte SPZ vozidla');
      setConfirmOnConfirm(() => () => setSelectedTab('automobil'));
      setConfirmVisible(true);
      return;
    }

    // Get client name for display
    const clientDisplayName = zakladniData.firma 
      ? zakladniData.nazevFirmy 
      : `${zakladniData.jmeno} ${zakladniData.prijmeni}`;
    // Show confirmation dialog and call performSave
    setConfirmMessage(`Chcete uložit výkup pro klienta "${clientDisplayName}" s vozidlem SPZ "${automobilData.spz}"?`);
    setConfirmOnConfirm(() => () => performSave());
    setConfirmCancelText('Zrušit');
    setConfirmConfirmText('Uložit');
    setConfirmVisible(true);
  };

  const performSave = async () => {
    setConfirmVisible(false);
    setLoading(true);
    try {

      // EXTRACT INSPECTION DATE & TIME from datumProhlidky (format: "dd.mm.yyyy hh:mm")
      let inspectionDate: string | undefined = undefined;
      let inspectionTime: string | undefined = undefined;

      if (zakladniData.datumProhlidky) {
        // Format: "29.01.2026 14:30" nebo jen "29.01.2026"
        const parts = zakladniData.datumProhlidky.trim().split(' ');
        if (parts.length >= 1) {
          inspectionDate = parts[0]; // "29.01.2026"
        }
        if (parts.length >= 2 && parts[1]) {
          inspectionTime = parts[1]; // "14:30"
        } else {
          // Default čas pokud není v datumProhlidky - defaultujeme na 09:00
          inspectionTime = '09:00';
        }
      }


      // BUILD PURCHASE PAYLOAD
      const payload: Record<string, any> = {
        clientName: zakladniData.firma 
          ? zakladniData.nazevFirmy 
          : `${zakladniData.jmeno} ${zakladniData.prijmeni}`,
        clientType: zakladniData.firma ? 'company' : 'person',

        purchaseDate: null,
        purchaseTime: null,
        inspectionDate: inspectionDate || null,
        inspectionTime: inspectionTime || null,

        spz: automobilData.spz || 'N/A',
        purchaseState: 'NEW',

        employeeId: user?.id ? parseInt(String(user.id)) : 1,

        totalAmount: zakladniData.cenaNabidnuta ? parseInt(zakladniData.cenaNabidnuta) : null,
        customerPrice: zakladniData.cenaZakaznik ? parseInt(zakladniData.cenaZakaznik) : null,
        offeredPrice: zakladniData.cenaNabidnuta ? parseInt(zakladniData.cenaNabidnuta) : null,
        expectedSalePrice: souhrnData.predCenaProdeje ? parseInt(souhrnData.predCenaProdeje) : null,

        isVatPayer: zakladniData.platceDPH,
        isCounterAccount: souhrnData.protiucet,
        vinVerified: souhrnData.vinProveren,

        sourceKnowledge: souhrnData.odkudZna !== '---Výběr---' ? souhrnData.odkudZna : null,
        phone: zakladniData.telefon?.trim() ? zakladniData.telefon : null,
        street: zakladniData.ulice || null,
        city: zakladniData.mesto || null,
        postalCode: zakladniData.psc || null,
        notes: generalNotes || null,

        companyInfo: zakladniData.firma ? {
          companyName: zakladniData.nazevFirmy,
          ico: zakladniData.ico || null,
          dic: null,
        } : null,

        serviceNotes: serviceNotes || null,
        coverPhotoUri: coverPhotoUri || null,

        carDetails: {
          vin: souhrnData.vin || null,
          barva: null,
          palivo: automobilData.motorovaVarianta !== '---Výběr---' ? automobilData.motorovaVarianta : null,
          make: automobilData.znacka !== '---Výběr---' ? automobilData.znacka : null,
          model: automobilData.model !== '---Výběr---' ? automobilData.model : null,
          year: automobilData.doProvozu ? parseInt(automobilData.doProvozu.split('.')[2]) : new Date().getFullYear(),
          color: null,
          mileage: automobilData.km ? parseInt(automobilData.km) : null,
          fuelType: automobilData.motorovaVarianta !== '---Výběr---' ? automobilData.motorovaVarianta : null,
          engineSize: automobilData.vykon ? `${automobilData.vykon} kW` : null,
          transmission: automobilData.prevodovka !== '---Výběr---' ? automobilData.prevodovka : null,
          bodyType: null,
          driveType: automobilData.pohon !== '---Výběr---' ? automobilData.pohon : null,
          stk: automobilData.stk || null,
          firstRegistration: automobilData.doProvozu || null,
          isImport: automobilData.dovoz,
          isFirstOwner: automobilData.prvniMajitel,
          hasServiceBook: automobilData.servisniKnizka,
          hasSecurityScrews: false,
          hasAiWheels: false,
          pocetVlastniku: automobilData.pocetVlastniku ? parseInt(automobilData.pocetVlastniku) : null,
          pocetProvozovatelu: automobilData.pocetProvozovatelu ? parseInt(automobilData.pocetProvozovatelu) : null,
          cebia: automobilData.cebia,
          caVertical: automobilData.caVertical,
        },

        componentStatuses: stavSoucastiData.map(item => ({
          component: item.component,
          status: item.status,
          notes: item.notes || undefined,
        })),
      };

      const pendingId = addPendingUpload(payload as any);
      await clearDraftData();
      setLoading(false);
      router.back();

      await uploadPurchaseInBackground(
        pendingId,
        payload as any,
        vehicleImages,
        defectImages,
        interiorImages,
        coverPhotoUri,
      );
    } catch (error: any) {
      Alert.alert('Chyba', error.message || 'Nepodařilo se uložit výkup');
      setLoading(false);
    }
  };

  // Background upload function
  const uploadPurchaseInBackground = async (
    pendingId: string,
    payload: Record<string, any>,
    vehicleImages: string[],
    defectImages: string[],
    interiorImages: string[],
    coverPhotoUri?: string | null
  ): Promise<void> => {
    try {

      // 1️⃣ CREATE PURCHASE ON API
      const createResult = await (apiService as any).createPurchase(payload as Record<string, any>);

      const serverId = String(createResult?.id || createResult?.data?.id);
      if (!serverId || serverId === 'null') {
        throw new Error('API vrátilo neplatné ID: ' + JSON.stringify(createResult));
      }


      // 2️⃣ UPLOAD COVER PHOTO FIRST if exists
      let uploadedCoverUri: string | undefined;
      if (coverPhotoUri) {
        try {
          const coverResult = await apiService.uploadPhotos(serverId, [coverPhotoUri]);
          if (coverResult?.files && coverResult.files.length > 0) {
            uploadedCoverUri = coverResult.files[0];
          }
        } catch (e) {
        }
      }

      // 3️⃣ UPLOAD VEHICLE PHOTOS
      if (vehicleImages.length > 0) {
        try {
          const vehResult = await apiService.uploadPhotos(serverId, vehicleImages);
          updatePurchaseProgress(pendingId, 50);
        } catch (e) {
        }
      }

      // 4️⃣ UPLOAD DEFECT PHOTOS
      if (defectImages.length > 0) {
        try {
          const defResult = await apiService.uploadDefectPhotos(serverId, defectImages);
          updatePurchaseProgress(pendingId, 75);
        } catch (e) {
        }
      }

      // 5️⃣ UPDATE COVER PHOTO URI IN DB (if was uploaded)
      if (uploadedCoverUri) {
        try {
          // Only update coverPhotoUri field - don't touch other fields!
          const coverUpdatePayload = { coverPhotoUri: uploadedCoverUri };
          await apiService.updatePurchase(serverId, coverUpdatePayload);
        } catch (e) {
        }
      }

      // 6️⃣ RELOAD & UPDATE CONTEXT with latest data from DB
      const savedPurchase = await apiService.getPurchaseById(serverId);
      if (savedPurchase.carDetails) {
      }
      
      // 7️⃣ UPDATE CONTEXT so UI shows latest data
      if (savedPurchase) {
        // savedPurchase je ALREADY transformován z getPurchaseById
        // Jen updatuj všechna pole aby si UI sebralo latest data
        updatePurchase(serverId, savedPurchase);
      }
      
      markUploadSuccess(pendingId);
    } catch (error: any) {
      markUploadError(pendingId, error?.message || 'Chyba při nahrávání');
    }
  };

  // Helper function to render input fields with error styling based on validation state
  const renderInputField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: {
      placeholder?: string;
      keyboardType?: 'default' | 'numeric' | 'phone-pad';
      editable?: boolean;
      onPress?: () => void;
      rightIcon?: React.ReactNode;
      error?: boolean;
      showWarning?: boolean;
    }
  ) => {
    const numValue = parseInt(value);
    const showWarning = options?.showWarning && !isNaN(numValue) && numValue >= 4;
    const isEmpty = !value || value.trim() === '';
    const borderColor = isEmpty ? '#E30613' : theme.border;

    return (
      <View style={styles.inputGroup}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
        <TouchableOpacity
          activeOpacity={options?.editable === false && options?.onPress ? 0.7 : 1}
          onPress={options?.onPress}
          disabled={options?.editable !== false}
        >
          <View pointerEvents={options?.editable === false ? 'none' : 'auto'}>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: theme.inputBackground, color: theme.text, borderColor },
                options?.error && { borderColor: '#FF3B30' }
              ]}
              value={value}
              onChangeText={onChangeText}
              placeholder={options?.placeholder}
              placeholderTextColor={theme.textTertiary}
              keyboardType={options?.keyboardType || 'default'}
              returnKeyType="done"
              editable={options?.editable !== false}
            />
            {options?.rightIcon && (
              <View style={styles.inputRightIcon}>
                {options.rightIcon}
              </View>
            )}
          </View>
        </TouchableOpacity>
        {showWarning && (
          <View style={styles.warningContainer}>
            <Ionicons name="warning" size={14} color="#FF9500" />
            <Text style={styles.warningText}>Vozidlo s více vlastníky/provozovateli</Text>
          </View>
        )}
      </View>
    );
  };

  // Helper function to render input with error border and better error messaging
  // Added as per update instructions
  const renderInput = (
    fieldName: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder?: string,
    keyboardType?: 'default' | 'numeric' | 'email-address' | 'phone-pad'
  ) => {
    const hasError = validationErrors[fieldName];
    return (
      <TextInput
        style={[
          styles.textInput,
          {
            borderColor: hasError ? '#FF3B30' : '#E5E5E7',
            borderWidth: hasError ? 2 : 1,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8E8E93"
        keyboardType={keyboardType || 'default'}
      />
    );
  };

  const renderToggleField = (
    label: string,
    value: boolean,
    onValueChange: (value: boolean) => void
  ) => (
    <View style={[styles.switchRow, { borderBottomColor: theme.borderLight }]}>
      <Text style={[styles.switchLabel, { color: theme.text }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  const renderPriceField = (
    label: string,
    value: string,
    onChangeText: (text: string) => void
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
        value={value}
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={theme.textTertiary}
        keyboardType="numeric"
        returnKeyType="done"
      />
    </View>
  );

  const getAvailableModels = () => {
    if (!automobilData.znacka || automobilData.znacka === '---Výběr---') return ['---Výběr---'];
    const models = VEHICLE_MODELS[automobilData.znacka] || [];
    return ['---Výběr---', ...models];
  };

  const handleMakeChange = (znacka: string) => {
    setAutomobilData(prev => ({ ...prev, znacka, model: '---Výběr---' }));
  };

  const updateComponentStatus = (index: number, status: ComponentStatus['status']) => {
    setStavSoucastiData(prev => prev.map((item, i) => 
      i === index ? { ...item, status } : item
    ));
  };

  const updateComponentNotes = (index: number, notes: string) => {
    setStavSoucastiData(prev => prev.map((item, i) => 
      i === index ? { ...item, notes } : item
    ));
  };

  const getStatusOption = (status: ComponentStatus['status']) => {
    return STATUS_OPTIONS.find(option => option.key === status) || STATUS_OPTIONS[1];
  };

  const renderZakladniContent = () => (
    <ScrollView ref={zakladniRef} style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Section: Úvodní fotka vozidla - na samém začátku */}
      <View style={[styles.photoSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Úvodní fotka vozidla</Text>
        <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
          Vyfotit fotku vozidla pro náhled v seznamu výkupů
        </Text>
        {coverPhotoUri ? (
          <View style={styles.coverPhotoPreview}>
            <Image source={{ uri: coverPhotoUri }} style={styles.coverPhotoImage} />
            <View style={styles.coverPhotoOverlay}>
              <TouchableOpacity
                style={[styles.coverPhotoButton, { backgroundColor: theme.accent }]}
                onPress={() => setCoverPhotoUri(null)}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
                <Text style={styles.coverPhotoButtonText}>Odebrat</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.coverPhotoEmpty}>
            <TouchableOpacity
              style={[styles.coverPhotoActionButton, { backgroundColor: theme.accent, borderColor: theme.border }]}
              onPress={async () => {
                const result = await ImagePicker.launchCameraAsync({
                  allowsEditing: true,
                  aspect: [16, 9],
                  quality: 0.8,
                });
                if (!result.canceled && result.assets[0]?.uri) {
                  setCoverPhotoUri(result.assets[0].uri);
                }
              }}
            >
              <Ionicons name="camera" size={24} color="#FFFFFF" />
              <Text style={styles.coverPhotoActionButtonText}>Vyfotit z kamery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.coverPhotoActionButton, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
              onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  allowsEditing: true,
                  aspect: [16, 9],
                  quality: 0.8,
                });
                if (!result.canceled && result.assets[0]?.uri) {
                  setCoverPhotoUri(result.assets[0].uri);
                }
              }}
            >
              <Ionicons name="image" size={24} color={theme.text} />
              <Text style={[styles.coverPhotoActionButtonText, { color: theme.text }]}>Vybrat z galerie</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Základní informace</Text>

      {/* Removed Stav selection picker as per update instructions */}

      {/* Display current user as buyer */}
      <View style={[styles.inputGroup, { backgroundColor: theme.card, padding: 12, borderRadius: 10 }]}>
        <Text style={[styles.label, { color: theme.textSecondary }]}>Výkupčí</Text>
        <Text style={[styles.buyerName, { color: theme.text }]}>
          {user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.userName || 'Přihlášený uživatel'}
        </Text>
      </View>

      <DatePickerField
        label="Datum prohlídky"
        value={zakladniData.datumProhlidky}
        onChange={(dateStr) => setZakladniData(prev => ({ ...prev, datumProhlidky: dateStr }))}
        placeholder="dd.mm.yyyy hh:mm"
        includeTime={true}
        error={!zakladniData.datumProhlidky.trim()}
      />

      {renderInputField(
        'Cena zákazník', 
        zakladniData.cenaZakaznik, 
        (text) => setZakladniData(prev => ({ ...prev, cenaZakaznik: text })),
        { placeholder: '0', keyboardType: 'numeric', showWarning: false }
      )}

      {renderInputField(
        'Cena nabídnuta', 
        zakladniData.cenaNabidnuta, 
        (text) => setZakladniData(prev => ({ ...prev, cenaNabidnuta: text })),
        { placeholder: '0', keyboardType: 'numeric', showWarning: false }
      )}

      {renderToggleField(
        'Firma',
        zakladniData.firma,
        (value) => setZakladniData(prev => ({ ...prev, firma: value }))
      )}

      {renderToggleField(
        'Plátce DPH',
        zakladniData.platceDPH,
        (value) => setZakladniData(prev => ({ ...prev, platceDPH: value }))
      )}
      {zakladniData.firma ? (
        <>
          {renderInputField(
            'Název firmy', 
            zakladniData.nazevFirmy, 
            (text) => setZakladniData(prev => ({ ...prev, nazevFirmy: text })),
            { placeholder: 'Zadejte název firmy...', error: zakladniValidation.nazevFirmy }
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              {renderInputField(
                'IČO', 
                zakladniData.ico, 
                (text) => setZakladniData(prev => ({ ...prev, ico: text })),
                { placeholder: 'Zadejte IČO...' }
              )}
            </View>
            <TouchableOpacity
              style={[styles.icoSearchButton, icoLoading && styles.icoSearchButtonDisabled]}
              onPress={handleIcoSearch}
              disabled={icoLoading || !zakladniData.ico.trim()}
            >
              {icoLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="search" size={18} color="#FFFFFF" />
                  <Text style={styles.icoSearchButtonText}>Hledat</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          {/* Replace renderInputField for Telefon with PhoneInput */}
          <PhoneInput
            label="Telefon"
            value={zakladniData.telefon}
            onChangeText={(text) => setZakladniData(prev => ({ ...prev, telefon: text }))}
            placeholder="xxx xxx xxx"
            error={!zakladniData.telefon.trim()}
          />
          {renderInputField(
            'Ulice', 
            zakladniData.ulice, 
            (text) => setZakladniData(prev => ({ ...prev, ulice: text })),
            { placeholder: 'Zadejte ulici...' }
          )}
          {renderInputField(
            'Město', 
            zakladniData.mesto, 
            (text) => setZakladniData(prev => ({ ...prev, mesto: text })),
            { placeholder: 'Zadejte město...' }
          )}
          {renderInputField(
            'PSČ', 
            zakladniData.psc, 
            (text) => setZakladniData(prev => ({ ...prev, psc: text })),
            { placeholder: 'Zadejte PSČ...' }
          )}
          <SelectionPicker
            label="Odkud zná"
            value={souhrnData.odkudZna}
            options={ODKUD_ZNA}
            onSelect={(value) => setSouhrnData(prev => ({ ...prev, odkudZna: value }))}
            placeholder="---Výběr---"
            error={souhrnData.odkudZna === '---Výběr---'}
          />
        </>
      ) : (
        <>
          {renderInputField(
            'Jméno', 
            zakladniData.jmeno, 
            (text) => setZakladniData(prev => ({ ...prev, jmeno: text })),
            { placeholder: 'Zadejte jméno...', error: zakladniValidation.jmeno }
          )}
          {renderInputField(
            'Příjmení', 
            zakladniData.prijmeni, 
            (text) => setZakladniData(prev => ({ ...prev, prijmeni: text })),
            { placeholder: 'Zadejte příjmení...', error: zakladniValidation.prijmeni }
          )}
          {/* Replace renderInputField for Telefon with PhoneInput */}
          <PhoneInput
            label="Telefon"
            value={zakladniData.telefon}
            onChangeText={(text) => setZakladniData(prev => ({ ...prev, telefon: text }))}
            placeholder="xxx xxx xxx"
            error={!zakladniData.telefon.trim()}
          />
          <SelectionPicker
            label="Odkud zná"
            value={souhrnData.odkudZna}
            options={ODKUD_ZNA}
            onSelect={(value) => setSouhrnData(prev => ({ ...prev, odkudZna: value }))}
            placeholder="---Výběr---"
            error={souhrnData.odkudZna === '---Výběr---'}
          />
        </>
      )}
    </ScrollView>
  );

  const renderAutomobilContent = () => (
    <ScrollView ref={automobilRef} style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Informace o vozidle</Text>

      {/* VIN Input with Lookup Button - at the top */}
      <View style={[styles.vinInputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>VIN</Text>
        <View style={styles.vinInputRow}>
          <TextInput
            style={[styles.vinTextInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
            value={souhrnData.vin}
            onChangeText={(text) => setSouhrnData(prev => ({ ...prev, vin: text.toUpperCase() }))}
            placeholder="Zadejte 17-místný VIN..."
            placeholderTextColor={theme.textTertiary}
            autoCapitalize="characters"
            maxLength={17}
          />
          <TouchableOpacity
            style={[styles.vinLookupButton, vinLoading && styles.vinLookupButtonDisabled]}
            onPress={handleFetchVehicleData}
            disabled={vinLoading || souhrnData.vin.length < 17}
          >
            {vinLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="search" size={18} color="#FFFFFF" />
                <Text style={styles.vinLookupButtonText}>Načíst</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        <Text style={[styles.vinHelpText, { color: theme.textTertiary }]}>
          Zadejte VIN a klikněte na &quot;Načíst&quot; pro automatické doplnění údajů o vozidle
        </Text>
      </View>

      <SelectionPicker
        label="Značka"
        value={automobilData.znacka}
        options={['---Výběr---', ...VEHICLE_MAKES]}
        onSelect={handleMakeChange}
        placeholder="---Výběr---"
        error={automobilData.znacka === '---Výběr---'}
      />

      <SelectionPicker
        label="Model"
        value={automobilData.model}
        options={getAvailableModels()}
        onSelect={(value) => setAutomobilData(prev => ({ ...prev, model: value }))}
        placeholder="---Výběr---"
        error={automobilData.model === '---Výběr---'}
      />

      <SpzInput
        label="SPZ"
        value={automobilData.spz}
        onChangeText={(text) => setAutomobilData(prev => ({ ...prev, spz: text }))}
        placeholder="1A2 3456"
        error={!automobilData.spz.trim()}
      />

      <WheelPicker
        label="Motorová varianta"
        value={automobilData.motorovaVarianta}
        options={MOTOROVA_VARIANTA}
        onSelect={(value) => setAutomobilData(prev => ({ ...prev, motorovaVarianta: value }))}
        placeholder="---Výběr---"
        error={automobilData.motorovaVarianta === '---Výběr---'}
      />

      {renderInputField(
        'Km', 
        automobilData.km, 
        (text) => setAutomobilData(prev => ({ ...prev, km: text })),
        { keyboardType: 'numeric' }
      )}

      <DatePickerField
        label="STK"
        value={automobilData.stk}
        onChange={(dateStr) => setAutomobilData(prev => ({ ...prev, stk: dateStr }))}
        placeholder="dd.mm.yyyy"
        error={!automobilData.stk.trim()}
      />

      {renderInputField(
        'Výkon (kW)', 
        automobilData.vykon, 
        (text) => setAutomobilData(prev => ({ ...prev, vykon: text })),
        { keyboardType: 'numeric' }
      )}

      <SelectionPicker
        label="Převodovka"
        value={automobilData.prevodovka}
        options={PREVODOVKA}
        onSelect={(value) => setAutomobilData(prev => ({ ...prev, prevodovka: value }))}
        placeholder="---Výběr---"
        error={automobilData.prevodovka === '---Výběr---'}
      />

      <SelectionPicker
        label="Pohon"
        value={automobilData.pohon}
        options={POHON}
        onSelect={(value) => setAutomobilData(prev => ({ ...prev, pohon: value }))}
        placeholder="---Výběr---"
        error={automobilData.pohon === '---Výběr---'}
      />

      <DatePickerField
        label="Do provozu"
        value={automobilData.doProvozu}
        onChange={(dateStr) => setAutomobilData(prev => ({ ...prev, doProvozu: dateStr }))}
        placeholder="dd.mm.yyyy"
        error={!automobilData.doProvozu.trim()}
      />

      {renderInputField(
        'Počet vlastníků', 
        automobilData.pocetVlastniku, 
        (text) => setAutomobilData(prev => ({ ...prev, pocetVlastniku: text })),
        { placeholder: '', keyboardType: 'numeric', showWarning: true }
      )}

      {renderInputField(
        'Počet provozovatelů', 
        automobilData.pocetProvozovatelu, 
        (text) => setAutomobilData(prev => ({ ...prev, pocetProvozovatelu: text })),
        { placeholder: '', keyboardType: 'numeric', showWarning: true }
      )}
      {renderToggleField(
        'Dovoz',
        automobilData.dovoz,
        (value) => setAutomobilData(prev => ({ ...prev, dovoz: value }))
      )}

      {renderToggleField(
        'První majitel',
        automobilData.prvniMajitel,
        (value) => setAutomobilData(prev => ({ ...prev, prvniMajitel: value }))
      )}

      {renderToggleField(
        'Servisní knížka',
        automobilData.servisniKnizka,
        (value) => setAutomobilData(prev => ({ ...prev, servisniKnizka: value }))
      )}

      {renderToggleField(
        'Protiúčet',
        souhrnData.protiucet,
        (value) => {
          setSouhrnData(prev => ({ ...prev, protiucet: value }));
          if (value) setShowCounterPicker(true); else setCounterCar(null);
        }
      )}

      {counterCar && (
        <View style={[styles.photoSection, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Vybraný protiúčet</Text>
          <Text style={{ color: theme.text }}>{counterCar.make} {counterCar.model}</Text>
          {!!counterCar.variant && <Text style={{ color: theme.textSecondary }}>{counterCar.variant}</Text>}
          {!!counterCar.price && <Text style={{ color: theme.text }}>{counterCar.price.toLocaleString('cs-CZ')} Kč</Text>}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
            <TouchableOpacity onPress={() => setShowCounterPicker(true)} style={[styles.vinLookupButton, { backgroundColor: theme.accent }]}>
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.vinLookupButtonText}>Změnit</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setCounterCar(null); setSouhrnData(prev => ({ ...prev, protiucet: false })); }} style={[styles.vinLookupButton, { backgroundColor: theme.inputBackground }]}>
              <Text style={[styles.vinLookupButtonText, { color: theme.text }]}>Odebrat</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={[styles.vinSectionTitle, { color: theme.text }]}>VIN prověřeno</Text>

      {renderToggleField(
        'Cebia',
        automobilData.cebia,
        (value) => setAutomobilData(prev => ({ ...prev, cebia: value }))
      )}

      {renderToggleField(
        'CaVertical',
        automobilData.caVertical,
        (value) => setAutomobilData(prev => ({ ...prev, caVertical: value }))
      )}
    </ScrollView>
  );

  const renderStavSoucastiContent = () => (
    <ScrollView ref={stavSoucastiRef} style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Hodnocení stavu součástí vozidla</Text>
      <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>Vyhodnoťte stav každé součásti</Text>

      {stavSoucastiData.map((item, index) => (
        <View key={item.component} style={[styles.componentContainer, { backgroundColor: theme.card }]}>
          <View style={styles.componentHeader}>
            <Text style={[styles.componentName, { color: theme.text }]}>{item.component}</Text>
            <View style={styles.statusSelector}>
              {STATUS_OPTIONS.map((statusOption) => {
                const isSelected = item.status === statusOption.key;
                return (
                  <TouchableOpacity
                    key={statusOption.key}
                    style={[
                      styles.statusButton,
                      { borderColor: theme.border },
                      isSelected && { backgroundColor: statusOption.color, borderColor: statusOption.color }
                    ]}
                    onPress={() => updateComponentStatus(index, statusOption.key as ComponentStatus['status'])}
                  >
                    <Ionicons
                      name={statusOption.icon as any}
                      size={18}
                      color={isSelected ? '#FFFFFF' : statusOption.color}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.statusIndicator}>
            <View 
              style={[
                styles.statusBadge, 
                { backgroundColor: getStatusOption(item.status).color }
              ]}
            />
            <Text style={[styles.statusLabelText, { color: theme.textSecondary }]}>
              {getStatusOption(item.status).label}
            </Text>
          </View>

          <View style={styles.noteHeader}>
            <Ionicons name="create-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.noteHeaderText, { color: theme.textSecondary }]}>Poznámka</Text>
          </View>
          <TextInput
            style={[
              styles.componentNotes,
              {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                borderColor: item.notes ? theme.accent : theme.border,
              },
            ]}
            value={item.notes}
            onChangeText={(text) => updateComponentNotes(index, text)}
            placeholder='Zapište poznámku (např. "lehké pískání při brzdění")'
            placeholderTextColor={theme.textTertiary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      ))}

      <View style={styles.generalNotesSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Obecné poznámky</Text>
        <TextInput
          style={[styles.multilineInput, { backgroundColor: theme.card, color: theme.text }]}
          value={generalNotes}
          onChangeText={setContextGeneralNotes}
          placeholder="Celkové poznámky a pozorování stavu vozidla..."
          placeholderTextColor={theme.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      <View style={styles.generalNotesSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Servisní poznámka</Text>
        <TextInput
          style={[styles.multilineInput, { backgroundColor: theme.card, color: theme.text }]}
          value={serviceNotes}
          onChangeText={setContextServiceNotes}
          placeholder="Servisní poznámka a doporučení..."
          placeholderTextColor={theme.textTertiary}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
    </ScrollView>
  );

  const renderFotoVadyContent = () => {
    const getTotalImageCount = () => {
      return vehicleImages.length + defectImages.length + interiorImages.length;
    };

    const openVehicleCamera = async () => {
      try {
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.85,
        });
        if (!result.canceled && result.assets[0]?.uri) {
          setVehicleImages(prev => [...prev, result.assets[0].uri]);
        }
      } catch (e) {
      }
    };

    const openVehicleGallery = async () => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 0.85,
          allowsEditing: false,
        });
        if (!result.canceled && result.assets) {
          setVehicleImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
        }
      } catch (e) {
      }
    };

    const openDefectCamera = async () => {
      try {
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.85,
        });
        if (!result.canceled && result.assets[0]?.uri) {
          setDefectImages(prev => [...prev, result.assets[0].uri]);
        }
      } catch (e) {
      }
    };

    const openDefectGallery = async () => {
      try {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 0.85,
          allowsEditing: false,
        });
        if (!result.canceled && result.assets) {
          setDefectImages(prev => [...prev, ...result.assets.map(a => a.uri)]);
        }
      } catch (e) {
      }
    };

    return (
      <ScrollView ref={fotoVadyRef} style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Photo Summary */}
        <View style={[styles.photoSummarySection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Přehled fotografií</Text>
          <View style={styles.summaryRow}>
            <Ionicons name="images" size={20} color={theme.accent} />
            <Text style={[styles.summaryText, { color: theme.text }]}>
              {getTotalImageCount()} fotografií pořízeno
            </Text>
          </View>
        </View>

        {/* Section 1: Foto vozidla */}
        <View style={[styles.photoSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Foto vozidla</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Zachyťte exteriér, interiér a všechny detaily vozidla
          </Text>

          <View style={styles.rowButtons}>
            <TouchableOpacity style={styles.actionInline} onPress={openVehicleCamera}>
              <Ionicons name="camera" size={20} color={theme.accent} />
              <Text style={[styles.actionInlineText, { color: theme.accent }]}>Vyfotit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionInline} onPress={openVehicleGallery}>
              <Ionicons name="images" size={20} color={theme.accent} />
              <Text style={[styles.actionInlineText, { color: theme.accent }]}>Vybrat</Text>
            </TouchableOpacity>
          </View>

          {vehicleImages.length > 0 && (
            <View style={styles.thumbGrid}>
              {vehicleImages.map((u, index) => (
                <View 
                  key={`v-${index}`} 
                  style={styles.thumbItem}
                >
                  <Image source={{ uri: u }} style={styles.thumbImg} />
                  <TouchableOpacity 
                    style={styles.removeBtn} 
                    onPress={() => setVehicleImages(prev => prev.filter((_, i) => i !== index))}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Section 2: Foto vady */}
        <View style={[styles.photoSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Foto vady</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Zdokumentujte škrábance, promáčknutí, rez nebo jiné problémy
          </Text>

          <View style={styles.rowButtons}>
            <TouchableOpacity style={styles.actionInline} onPress={openDefectCamera}>
              <Ionicons name="camera" size={20} color="#FF3B30" />
              <Text style={[styles.actionInlineText, { color: '#FF3B30' }]}>Vyfotit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionInline} onPress={openDefectGallery}>
              <Ionicons name="images" size={20} color="#FF3B30" />
              <Text style={[styles.actionInlineText, { color: '#FF3B30' }]}>Vybrat</Text>
            </TouchableOpacity>
          </View>

          {defectImages.length > 0 && (
            <View style={styles.thumbGrid}>
              {defectImages.map((u, index) => (
                <View 
                  key={`d-${index}`} 
                  style={styles.thumbItem}
                >
                  <Image source={{ uri: u }} style={styles.thumbImg} />
                  <TouchableOpacity 
                    style={styles.removeBtn} 
                    onPress={() => setDefectImages(prev => prev.filter((_, i) => i !== index))}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (selectedTab) {
      case 'zakladni':
        return renderZakladniContent();
      case 'automobil':
        return renderAutomobilContent();
      case 'stav-soucasti':
        return renderStavSoucastiContent();
      case 'foto-vady':
        return renderFotoVadyContent();
      default:
        return renderZakladniContent();
    }
  };
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with SafeArea padding */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.headerButton, { backgroundColor: theme.inputBackground }]} onPress={handleClose}>
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Nový výkup</Text>
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: theme.accent }, loading && styles.saveButtonDisabled]} 
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>{loading ? 'Ukládám...' : 'Uložit'}</Text>
        </TouchableOpacity>
      </View>

      {/* Tablet Split-view or Phone stacked layout */}
      <View style={[
        isSplitView ? styles.splitContainer : styles.stackedContainer,
        { backgroundColor: theme.background }
      ]}>
        {/* Left Sidebar - Vertical Tabs (ONLY on tablet) */}
        {isSplitView && (
          <View style={[styles.sidebarTabs, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
            {PURCHASE_TABS.map((tab) => {
              const isSelected = tab.key === selectedTab;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.sidebarTabItem,
                    { backgroundColor: isSelected ? theme.accent : 'transparent' }
                  ]}
                  onPress={() => handleTabPress(tab)}
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
          {/* Tab Navigation - ONLY on phone */}
          {!isSplitView && (
            <View style={[styles.tabNavigation, { backgroundColor: theme.surface }]}>
              <ScrollView
                ref={tabsScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabScrollContent}
              >
                {PURCHASE_TABS.map((tab) => {
                  const isSelected = tab.key === selectedTab;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[
                        styles.tabItem,
                        { backgroundColor: isSelected ? theme.accent : theme.inputBackground }
                      ]}
                      onPress={() => handleTabPress(tab)}
                      onLayout={(e) => {
                        const { x, width } = e.nativeEvent.layout;
                        tabLayoutsRef.current[tab.key] = { x, width };
                      }}
                    >
                      <Ionicons 
                        name={tab.icon} 
                        size={18} 
                        color={isSelected ? "#FFFFFF" : theme.textSecondary} 
                      />
                      <Text style={[
                        styles.tabText,
                        { color: isSelected ? "#FFFFFF" : theme.textSecondary }
                      ]}>
                        {tab.title}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            {renderTabContent()}
          </KeyboardAvoidingView>
        </View>
      </View>

      {/* Dialogs */}
      <ConfirmDialog
        visible={confirmVisible}
        message={confirmMessage}
        cancelText={confirmCancelText}
        confirmText={confirmConfirmText}
        onConfirm={() => {
          setConfirmVisible(false);
          confirmOnConfirm();
        }}
        onCancel={() => setConfirmVisible(false)}
      />

      <CounterAccountPicker
        visible={showCounterPicker}
        onClose={() => setShowCounterPicker(false)}
        onSelect={(car) => { setCounterCar(car); setSouhrnData(prev => ({ ...prev, protiucet: true })); }}
      />

      <ConfirmDialog
        visible={closeConfirmVisible}
        message="Zavřít bez uložení? Vaše data budou uložena jako návrh a můžete je později pokračovat v editaci."
        onConfirm={() => {
          setCloseConfirmVisible(false);
          router.back();
        }}
        onCancel={() => setCloseConfirmVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  stackedContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  sidebarTabs: {
    width: 280,
    borderRightWidth: 1,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sidebarTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
  },
  sidebarTabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    borderBottomWidth: 1,
    minHeight: 56,
  },
  headerButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  saveButton: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20 
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  tabNavigation: { paddingVertical: 12, borderBottomWidth: 1 },
  tabScrollContent: { paddingHorizontal: 16, gap: 8 },
  tabItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 24, 
    gap: 8 
  },
  tabText: { fontSize: 14, fontWeight: '500' },
  tabContent: { flex: 1, padding: 16 },
  // Input styles matching edit-purchase
  inputGroup: { marginBottom: 16, position: 'relative' },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  buyerName: { fontSize: 16, fontWeight: '500' },
  input: { 
    fontSize: 16, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    borderRadius: 10, 
    borderWidth: 1 
  },
  inputRightIcon: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: [{ translateY: -12 }],
  },
  icoSearchButton: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#e30613',
    borderRadius: 10,
  },
  icoSearchButtonDisabled: { opacity: 0.5 },
  icoSearchButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  switchRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingVertical: 12, 
    borderBottomWidth: 1 
  },
  switchLabel: { fontSize: 16 },
  sectionTitle: { 
    fontSize: 17, 
    fontWeight: '600', 
    marginBottom: 8
  },
  vinSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 0,
    paddingVertical: 12,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionDescription: { 
    fontSize: 14, 
    marginBottom: 16 
  },
  // Component status styles
  componentContainer: { 
    marginBottom: 12, 
    padding: 16, 
    borderRadius: 12 
  },
  componentHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  componentName: { fontSize: 16, fontWeight: '600' },
  statusSelector: { flexDirection: 'row', gap: 6 },
  statusButton: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 1.5
  },
  statusIndicator: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 8 
  },
  statusBadge: { width: 8, height: 8, borderRadius: 4 },
  statusLabelText: { fontSize: 13 },
  componentNotes: { 
    fontSize: 14, 
    padding: 12, 
    borderRadius: 10, 
    minHeight: 64,
    borderWidth: 1,
  },
  noteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  noteHeaderText: { fontSize: 13, fontWeight: '500' },
  generalNotesSection: { marginTop: 16 },
  multilineInput: { 
    fontSize: 14, 
    padding: 12, 
    borderRadius: 10, 
    minHeight: 100, 
    textAlignVertical: 'top' 
  },
  // VIN input styles
  vinInputContainer: { marginBottom: 16, padding: 16, borderRadius: 12 },
  inputLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  vinInputRow: { flexDirection: 'row', gap: 8 },
  vinTextInput: { 
    flex: 1, 
    fontSize: 16, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    borderRadius: 10, 
    borderWidth: 1,
    letterSpacing: 1
  },
  vinLookupButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    paddingHorizontal: 16, 
    backgroundColor: '#e30613', 
    borderRadius: 10 
  },
  vinLookupButtonDisabled: { opacity: 0.5 },
  vinLookupButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  vinHelpText: { fontSize: 12, marginTop: 8 },
  // Photo section styles
  photoSummarySection: { marginBottom: 16, padding: 16, borderRadius: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  summaryText: { fontSize: 15, fontWeight: '500' },
  photoSection: { marginBottom: 16, padding: 16, borderRadius: 12 },
  guidelinesSection: { marginBottom: 16, padding: 16, borderRadius: 12 },
  guidelinesList: { gap: 8, marginTop: 8 },
  guidelineItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guidelineText: { fontSize: 14, flex: 1 },
  bottomSpacer: { height: 40 },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  datePickerContainer: {
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  // New style for renderInput helper
  textInput: {
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    color: '#000000',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
    gap: 6,
  },
  warningText: {
    fontSize: 13,
    color: '#FF9500',
    fontWeight: '500',
  },
  // Thumbnail grid styles
  thumbGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  thumbItem: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  // Cover photo styles
  coverPhotoPreview: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    aspectRatio: 16 / 9,
  },
  coverPhotoImage: {
    width: '100%',
    height: '100%',
  },
  coverPhotoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
  },
  coverPhotoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  coverPhotoEmpty: {
    marginTop: 12,
    gap: 12,
  },
  coverPhotoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  coverPhotoActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rowButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionInline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e30613',
    backgroundColor: 'transparent',
  },
  actionInlineText: {
    fontSize: 14,
    fontWeight: '600',
  },
});