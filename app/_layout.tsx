import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PurchaseProvider } from '@/contexts/PurchaseContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { UsersProvider } from '@/contexts/UsersContext';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, ActivityIndicator, AppState, AppStateStatus, Platform } from 'react-native';
import LoginScreen from './login';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useEffect, useRef } from 'react';
import { ToastContainer } from '@/components/Toast';
import {
  setupNotificationListeners,
  initializePushNotifications,
  getPurchaseIdFromNotification,
} from '@/services/pushNotifications';
import * as Notifications from 'expo-notifications';
import * as ImagePicker from 'expo-image-picker';
import { purgeOrphanCacheFiles } from '@/utils/cacheCleanup';
SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

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

/**
 * Klepnutí na push notifikaci otevře konkrétní výkup.
 *
 * `useLastNotificationResponse` pokrývá i studený start - když je aplikace
 * zavřená, klepnutí ji teprve nastartuje a odpověď je k dispozici hned po
 * mountu (běžný listener by se do té doby nestihl zaregistrovat).
 *
 * Je to samostatná komponenta, protože ten hook sahá na nativní modul, který
 * na webu neexistuje. Hooky nejde volat podmíněně, ale komponentu jde podmíněně
 * vykreslit - na webu se proto nenamountuje vůbec.
 */
function PushNotificationNavigator({ userId }: { userId?: string }) {
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  const handledNotificationRef = useRef<string | null>(null);

  useEffect(() => {
    // Na uživatele čekáme proto, že dokud není přihlášený, překrývá obsah
    // AuthGate a navigace by se ztratila - po přihlášení efekt doběhne znovu.
    if (!lastNotificationResponse || !userId) return;

    // Stejnou odpověď vrací hook opakovaně, tak si pamatujeme, co už jsme otevřeli
    const notificationId = lastNotificationResponse.notification.request.identifier;
    if (handledNotificationRef.current === notificationId) return;

    const purchaseId = getPurchaseIdFromNotification(lastNotificationResponse.notification);
    if (!purchaseId) return;

    handledNotificationRef.current = notificationId;
    router.push(`/purchase/${purchaseId}`);
  }, [lastNotificationResponse, userId]);

  return null;
}

function RootLayoutContent() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { addNotification } = useNotifications();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Request camera and gallery permissions on app startup
  const requestMediaPermissions = async () => {
    try {
      // Request camera permissions
      await ImagePicker.requestCameraPermissionsAsync();
      
      // Request media library permissions
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    } catch (error) {
      // Error requesting media permissions - silent fail
    }
  };

  // Hide splash screen
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      // Silently fail
    });
  }, []);

  // Clean up orphaned temp photos/PDFs left behind by crashes or older app versions
  useEffect(() => {
    purgeOrphanCacheFiles();
  }, []);

  // Clear badge when app becomes active
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);


  const handleAppStateChange = async (state: AppStateStatus) => {
    if (state === 'active') {
      // Clear badge when app is opened/comes to foreground
      await Notifications.setBadgeCountAsync(0);
    }
  };

  // Initialize push notifications and request media permissions when user is authenticated
  useEffect(() => {
    if (user?.id) {
      // Request camera and gallery permissions at startup
      requestMediaPermissions();
      
      initializePushNotifications(Number(user.id));

      const cleanup = setupNotificationListeners(
        (notification) => {
          const content = notification.request.content;
          const title = content.title || 'Notifikace';
          const body = content.body || '';
          // Show as toast immediately
          showToast(body || title, 'info');
          // Save to notification history for Notification Center
          addNotification(title, body, 'push', content.data);
        },
        (notification) => {
          const content = notification.request.content;
          const title = content.title || 'Notifikace';
          const body = content.body || '';
          // Show as toast immediately
          showToast(body || title, 'info');
          // Save to notification history for Notification Center
          addNotification(title, body, 'push', content.data);
        }
      );

      return cleanup;
    }
  }, [user?.id, showToast, addNotification]);

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Web nemá nativní modul notifikací - viz komentář u komponenty */}
      {Platform.OS !== 'web' && <PushNotificationNavigator userId={user?.id} />}
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
          <Stack.Screen
            name="admin/catalog"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </Stack>
      </AuthGate>
      {/* Single unified toast container */}
      <ToastContainer />
    </NavigationThemeProvider>
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