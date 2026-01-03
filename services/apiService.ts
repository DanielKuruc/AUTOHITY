import { Purchase } from '@/constants/types';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImageManipulator from 'expo-image-manipulator';

const API_BASE_URL = 'https://autohity.cz/php-api';
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

// JWT tokenty již nepoužíváme; placeholder funkce zachována kvůli kompatibilitě
let globalJwtToken: string | null = null;
export const setGlobalJwtToken = (_token: string | null) => {
  globalJwtToken = null;
  console.log('[ApiService] JWT token disabled (no longer used)');
};
const getAuthToken = (): string | null => null;

// Helper to create auth headers
const getAuthHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

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

const transformApiToCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(transformApiToCamelCase);
  }
  if (obj !== null && typeof obj === 'object') {
    const transformed: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = snakeToCamel(key);
      // Special handling for JSON stringified arrays like photos
      if ((camelKey === 'images' || camelKey === 'defectImages' || camelKey === 'photos') && typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          // Map server 'photos' -> client 'images'
          if (camelKey === 'photos') {
            transformed['images'] = parsed;
          } else {
            transformed[camelKey] = parsed;
          }
        } catch (e) {
          if (camelKey === 'photos') {
            transformed['images'] = value as any;
          } else {
            transformed[camelKey] = value;
          }
        }
      } else if (camelKey === 'photos' && Array.isArray(value)) {
        // If API already returns array JSON, alias to images
        transformed['images'] = value;
      } else if (camelKey === 'defect_photos') {
        if (typeof value === 'string') {
          try { transformed['defectImages'] = JSON.parse(value); }
          catch { transformed['defectImages'] = value as any; }
        } else {
          transformed['defectImages'] = transformApiToCamelCase(value);
        }
      } else if (camelKey === 'car_details') {
        transformed['carDetails'] = transformApiToCamelCase(value);
      } else if (camelKey === 'component_statuses') {
        transformed['componentStatuses'] = transformApiToCamelCase(value);
      } else if (camelKey === 'company_info') {
        if (typeof value === 'string') {
          try { transformed['companyInfo'] = JSON.parse(value as string); }
          catch { transformed['companyInfo'] = value; }
        } else {
          transformed['companyInfo'] = transformApiToCamelCase(value);
        }
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
          isImport: !!transformed.vehicleIsImport,
          isFirstOwner: !!transformed.vehicleIsFirstOwner,
          hasServiceBook: !!transformed.vehicleHasServiceBook,
          hasSecurityScrews: !!transformed.vehicleHasSecurityScrews,
          hasAiWheels: !!transformed.vehicleHasAiWheels,
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
    const clone: any = { ...data };
    // Keep nested structures; only strip transient gallery fields
    delete clone.gallery;

    // Normalize primitives: empty strings -> null
    for (const [k, v] of Object.entries(clone)) {
      if (typeof v === 'string' && v.trim() === '') clone[k] = null;
    }

    // Helper: parse dd.mm.yyyy to YYYY-MM-DD
    const normalizeCzDate = (value: any): string | null => {
      if (!value) return null;
      if (value instanceof Date && !isNaN(value.getTime())) {
        const d = value as Date;
        const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      }
      if (typeof value === 'string') {
        const m = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (m) {
          const dd = m[1].padStart(2, '0');
          const mm = m[2].padStart(2, '0');
          const yyyy = m[3];
          return `${yyyy}-${mm}-${dd}`;
        }
        // ISO-like already
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value;
      }
      return null;
    };

    // Dates: convert to YYYY-MM-DD
    if (clone.purchaseDate !== undefined) clone.purchaseDate = normalizeCzDate(clone.purchaseDate);
    if (clone.inspectionDate !== undefined) clone.inspectionDate = normalizeCzDate(clone.inspectionDate);
    if (clone.carDetails) {
      const cd = { ...clone.carDetails };
      cd.firstRegistration = normalizeCzDate(cd.firstRegistration);
      clone.carDetails = cd;
    }

    // Numbers: coerce strings to numbers where applicable
    const numKeys = ['totalAmount', 'customerPrice', 'offeredPrice', 'expectedSalePrice', 'employeeId'];
    for (const key of numKeys) {
      if (clone[key] !== undefined && clone[key] !== null && clone[key] !== '') {
        const n = Number(clone[key]);
        clone[key] = isNaN(n) ? null : n;
      }
    }

    // Booleans
    const boolKeys = ['isVatPayer', 'isCounterAccount', 'vinVerified'];
    for (const key of boolKeys) {
      if (clone[key] !== undefined) clone[key] = !!clone[key];
    }

    return clone;
  }
  /**
   * Vytvoří nový výkup na serveru
   */
  async createPurchase(purchase: Purchase): Promise<any> {
    try {
      console.log('[ApiService] Vytváření nového výkupu na serveru...');
      // PHP API očekává camelCase klíče – posíláme sanitizovaná data (bez image polí)
      const apiData: any = this.sanitizeForApi(purchase);
      // Map client images -> server photos (JSON)
      if (purchase.images && purchase.images.length > 0) {
        apiData.photos = purchase.images;
      }
      console.log('[ApiService] Purchase data (camelCase):', JSON.stringify(apiData, null, 2));

      const response = await fetch(`${API_BASE_URL}/purchases`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(apiData),
      });

      console.log(`[ApiService] Create response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ApiService] Create error: ${response.status} - ${errorText}`);
        throw new Error(`Vytvoření výkupu selhalo: ${response.status}`);
      }

      const result = await response.json();
      console.log('[ApiService] Výkup vytvořen:', result);

      return result;
    } catch (error: any) {
      console.error('[ApiService] Create error:', error);
      throw error;
    }
  }

  /**
   * Získá všechny výkupy
   */
  async getPurchases(): Promise<Purchase[]> {
    try {
      console.log('[ApiService] Načítám výkupy ze serveru...');

      const response = await fetch(`${API_BASE_URL}/purchases`, {
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
      });
      // Absolutizuj URL fotek
      transformed.forEach((p: any) => {
        if (Array.isArray(p.images)) p.images = p.images.map((x: string) => absolutizeUrl(x));
        if (Array.isArray(p.defectImages)) p.defectImages = p.defectImages.map((x: string) => absolutizeUrl(x));
      });
      console.log('[ApiService] Výkupy načteny:', transformed);

      return transformed;
    } catch (error: any) {
      console.error('[ApiService] Get error:', error);
      throw error;
    }
  }

  /**
   * Získá konkrétní výkup
   */
  async getPurchaseById(id: string): Promise<Purchase> {
    try {
      console.log(`[ApiService] Načítám výkup ID: ${id}`);

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
      if (Array.isArray((transformed as any).images)) (transformed as any).images = (transformed as any).images.map((x: string) => absolutizeUrl(x));
      if (Array.isArray((transformed as any).defectImages)) (transformed as any).defectImages = (transformed as any).defectImages.map((x: string) => absolutizeUrl(x));
      console.log('[ApiService] Výkup načten:', transformed);

      return transformed;
    } catch (error: any) {
      console.error('[ApiService] Get by ID error:', error);
      throw error;
    }
  }

  /**
   * Aktualizuje výkup
   */
  async updatePurchase(id: string, purchase: Partial<Purchase>): Promise<any> {
    try {
      console.log(`[ApiService] Aktualizuji výkup ID: ${id}`);

      // PHP API očekává camelCase klíče – posíláme sanitizovaná data
      const apiData: any = this.sanitizeForApi(purchase as any);
      if (purchase.images && purchase.images.length > 0) {
        apiData.photos = purchase.images;
      }

      const response = await fetch(`${API_BASE_URL}/purchases/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        throw new Error(`Aktualizace selhala: ${response.status}`);
      }

      const result = await response.json();
      console.log('[ApiService] Výkup aktualizován:', result);

      return result;
    } catch (error: any) {
      console.error('[ApiService] Update error:', error);
      throw error;
    }
  }

  /**
   * Smaže výkup
   */
  async deletePurchase(id: string): Promise<void> {
    console.log('[ApiService] Mažu výkup ID:', id);
    const response = await fetch(`${API_BASE_URL}/purchases/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error('[ApiService] Delete failed:', response.status, text);
      throw new Error(`Chyba při mazání: ${response.status}`);
    }
    console.log('[ApiService] Delete OK:', text);
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
      console.log('[ApiService] Search URL:', url);

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
      console.error('[ApiService] Search error:', error);
      throw error;
    }
  }

  /**
   * Přihlášení a získání JWT tokenu
   */
  async login(email: string, password: string): Promise<any> {
    try {
      console.log('[ApiService] Přihlášení:', email);
      console.log('[ApiService] API URL:', `${API_BASE_URL}/auth/login`);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('[ApiService] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[ApiService] API chyba:', errorData);
        throw new Error(errorData.error || 'Přihlášení selhalo');
      }

      const result = await response.json();
      console.log('[ApiService] Přihlášení úspěšné:', result);

      // Ulož token
      if (result.token) {
        await AsyncStorage.setItem('jwtToken', result.token);
        setGlobalJwtToken(result.token);
      }

      return result;
    } catch (error: any) {
      console.error('[ApiService] Login error:', error.message);
      console.error('[ApiService] Login error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Odhlášení
   */
  async logout(): Promise<void> {
    try {
      console.log('[ApiService] Odhlášení');
      await AsyncStorage.removeItem('jwtToken'); // už se nepoužívá, ale čistíme případné zbytky
      setGlobalJwtToken(null); // no-op
    } catch (error: any) {
      console.error('[ApiService] Logout error:', error);
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
      console.error('[ApiService] Restore session error:', error);
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
      console.log('[ApiService] Export nákupů jako CSV');
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
      console.error('[ApiService] Export error:', error);
      throw error;
    }
  }

  /**
   * Uploaduje fotografie pro nákup
   */
  async uploadPhotos(purchaseId: string, photoUris: string[]): Promise<{ success: boolean; files: string[] }> {
    try {
      console.log(`[ApiService] Uploaduji ${photoUris.length} fotek pro nákup ID: ${purchaseId}`);

      // Compress photos before upload
      const compressedUris: string[] = [];
      for (const uri of photoUris) {
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1600 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
          );
          compressedUris.push(manipulated.uri || uri);
        } catch (e) {
          console.warn('[ApiService] Compression failed, using original:', e);
          compressedUris.push(uri);
        }
      }
      const formData = new FormData();
      for (let i = 0; i < compressedUris.length; i++) {
        const uri = compressedUris[i];
        const filename = `photo_${purchaseId}_${Date.now()}_${i}.jpg`;
        // Převeď URI na blob pro web/React Native
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('photos[]', {
          uri,
          type: 'image/jpeg',
          name: filename,
        } as any);
      }

      // Prepare headers bez Content-Type a bez Authorization
      const headers: Record<string, string> = {};

      const uploadResponse = await fetch(
        `${API_BASE_URL}/purchases/${purchaseId}/upload-images`,
        {
          method: 'POST',
          headers,
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error(`[ApiService] Upload error: ${uploadResponse.status} - ${errorText}`);
        throw new Error(`Upload fotek selhal: ${uploadResponse.status}`);
      }

      const result = await uploadResponse.json();
      console.log('[ApiService] Fotky uploadovány:', result);

      return {
        success: true,
        files: result.files || [],
      };
    } catch (error: any) {
      console.error('[ApiService] Upload photos error:', error);
      throw error;
    }
  }

  async uploadDefectPhotos(purchaseId: string, photoUris: string[]): Promise<{ success: boolean; files: string[] }> {
    try {
      console.log(`[ApiService] Uploaduji ${photoUris.length} fotek vad pro nákup ID: ${purchaseId}`);
      const compressedUris: string[] = [];
      for (const uri of photoUris) {
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            uri,
            [{ resize: { width: 1600 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
          );
          compressedUris.push(manipulated.uri || uri);
        } catch (e) {
          console.warn('[ApiService] Defect compression failed, using original:', e);
          compressedUris.push(uri);
        }
      }
      const formData = new FormData();
      for (let i = 0; i < compressedUris.length; i++) {
        const uri = compressedUris[i];
        const filename = `defect_${purchaseId}_${Date.now()}_${i}.jpg`;
        // Web needs Blob
        try {
          const resp = await fetch(uri);
          const blob = await resp.blob();
          formData.append('photos[]', blob as any, filename);
        } catch {
          formData.append('photos[]', { uri, type: 'image/jpeg', name: filename } as any);
        }
      }
      const headers: Record<string, string> = {};
      const url = `${API_BASE_URL}/purchases/${purchaseId}/upload-defect-images`;
      console.log('[ApiService] Defect upload URL:', url);
      const uploadResponse = await fetch(url, { method: 'POST', headers, body: formData });
      const text = await uploadResponse.text();
      if (!uploadResponse.ok) {
        console.error('[ApiService] Defect upload error payload:', text);
        throw new Error(`Upload fotek vad selhal: ${uploadResponse.status} - ${text}`);
      }
      let result: any = {};
      try { result = JSON.parse(text); } catch { result = { files: [] }; }
      console.log('[ApiService] Defect photos upload OK:', result);
      return { success: true, files: result.files || [] };
    } catch (error: any) {
      console.error('[ApiService] Upload defect photos error:', error);
      throw error;
    }
  }
  /**
   * Smaže fotku z nákupu
   */
  async deletePhoto(purchaseId: string, filename: string): Promise<void> {
    try {
      console.log(`[ApiService] Mažu fotku ${filename} z nákupu ID: ${purchaseId}`);

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

      console.log('[ApiService] Fotka smazána');
    } catch (error: any) {
      console.error('[ApiService] Delete photo error:', error);
      throw error;
    }
  }
}

export const apiService = new ApiService();