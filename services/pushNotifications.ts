import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';
import { apiService } from './apiService';

/**
 * PUSH NOTIFICATIONS SERVICE
 * 
 * Handles:
 * - Token registration for physical devices
 * - Fallback to in-app notifications in simulator
 * - Token submission to backend
 * - Global notification handler setup
 */

// Configure notification handler - push notifications will NOT show system alerts
// Instead they'll be delivered to in-app notification center via listeners
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // Don't show system notification
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

/**
 * Get Expo push token for a device
 * Returns null on simulator (will use in-app notifications instead)
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    // On simulator, return null - we'll use in-app notifications
    if (!Device.isDevice) {
      console.log('[PushNotifications] Running on simulator - using in-app notifications fallback');
      return null;
    }

    // On physical device, get the Expo push token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ||
                      Constants.easConfig?.projectId ||
                      'unknown';

    if (projectId === 'unknown') {
      console.warn('[PushNotifications] No projectId found - cannot get push token');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    console.log('[PushNotifications] Token obtained:', token.data.substring(0, 20) + '...');
    return token.data;
  } catch (error) {
    console.error('[PushNotifications] Failed to get token:', error);
    return null;
  }
}

/**
 * Request notification permissions (iOS)
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (!Device.isDevice) {
      console.log('[PushNotifications] Simulator - skipping permissions request');
      return true;
    }

    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      console.log('[PushNotifications] Non-mobile platform - skipping permissions');
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    const granted = status === 'granted';

    console.log('[PushNotifications] Notification permissions:', status);
    return granted;
  } catch (error) {
    console.error('[PushNotifications] Permission request failed:', error);
    return false;
  }
}

/**
 * Register push token with backend
 * Sends the token to PHP backend so push can be sent to this device
 */
export async function registerPushTokenWithBackend(
  userId: number,
  expoToken: string | null
): Promise<boolean> {
  try {
    if (!expoToken) {
      console.log('[PushNotifications] No token to register (simulator/fallback mode)');
      return true; // Still consider it success - we'll use in-app notifications
    }

    const response = await apiService.post('/register_push_token.php', {
      user_id: userId,
      expo_token: expoToken,
    });

    console.log('[PushNotifications] Token registered with backend');
    return response.success === true;
  } catch (error) {
    console.error('[PushNotifications] Failed to register token:', error);
    return false;
  }
}

/**
 * Setup notification listeners for incoming push notifications
 * Call this in your app root (e.g., _layout.tsx)
 * 
 * @param onNotificationReceived - Callback when notification arrives (app open)
 * @param onNotificationResponse - Callback when user taps notification
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (notification: Notifications.Notification) => void
) {
  // Listen for notifications when app is open
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    console.log('[PushNotifications] Notification received while app open:', {
      title: notification.request.content.title,
      body: notification.request.content.body,
    });

    onNotificationReceived?.(notification);
  });

  // Listen for user tapping on notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const notification = response.notification;
    console.log('[PushNotifications] User tapped notification:', {
      title: notification.request.content.title,
      body: notification.request.content.body,
    });

    onNotificationResponse?.(notification);
  });

  // Return cleanup function
  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Initialize push notifications
 * Call this early in app lifecycle (e.g., in _layout.tsx useEffect)
 */
export async function initializePushNotifications(userId: number): Promise<void> {
  try {
    console.log('[PushNotifications] Initializing...');

    // ✅ On simulator - use in-app notifications only
    if (!Device.isDevice) {
      console.log('[PushNotifications] Simulator detected - using in-app notifications only');
      return;
    }

    // ✅ Explicitly evaluate permission result
    const permissionGranted = await requestNotificationPermissions();

    // ✅ If permission NOT granted - stop here
    if (!permissionGranted) {
      console.warn('[PushNotifications] Notification permission denied - push tokens cannot be obtained');
      return;
    }

    // ✅ Get token ONLY if permission is granted
    const token = await getExpoPushToken();

    // ✅ Register with backend ONLY if token exists
    if (token) {
      await registerPushTokenWithBackend(userId, token);
    }

    console.log('[PushNotifications] Initialization complete');
  } catch (error) {
    console.error('[PushNotifications] Initialization failed:', error);
  }
}

/**
 * Manually trigger a notification (for testing or in-app notifications)
 * Used by NotificationContext to show in-app notifications that look like push
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
  seconds: number = 2
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
        badge: 1,
      },
      trigger: { type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
    });

    console.log('[PushNotifications] Local notification scheduled:', title);
  } catch (error) {
    console.error('[PushNotifications] Failed to schedule notification:', error);
  }
}