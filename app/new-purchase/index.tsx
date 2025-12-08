import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SelectionPicker } from '@/components/SelectionPicker';
import { WheelPicker } from '@/components/WheelPicker';
import { CameraCapture } from '@/components/CameraCapture';
import { DatePickerField } from '@/components/DatePickerField';
import { PhoneInput } from '@/components/PhoneInput';
import { SpzInput } from '@/components/SpzInput';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Purchase, PurchaseState, CarCondition, ClientType } from '@/constants/types';
import {
  VEHICLE_MAKES,
  VEHICLE_MODELS,
} from '@/constants/vehicleOptions';
import { 
  fetchVehicleDataByVin, 
  validateVin, 
  hasApiKey,
  VehicleDataResponse 
} from '@/services/vehicleDataApi';
import { 
  AresCompanyData,
  fetchCompanyByIco,
  validateIco,
} from '@/services/aresApi';

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
    title: 'Foto vady', 
    icon: 'camera' as const
  },
];

const STATES = ['---Výběr---', 'Nový', 'Probíhá', 'Dokončen', 'Zrušen'];
const BUYERS = ['Kuruc Daniel', 'Jan Novák', 'Petr Svoboda', 'Marie Dvořáková'];
const MOTOROVA_VARIANTA = ['---Výběr---', '1.0 TSI', '1.4 TFSI', '1.6 TDI', '2.0 TDI', '2.0 TFSI', '3.0 TDI'];
const PREVODOVKA = ['---Výběr---', 'Automatická', 'Manuální'];
const KAROSERIE = ['---Výběr---', 'Sedan', 'Hatchback', 'Kombi', 'SUV', 'Coupe', 'Cabrio'];
const POHON = ['---Výběr---', 'Přední', 'Zadní', '4x4'];
const ODKUD_ZNA = ['---Výběr---', 'Internet', 'Doporučení', 'Reklama', 'Sociální sítě', 'Jiné'];

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

  // Try to find in KAROSERIE options
  const found = KAROSERIE.find(k => 
    k !== '---Výběr---' && normalized.includes(k.toUpperCase())
  );
  if (found) return found;

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
export default function NewPurchaseScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    vin?: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
    isCompany?: string;
    ico?: string;
    vehicleData?: string;
    companyData?: string;
  }>();
  const [selectedTab, setSelectedTab] = useState('zakladni');

  // Form data for all tabs
  const [zakladniData, setZakladniData] = useState({
    stav: 'Nový',
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
    stk: '18.09.2025',
    vykon: '',
    prevodovka: '---Výběr---',
    karoserie: '---Výběr---',
    pohon: '---Výběr---',
    kolaAI: false,
    doProvozu: '18.09.2025',
    dovoz: false,
    prvniMajitel: false,
    servisniKnizka: false,
    bezpecnostniSrouby: false,
  });

  const [stavSoucastiData, setStavSoucastiData] = useState<ComponentStatus[]>(
    VEHICLE_COMPONENTS.map(component => ({
      component,
      status: 'good' as const,
      notes: '',
    }))
  );

  const [generalNotes, setGeneralNotes] = useState('');

  // Photo states
  const [vehicleImages, setVehicleImages] = useState<string[]>([]);
  const [defectImages, setDefectImages] = useState<string[]>([]);
  const [interiorImages, setInteriorImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [vinLoading, setVinLoading] = useState(false);
  const [icoLoading, setIcoLoading] = useState(false);

  const { addPurchase } = usePurchases();

  const [souhrnData, setSouhrnData] = useState({
    vin: '',
    vinProveren: false,
    cenaVykupu: '',
    protiucet: false,
    predCenaProdeje: '',
    odkudZna: '---Výběr---',
  });

  // Initialize form from route params - single useEffect
  useEffect(() => {
    // Only run once on mount, skip if no relevant params
    const hasParams = params.vin || params.firstName || params.companyName || params.vehicleData;
    if (!hasParams) return;

    console.log('[NewPurchase] Initializing from params:', params);

    // Set VIN
    if (params.vin) {
      setSouhrnData(prev => ({ ...prev, vin: params.vin || '' }));
    }

    // Set client info
    const isCompany = params.isCompany === '1';
    setZakladniData(prev => ({
      ...prev,
      jmeno: params.firstName || prev.jmeno,
      prijmeni: params.lastName || prev.prijmeni,
      nazevFirmy: params.companyName || prev.nazevFirmy,
      firma: isCompany,
      ico: params.ico || prev.ico,
    }));

    // Parse and apply company data from ARES
    if (params.companyData) {
      try {
        const companyData = JSON.parse(params.companyData) as AresCompanyData;
        console.log('[NewPurchase] Applying ARES company data:', companyData);

        setZakladniData(prev => ({
          ...prev,
          nazevFirmy: companyData.nazev || prev.nazevFirmy,
          ico: companyData.ico || prev.ico,
          ulice: companyData.ulice || prev.ulice,
          mesto: companyData.mesto || prev.mesto,
          psc: companyData.psc?.replace(/\s/g, '') || prev.psc,
        }));
      } catch (e) {
        console.error('[NewPurchase] Failed to parse company data:', e);
      }
    }

    // Parse and apply vehicle data from API
    if (params.vehicleData) {
      try {
        const vehicleData = JSON.parse(params.vehicleData) as VehicleDataResponse;
        console.log('[NewPurchase] Applying vehicle data:', vehicleData);

        // Normalize brand and model using helper functions
        const normalizedZnacka = normalizeZnacka(vehicleData.znacka || '');
        const normalizedModel = findMatchingModel(normalizedZnacka, vehicleData.model || '');

        // Map fuel to motorovaVarianta
        const motorovaVarianta = mapFuelToWheelPicker(vehicleData.palivo || '', vehicleData.objemMotoru);

        // Map karoserie
        const karoserie = mapKaroserie(vehicleData.karoserie || '');

        // Map prevodovka
        const prevodovka = mapPrevodovka(vehicleData.prevodovka || '');

        // Map pohon
        const pohon = mapPohon(vehicleData.pohon || '');
        setAutomobilData(prev => ({
          ...prev,
          znacka: normalizedZnacka || prev.znacka,
          model: normalizedModel || prev.model,
          motorovaVarianta: motorovaVarianta || prev.motorovaVarianta,
          vykon: vehicleData.vykonKw?.toString() || prev.vykon,
          karoserie: karoserie || prev.karoserie,
          stk: vehicleData.stk || prev.stk,
          doProvozu: vehicleData.datumPrvniRegistrace || prev.doProvozu,
          prevodovka: prevodovka || prev.prevodovka,
          pohon: pohon || prev.pohon,
        }));

        setSouhrnData(prev => ({ ...prev, vinProveren: true }));
      } catch (e) {
        console.error('[NewPurchase] Failed to parse vehicle data:', e);
      }
    }
  }, []); // Empty dependency array - run only once on mount

  const handleTabPress = (tab: typeof PURCHASE_TABS[0]) => {
    setSelectedTab(tab.key);
  };

  const handleClose = () => {
    router.back();
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
      console.log('[VIN Lookup] Načtená data:', JSON.stringify(vehicleData, null, 2));

      // Normalize brand and model using helper functions
      const normalizedZnacka = normalizeZnacka(vehicleData.znacka || '');
      const normalizedModel = findMatchingModel(normalizedZnacka, vehicleData.model || '');

      // Map fuel to motorovaVarianta
      const motorovaVarianta = mapFuelToWheelPicker(vehicleData.palivo || '', vehicleData.objemMotoru);

      // Map karoserie
      const karoserie = mapKaroserie(vehicleData.karoserie || '');

      // Map prevodovka
      const prevodovka = mapPrevodovka(vehicleData.prevodovka || '');

      // Map pohon
      const pohon = mapPohon(vehicleData.pohon || '');
      // Process STK date - ensure correct format dd.mm.yyyy
      let stkValue = vehicleData.stk;
      if (stkValue) {
        console.log('[VIN Lookup] STK z API:', stkValue);
        // STK by mělo být ve formátu dd.mm.yyyy - ověříme
        if (!stkValue.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
          // Zkusíme parsovat a přeformátovat
          const stkDate = new Date(stkValue);
          if (!isNaN(stkDate.getTime())) {
            stkValue = stkDate.toLocaleDateString('cs-CZ');
          }
        }
        console.log('[VIN Lookup] STK po zpracování:', stkValue);
      }

      // Process doProvozu date
      let doProvozuValue = vehicleData.datumPrvniRegistrace;
      if (doProvozuValue) {
        console.log('[VIN Lookup] Do provozu z API:', doProvozuValue);
      }

      // Aktualizovat data automobilu z API
      setAutomobilData(prev => {
        const updated = {
          ...prev,
          znacka: normalizedZnacka || prev.znacka,
          model: normalizedModel || prev.model,
          motorovaVarianta: motorovaVarianta || prev.motorovaVarianta,
          vykon: vehicleData.vykonKw?.toString() || prev.vykon,
          karoserie: karoserie || prev.karoserie,
          stk: stkValue || prev.stk,
          doProvozu: doProvozuValue || prev.doProvozu,
          prevodovka: prevodovka || prev.prevodovka,
          pohon: pohon || prev.pohon,
        };
        console.log('[VIN Lookup] Aktualizovaná automobilData:', updated);
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
      console.error('[VIN Lookup] Chyba:', error);
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
      console.log('[IČO Lookup] Načtená data:', companyData);
      if (companyData && companyData.success) {
        // Aktualizovat všechna pole včetně adresy
        setZakladniData(prev => {
          const updated = {
            ...prev,
            nazevFirmy: companyData.nazev || prev.nazevFirmy,
            ulice: companyData.ulice || prev.ulice,
            mesto: companyData.mesto || prev.mesto,
            psc: companyData.psc?.replace(/\s/g, '') || prev.psc, // Odstranit mezery z PSČ
          };
          console.log('[IČO Lookup] Aktualizovaná data:', updated);
          return updated;
        });
        // Sestavit zprávu s načtenými údaji
        const loadedFields = [];
        if (companyData.nazev) loadedFields.push(`Název: ${companyData.nazev}`);
        if (companyData.ulice) loadedFields.push(`Ulice: ${companyData.ulice}`);
        if (companyData.mesto) loadedFields.push(`Město: ${companyData.mesto}`);
        if (companyData.psc) loadedFields.push(`PSČ: ${companyData.psc}`);
        Alert.alert(
          'Úspěch', 
          `Data firmy byla načtena z ARES:\n\n${loadedFields.join('\n')}`
        );
      } else {
        Alert.alert('Chyba', 'Firma s tímto IČO nebyla nalezena');
      }
    } catch (error: any) {
      console.error('[IČO Lookup] Chyba:', error);
      Alert.alert('Chyba', error.message || 'Nepodařilo se načíst data firmy');
    } finally {
      setIcoLoading(false);
    }
  };

  const handleIcoSearch = handleFetchIco;

  const handleSave = async () => {
    // Validate required fields
    if (zakladniData.firma) {
      if (!zakladniData.nazevFirmy.trim()) {
        Alert.alert('Chyba', 'Prosím vyplňte název firmy');
        setSelectedTab('zakladni');
        return;
      }
    } else {
      if (!zakladniData.jmeno.trim() || !zakladniData.prijmeni.trim()) {
        Alert.alert('Chyba', 'Prosím vyplňte jméno a příjmení klienta');
        setSelectedTab('zakladni');
        return;
      }
    }

    if (!automobilData.spz.trim()) {
      Alert.alert('Chyba', 'Prosím vyplňte SPZ vozidla');
      setSelectedTab('automobil');
      return;
    }

    // Get client name for display
    const clientDisplayName = zakladniData.firma 
      ? zakladniData.nazevFirmy 
      : `${zakladniData.jmeno} ${zakladniData.prijmeni}`;
    // Show confirmation dialog
    Alert.alert(
      'Potvrdit uložení',
      `Chcete uložit výkup pro klienta "${clientDisplayName}" s vozidlem SPZ "${automobilData.spz}"?`,
      [
        {
          text: 'Zrušit',
          style: 'cancel',
        },
        {
          text: 'Uložit',
          style: 'default',
          onPress: () => performSave(),
        },
      ]
    );
  };

  const performSave = async () => {
    setLoading(true);
    try {
      // Combine all images
      const allImages = [
        ...vehicleImages,
        ...defectImages,
        ...interiorImages
      ];

      // Determine purchase state
      let purchaseState = PurchaseState.NEW;
      if (zakladniData.stav === 'Probíhá') purchaseState = PurchaseState.IN_PROGRESS;
      else if (zakladniData.stav === 'Dokončen') purchaseState = PurchaseState.COMPLETED;
      else if (zakladniData.stav === 'Zrušen') purchaseState = PurchaseState.CANCELLED;

      // Get client name
      const clientName = zakladniData.firma 
        ? zakladniData.nazevFirmy 
        : `${zakladniData.jmeno} ${zakladniData.prijmeni}`.trim();

      // Parse year from doProvozu date
      let carYear = new Date().getFullYear();
      if (automobilData.doProvozu) {
        const match = automobilData.doProvozu.match(/(\d{4})/);
        if (match) carYear = parseInt(match[1]);
      }

      // Create purchase object with all collected data
      const newPurchase: Purchase = {
        id: Date.now().toString(),
        clientName: clientName || 'Neznámý klient',
        clientType: zakladniData.firma ? ClientType.COMPANY : ClientType.PERSONAL,
        spz: automobilData.spz || 'N/A',
        purchaseDate: zakladniData.datumVykupu || undefined,
        purchaseState,
        employeeId: '1', // Current user
        // Car details - complete mapping
        carDetails: {
          id: Date.now().toString(),
          make: automobilData.znacka !== '---Výběr---' ? automobilData.znacka : 'Neznámá',
          model: automobilData.model !== '---Výběr---' ? automobilData.model : 'Neznámý',
          year: carYear,
          vin: souhrnData.vin || undefined,
          color: undefined,
          mileage: automobilData.km ? parseInt(automobilData.km) : undefined,
          fuelType: automobilData.motorovaVarianta !== '---Výběr---' ? automobilData.motorovaVarianta : undefined,
          engineSize: automobilData.vykon ? `${automobilData.vykon} kW` : undefined,
          transmission: automobilData.prevodovka !== '---Výběr---' ? automobilData.prevodovka : undefined,
          condition: CarCondition.USED,
          // Extended car fields
          bodyType: automobilData.karoserie !== '---Výběr---' ? automobilData.karoserie : undefined,
          driveType: automobilData.pohon !== '---Výběr---' ? automobilData.pohon : undefined,
          stk: automobilData.stk || undefined,
          firstRegistration: automobilData.doProvozu || undefined,
          isImport: automobilData.dovoz,
          isFirstOwner: automobilData.prvniMajitel,
          hasServiceBook: automobilData.servisniKnizka,
          hasSecurityScrews: automobilData.bezpecnostniSrouby,
          hasAiWheels: automobilData.kolaAI,
        },
        // Notes
        notes: generalNotes || undefined,
        // Images
        images: allImages.length > 0 ? allImages : undefined,
        // Financial data
        totalAmount: souhrnData.cenaVykupu ? parseInt(souhrnData.cenaVykupu) : (zakladniData.cenaNabidnuta ? parseInt(zakladniData.cenaNabidnuta) : undefined),
        customerPrice: zakladniData.cenaZakaznik ? parseInt(zakladniData.cenaZakaznik) : undefined,
        offeredPrice: zakladniData.cenaNabidnuta ? parseInt(zakladniData.cenaNabidnuta) : undefined,
        expectedSalePrice: souhrnData.predCenaProdeje ? parseInt(souhrnData.predCenaProdeje) : undefined,
        // Dates
        inspectionDate: zakladniData.datumProhlidky || undefined,
        // Client data
        isVatPayer: zakladniData.platceDPH,
        phone: zakladniData.telefon || undefined,
        street: zakladniData.ulice || undefined,
        city: zakladniData.mesto || undefined,
        postalCode: zakladniData.psc || undefined,
        // Company info (if applicable)
        companyInfo: zakladniData.firma ? {
          companyName: zakladniData.nazevFirmy,
          ico: zakladniData.ico || undefined,
          dic: undefined, // Not collected in form
        } : undefined,
        // Summary data
        sourceKnowledge: souhrnData.odkudZna !== '---Výběr---' ? souhrnData.odkudZna : undefined,
        isCounterAccount: souhrnData.protiucet,
        vinVerified: souhrnData.vinProveren,
        // Component statuses
        componentStatuses: stavSoucastiData.map(item => ({
          component: item.component,
          status: item.status,
          notes: item.notes || undefined,
        })),
      };

      console.log('[NewPurchase] Ukládám výkup:', JSON.stringify(newPurchase, null, 2));
      addPurchase(newPurchase);

      Alert.alert(
        'Úspěch',
        'Výkup byl úspěšně uložen',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('[NewPurchase] Chyba při ukládání:', error);
      Alert.alert('Chyba', 'Nepodařilo se uložit výkup');
    } finally {
      setLoading(false);
    }
  };

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
    }
  ) => (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        activeOpacity={options?.editable === false && options?.onPress ? 0.7 : 1}
        onPress={options?.onPress}
        disabled={options?.editable !== false}
      >
        <View pointerEvents={options?.editable === false ? 'none' : 'auto'}>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
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
    </View>
  );

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
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Základní informace</Text>

      <SelectionPicker
        label="Stav"
        value={zakladniData.stav}
        options={STATES}
        onSelect={(value) => setZakladniData(prev => ({ ...prev, stav: value }))}
        placeholder="---Výběr---"
      />

      <SelectionPicker
        label="Výkupčí"
        value={zakladniData.vykupci}
        options={BUYERS}
        onSelect={(value) => setZakladniData(prev => ({ ...prev, vykupci: value }))}
        placeholder="Vyberte výkupčího..."
      />

      <DatePickerField
        label="Datum prohlídky"
        value={zakladniData.datumProhlidky}
        onChange={(dateStr) => setZakladniData(prev => ({ ...prev, datumProhlidky: dateStr }))}
        placeholder="dd.mm.yyyy hh:mm"
      />

      {renderInputField(
        'Cena zákazník', 
        zakladniData.cenaZakaznik, 
        (text) => setZakladniData(prev => ({ ...prev, cenaZakaznik: text })),
        { placeholder: '0', keyboardType: 'numeric' }
      )}

      {renderInputField(
        'Cena nabídnuta', 
        zakladniData.cenaNabidnuta, 
        (text) => setZakladniData(prev => ({ ...prev, cenaNabidnuta: text })),
        { placeholder: '0', keyboardType: 'numeric' }
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
            { placeholder: 'Zadejte název firmy...' }
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
          />
        </>
      ) : (
        <>
          {renderInputField(
            'Jméno', 
            zakladniData.jmeno, 
            (text) => setZakladniData(prev => ({ ...prev, jmeno: text })),
            { placeholder: 'Zadejte jméno...' }
          )}
          {renderInputField(
            'Příjmení', 
            zakladniData.prijmeni, 
            (text) => setZakladniData(prev => ({ ...prev, prijmeni: text })),
            { placeholder: 'Zadejte příjmení...' }
          )}
          {/* Replace renderInputField for Telefon with PhoneInput */}
          <PhoneInput
            label="Telefon"
            value={zakladniData.telefon}
            onChangeText={(text) => setZakladniData(prev => ({ ...prev, telefon: text }))}
            placeholder="xxx xxx xxx"
          />
          <SelectionPicker
            label="Odkud zná"
            value={souhrnData.odkudZna}
            options={ODKUD_ZNA}
            onSelect={(value) => setSouhrnData(prev => ({ ...prev, odkudZna: value }))}
            placeholder="---Výběr---"
          />
        </>
      )}
    </ScrollView>
  );

  const renderAutomobilContent = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
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
          Zadejte VIN a klikněte na "Načíst" pro automatické doplnění údajů o vozidle
        </Text>
      </View>

      <SelectionPicker
        label="Značka"
        value={automobilData.znacka}
        options={['---Výběr---', ...VEHICLE_MAKES]}
        onSelect={handleMakeChange}
        placeholder="---Výběr---"
      />

      <SelectionPicker
        label="Model"
        value={automobilData.model}
        options={getAvailableModels()}
        onSelect={(value) => setAutomobilData(prev => ({ ...prev, model: value }))}
        placeholder="---Výběr---"
      />

      <SpzInput
        label="SPZ"
        value={automobilData.spz}
        onChangeText={(text) => setAutomobilData(prev => ({ ...prev, spz: text }))}
        placeholder="1A2 3456"
      />

      <WheelPicker
        label="Motorová varianta"
        value={automobilData.motorovaVarianta}
        options={MOTOROVA_VARIANTA}
        onSelect={(value) => setAutomobilData(prev => ({ ...prev, motorovaVarianta: value }))}
        placeholder="---Výběr---"
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
      />

      <SelectionPicker
        label="Karoserie"
        value={automobilData.karoserie}
        options={KAROSERIE}
        onSelect={(value) => setAutomobilData(prev => ({ ...prev, karoserie: value }))}
        placeholder="---Výběr---"
      />

      <SelectionPicker
        label="Pohon"
        value={automobilData.pohon}
        options={POHON}
        onSelect={(value) => setAutomobilData(prev => ({ ...prev, pohon: value }))}
        placeholder="---Výběr---"
      />
      {renderToggleField(
        'Kola AI',
        automobilData.kolaAI,
        (value) => setAutomobilData(prev => ({ ...prev, kolaAI: value }))
      )}

      <DatePickerField
        label="Do provozu"
        value={automobilData.doProvozu}
        onChange={(dateStr) => setAutomobilData(prev => ({ ...prev, doProvozu: dateStr }))}
        placeholder="dd.mm.yyyy"
      />
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
        'Bezpečnostní šrouby',
        automobilData.bezpecnostniSrouby,
        (value) => setAutomobilData(prev => ({ ...prev, bezpecnostniSrouby: value }))
      )}

      {renderToggleField(
        'VIN prověřen',
        souhrnData.vinProveren,
        (value) => setSouhrnData(prev => ({ ...prev, vinProveren: value }))
      )}

      {renderToggleField(
        'Protiúčet',
        souhrnData.protiucet,
        (value) => setSouhrnData(prev => ({ ...prev, protiucet: value }))
      )}
    </ScrollView>
  );

  const renderStavSoucastiContent = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
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

          <TextInput
            style={[styles.componentNotes, { backgroundColor: theme.inputBackground, color: theme.text }]}
            value={item.notes}
            onChangeText={(text) => updateComponentNotes(index, text)}
            placeholder="Další poznámky k této součásti..."
            placeholderTextColor={theme.textTertiary}
            multiline
            numberOfLines={2}
          />
        </View>
      ))}

      <View style={styles.generalNotesSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Obecné poznámky</Text>
        <TextInput
          style={[styles.multilineInput, { backgroundColor: theme.card, color: theme.text }]}
          value={generalNotes}
          onChangeText={setGeneralNotes}
          placeholder="Celkové poznámky a pozorování stavu vozidla..."
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

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
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

        {/* Vehicle Exterior Photos */}
        <View style={[styles.photoSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Exteriér vozidla</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Zachyťte celkový stav exteriéru, úhly a obecný vzhled
          </Text>
          <CameraCapture
            images={vehicleImages}
            onAddImage={(uri) => setVehicleImages(prev => [...prev, uri])}
            onAddImages={(uris) => setVehicleImages(prev => [...prev, ...uris])}
            onRemoveImage={(index) => setVehicleImages(prev => prev.filter((_, i) => i !== index))}
          />
        </View>

        {/* Defects and Damage Photos */}
        <View style={[styles.photoSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Vady a poškození</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Zdokumentujte škrábance, promáčknutí, rez nebo jiné problémy
          </Text>
          <CameraCapture
            images={defectImages}
            onAddImage={(uri) => setDefectImages(prev => [...prev, uri])}
            onAddImages={(uris) => setDefectImages(prev => [...prev, ...uris])}
            onRemoveImage={(index) => setDefectImages(prev => prev.filter((_, i) => i !== index))}
          />
        </View>

        {/* Interior Photos */}
        <View style={[styles.photoSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Stav interiéru</Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Zachyťte sedadla, palubní desku, ovládací prvky a opotřebení interiéru
          </Text>
          <CameraCapture
            images={interiorImages}
            onAddImage={(uri) => setInteriorImages(prev => [...prev, uri])}
            onAddImages={(uris) => setInteriorImages(prev => [...prev, ...uris])}
            onRemoveImage={(index) => setInteriorImages(prev => prev.filter((_, i) => i !== index))}
          />
        </View>

        {/* Photo Guidelines */}
        <View style={[styles.guidelinesSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Pokyny pro fotografování</Text>
          <View style={styles.guidelinesList}>
            {[
              'Pořizujte jasné, dobře osvětlené fotografie',
              'Zachyťte více úhlů pro každou oblast',
              'Zaměřte se na jakékoli poškození nebo vady',
              'Přiložte detailní záběry problematických oblastí',
              'Zajistěte, aby fotografie nebyly rozmazané',
              'Zdokumentujte všechny významné funkce'
            ].map((guideline, index) => (
              <View key={index} style={styles.guidelineItem}>
                <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                <Text style={[styles.guidelineText, { color: theme.textSecondary }]}>{guideline}</Text>
              </View>
            ))}
          </View>
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

      {/* Tab Navigation */}
      <View style={[styles.tabNavigation, { backgroundColor: theme.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
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

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {renderTabContent()}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    padding: 10, 
    borderRadius: 8, 
    minHeight: 40 
  },
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
});