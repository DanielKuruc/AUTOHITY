import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  card: string;
  // Text
  text: string;
  textSecondary: string;
  textTertiary: string;
  // Borders
  border: string;
  borderLight: string;
  // Accent
  accent: string;
  accentLight: string;
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  // Special
  overlay: string;
  inputBackground: string;
  headerButtonBackground: string;
  idButtonBackground: string;
  headerButtonText: string;
  contextbuttons: string;
  idIcons: string;
  idIconsBackground: string;
}

export const lightTheme: ThemeColors = {
  background: "#F8F9FA",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  text: "#1A1A1A",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  border: "#D1D5DB",
  borderLight: "#E5E7EB",
  accent: "#e30613",
  accentLight: "#FEE2E2",
  success: "#34C759",
  warning: "#FF9500",
  error: "#FF3B30",
  info: "#007AFF",
  overlay: "rgba(0, 0, 0, 0.5)",
  inputBackground: "#F8F8F8",
  headerButtonBackground: "#6f6f6fff",
  idButtonBackground: "#6f6f6fff",
  idIcons: "#ffffff",
  idIconsBackground: "#6f6f6fff",
  headerButtonText: "#F8F8F8",
  contextbuttons: "#000000",
};

export const darkTheme: ThemeColors = {
  background: "#121212",
  surface: "#1E1E1E",
  card: "#2C2C2C",
  text: "#FFFFFF",
  textSecondary: "#A1A1A1",
  textTertiary: "#6B6B6B",
  border: "#3A3A3A",
  borderLight: "#2A2A2A",
  accent: "#e30613",
  accentLight: "#3D1515",
  success: "#30D158",
  warning: "#FF9F0A",
  error: "#FF453A",
  info: "#0A84FF",
  overlay: "rgba(0, 0, 0, 0.7)",
  inputBackground: "#2C2C2C",
  headerButtonBackground: "#2C2C2C",
  idButtonBackground: "#e30613",
  idIcons: "#e30613",
  idIconsBackground: "#3D1515",
  headerButtonText: "#F8F8F8",
  contextbuttons: "#F8F8F8",
};

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemeColors;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "autohity_theme_mode";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved && ["light", "dark", "system"].includes(saved)) {
        setThemeModeState(saved as ThemeMode);
      }
    } catch (error) {}
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {}
  };

  const toggleTheme = () => {
    const newMode = themeMode === "dark" ? "light" : "dark";
    setThemeMode(newMode);
  };
  const isDark =
    themeMode === "system"
      ? systemColorScheme === "dark"
      : themeMode === "dark";

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{ theme, isDark, themeMode, setThemeMode, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
