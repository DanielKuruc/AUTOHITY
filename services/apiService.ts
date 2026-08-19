import { Purchase } from '@/constants/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { authEndpoint } from '@/services/authApiService';

const PHP_BASE = process.env.EXPO_PUBLIC_PHP_API_BASE || 'https://autohity.cz';
export const API_BASE_URL = `${PHP_BASE}/php-api`;
const AUTH_API_URL = process.env.EXPO_PUBLIC_AUTH_API_URL || 'https://auth-server.example.com'; // Separate auth server - set via env

const ABSOLUTE_BASE_URL = 'https://autohity.cz';
const absolutizeUrl = (u: string): string => {
  if (!u) return u;
  // Backward-compat: fix old prefix
  if (u.startsWith('/api/photos/')) u = u.replace('/api/photos/', '/php-api/photos/');
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  // handle leading slash
  if (u.startsWith('/')) return `${ABSOLUTE_BASE_URL}${u}`;
  return `${ABSOLUTE_BASE_URL}/${u}`;
};

// Aktuální session token z AuthContext - AuthContext ho sem propisuje při loginu/
// logoutu/rehydrataci, aby ho i moduly mimo React strom (tento soubor) mohly
// přiložit k požadavkům na php-api (např. admin endpointy chráněné Auth::requireAdmin()).
let globalJwtToken: string | null = null;
export const setGlobalJwtToken = (token: string | null) => {
  globalJwtToken = token;
};
const getAuthToken = (): string | null => globalJwtToken;

// Helper to create auth headers - exported so other service modules (e.g.
// vehicleMakesModelsApi.ts) can attach the same Bearer token without duplicating this.
export const getAuthHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Helper: Transform snake_case to camelCase
const snakeToCamel = (str: string): string => {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

const camelToSnake = (str: string): string => {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
};

// Normalize booleans coming from API ("0"/"1", 0/1, "true"/"false", true/false)
const normalizeBool = (v: any): boolean | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v === 1;
  if (typeof v === 'string') {
    const s = v.trim().toLowerCase();
    if (s === '1' || s === 'true' || s === 'yes' || s === 'ano') return true;
    if (s === '0' || s === 'false' || s === 'no' || s === 'ne') return false;
  }
  return undefined;
};

export const transformApiToCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(transformApiToCamelCase);
  }
  if (obj !== null && typeof obj === 'object') {
    const transformed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key);
      // Photos -> images
      if ((camelKey === 'images' || camelKey === 'defectImages' || key === 'photos' || key === 'defect_photos') && typeof value === 'string') {
        try {
          const parsed = JSON.parse(value as string);
          if (key === 'photos' || camelKey === 'images') transformed['images'] = parsed;
          else transformed['defectImages'] = parsed;
        } catch {
          if (key === 'photos' || camelKey === 'images') transformed['images'] = value as any;
          else transformed['defectImages'] = value as any;
        }
      } else if (key === 'photos' && Array.isArray(value)) {
        transformed['images'] = value;
      } else if (key === 'defect_photos' && Array.isArray(value)) {
        transformed['defectImages'] = value;
      } else if ((camelKey.startsWith('is') || camelKey.startsWith('has')) && camelKey !== 'isPriority') {
        // CRITICAL: isPriority MUST stay as INT (0/1), NOT convert to boolean!
        const b = normalizeBool(value);
        transformed[camelKey] = b === undefined ? value : b;
      } else if (camelKey === 'isPriority') {
        // isPriority stays as INT 0 or 1, never convert to boolean
        transformed[camelKey] = value === null || value === undefined ? undefined : (value === 1 || value === '1' ? 1 : 0);
      } else if (camelKey === 'registered' || camelKey === 'cebia' || camelKey === 'caVertical' || camelKey === 'dovoz' || camelKey === 'prvniMajitel' || camelKey === 'servisniKnizka' || camelKey === 'bezpecnostniSrouby' || camelKey === 'kolaAI') {
        // CRITICAL: Convert vehicle booleans from string "0"/"1" to actual boolean
        const b = normalizeBool(value);
        transformed[camelKey] = b === undefined ? value : b;
      } else if (camelKey === 'carDetails' || key === 'car_details') {
        transformed['carDetails'] = transformApiToCamelCase(value);
      } else if (camelKey === 'componentStatuses' || key === 'component_statuses') {
        transformed['componentStatuses'] = transformApiToCamelCase(value);
      } else if (camelKey === 'companyInfo' || key === 'company_info') {
        if (typeof value === 'string') {
          try { transformed['companyInfo'] = JSON.parse(value as string); }
          catch { transformed['companyInfo'] = value; }
        } else {
          transformed['companyInfo'] = transformApiToCamelCase(value);
        }
      } else if (key === 'purchase_time' || key === 'inspection_time') {
        // Special handling for time fields: convert to hh:mm format string
        if (typeof value === 'string') {
          // Try to parse time string (e.g. "14:30:00" or "14:30")
          const m = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
          if (m) {
            const hh = m[1].padStart(2, '0');
            const mm = m[2];
            transformed[camelKey] = `${hh}:${mm}`;
          } else {
            transformed[camelKey] = value;
          }
        } else {
          transformed[camelKey] = value;
        }
      } else if (key === 'client_type') {
        // ✅ FIX: client_type is 'person' or 'company' - no recursive transformation, just key conversion
        transformed['clientType'] = value;
      } else {
        transformed[camelKey] = transformApiToCamelCase(value);
      }
    }
    // Assemble carDetails from vehicle_* flat fields when absent
    if (!transformed.carDetails) {
      const hasVehicleFields =
        transformed.vehicleMake ||
        transformed.vehicleModel ||
        transformed.vehicleYear ||
        transformed.vehicleMileage ||
        transformed.vehicleVin;
      if (hasVehicleFields) {
        transformed.carDetails = {
          make: transformed.vehicleMake,
          model: transformed.vehicleModel,
          year: transformed.vehicleYear ? Number(transformed.vehicleYear) : undefined,
          mileage: transformed.vehicleMileage ? Number(transformed.vehicleMileage) : undefined,
          vin: transformed.vehicleVin,
          color: transformed.vehicleColor,
          fuelType: transformed.vehicleFuelType,
          engineSize: transformed.vehicleEngineSize,
          transmission: transformed.vehicleTransmission,
          bodyType: transformed.vehicleBodyType,
          driveType: transformed.vehicleDriveType,
          stk: transformed.vehicleStk,
          firstRegistration: transformed.vehicleFirstRegistration,
          isImport: normalizeBool(transformed.vehicleIsImport),
          isFirstOwner: normalizeBool(transformed.vehicleIsFirstOwner),
          hasServiceBook: normalizeBool(transformed.vehicleHasServiceBook),
          hasSecurityScrews: normalizeBool(transformed.vehicleHasSecurityScrews),
          hasAiWheels: normalizeBool(transformed.vehicleHasAiWheels),
          cebia: normalizeBool(transformed.vehicleCebia),
          caVertical: normalizeBool(transformed.vehicleCaVertical),
          condition: 'USED',
        } as any;
      }
    }
    return transformed;
  }
  return obj;
};

const transformCamelToSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(transformCamelToSnakeCase);
  }
  if (obj !== null && typeof obj === 'object') {
    const transformed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = camelToSnake(key);
      // Special handling for arrays like images/defectImages - stringify them
      if ((key === 'images' || key === 'defectImages') && Array.isArray(value) && value.length > 0) {
        transformed[snakeKey] = JSON.stringify(value);
      } else {
        transformed[snakeKey] = transformCamelToSnakeCase(value);
      }
    }
    return transformed;
  }
  return obj;
};

class ApiService {
  private sanitizeForApi<T extends Record<string, any>>(data: T): T {
    // Deep clone
    const clone = JSON.parse(JSON.stringify(data));

    // Remove undefined values - PHP API expects either value or null, not undefined
    const removeUndefined = (o: any): any => {
      if (!o || typeof o !== 'object') return o;
      if (Array.isArray(o)) return o.map(removeUndefined).filter(v => v !== undefined);
      const result: any = {};
      for (const [k, v] of Object.entries(o)) {
        if (v !== undefined) {
          result[k] = removeUndefined(v);
        }
      }
      return result;
    };

    const sanitized = removeUndefined(clone);

    // Set defaults for required NOT NULL columns in DB
    if (!sanitized.phone) sanitized.phone = '';
    // ВАЖНО: Nikdy nevytvářej purchaseState ve výchozím stavu během částkové aktualizace
    // if (!sanitized.purchaseState) sanitized.purchaseState = 'NEW';
    // IMPORTANT: Only set default employeeId on CREATE, not on UPDATE
    // During UPDATE, omit employeeId entirely if not provided to avoid overwriting it
    // if (!sanitized.employeeId) sanitized.employeeId = 1;

    // Date normalization
    const normalizeCzDate = (value: any): string | null => {
      if (!value) return null;
      if (typeof value === 'string') {
        const m = value.match(/^(\d{1,2})[.\s-]+(\d{1,2})[.\s-]+(\d{4})/);
        if (m) {
          const dd = m[1].padStart(2, '0');
          const mm = m[2].padStart(2, '0');
          const yyyy = m[3];
          return `${yyyy}-${mm}-${dd}`;
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
      }
      return null;
    };

    // IMPORTANT: Only normalize dates that are explicitly in the data
    // Do NOT normalize dates that aren't present (they become null and overwrite DB values)
    if ('purchaseDate' in sanitized && sanitized.purchaseDate) {
      sanitized.purchaseDate = normalizeCzDate(sanitized.purchaseDate);
    }
    if ('inspectionDate' in sanitized && sanitized.inspectionDate) {
      sanitized.inspectionDate = normalizeCzDate(sanitized.inspectionDate);
    }

    // Time normalization (HH:MM format)
    const normalizeTime = (value: any): string | null => {
      if (!value) return null;
      const match = String(value).match(/(\d{1,2}):(\d{2})/);
      if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}`;
      }
      return null;
    };

    if ('purchaseTime' in sanitized && sanitized.purchaseTime) {
      sanitized.purchaseTime = normalizeTime(sanitized.purchaseTime);
    }
    // CRITICAL: Only normalize inspectionTime if it's explicitly in the data
    // This prevents clearing it during partial updates (e.g., when only updating serviceNotes)
    if ('inspectionTime' in sanitized && sanitized.inspectionTime) {
      sanitized.inspectionTime = normalizeTime(sanitized.inspectionTime);
    }

    // carDetails normalization
    if (sanitized.carDetails) {
      const cd = sanitized.carDetails;

      // ✅ FIX: Když registered=false, vynulovat skrytá pole
      if (cd.registered === false) {
        cd.spz = null;
        cd.stk = null;
        cd.pocetVlastniku = null;
        cd.pocetProvozovatelu = null;
        cd.prvniMajitel = null;
      }

      // Handle firstRegistration conversion
      if (!cd.firstRegistration && cd.doProvozu) {
        cd.firstRegistration = cd.doProvozu;
      }
      if (cd.firstRegistration && typeof cd.firstRegistration === 'string') {
        const val = cd.firstRegistration.trim();
        let converted = normalizeCzDate(val);
        if (!converted && val) {
          const m = val.match(/^(\d{1,2})[.\s-](\d{1,2})[.\s-](\d{4})/);
          if (m) {
            const dd = m[1].padStart(2, '0');
            const mm = m[2].padStart(2, '0');
            const yyyy = m[3];
            converted = `${yyyy}-${mm}-${dd}`;
          }
        }
        cd.firstRegistration = converted || null;
      }
      delete cd.doProvozu;

      // Handle fuelType alias
      if (!cd.fuelType && cd.motorovaVarianta) {
        cd.fuelType = cd.motorovaVarianta;
      }
    }

    // Coerce numbers
    const numKeys = ['totalAmount', 'customerPrice', 'offeredPrice', 'expectedSalePrice', 'employeeId'];
    for (const key of numKeys) {
      if (sanitized[key] !== undefined && sanitized[key] !== null && sanitized[key] !== '') {
        const n = Number(sanitized[key]);
        sanitized[key] = isNaN(n) ? null : n;
      }
    }

    // Coerce booleans to 0/1
    const boolKeys = ['isVatPayer', 'isCounterAccount', 'vinVerified'];
    for (const key of boolKeys) {
      if (sanitized[key] !== undefined) {
        sanitized[key] = !!sanitized[key] ? 1 : 0;
      }
    }

    return sanitized;
  }

  /**
   * Získá všechny výkupy (používá se pro zpětnou kompatibilitu - načítá první stránku)
   */
  async getPurchases(): Promise<Purchase[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/purchases?offset=0&limit=100`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Chyba při načítání: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data || result || [];
      const transformed = transformApiToCamelCase(data);
      // Ensure carDetails for each item when vehicle_* present
      transformed.forEach((p: any) => {
        if (!p.carDetails) {
          const has = p.vehicleMake || p.vehicleModel || p.vehicleYear || p.vehicleMileage || p.vehicleVin;
          if (has) {
            p.carDetails = {
              make: p.vehicleMake,
              model: p.vehicleModel,
              year: p.vehicleYear ? Number(p.vehicleYear) : undefined,
              mileage: p.vehicleMileage ? Number(p.vehicleMileage) : undefined,
              vin: p.vehicleVin,
            };
          }
        }
        // Normalize booleans within carDetails if present as strings/numbers
        if (p.carDetails) {
          const c = p.carDetails as any;
          c.isImport = normalizeBool(c.isImport);
          c.isFirstOwner = normalizeBool(c.isFirstOwner);
          c.hasServiceBook = normalizeBool(c.hasServiceBook);
          c.hasSecurityScrews = normalizeBool(c.hasSecurityScrews);
          c.hasAiWheels = normalizeBool(c.hasAiWheels);
          c.cebia = normalizeBool(c.cebia);
          c.caVertical = normalizeBool(c.caVertical);
        }
      });
      // Absolutizuj URL fotek
      transformed.forEach((p: any) => {
        if (Array.isArray(p.images)) p.images = p.images.map((x: string) => absolutizeUrl(x));
        if (Array.isArray(p.defectImages)) p.defectImages = p.defectImages.map((x: string) => absolutizeUrl(x));
        if (p.coverPhotoUri) p.coverPhotoUri = absolutizeUrl(p.coverPhotoUri);
      });

      return transformed;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Získá stránku výkupů s paginací
   */
  async fetchPurchasesPage(page: number, pageSize: number, search?: string): Promise<{ items: Purchase[]; total: number; hasMore: boolean }> {
    try {
      const offset = page * pageSize;
      const searchParam = search && search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
      const response = await fetch(`${API_BASE_URL}/purchases?offset=${offset}&limit=${pageSize}${searchParam}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        // Server posílá důvod v těle - bez něj je z chyby jen holé číslo
        let detail = '';
        try {
          const body = await response.text();
          const parsed = JSON.parse(body);
          detail = (parsed?.error || body || '').slice(0, 300);
        } catch {
          // tělo není JSON - detail zůstane prázdný
        }
        throw new Error(`Chyba při načítání: ${response.status}${detail ? ` – ${detail}` : ''}`);
      }

      const result = await response.json();
      const data = result.data || [];
      const transformed = transformApiToCamelCase(data);
      // Absolutizuj URL fotek
      transformed.forEach((p: any) => {
        if (Array.isArray(p.images)) p.images = p.images.map((x: string) => absolutizeUrl(x));
        if (Array.isArray(p.defectImages)) p.defectImages = p.defectImages.map((x: string) => absolutizeUrl(x));
        if (p.coverPhotoUri) p.coverPhotoUri = absolutizeUrl(p.coverPhotoUri);
      });

      return {
        items: transformed,
        total: result.total || 0,
        hasMore: result.hasMore || false,
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Získá konkrétní výkup
   */
  async getPurchaseById(id: string): Promise<Purchase> {
    try {

      const response = await fetch(`${API_BASE_URL}/purchases/${id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Chyba při načítání: ${response.status}`);
      }

      const result = await response.json();
      const data = result.data || result;
      const transformed = transformApiToCamelCase(data);
      // Ensure carDetails from flat vehicle_* fields
      if (!(transformed as any).carDetails) {
        const p: any = transformed;
        if (p.vehicleMake || p.vehicleModel || p.vehicleYear || p.vehicleMileage || p.vehicleVin) {
          p.carDetails = {
            make: p.vehicleMake,
            model: p.vehicleModel,
            year: p.vehicleYear ? Number(p.vehicleYear) : undefined,
            mileage: p.vehicleMileage ? Number(p.vehicleMileage) : undefined,
            vin: p.vehicleVin,
            color: p.vehicleColor,
          };
        }
      }
      // Normalize booleans in carDetails
      if ((transformed as any).carDetails) {
        const c = (transformed as any).carDetails as any;
        c.isImport = normalizeBool(c.isImport);
        c.isFirstOwner = normalizeBool(c.isFirstOwner);
        c.hasServiceBook = normalizeBool(c.hasServiceBook);
        c.hasSecurityScrews = normalizeBool(c.hasSecurityScrews);
        c.hasAiWheels = normalizeBool(c.hasAiWheels);
        c.cebia = normalizeBool(c.cebia);
        c.caVertical = normalizeBool(c.caVertical);
      }
      if (Array.isArray((transformed as any).images)) (transformed as any).images = (transformed as any).images.map((x: string) => absolutizeUrl(x));
      if (Array.isArray((transformed as any).defectImages)) (transformed as any).defectImages = (transformed as any).defectImages.map((x: string) => absolutizeUrl(x));
      if ((transformed as any).coverPhotoUri) (transformed as any).coverPhotoUri = absolutizeUrl((transformed as any).coverPhotoUri);

      return transformed;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Aktualizuje výkup
   */
  async updatePurchase(id: string, purchase: Partial<Purchase>): Promise<any> {
    try {

      // IMPORTANT: Only include fields that are explicitly provided in the purchase object
      // Do NOT normalize/reset fields that aren't included (e.g., inspectionDate, inspectionTime)
      const apiData: any = {};
      // Only process fields that are actually in the purchase object
      const fieldsToMap: (keyof Partial<Purchase>)[] = [
        'clientName', 'clientType', 'spz', 'purchaseDate', 'purchaseTime', 'purchaseState',
        'employeeId', 'totalAmount', 'customerPrice', 'offeredPrice', 'expectedSalePrice',
        'phone', 'street', 'city', 'postalCode', 'notes', 'serviceNotes', 'sourceKnowledge',
        'isVatPayer', 'isCounterAccount', 'vinVerified',
        'carDetails', 'componentStatuses', 'companyInfo', 'isPriority', 'paintThickness'
      ];

      // Only add fields that are explicitly in purchase object
      for (const field of fieldsToMap) {
        if (field in purchase) {
          apiData[field] = (purchase as any)[field];
        }
      }

      // Special handling for inspectionDate and inspectionTime - NEVER include unless explicitly provided
      // These should NEVER be reset/updated during partial updates
      if ('inspectionDate' in purchase) {
        apiData.inspectionDate = purchase.inspectionDate;
      }
      if ('inspectionTime' in purchase) {
        apiData.inspectionTime = purchase.inspectionTime;
      }

      // Photos handling - CRITICAL: Send as ARRAY, not stringified JSON
      if ('images' in purchase) {
        apiData.images = Array.isArray(purchase.images) ? purchase.images : [];
      }
      if ('defectImages' in purchase) {
        apiData.defectImages = Array.isArray(purchase.defectImages) ? purchase.defectImages : [];
      }
      // CRITICAL: Handle coverPhotoUri - must include even if null to delete from DB
      if ('coverPhotoUri' in purchase) {
        apiData.coverPhotoUri = purchase.coverPhotoUri ?? null;
      }

      // Now sanitize only the fields that are present
      const sanitized = this.sanitizeForApi(apiData);

      const response = await fetch(`${API_BASE_URL}/purchases/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(sanitized),
      });

      if (!response.ok) {
        throw new Error(`Aktualizace selhala: ${response.status}`);
      }

      const result = await response.json();

      return result;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Smaže výkup
   */
  async deletePurchase(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/purchases/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Chyba při mazání: ${response.status}`);
    }
  }

  /**
   * Hledá výkupy podle filtru
   */
  async searchPurchases(filters: Record<string, any>): Promise<Purchase[]> {
    try {
      const queryParams = new URLSearchParams();
      // Map filter names to API parameter names if needed
      const filterMapping: Record<string, string> = {
        clientName: 'client_name',
        purchaseState: 'purchase_state',
        employeeId: 'employee_id',
        spz: 'spz',
      };

      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          const paramKey = filterMapping[key] || key;
          queryParams.append(paramKey, String(value));
        }
      }

      const url = `${API_BASE_URL}/purchases?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Hledání selhalo: ${response.status}`);
      }

      const result = await response.json();
      return result.data || result || [];
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Přihlášení a získání JWT tokenu - NOVÝ ENDPOINT
   * POST /api/account/sign-in
   */
  async login(userName: string, password: string): Promise<any> {
    try {
      const url = authEndpoint('sign-in');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userName, password }),
      });


      // Přečti text nejdřív (abychom mohli debugovat)
      const responseText = await response.text();

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (parseError) {
        }
        throw new Error(`Load failed: ${errorMessage}`);
      }

      // Parse response
      let result: any = {};
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Load failed: Invalid response format');
      }


      // Validace - ověř, že máme token
      if (!result.token) {
        throw new Error('Load failed: No token in response');
      }

      // Ulož token
      await AsyncStorage.setItem('jwtToken', result.token);

      return {
        success: true,
        token: result.token,
        refreshToken: result.refreshToken,
        user: {
          id: result.id,
          email: result.email,
          userName: result.userName,
        },
      };
    } catch (error: any) {
      // Vrať chybu s jasným textem
      throw new Error(error.message || 'Load failed');
    }
  }

  /**
   * Načti profil uživatele - GET /api/account/profile
   */
  async getProfile(): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('jwtToken');
      if (!token) {
        throw new Error('Token není k dispozici');
      }

      const url = authEndpoint('profile');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });


      if (!response.ok) {
        throw new Error(`Načtení profilu selhalo: ${response.status}`);
      }

      const profileData = await response.json();

      return {
        success: true,
        data: {
          id: profileData.id,
          name: `${profileData.firstName} ${profileData.lastName}`,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          userName: profileData.userName,
          email: profileData.email,
          phoneNumber: profileData.phoneNumber,
        },
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Odhlášení
   */
  async logout(): Promise<void> {
    try {
      await AsyncStorage.removeItem('jwtToken'); // už se nepoužívá, ale čistíme případné zbytky
      setGlobalJwtToken(null); // no-op
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Obnoví session z tokenu v AsyncStorage
   */
  async restoreSession(): Promise<string | null> {
    try {
      await AsyncStorage.removeItem('jwtToken');
      setGlobalJwtToken(null);
      return null;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Nahraje fotky pro nákup
   */
  /**
   * Exportuje nákupy jako CSV
   */
  async exportPurchasesAsCSV(purchases: Purchase[]): Promise<string> {
    try {
      const headers = [
        'ID',
        'Klient',
        'Typ klienta',
        'SPZ',
        'Datum nákupu',
        'Stav',
        'Zaměstnanec',
        'Celková částka',
        'Cena od zákazníka',
        'Nabídnutá cena',
        'Očekávaná prodejní cena',
        'DPH',
        'Telefon',
        'Ulice',
        'Město',
        'PSČ',
        'Poznámky',
      ];

      const rows = purchases.map(p => [
        p.id,
        p.clientName,
        p.clientType,
        p.spz,
        p.purchaseDate || '',
        p.purchaseState,
        p.employeeId || '',
        p.totalAmount || '',
        p.customerPrice || '',
        p.offeredPrice || '',
        p.expectedSalePrice || '',
        p.isVatPayer ? 'Ano' : 'Ne',
        p.phone || '',
        p.street || '',
        p.city || '',
        p.postalCode || '',
        p.notes || '',
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      return csv;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Uploaduje fotografie pro nákup
   */
  async uploadPhotos(purchaseId: string, photoUris: string[]): Promise<{ success: boolean; files: string[] }> {
    try {
      if (!photoUris || photoUris.length === 0) {
        return { success: true, files: [] };
      }
      const pid = String(purchaseId).trim();

      // Compress + ensure local files before upload
      const preparedFiles: { uri: string; name: string; type: string }[] = [];
      const tempFiles: string[] = []; // downloaded/manipulated copies to clean up after upload
      let index = 0;
      for (const originalUri of photoUris) {
        const filename = `photo_${pid}_${Date.now()}_${index++}.jpg`;
        let workUri = originalUri;

        // If remote URL, download to cache first
        if (workUri.startsWith('http://') || workUri.startsWith('https://')) {
          const downloadPath = `${FileSystem.cacheDirectory}${filename}`;
          try {
            const dl = await FileSystem.downloadAsync(workUri, downloadPath);
            workUri = dl.uri;
            tempFiles.push(workUri);
          } catch (e) {
            continue; // skip this file
          }
        }

        // Compress to 1600px width (native only); on web keep as is
        let localUri = workUri;
        try {
          if (Platform.OS !== 'web') {
            const manipulated = await ImageManipulator.manipulateAsync(
              workUri,
              [{ resize: { width: 1600 } }],
              { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
            );
            localUri = manipulated.uri || workUri;
            if (localUri !== workUri) tempFiles.push(localUri);
          }
        } catch (e) {
        }

        preparedFiles.push({ uri: localUri, name: filename, type: 'image/jpeg' });
      }
      try {
        const formData = new FormData();
        if (Platform.OS === 'web') {
          // Web: fetch blob and append as File for each
          for (const f of preparedFiles) {
            try {
              const resp = await fetch(f.uri);
              const blob = await resp.blob();
              const file = new File([blob], f.name, { type: f.type });
              formData.append('photos[]', file);
            } catch (e) {
            }
          }
        } else {
          // Native: append RN file parts
          for (const f of preparedFiles) {
            formData.append('photos[]', { uri: f.uri, name: f.name, type: f.type } as any);
          }
        }

        const headers: Record<string, string> = { Accept: 'application/json' };
        const url = `${API_BASE_URL}/purchases/${encodeURIComponent(pid)}/upload-images`;
        const uploadResponse = await fetch(url, { method: 'POST', headers, body: formData });

        const text = await uploadResponse.text();
        if (!uploadResponse.ok) {
          throw new Error(`Upload fotek selhal: ${uploadResponse.status} - ${text}`);
        }

        let result: any = {};
        try { result = JSON.parse(text); } catch { result = { files: [] }; }

        // CRITICAL: Absolutize returned file paths so they can be saved to DB as full HTTP URLs
        const absolutizedFiles = (result.files || []).map((path: string) => absolutizeUrl(path));

        return { success: true, files: absolutizedFiles };
      } finally {
        // Clean up compressed/downloaded temp copies now that the upload request has read them
        for (const f of tempFiles) {
          FileSystem.deleteAsync(f, { idempotent: true }).catch(() => {});
        }
      }
    } catch (error: any) {
      throw error;
    }
  }

  async uploadDefectPhotos(purchaseId: string, photoUris: string[]): Promise<{ success: boolean; files: string[] }> {
    try {
      if (!photoUris || photoUris.length === 0) {
        return { success: true, files: [] };
      }
      const pid = String(purchaseId).trim();

      const preparedFiles: { uri: string; name: string; type: string }[] = [];
      const tempFiles: string[] = []; // downloaded/manipulated copies to clean up after upload
      let index = 0;
      for (const originalUri of photoUris) {
        const filename = `defect_${pid}_${Date.now()}_${index++}.jpg`;
        let workUri = originalUri;
        if (workUri.startsWith('http://') || workUri.startsWith('https://')) {
          const downloadPath = `${FileSystem.cacheDirectory}${filename}`;
          try {
            const dl = await FileSystem.downloadAsync(workUri, downloadPath);
            workUri = dl.uri;
            tempFiles.push(workUri);
          } catch (e) {
            continue;
          }
        }
        let localUri = workUri;
        try {
          if (Platform.OS !== 'web') {
            const manipulated = await ImageManipulator.manipulateAsync(
              workUri,
              [{ resize: { width: 1600 } }],
              { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
            );
            localUri = manipulated.uri || workUri;
            if (localUri !== workUri) tempFiles.push(localUri);
          }
        } catch {}
        preparedFiles.push({ uri: localUri, name: filename, type: 'image/jpeg' });
      }
      try {
        const formData = new FormData();
        if (Platform.OS === 'web') {
          for (const f of preparedFiles) {
            try {
              const resp = await fetch(f.uri);
              const blob = await resp.blob();
              const file = new File([blob], f.name, { type: f.type });
              formData.append('defect_photos[]', file);
            } catch (e) {
            }
          }
        } else {
          for (const f of preparedFiles) {
            formData.append('defect_photos[]', { uri: f.uri, name: f.name, type: f.type } as any);
          }
        }
        const headers: Record<string, string> = { Accept: 'application/json' };
        const url = `${API_BASE_URL}/purchases/${encodeURIComponent(pid)}/upload-defect-images`;
        const uploadResponse = await fetch(url, { method: 'POST', headers, body: formData });
        const text = await uploadResponse.text();
        if (!uploadResponse.ok) {
          throw new Error(`Upload fotek vad selhal: ${uploadResponse.status} - ${text}`);
        }
        let result: any = {};
        try { result = JSON.parse(text); } catch { result = { files: [] }; }
        // CRITICAL: Absolutize returned file paths so they can be saved to DB as full HTTP URLs
        const absolutizedFiles = (result.files || []).map((path: string) => absolutizeUrl(path));
        return { success: true, files: absolutizedFiles };
      } finally {
        for (const f of tempFiles) {
          FileSystem.deleteAsync(f, { idempotent: true }).catch(() => {});
        }
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Uploaduje úvodní fotku vozidla - SEPARÁTNÍ endpoint
   * Nedotýká se vehicle/defect fotek - používá jenom cover_photo_uri sloupec
   */
  async uploadCoverPhoto(purchaseId: string, photoUri: string): Promise<{ success: boolean; uri: string }> {
    try {
      if (!photoUri) {
        return { success: false, uri: '' };
      }
      const pid = String(purchaseId).trim();
      const filename = `cover_${pid}_${Date.now()}.jpg`;
      let workUri = photoUri;
      const tempFiles: string[] = []; // downloaded/manipulated copies to clean up after upload

      // Download remote URLs to cache first
      if (workUri.startsWith('http://') || workUri.startsWith('https://')) {
        const downloadPath = `${FileSystem.cacheDirectory}${filename}`;
        try {
          const dl = await FileSystem.downloadAsync(workUri, downloadPath);
          workUri = dl.uri;
          tempFiles.push(workUri);
        } catch (e) {
          throw new Error('Failed to download cover photo');
        }
      }

      // Compress to 1600px width (native only)
      let localUri = workUri;
      try {
        if (Platform.OS !== 'web') {
          const manipulated = await ImageManipulator.manipulateAsync(
            workUri,
            [{ resize: { width: 1600 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
          );
          localUri = manipulated.uri || workUri;
          if (localUri !== workUri) tempFiles.push(localUri);
        }
      } catch (e) {
      }

      try {
        const formData = new FormData();
        if (Platform.OS === 'web') {
          // Web: fetch blob and append as File
          try {
            const resp = await fetch(localUri);
            const blob = await resp.blob();
            const file = new File([blob], filename, { type: 'image/jpeg' });
            formData.append('cover_photo', file);
          } catch (e) {
            throw new Error('Failed to prepare cover photo for web');
          }
        } else {
          // Native: append RN file part
          formData.append('cover_photo', { uri: localUri, name: filename, type: 'image/jpeg' } as any);
        }

        const headers: Record<string, string> = { Accept: 'application/json' };
        const url = `${API_BASE_URL}/purchases/${encodeURIComponent(pid)}/upload-cover-photo`;
        const uploadResponse = await fetch(url, { method: 'POST', headers, body: formData });

        const text = await uploadResponse.text();
        if (!uploadResponse.ok) {
          throw new Error(`Upload úvodní fotky selhal: ${uploadResponse.status} - ${text}`);
        }

        let result: any = {};
        try { result = JSON.parse(text); } catch { result = { uri: '' }; }

        // Absolutize returned file path
        const absolutizedUri = absolutizeUrl(result.uri || '');

        return { success: true, uri: absolutizedUri };
      } finally {
        for (const f of tempFiles) {
          FileSystem.deleteAsync(f, { idempotent: true }).catch(() => {});
        }
      }
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Smaže fotku z nákupu
   */
  async deletePhoto(purchaseId: string, filename: string): Promise<void> {
    try {

      const response = await fetch(
        `${API_BASE_URL}/purchases/${purchaseId}/photos/${filename}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`Smazání fotky selhalo: ${response.status}`);
      }

    } catch (error: any) {
      throw error;
    }
  }
}

export const apiService: any = {
  // Purchases
  async createPurchase(payload: Record<string, any>): Promise<any> {
    const service = new ApiService();
    const sanitized = service['sanitizeForApi'](payload);
    const res = await fetch(`${API_BASE_URL}/purchases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(sanitized),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(text);
    try { 
      const parsed = JSON.parse(text);
      return parsed;
    } catch { 
      return { id: null, raw: text }; 
    }
  },
  async getPurchases() {
    return new ApiService().getPurchases();
  },
  async fetchPurchasesPage(page: number, pageSize: number, search?: string) {
    return new ApiService().fetchPurchasesPage(page, pageSize, search);
  },
  async getPurchaseById(id: string) {
    return new ApiService().getPurchaseById(id);
  },
  async updatePurchase(id: string, data: any) {
    return new ApiService().updatePurchase(id, data);
  },
  async deletePurchase(id: string) {
    return new ApiService().deletePurchase(id);
  },
  async searchPurchases(filters: Record<string, any>) {
    return new ApiService().searchPurchases(filters);
  },

  // Clients
  async listClients(params: Record<string, string | number> = {}) {
    const qs = new URLSearchParams(params as any).toString();
    const res = await fetch(`${API_BASE_URL}/clients${qs ? `?${qs}` : ''}`);
    return res.json();
  },
  async getClient(id: number | string) {
    const res = await fetch(`${API_BASE_URL}/clients/${id}`);
    return res.json();
  },
  async createClient(data: any) {
    const res = await fetch(`${API_BASE_URL}/clients`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data),
    });
    return res.json();
  },
  async updateClient(id: number | string, data: any) {
    const res = await fetch(`${API_BASE_URL}/clients/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteClient(id: number | string) {
    const res = await fetch(`${API_BASE_URL}/clients/${id}`, { method: 'DELETE' });
    return res.json();
  },

  // Vehicle under purchase
  async getVehicle(purchaseId: string | number) {
    const res = await fetch(`${API_BASE_URL}/purchases/${purchaseId}/vehicle`);
    return res.json();
  },
  async upsertVehicle(purchaseId: string | number, data: any) {
    const res = await fetch(`${API_BASE_URL}/purchases/${purchaseId}/vehicle`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data),
    });
    return res.json();
  },
  async deleteVehicle(purchaseId: string | number) {
    const res = await fetch(`${API_BASE_URL}/purchases/${purchaseId}/vehicle`, { method: 'DELETE' });
    return res.json();
  },

  // Component statuses
  async getComponents(purchaseId: string | number) {
    const res = await fetch(`${API_BASE_URL}/purchases/${purchaseId}/components`);
    return res.json();
  },
  async putComponents(purchaseId: string | number, items: any[]) {
    const res = await fetch(`${API_BASE_URL}/purchases/${purchaseId}/components`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(items),
    });
    return res.json();
  },

