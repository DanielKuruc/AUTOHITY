import { apiService } from '@/services/apiService';
import { authApiService } from '@/services/authApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = '@autohity_session';

interface User {
  id: string;
  userName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  isAdmin?: boolean;
}

interface UserStats {
  total: number;
  new: number;
  inProgress: number;
  completed: number;
  cancelled?: number;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  jwtToken: string | null;
  userStats: UserStats | null;
  allStats: UserStats | null;
  login: (userName: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loadUserProfile: () => Promise<void>;
  loadUserStats: () => Promise<void>;
  loadAllStats: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [allStats, setAllStats] = useState<UserStats | null>(null);

  // Inicializace - načti session z úložiště - POUZE JEDNOU při startu
  useEffect(() => {
    let isMounted = true;
    console.log('[Auth] Initializing auth system');
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isMounted) return; // Měň pořadí - check PRVNÍ
        if (stored) {
          try {
            const { user: storedUser, token: storedToken } = JSON.parse(stored);
            console.log('[Auth] ✅ Session found in storage for user:', storedUser?.userName);
            setUser(storedUser);
            setJwtToken(storedToken);
            setIsAuthenticated(true);
          } catch (parseErr) {
            console.error('[Auth] ❌ Failed to parse stored session:', parseErr);
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        } else {
          console.log('[Auth] ℹ️ No session in storage - user must login');
        }
        // VŽDY nastav isLoading na false když je init hotový
        setIsLoading(false);
        console.log('[Auth] ✅ Initialization complete');
      } catch (err) {
        console.error('[Auth] ❌ Initialization error:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    init();
    return () => {
      isMounted = false;
    };
  }, []); // EMPTY - spustí se POUZE jednou

  const login = async (userName: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[Auth] Login attempt:', userName);
      const loginResponse = await authApiService.login(userName, password);

      const userData: User = {
        id: String(loginResponse.id || 0),
        userName: loginResponse.userName,
        email: loginResponse.email,
        firstName: loginResponse.given_name,
        lastName: loginResponse.family_name,
      };

      setUser(userData);
      setJwtToken(loginResponse.token);
      setIsAuthenticated(true);

      // Ulož session
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ user: userData, token: loginResponse.token })
      );

      // Načti profil aby jsme dostal telefon a další detaily
      try {
        await loadUserProfile();
      } catch (profileError) {
        console.error('[Auth] Failed to load profile:', profileError);
        // Nepretrhávej login - profil není kritický
      }

      // Synchronizuj uživatele do DB (employees table)
      try {
        const syncResult = await apiService.syncUser(
          userData.id,
          userData.firstName || '',
          userData.lastName || ''
        );
        console.log('[Auth] User synced to DB:', syncResult);
      } catch (syncError) {
        console.error('[Auth] Failed to sync user to DB:', syncError);
        // Nepretrhávej login - sync selhání není kritické
      }

      console.log('[Auth] Login successful');
      return { success: true };
    } catch (error: any) {
      console.error('[Auth] Login error:', error.message);
      return { success: false, error: error.message || 'Přihlášení se nezdařilo' };
    }
  };

  const logout = async () => {
    try {
      console.log('[Auth] Logout - clearing session');
      // Postupně resetuj aby se nevrátilo do loading stavu
      await AsyncStorage.removeItem(STORAGE_KEY);
      await authApiService.logout();
      // Až po úspěšném logout resetuj state
      setIsAuthenticated(false);
      setUser(null);
      setJwtToken(null);
      setUserStats(null);
      setAllStats(null);
      // isLoading zůstane false - nechceme se vrátit na loading screen
      console.log('[Auth] Logout complete');
    } catch (err) {
      console.error('[Auth] Logout error:', err);
      // I při erroru resetuj auth state
      setIsAuthenticated(false);
      setUser(null);
      setJwtToken(null);
    }
  };

  const loadUserProfile = async () => {
    if (!jwtToken) {
      console.log('[Auth] Cannot load profile - no JWT token');
      return;
    }
    try {
      console.log('[Auth] Loading profile');
      const profileData = await authApiService.getProfile(jwtToken);
      console.log('[Auth] Profile API response:', profileData);
      setUser(prev => {
        const updated = prev
          ? {
              ...prev,
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              phoneNumber: profileData.phoneNumber,
            }
          : null;
        console.log('[Auth] User state after profile update:', updated);
        return updated;
      });
    } catch (err) {
      console.error('[Auth] Profile load error:', err);
      throw err;
    }
  };

  const loadUserStats = async () => {
    if (!user?.id) {
      console.log('[Auth] Cannot load stats - no user ID');
      return;
    }

    try {
      console.log('[Auth] Loading personal stats for user:', user.id);
      const url = `https://autohity.cz/php-api/purchases/stats?userId=${user.id}`;
      console.log('[Auth] Calling stats endpoint:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[Auth] Stats response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Auth] Stats response error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Auth] Stats raw response:', JSON.stringify(data, null, 2));
      if (data.success && data.data) {
        console.log('[Auth] ✅ Personal stats loaded:', data.data);
        setUserStats({
          total: data.data.total || 0,
          new: data.data.new || 0,
          inProgress: data.data.inProgress || 0,
          completed: data.data.completed || 0,
          cancelled: data.data.cancelled || 0,
        });
      } else {
        console.warn('[Auth] Stats response not successful or missing data field');
        setUserStats({
          total: 0,
          new: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
        });
      }
    } catch (err) {
      console.error('[Auth] Load personal stats error:', err);
      setUserStats({
        total: 0,
        new: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      });
    }
  };

  const loadAllStats = async () => {
    try {
      console.log('[Auth] Loading company-wide stats');
      const url = 'https://autohity.cz/php-api/purchases/stats/all';
      console.log('[Auth] Calling all stats endpoint:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('[Auth] All stats response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Auth] All stats response error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Auth] All stats raw response:', JSON.stringify(data, null, 2));
      if (data.success && data.data) {
        console.log('[Auth] ✅ Company stats loaded:', data.data);
        setAllStats({
          total: data.data.total || 0,
          new: data.data.new || 0,
          inProgress: data.data.inProgress || 0,
          completed: data.data.completed || 0,
          cancelled: data.data.cancelled || 0,
        });
      } else {
        console.warn('[Auth] All stats response not successful or missing data field');
        setAllStats({
          total: 0,
          new: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
        });
      }
    } catch (err) {
      console.error('[Auth] Load company stats error:', err);
      setAllStats({
        total: 0,
        new: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      });
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      console.log('[Auth] Changing password');
      // TODO: Implement password change when API endpoint is available
      console.warn('[Auth] Password change not yet implemented');
      return false;
    } catch (err) {
      console.error('[Auth] Change password error:', err);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        jwtToken,
        userStats,
        allStats,
        login,
        logout,
        loadUserProfile,
        loadUserStats,
        loadAllStats,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}