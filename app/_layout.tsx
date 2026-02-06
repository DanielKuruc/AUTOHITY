import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PurchaseProvider } from '@/contexts/PurchaseContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { UsersProvider } from '@/contexts/UsersContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import LoginScreen from './login';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { ToastContainer } from '@/components/Toast';
import { setupNotificationListeners, initializePushNotifications } from '@/services/pushNotifications';
SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  console.log('[AuthGate] Render:', { isAuthenticated, isLoading });

  if (isLoading) {
    console.log('[AuthGate] Showing loading...');
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  if (!isAuthenticated) {
    console.log('[AuthGate] Not authenticated - showing LoginScreen');
    return <LoginScreen />;
  }

  console.log('[AuthGate] Authenticated - showing app');
  return <>{children}</>;
}

function RootLayoutContent() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { addFromPushNotification } = useNotifications();
  const [loaded, fontError] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Hide splash screen immediately (don't wait for fonts)
  useEffect(() => {
    SplashScreen.hideAsync().catch(err => {
      console.log('[RootLayout] Error hiding splash:', err);
    });
  }, []);

  // Log font loading status
  useEffect(() => {
    if (loaded) {
      console.log('[RootLayout] Fonts loaded successfully');
    }
    if (fontError) {
      console.error('[RootLayout] Font error:', fontError);
    }
  }, [loaded, fontError]);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (user?.id) {
      console.log('[RootLayout] Initializing push notifications for user:', user.id);
      initializePushNotifications(Number(user.id));

      // Setup listeners for incoming notifications
      const cleanup = setupNotificationListeners(
        (notification) => {
          // Notification received while app is open
          addFromPushNotification(notification);
        },
        (notification) => {
          // User tapped on notification
          addFromPushNotification(notification);
          
          // Optional: Navigate to specific screen based on notification data
          const data = notification.request.content.data;
          if (data?.purchaseId) {
            // Could navigate to purchase detail here if needed
            console.log('[RootLayout] Would navigate to purchase:', data.purchaseId);
          }
        }
      );

      return cleanup;
    }
  }, [user?.id, addFromPushNotification]);

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
      <ToastContainer />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <AuthProvider>
          <UsersProvider>
            <ToastProvider>
              <NotificationProvider>
                <PurchaseProvider>
                  <RootLayoutContent />
                </PurchaseProvider>
              </NotificationProvider>
            </ToastProvider>
          </UsersProvider>
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