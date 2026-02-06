/**
 * Vehicle Data API Service
 * API pro přístup k datům o vozidlech z dataovozidlech.cz
 * 
 * Parametry:
 * - vin: VIN číslo vozidla (jednoznačný identifikátor)
 * - tp: Technický průkaz
 * - orv: Osvědčení o registraci vozidla
 * 
 * Status kódy:
 * - 1: Úspěch, data nalezena
 * - 3: Data nenalezena
 */

import Constants from 'expo-constants';
const API_BASE_URL = 'https://api.dataovozidlech.cz/api/vehicletechnicaldata/v2';

// API klíč - načítáme z různých zdrojů
const getApiKey = (): string => {
  // Try expo-constants extra first (with EXPO_PUBLIC_ prefix)
  const expoExtraPublic = Constants.expoConfig?.extra?.EXPO_PUBLIC_VEHICLE_DATA_API_KEY;
  if (expoExtraPublic) {
    console.log('[VehicleDataAPI] Klíč nalezen v expoConfig.extra.EXPO_PUBLIC_VEHICLE_DATA_API_KEY');
    return expoExtraPublic;
  }

  // Try without prefix
  const expoExtra = Constants.expoConfig?.extra?.VEHICLE_DATA_API_KEY;
  if (expoExtra) {
    console.log('[VehicleDataAPI] Klíč nalezen v expoConfig.extra.VEHICLE_DATA_API_KEY');
    return expoExtra;
  }

  // Try manifest extra (older expo versions)
  const manifestExtraPublic = (Constants.manifest as any)?.extra?.EXPO_PUBLIC_VEHICLE_DATA_API_KEY;
  if (manifestExtraPublic) {
    console.log('[VehicleDataAPI] Klíč nalezen v manifest.extra.EXPO_PUBLIC_VEHICLE_DATA_API_KEY');
    return manifestExtraPublic;
  }
  const manifestExtra = (Constants.manifest as any)?.extra?.VEHICLE_DATA_API_KEY;
  if (manifestExtra) {
    console.log('[VehicleDataAPI] Klíč nalezen v manifest.extra.VEHICLE_DATA_API_KEY');
    return manifestExtra;
  }

  // Try environment variables
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.EXPO_PUBLIC_VEHICLE_DATA_API_KEY) {
      console.log('[VehicleDataAPI] Klíč nalezen v process.env.EXPO_PUBLIC_VEHICLE_DATA_API_KEY');
      return process.env.EXPO_PUBLIC_VEHICLE_DATA_API_KEY;
    }
    if (process.env.VEHICLE_DATA_API_KEY) {
      console.log('[VehicleDataAPI] Klíč nalezen v process.env.VEHICLE_DATA_API_KEY');
      return process.env.VEHICLE_DATA_API_KEY;
    }
  }

  console.log('[VehicleDataAPI] API klíč nenalezen v žádném zdroji');
  return '';
};

export interface VehicleDataResponse {
  // Základní údaje
  vin?: string;
  znacka?: string;
  model?: string;
  rokVyroby?: number;
  datumPrvniRegistrace?: string;
  // Technické údaje
  palivo?: string;
  objemMotoru?: number;
  vykonKw?: number;
  vykonHp?: number;
  prevodovka?: string;
  pohon?: string;
  karoserie?: string;
  pocetDveri?: number;
  pocetMist?: number;
  barva?: string;
  // Hmotnosti
  hmotnostProvozni?: number;
  hmotnostMax?: number;
  // STK a emise
  stk?: string;
  emisniTrida?: string;
  // Další údaje
  pocetVlastniku?: number;
  pocetProvozovatelu?: number;
  error?: string;
  success?: boolean;
}

export interface VehicleSearchParams {
  vin?: string;
  tp?: string;
  orv?: string;
}

interface ApiResponse {
  Status: number;
  Data: any | null;
}

/**
 * Kontroluje, zda je API klíč nastaven
 */
export const hasApiKey = (): boolean => {
  const key = getApiKey();
  console.log('[VehicleDataAPI] Kontrola API klíče, délka:', key.length);
  return key.length > 0;
};

/**
 * Načte data o vozidle podle VIN, TP nebo ORV
 * Parametry lze libovolně kombinovat
 */
