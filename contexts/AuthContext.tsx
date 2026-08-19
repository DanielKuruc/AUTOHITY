import { apiService, setGlobalJwtToken } from '@/services/apiService';
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
  loadUserStatsFiltered: (startDate?: string, endDate?: string) => Promise<UserStats | null>;
  loadAllStatsFiltered: (startDate?: string, endDate?: string) => Promise<UserStats | null>;
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
    const init = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!isMounted) return; // Měň pořadí - check PRVNÍ
        if (stored) {
          try {
            const { user: storedUser, token: storedToken } = JSON.parse(stored);
            setUser(storedUser);
            setJwtToken(storedToken);
            setGlobalJwtToken(storedToken);
            setIsAuthenticated(true);
          } catch (parseErr) {
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        } else {
        }
        // VŽDY nastav isLoading na false když je init hotový
        setIsLoading(false);
      } catch (err) {
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
      const demoUser = process.env.EXPO_PUBLIC_DEMO_USERNAME;
      const demoPass = process.env.EXPO_PUBLIC_DEMO_PASSWORD;
      console.log('[DEBUG] demoUser defined:', !!demoUser, '| demoPass defined:', !!demoPass, '| match:', userName === demoUser, password === demoPass);
      if (demoUser && demoPass && userName === demoUser && password === demoPass) {
        const userData: User = {
          id: '0',
          userName: 'demo',
          email: 'demo@autohity.cz',
          firstName: 'Demo',
          lastName: 'Uživatel',
        };
        setUser(userData);
        setJwtToken('demo-token');
        setGlobalJwtToken('demo-token');
        setIsAuthenticated(true);
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ user: userData, token: 'demo-token' })
        );
        return { success: true };
      }

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
      setGlobalJwtToken(loginResponse.token);
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
        // Nepretrhávej login - profil není kritický
      }

      // Synchronizuj uživatele do DB (employees table)
      try {
        const syncResult = await apiService.syncUser(
          userData.id,
          userData.firstName || '',
          userData.lastName || ''
        );
      } catch (syncError) {
        // Nepretrhávej login - sync selhání není kritické
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Přihlášení se nezdařilo' };
    }
  };

  const logout = async () => {
    try {
      // Postupně resetuj aby se nevrátilo do loading stavu
      await AsyncStorage.removeItem(STORAGE_KEY);
      await authApiService.logout();
      // Až po úspěšném logout resetuj state
      setIsAuthenticated(false);
      setUser(null);
      setJwtToken(null);
      setGlobalJwtToken(null);
      setUserStats(null);
      setAllStats(null);
      // isLoading zůstane false - nechceme se vrátit na loading screen
    } catch (err) {
      // I při erroru resetuj auth state
      setIsAuthenticated(false);
      setUser(null);
      setJwtToken(null);
      setGlobalJwtToken(null);
    }
  };

  const loadUserProfile = async () => {
    if (!jwtToken) {
      return;
    }
    try {
      const profileData = await authApiService.getProfile(jwtToken);
      setUser(prev => {
        const updated = prev
          ? {
              ...prev,
              firstName: profileData.firstName,
              lastName: profileData.lastName,
              phoneNumber: profileData.phoneNumber,
            }
          : null;
        return updated;
      });
    } catch (err) {
      // Profil (jméno/telefon) není kritický - typicky selže jen když session token
      // mezitím vypršel. Nechceme kvůli tomu appku shodit na unhandled rejection,
      // stávající (uložená) data uživatele zůstanou beze změny.
    }
  };

  const loadUserStats = async () => {
    if (!user?.id) {
      return;
    }

    try {
      const url = `https://autohity.cz/php-api/purchases/stats?userId=${user.id}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        setUserStats({
          total: data.data.total || 0,
          new: data.data.new || 0,
          inProgress: data.data.inProgress || 0,
          completed: data.data.completed || 0,
          cancelled: data.data.cancelled || 0,
        });
      } else {
        setUserStats({
          total: 0,
          new: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
        });
      }
    } catch (err) {
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
      const url = 'https://autohity.cz/php-api/purchases/stats/all';

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        setAllStats({
          total: data.data.total || 0,
          new: data.data.new || 0,
          inProgress: data.data.inProgress || 0,
          completed: data.data.completed || 0,
          cancelled: data.data.cancelled || 0,
        });
      } else {
        setAllStats({
          total: 0,
          new: 0,
          inProgress: 0,
          completed: 0,
          cancelled: 0,
        });
      }
    } catch (err) {
      setAllStats({
        total: 0,
        new: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      });
    }
  };

  const loadUserStatsFiltered = async (startDate?: string, endDate?: string): Promise<UserStats | null> => {
    if (!user?.id) {
      return null;
    }

    try {
      let url = `https://autohity.cz/php-api/purchases/stats/filtered?userId=${user.id}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        return {
          total: data.data.total || 0,
          new: data.data.new || 0,
          inProgress: data.data.inProgress || 0,
          completed: data.data.completed || 0,
          cancelled: data.data.cancelled || 0,
        };
      }
      return null;
    } catch (err) {
      return null;
    }
  };

  const loadAllStatsFiltered = async (startDate?: string, endDate?: string): Promise<UserStats | null> => {
    try {
      let url = 'https://autohity.cz/php-api/purchases/stats/filtered/all';
      if (startDate) url += `?startDate=${startDate}`;
      if (endDate) url += (startDate ? '&' : '?') + `endDate=${endDate}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.data) {
        return {
          total: data.data.total || 0,
          new: data.data.new || 0,
          inProgress: data.data.inProgress || 0,
          completed: data.data.completed || 0,
          cancelled: data.data.cancelled || 0,
        };
      }
      return null;
    } catch (err) {
      return null;
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<boolean> => {
    try {
      // TODO: Implement password change when API endpoint is available
      return false;
    } catch (err) {
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
        loadUserStatsFiltered,
        loadAllStatsFiltered,
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