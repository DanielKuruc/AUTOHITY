import { NotificationToast } from '@/components/NotificationCenter';
import { ToastContainer } from '@/components/Toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { NotificationProvider, useNotifications } from '@/contexts/NotificationContext';
import { PurchaseProvider } from '@/contexts/PurchaseContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { UsersProvider } from '@/contexts/UsersContext';
import { initializePushNotifications, setupNotificationListeners } from '@/services/pushNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LoginScreen from './login';
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

function RootLayoutContent() {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const { addFromPushNotification, notifications } = useNotifications();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Hide splash screen
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      // Silently fail
    });
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
  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (user?.id) {
      initializePushNotifications(Number(user.id));

      const cleanup = setupNotificationListeners(
        (notification) => {
          addFromPushNotification(notification);
        },
        (notification) => {
          addFromPushNotification(notification);
        }
      );

      return cleanup;
    }
  }, [user?.id, addFromPushNotification]);

  // Persist notifications to AsyncStorage whenever they change
  useEffect(() => {
    const persistNotifications = async () => {
      try {
        await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
      } catch (error) {
        // Silently fail or log error if needed
      }
    };
    persistNotifications();
  }, [notifications]);

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
      {/* Display push notification toasts */}
      {notifications.length > 0 && (
        <View style={styles.notificationStack}>
          {notifications.slice(0, 1).map((notif) => (
            <NotificationToast key={notif.id} notification={notif} />
          ))}
        </View>
      )}
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
  notificationStack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    pointerEvents: 'none',
  },
});