export const fetchVehicleData = async (params: VehicleSearchParams): Promise<VehicleDataResponse> => {
  const API_KEY = getApiKey();
  if (!API_KEY) {
    console.error('[VehicleDataAPI] API klíč není nastaven');
    throw new Error('API klíč není nastaven. Kontaktujte administrátora.');
  }

  if (!params.vin && !params.tp && !params.orv) {
    throw new Error('Musí být zadán alespoň jeden parametr: VIN, TP nebo ORV');
  }

  // Sestavení URL s parametry
  const queryParams = new URLSearchParams();
  if (params.vin) queryParams.append('vin', params.vin);
  if (params.tp) queryParams.append('tp', params.tp);
  if (params.orv) queryParams.append('orv', params.orv);

  const url = `${API_BASE_URL}?${queryParams.toString()}`;

  console.log('[VehicleDataAPI] Načítám data z:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'api_key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VehicleDataAPI] Chyba API:', response.status, errorText);
      throw new Error(`API chyba: ${response.status} - ${errorText}`);
    }

    const apiResponse: ApiResponse = await response.json();
    console.log('[VehicleDataAPI] Přijata odpověď:', apiResponse);

    // Zpracování status kódu
    if (apiResponse.Status === 3 || !apiResponse.Data) {
      throw new Error('Vozidlo nebylo nalezeno v databázi. Zkontrolujte zadané údaje.');
    }

    if (apiResponse.Status !== 1) {
      throw new Error(`API vrátilo neočekávaný status: ${apiResponse.Status}`);
    }

    return {
      success: true,
      ...mapApiResponseToVehicleData(apiResponse.Data),
    };
  } catch (error: any) {
    console.error('[VehicleDataAPI] Chyba při načítání:', error);

    // Detekce specifických chyb
    if (error.message === 'Load failed' || error.message === 'Network request failed') {
      // CORS nebo síťová chyba - typické pro webovou verzi
      throw new Error('Nepodařilo se připojit k API. Zkuste to prosím na mobilním zařízení nebo zkontrolujte připojení k internetu.');
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Chyba sítě. Zkontrolujte připojení k internetu.');
    }
    throw error;
  }
};

/**
 * Načte data o vozidle pouze podle VIN
 */
export const fetchVehicleDataByVin = async (vin: string): Promise<VehicleDataResponse> => {
  if (!vin || vin.length < 17) {
    throw new Error('VIN musí mít 17 znaků');
  }
  return fetchVehicleData({ vin: vin.toUpperCase() });
};

/**
 * Načte data o vozidle podle technického průkazu
 */
export const fetchVehicleDataByTP = async (tp: string): Promise<VehicleDataResponse> => {
  return fetchVehicleData({ tp });
};

/**
 * Načte data o vozidle podle osvědčení o registraci
 */
export const fetchVehicleDataByORV = async (orv: string): Promise<VehicleDataResponse> => {
  return fetchVehicleData({ orv });
};

/**
 * Mapuje odpověď z API na náš interface
 * Struktura odpovědi z dataovozidlech.cz
 */
