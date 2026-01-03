import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PurchaseProvider } from '@/contexts/PurchaseContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import LoginScreen from './login';
import { setGlobalJwtToken as setApiServiceToken } from '@/services/apiService';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, jwtToken } = useAuth();
  const { theme } = useTheme();

  // Set JWT token v services když se změní
  useEffect(() => {
    console.log('[RootLayout] AuthGate - jwtToken:', jwtToken ? 'set' : 'null');
    if (jwtToken) {
      console.log('[RootLayout] Nastavuji JWT token ve services:', jwtToken.substring(0, 20) + '...');
      setApiServiceToken(jwtToken);
    } else {
      console.log('[RootLayout] Token je null, nenastavuji do services');
    }
  }, [jwtToken]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}

function RootLayoutContent() {
  const { isDark } = useTheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen 
            name="filters" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="new-purchase" 
            options={{ 
              presentation: 'fullScreenModal',
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="purchase/[id]" 
            options={{ 
              headerShown: false,
            }} 
          />
        </Stack>
      </AuthGate>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <AuthProvider>
          <PurchaseProvider>
            <RootLayoutContent />
          </PurchaseProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});