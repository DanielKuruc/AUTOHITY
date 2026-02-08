import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';

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
    if (!Device.isDevice) {
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ||
                      Constants.easConfig?.projectId ||
                      'unknown';

    if (projectId === 'unknown') {
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });

    return token.data;
  } catch (error) {
    return null;
  }
}

/**
 * Request notification permissions (iOS)
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (!Device.isDevice) {
      return true;
    }

    if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
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
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!expoToken) {
      return { success: true };
    }

    const PHP_BASE = process.env.EXPO_PUBLIC_PHP_API_BASE || 'https://autohity.cz';
    const API_BASE_URL = `${PHP_BASE}/php-api`;
    const url = `${API_BASE_URL}/register_push_token.php`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        expo_token: expoToken,
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return { 
        success: false, 
        error: `HTTP ${response.status}: ${responseText}` 
      };
    }

    let responseData: any = {};
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      return { 
        success: false, 
        error: `Invalid response: ${responseText}` 
      };
    }

    if (responseData.success === true) {
      return { success: true };
    } else {
      const errorMsg = responseData.error || responseData.message || 'Unknown backend error';
      return { 
        success: false, 
        error: `Backend error: ${errorMsg}` 
      };
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error);
    return { 
      success: false, 
      error: `Request failed: ${errorMsg}` 
    };
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
  const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
    onNotificationReceived?.(notification);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onNotificationResponse?.(response.notification);
  });

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
    if (!Device.isDevice) {
      return;
    }

    const permissionGranted = await requestNotificationPermissions();

    if (!permissionGranted) {
      return;
    }

    const token = await getExpoPushToken();

    if (!token) {
      return;
    }

    await registerPushTokenWithBackend(userId, token);
  } catch (error) {
    // Silently fail - notifications are not critical
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
  } catch (error) {
    // Silently fail
  }
}