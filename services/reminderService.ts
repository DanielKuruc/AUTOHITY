import * as Notifications from 'expo-notifications';
import { Purchase, PurchaseState } from '@/constants/types';
import { scheduleReminder, cancelNotification, getScheduledNotifications } from './notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMINDER_IDS_STORAGE_KEY = '@reminder_ids';

/**
 * Spočítá dny do určitého datumu
 */
export const daysUntilDate = (dateString?: string): number | null => {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
};

/**
 * Vytvoří připomínku na STK
 */
export async function createStkReminder(purchase: Purchase): Promise<string | null> {
  const daysLeft = daysUntilDate(purchase.carDetails?.stk);
  
  if (!daysLeft || daysLeft < 0 || daysLeft > 30) return null;

  const reminderDate = new Date();
  // Naplánovat na 9:00 zítřka
  reminderDate.setDate(reminderDate.getDate() + 1);
  reminderDate.setHours(9, 0, 0, 0);

  try {
    const reminderId = await scheduleReminder(
      'STK brzy vyprší',
      `Vozidlo ${purchase.carDetails?.make} ${purchase.carDetails?.model} (${purchase.spz}) - STK vyprší za ${daysLeft} dní`,
      reminderDate,
      { purchaseId: purchase.id, type: 'reminder' }
    );

    // Uložit ID připomínky
    await saveReminderId(purchase.id, 'stk', reminderId);
    return reminderId;
  } catch (error) {
    console.error('[ReminderService] Chyba při vytváření STK připomínky:', error);
    return null;
  }
}

/**
 * Vytvoří připomínku na nedokončený výkup
 */
export async function createUnfinishedPurchaseReminder(purchase: Purchase): Promise<string | null> {
  // Pouze pro výkupy v probíhajícím stavu
  if (purchase.purchaseState !== PurchaseState.IN_PROGRESS) return null;

  const purchaseDate = new Date(purchase.purchaseDate || new Date());
  const now = new Date();
  const daysSinceCreated = Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24));

  // Připomínka po 7 dnech
  if (daysSinceCreated >= 7) {
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 1);
    reminderDate.setHours(10, 0, 0, 0);

    try {
      const reminderId = await scheduleReminder(
        'Nedokončený výkup',
        `Výkup ${purchase.carDetails?.make} ${purchase.carDetails?.model} (${purchase.spz}) čeká ${daysSinceCreated} dní na dokončení`,
        reminderDate,
        { purchaseId: purchase.id, type: 'reminder' }
      );

      await saveReminderId(purchase.id, 'unfinished', reminderId);
      return reminderId;
    } catch (error) {
      console.error('[ReminderService] Chyba při vytváření připomínky na nedokončený výkup:', error);
      return null;
    }
  }

  return null;
}

/**
 * Vytvoří připomínky pro všechny výkupy
 */
export async function createRemindersForAllPurchases(purchases: Purchase[]): Promise<void> {
  console.log('[ReminderService] Vytváření připomínek pro výkupy...');
  
  // Vymazat staré připomínky
  await clearAllReminders();

  for (const purchase of purchases) {
    await createStkReminder(purchase);
    await createUnfinishedPurchaseReminder(purchase);
  }

  console.log('[ReminderService] Připomínky vytvořeny');
}

/**
 * Vymaže připomínku
 */
export async function deleteReminder(reminderId: string): Promise<void> {
  try {
    await cancelNotification(reminderId);
  } catch (error) {
    console.error('[ReminderService] Chyba při mazání připomínky:', error);
  }
}

/**
 * Vymaže všechny připomínky
 */
export async function clearAllReminders(): Promise<void> {
  try {
    const reminderIds = await AsyncStorage.getItem(REMINDER_IDS_STORAGE_KEY);
    if (reminderIds) {
      const ids = JSON.parse(reminderIds) as string[];
      for (const id of ids) {
        try {
          await cancelNotification(id);
        } catch (e) {
          // Ignorovat chyby při mazání
        }
      }
    }
    await AsyncStorage.removeItem(REMINDER_IDS_STORAGE_KEY);
  } catch (error) {
    console.error('[ReminderService] Chyba při mazání připomínek:', error);
  }
}

/**
 * Uloží ID připomínky do úložiště
 */
async function saveReminderId(purchaseId: string, type: 'stk' | 'unfinished', reminderId: string): Promise<void> {
  try {
    const key = `${REMINDER_IDS_STORAGE_KEY}_${purchaseId}_${type}`;
    await AsyncStorage.setItem(key, reminderId);
  } catch (error) {
    console.error('[ReminderService] Chyba při ukládání ID připomínky:', error);
  }
}

/**
 * Vrátí ID připomínky
 */
export async function getReminderId(purchaseId: string, type: 'stk' | 'unfinished'): Promise<string | null> {
  try {
    const key = `${REMINDER_IDS_STORAGE_KEY}_${purchaseId}_${type}`;
    return await AsyncStorage.getItem(key);
  } catch (error) {
    console.error('[ReminderService] Chyba při načítání ID připomínky:', error);
    return null;
  }
}

/**
 * Vrátí seznam všech naplánovaných připomínek
 */
export async function getAllReminders(): Promise<Array<{ id: string; purchase: string; type: string }>> {
  try {
    const scheduled = await getScheduledNotifications();
    return scheduled
      .filter(n => (n.content.data as any)?.type === 'reminder')
      .map(n => ({
        id: n.identifier,
        purchase: (n.content.data as any)?.purchaseId || 'unknown',
        type: 'reminder',
      }));
  } catch (error) {
    console.error('[ReminderService] Chyba při načítání připomínek:', error);
    return [];
  }
}

/**
 * Zkontroluje a aktualizuje připomínky (mělo by se volat periodicky)
 */
export async function checkAndUpdateReminders(purchases: Purchase[]): Promise<void> {
  // Vymazat a znovu vytvořit
  await createRemindersForAllPurchases(purchases);
}
