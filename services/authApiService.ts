import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Auth server neposílá CORS hlavičky, takže z prohlížeče na něj nelze volat
// přímo - web jde přes PHP proxy na autohity.cz. Nativní build volá upstream.
const AUTH_UPSTREAM_URL = 'https://app.autohity.cz/api/account';
const AUTH_PROXY_URL =
  process.env.EXPO_PUBLIC_AUTH_PROXY_URL || 'https://autohity.cz/php-api/auth-proxy.php';

/** URL auth endpointu ('sign-in', 'profile') pro aktuální platformu. */
export function authEndpoint(path: string): string {
  return Platform.OS === 'web'
    ? `${AUTH_PROXY_URL}?path=${encodeURIComponent(path)}`
    : `${AUTH_UPSTREAM_URL}/${path}`;
}

export interface LoginResponse {
  id?: number;
  userName: string;
  email: string;
  token: string;
  refreshToken?: string;
  given_name?: string;
  family_name?: string;
}

export interface ProfileResponse {
  id: number;
  firstName: string;
  lastName: string;
  userName: string;
  email: string;
  phoneNumber: string;
}

class AuthApiService {
  /**
   * Parsuj JWT token aby jsme dostali claims
   */
  private parseJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (err) {
      return null;
    }
  }

  /**
   * Přihlášení - POST /api/account/sign-in
   */
  async login(userName: string, password: string): Promise<LoginResponse> {
    const response = await fetch(authEndpoint('sign-in'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userName, password }),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => `HTTP ${response.status}`);
      throw new Error(`Přihlášení selhalo: ${error}`);
    }

    const data = await response.json() as LoginResponse;
    // Parsuj JWT aby jsme dostal dodatečné info (jméno, příjmení, atd.)
    const decoded = this.parseJwt(data.token);
    if (decoded) {
      data.given_name = decoded.given_name;
      data.family_name = decoded.family_name;
      if (decoded.sub && !data.id) {
        data.id = parseInt(decoded.sub, 10);
      }
    }
    return data;
  }

  /**
   * Získej profil - GET /api/account/profile
   */
  async getProfile(token: string): Promise<ProfileResponse> {
    const response = await fetch(authEndpoint('profile'), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text().catch(() => `HTTP ${response.status}`);
      throw new Error(`Načtení profilu selhalo: ${error}`);
    }

    const data = await response.json() as ProfileResponse;
    return data;
  }

  /**
   * Odhlášení
   */
  async logout(): Promise<void> {
    // TODO: Zavolaj endpoint /api/account/sign-out když je dostupný
    await AsyncStorage.removeItem('authToken');
  }
}

export const authApiService = new AuthApiService();