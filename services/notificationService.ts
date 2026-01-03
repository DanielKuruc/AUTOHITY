import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { PurchaseState } from '@/constants/types';

// Konfigurace notifikací
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  purchaseId?: string;
  type?: 'status_change' | 'reminder' | 'report';
}

/**
 * Registrace pro push notifikace
 */
export async function registerForPushNotifications(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Výkupy',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e30613',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Notifikace nebyly povoleny');
      return null;
    }
    
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Nahradit skutečným project ID
      });
      token = tokenData.data;
      console.log('Push token:', token);
    } catch (error) {
      console.log('Chyba při získávání push tokenu:', error);
    }
  } else {
    console.log('Push notifikace vyžadují fyzické zařízení');
  }

  return token;
}

/**
 * Odeslání lokální notifikace o změně stavu výkupu
 */
export async function sendPurchaseStatusNotification(
  clientName: string,
  spz: string,
  newState: PurchaseState,
  purchaseId: string
): Promise<void> {
  const stateLabels: Record<PurchaseState, string> = {
    [PurchaseState.NEW]: 'Nový',
    [PurchaseState.IN_PROGRESS]: 'Probíhá',
    [PurchaseState.COMPLETED]: 'Dokončen',
    [PurchaseState.CANCELLED]: 'Zrušen',
  };

  const stateLabel = stateLabels[newState] || newState;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Změna stavu výkupu',
      body: `Výkup ${spz} (${clientName}) - nový stav: ${stateLabel}`,
      data: { purchaseId, type: 'status_change' } as Record<string, unknown>,
      sound: 'default',
    },
    trigger: null, // Okamžité odeslání
  });
}

/**
 * Naplánování připomínky
 */
export async function scheduleReminder(
  title: string,
  body: string,
  triggerDate: Date,
  data?: NotificationData
): Promise<string> {
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data as Record<string, unknown>,
      sound: 'default',
    },
    trigger: {
      type: 'date',
      date: triggerDate,
    } as any,
  });

  return identifier;
}

/**
 * Odeslání notifikace o novém reportu
 */
export async function sendReportNotification(
  reportType: 'weekly' | 'monthly',
  summary: string
): Promise<void> {
  const title = reportType === 'weekly' ? 'Týdenní report' : 'Měsíční report';

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body: summary,
      data: { type: 'report' } as Record<string, unknown>,
      sound: 'default',
    },
    trigger: null,
  });
}

/**
 * Zrušení naplánované notifikace
 */
export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

/**
 * Zrušení všech notifikací
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Získání všech naplánovaných notifikací
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Listener pro příchozí notifikace
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Listener pro kliknutí na notifikaci
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}