const mapApiResponseToVehicleData = (data: any): Partial<VehicleDataResponse> => {
  if (!data) return {};

  console.log('[VehicleDataAPI] Mapuji data:', JSON.stringify(data, null, 2));
  // Logujeme všechna pole pro debugging STK
  console.log('[VehicleDataAPI] Všechna pole z API:', Object.keys(data));
  console.log('[VehicleDataAPI] Pole obsahující STK nebo platnost:', 
    Object.keys(data).filter(k => k.toLowerCase().includes('stk') || k.toLowerCase().includes('platnost') || k.toLowerCase().includes('tk'))
  );

  // Parsování roku z datumu první registrace
  let rokVyroby: number | undefined;
  if (data.DatumPrvniRegistrace) {
    const dateStr = data.DatumPrvniRegistrace;
    const year = parseInt(dateStr.substring(0, 4));
    if (!isNaN(year)) rokVyroby = year;
  }

  // Parsování datumu STK - zkusíme různé názvy polí z API
  let stk: string | undefined;
  const stkFieldNames = [
    'PravidelnaTechnickaProhlidkaDo', // Hlavní pole z API
    'PlatnostSTK', 'STK', 'PlatnostTK', 'DatumSTK', 'platnostSTK', 'PlatnostDoSTK',
    'STKDo', 'STKPlatnostDo', 'TKPlatnost', 'TechnickaKontrolaDo', 'PlatnostTechnickeKontroly'
  ];
  let stkRawValue: any = null;
  let foundFieldName: string | null = null;
  // Nejprve zkusíme přesné názvy
  for (const fieldName of stkFieldNames) {
    if (data[fieldName] !== undefined && data[fieldName] !== null && data[fieldName] !== '') {
      stkRawValue = data[fieldName];
      foundFieldName = fieldName;
      console.log(`[VehicleDataAPI] STK nalezeno v poli "${fieldName}":`, stkRawValue);
      break;
    }
  }
  // Pokud nenajdeme, zkusíme najít pole obsahující "stk" nebo "platnost" case-insensitive
  if (!stkRawValue) {
    for (const key of Object.keys(data)) {
      const lowerKey = key.toLowerCase();
      if ((lowerKey.includes('stk') || (lowerKey.includes('platnost') && lowerKey.includes('tk'))) && 
          data[key] !== undefined && data[key] !== null && data[key] !== '') {
        stkRawValue = data[key];
        foundFieldName = key;
        console.log(`[VehicleDataAPI] STK nalezeno dynamicky v poli "${key}":`, stkRawValue);
        break;
      }
    }
  }
  if (stkRawValue) {
    // Zkusíme parsovat jako datum
    const date = new Date(stkRawValue);
    if (!isNaN(date.getTime()) && date.getFullYear() > 1900) {
      stk = date.toLocaleDateString('cs-CZ');
      console.log('[VehicleDataAPI] STK parsováno jako datum:', stk);
    } else if (typeof stkRawValue === 'string') {
      // Pokud už je to string ve formátu dd.mm.yyyy, použijeme přímo
      if (stkRawValue.match(/^\d{1,2}\.\d{1,2}\.\d{4}$/)) {
        stk = stkRawValue;
        console.log('[VehicleDataAPI] STK použito přímo:', stk);
      } else if (stkRawValue.match(/^\d{4}-\d{2}-\d{2}/)) {
        // Formát ISO yyyy-mm-dd nebo yyyy-mm-ddThh:mm:ss
        const parts = stkRawValue.split('T')[0].split('-');
        if (parts.length === 3) {
          stk = `${parts[2]}.${parts[1]}.${parts[0]}`;
          console.log('[VehicleDataAPI] STK konvertováno z ISO:', stk);
        }
      }
    }
  } else {
    console.log('[VehicleDataAPI] STK pole nenalezeno. Dostupná pole:', Object.keys(data));
  }

  // Parsování výkonu z formátu "75 / 5500" (kW / otáčky)
  let vykonKw: number | undefined;
  if (data.MotorMaxVykon) {
    const powerMatch = data.MotorMaxVykon.match(/^(\d+)/);
    if (powerMatch) {
      vykonKw = parseInt(powerMatch[1]);
    }
  }

  // Mapování paliva na české názvy
  const palivoMap: Record<string, string> = {
    'BA': 'Benzín',
    'NM': 'Nafta',
    'NA': 'Nafta',
    'LPG': 'LPG',
    'CNG': 'CNG',
    'EL': 'Elektro',
    'HY': 'Hybrid',
    'PHEV': 'Plug-in Hybrid',
  };
  const palivo = data.Palivo ? (palivoMap[data.Palivo] || data.Palivo) : undefined;

  // Mapování karoserie - klíče z API (VozidloDruh2)
  const karoserieMap: Record<string, string> = {
    'AC KOMBI': 'Kombi',
    'AA SEDAN': 'Sedan',
    'AB HATCHBACK': 'Hatchback',
    'AD COUPE': 'Coupe',
    'AD KUPÉ': 'Coupe',
    'AD KUPE': 'Coupe',
    'AE KABRIOLET': 'Cabrio',
    'AE CABRIO': 'Cabrio',
    'AF SUV': 'SUV',
    'AF TERÉNNÍ': 'SUV',
    'AG MPV': 'SUV',
  };
  let karoserie = data.VozidloDruh2;
  if (karoserie) {
    const upperKaroserie = karoserie.toUpperCase();
    // Zkusíme najít v mapě
    karoserie = karoserieMap[upperKaroserie];
    // Pokud nenajdeme, zkusíme partial match
    if (!karoserie) {
      for (const [key, value] of Object.entries(karoserieMap)) {
        if (upperKaroserie.includes(key.split(' ')[1]) || key.includes(upperKaroserie)) {
          karoserie = value;
          break;
        }
      }
    }
    // Pokud stále nenajdeme, zkusíme extrahovat druhé slovo a namapovat
    if (!karoserie) {
      const secondWord = data.VozidloDruh2.split(' ')[1]?.toUpperCase();
      if (secondWord) {
        if (secondWord.includes('KOMBI') || secondWord.includes('ESTATE')) karoserie = 'Kombi';
        else if (secondWord.includes('SEDAN') || secondWord.includes('LIMUZÍNA')) karoserie = 'Sedan';
        else if (secondWord.includes('HATCH') || secondWord.includes('LIFTBACK')) karoserie = 'Hatchback';
        else if (secondWord.includes('COUP') || secondWord.includes('KUP')) karoserie = 'Coupe';
        else if (secondWord.includes('CABR') || secondWord.includes('KABR')) karoserie = 'Cabrio';
        else if (secondWord.includes('SUV') || secondWord.includes('TERÉN') || secondWord.includes('OFF')) karoserie = 'SUV';
        else karoserie = data.VozidloDruh2; // Fallback na původní hodnotu
      }
    }
  }

  // Mapování pohonu z NapravyPocetDruh
  // API může vracet:
  // - Textové hodnoty: "Přední", "Zadní", "4x4"
  // - Číselný formát: "2/1" = 2 nápravy, 1 poháněná, "2/2" = 4x4
  let pohon: string | undefined;
  if (data.NapravyPocetDruh) {
    const napravyStr = data.NapravyPocetDruh.toString().trim();
    console.log('[VehicleDataAPI] NapravyPocetDruh:', napravyStr);

    const upperStr = napravyStr.toUpperCase();

    // Nejprve zkusíme textové hodnoty
    if (upperStr.includes('PŘEDN') || upperStr.includes('PREDN') || upperStr === 'FRONT' || upperStr === 'FWD') {
      pohon = 'Přední';
    } else if (upperStr.includes('ZADN') || upperStr === 'REAR' || upperStr === 'RWD') {
      pohon = 'Zadní';
    } else if (upperStr.includes('4X4') || upperStr.includes('4WD') || upperStr.includes('AWD') || 
               upperStr.includes('QUATTRO') || upperStr.includes('XDRIVE') || upperStr.includes('4MATIC')) {
      pohon = '4x4';
    } else {
      // Zkusíme číselný formát "počet náprav/počet poháněných"
      const match = napravyStr.match(/(\d+)\s*\/\s*(\d+)/);
      if (match) {
        const drivenAxles = parseInt(match[2]);
        if (drivenAxles >= 2) {
          pohon = '4x4';
        } else {
          pohon = 'Přední'; // Default pro 1 poháněnou nápravu
        }
      } else if (napravyStr === '2/2') {
        pohon = '4x4';
      }
    }
  }

  // Parsování data první registrace pro "Do provozu"
  let datumDoProvozu: string | undefined;
  if (data.DatumPrvniRegistrace) {
    const date = new Date(data.DatumPrvniRegistrace);
    if (!isNaN(date.getTime())) {
      datumDoProvozu = date.toLocaleDateString('cs-CZ');
    }
  }

  // Parsování počtu vlastníků a provozovatelů
  let pocetVlastniku: number | undefined;
  if (data.PocetVlastniku !== undefined && data.PocetVlastniku !== null) {
    const parsed = parseInt(data.PocetVlastniku);
    if (!isNaN(parsed)) {
      pocetVlastniku = parsed;
    }
  }

  let pocetProvozovatelu: number | undefined;
  if (data.PocetProvozovatelu !== undefined && data.PocetProvozovatelu !== null) {
    const parsed = parseInt(data.PocetProvozovatelu);
    if (!isNaN(parsed)) {
      pocetProvozovatelu = parsed;
    }
  }
  return {
    vin: data.VIN,
    znacka: data.TovarniZnacka,
    model: data.ObchodniOznaceni,
    rokVyroby,
    datumPrvniRegistrace: datumDoProvozu,
    palivo,
    objemMotoru: data.MotorZdvihObjem || data.ZdvihovyObjem,
    vykonKw,
    vykonHp: vykonKw ? Math.round(vykonKw * 1.36) : undefined,
    prevodovka: undefined, // API neposkytuje
    pohon,
    karoserie,
    pocetDveri: data.PocetDveri,
    pocetMist: data.PocetMistCelkem || data.PocetMistKSezeni,
    barva: data.BarvaTov || data.BarvaText,
    hmotnostProvozni: data.ProvozniHmotnost,
    hmotnostMax: data.NejvetsiTechPripustnaHmotnost,
    stk,
    emisniTrida: data.EmisniUroven || data.EmisniTridaKod,
    pocetVlastniku,
    pocetProvozovatelu,
  };
};

/**
 * Validuje formát VIN
 */
export const validateVin = (vin: string): { valid: boolean; message?: string } => {
  if (!vin) {
    return { valid: false, message: 'VIN je povinný' };
  }

  const cleanVin = vin.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (cleanVin.length !== 17) {
    return { valid: false, message: 'VIN musí mít přesně 17 znaků' };
  }

  // VIN nesmí obsahovat I, O, Q
  if (/[IOQ]/.test(cleanVin)) {
    return { valid: false, message: 'VIN nesmí obsahovat písmena I, O nebo Q' };
  }

  return { valid: true };
};