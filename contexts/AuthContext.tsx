import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, setGlobalJwtToken as setApiServiceToken } from '@/services/apiService';

const SUPABASE_URL = 'https://zgvwyflaffrcvrolmior.supabase.co';
const SUPABASE_LOGIN_FUNCTION = `${SUPABASE_URL}/functions/v1/login`;

const AUTH_STORAGE_KEY = '@autohity_auth';

// Výchozí přihlašovací údaje pro místní účet
const DEFAULT_CREDENTIALS = {
  email: 'daniel@autohity.cz',
  password: 'heslo123',
};

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  jwtToken: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [storedCredentials, setStoredCredentials] = useState(DEFAULT_CREDENTIALS);

  // Načíst stav přihlášení při startu
  useEffect(() => {
    loadAuthState();
  }, []);

  const loadAuthState = async () => {
    try {
      const authData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed.isAuthenticated && parsed.user) {
          setIsAuthenticated(true);
          setUser(parsed.user);
          if (parsed.jwtToken) {
            setJwtToken(parsed.jwtToken);
            // Pass token to apiService so it can use it for requests
            setApiServiceToken(parsed.jwtToken);
            console.log('[Auth] JWT token restored from AsyncStorage');
          }
        }
        if (parsed.credentials) {
          setStoredCredentials(parsed.credentials);
        }
      }
    } catch (error) {
      console.error('[Auth] Chyba při načítání stavu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuthState = async (authenticated: boolean, userData: User | null, token?: string | null, credentials?: typeof DEFAULT_CREDENTIALS) => {
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
        isAuthenticated: authenticated,
        user: userData,
        jwtToken: token,
        credentials: credentials || storedCredentials,
      }));
    } catch (error) {
      console.error('[Auth] Chyba při ukládání stavu:', error);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      return { success: false, error: 'Zadejte email' };
    }

    if (!trimmedPassword) {
      return { success: false, error: 'Zadejte heslo' };
    }

    try {
      console.log('[Auth] Přihlašuji uživatele přes Supabase:', trimmedEmail);

      // Volat Supabase login edge function
      const response = await fetch(SUPABASE_LOGIN_FUNCTION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      });

      const result = await response.json();

      if (!result.success) {
        return { success: false, error: result.error || 'Přihlášení selhalo' };
      }

      if (!result.token) {
        console.error('[Auth] Supabase nevrátila token!');
        return { success: false, error: 'Chyba serveru - žádný token' };
      }

      // Získat token a user data z Supabase
      const token = result.token;
      const apiUser = result.user;

      // Připravit user data
      const userData: User = {
        id: apiUser.id?.toString() || '1',
        name: apiUser.name || '',
        email: apiUser.email || trimmedEmail,
        role: (apiUser.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
      };

      setIsAuthenticated(true);
      setUser(userData);
      setJwtToken(token);
      setApiServiceToken(token);
      
      await saveAuthState(true, userData, token);

      console.log('[Auth] Přihlášení úspěšné přes Supabase');
      console.log('[Auth] JWT token nastaven:', token.substring(0, 30) + '...');
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Chyba při přihlašování:', error);
      return { success: false, error: error.message || 'Chyba připojení' };
    }
  };

  const logout = async () => {
    setIsAuthenticated(false);
    setUser(null);
    setJwtToken(null);
    await apiService.logout();
    await saveAuthState(false, null, null);
    console.log('[Auth] Odhlášení úspěšné');
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    if (oldPassword !== storedCredentials.password) {
      return false;
    }
    if (newPassword.length < 6) {
      return false;
    }
    const newCredentials = { ...storedCredentials, password: newPassword };
    setStoredCredentials(newCredentials);
    await saveAuthState(isAuthenticated, user, null, newCredentials);
    console.log('[Auth] Heslo změněno');
    return true;
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      user,
      jwtToken,
      login,
      logout,
      changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}