  // Auth
  async login(email: string, password: string) {
    return new ApiService().login(email, password);
  },
  async logout() {
    return new ApiService().logout();
  },
  async restoreSession() {
    return new ApiService().restoreSession();
  },
  async getProfile() {
    return new ApiService().getProfile();
  },
  async listUsers() {
    const token = await AsyncStorage.getItem('jwtToken');
    const res = await fetch(`${API_BASE_URL}/users/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Users list failed: ${res.status}`);
    }
    return res.json();
  },
  async syncUser(userId: string, firstName: string, lastName: string) {
    const res = await fetch(`${API_BASE_URL}/users/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        firstName,
        lastName,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Sync user failed: ${res.status}`);
    }
    return res.json();
  },
  async getStats() {
    const token = await AsyncStorage.getItem('jwtToken');
    const res = await fetch(`${API_BASE_URL}/purchases/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Stats fetch failed: ${res.status}`);
    }
    return res.json();
  },
  async getStatsAll() {
    const token = await AsyncStorage.getItem('jwtToken');
    const res = await fetch(`${API_BASE_URL}/purchases/stats/all`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`All stats fetch failed: ${res.status}`);
    }
    return res.json();
  },

  // Uploads
  async uploadPhotos(purchaseId: string, photoUris: string[]) {
    return new ApiService().uploadPhotos(purchaseId, photoUris);
  },
  async uploadDefectPhotos(purchaseId: string, photoUris: string[]) {
    return new ApiService().uploadDefectPhotos(purchaseId, photoUris);
  },
  async uploadCoverPhoto(purchaseId: string, photoUri: string) {
    return new ApiService().uploadCoverPhoto(purchaseId, photoUri);
  },
  async deletePhoto(purchaseId: string, filename: string) {
    return new ApiService().deletePhoto(purchaseId, filename);
  },

  // Generic GET method for other endpoints
  async get(endpoint: string, options?: { params?: Record<string, any> }): Promise<any> {
    try {
      let url = `${API_BASE_URL}${endpoint}`;
      // Add query parameters if provided
      if (options?.params) {
        const queryParams = new URLSearchParams();
        for (const [key, value] of Object.entries(options.params)) {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        }
        const queryString = queryParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const text = await response.text();

      if (!response.ok) {
        throw new Error(`GET ${endpoint} failed: ${response.status} - ${text}`);
      }

      try {
        return JSON.parse(text);
      } catch {
        return { success: true, raw: text };
      }
    } catch (error: any) {
      throw error;
    }
  },

  // Generic POST method for other endpoints
  async post(endpoint: string, payload: any): Promise<any> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();

      if (!response.ok) {
        throw new Error(`POST ${endpoint} failed: ${response.status} - ${text}`);
      }

      try {
        return JSON.parse(text);
      } catch {
        return { success: true, raw: text };
      }
    } catch (error: any) {
      throw error;
    }
  },

  // Get all companies
  async getAllCompanies(): Promise<any[]> {
    try {
      const url = `${API_BASE_URL}/clients/companies`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (data?.success && Array.isArray(data?.data)) {
        return data.data;
      }
      return [];
    } catch (error: any) {
      // Error handled silently
      return [];
    }
  },

  // Get all people
  async getAllPeople(): Promise<any[]> {
    try {
      const url = `${API_BASE_URL}/clients/people`;
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (data?.success && Array.isArray(data?.data)) {
        return data.data;
      }
      return [];
    } catch (error: any) {
      // Error handled silently
      return [];
    }
  },

  // Client history search
  async searchCompaniesByFulltext(query: string): Promise<any[]> {
    try {
      // Když je query prázdný, vrátí všechny firmy
      if (!query || query.trim().length === 0) {
        return await this.getAllCompanies();
      }

      const queryParam = encodeURIComponent(query.trim());
      const url = `${API_BASE_URL}/clients?type=company&company_name=${queryParam}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (data?.success && Array.isArray(data?.data)) {
        return data.data;
      }
      return [];
    } catch (error: any) {
      // Error handled silently
      return [];
    }
  },

  async searchPeopleByFulltext(query: string): Promise<any[]> {
    try {
      // Když je query prázdný, vrátí všechny osoby
      if (!query || query.trim().length === 0) {
        return await this.getAllPeople();
      }

      const queryParam = encodeURIComponent(query.trim());
      const url = `${API_BASE_URL}/clients?type=person&first_name=${queryParam}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      if (data?.success && Array.isArray(data?.data)) {
        return data.data;
      }
      return [];
    } catch (error: any) {
      // Error handled silently
      return [];
    }
  },
};