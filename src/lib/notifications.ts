/**
 * Push-notification registration for DatePad.
 *
 * The server (pg_cron → send-reminders → Expo Push) is the source of truth; the
 * client's only job is to hand its Expo push token to the `push_tokens` table so
 * the server knows where to send. Everything here degrades gracefully:
 *   - the native module may be absent in an older dev build (needs a rebuild),
 *   - emulators/simulators can't get a real token (no FCM/APNs),
 *   - an Expo push token needs an EAS projectId.
 * In each case we return a reason instead of throwing, so the UI can explain.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

type NotificationsModule = typeof import('expo-notifications');

// Guarded require: importing statically would crash the bundle on a dev build
// that predates the native module. require + try/catch keeps the app running.
let Notifications: NotificationsModule | null = null;
try {
  Notifications = require('expo-notifications') as NotificationsModule;
} catch {
  Notifications = null;
}

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export type RegisterResult = { ok: true; token: string } | { ok: false; reason: string };

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
}

/** True when the native notifications module is present in this build. */
export function notificationsAvailable(): boolean {
  return Notifications != null;
}

export async function getPermissionState(): Promise<PermissionState> {
  if (!Notifications) return 'unavailable';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status as PermissionState;
  } catch {
    return 'unavailable';
  }
}

/** Ask the OS for permission. Returns whether it ended up granted. */
export async function requestPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Fetch this device's Expo push token and upsert it into push_tokens. */
export async function registerPushToken(userId: string): Promise<RegisterResult> {
  if (!Notifications) {
    return { ok: false, reason: 'Update the app to enable notifications.' };
  }
  if (!Device.isDevice) {
    return { ok: false, reason: 'Push notifications need a physical device.' };
  }
  const pid = projectId();
  if (!pid) {
    return { ok: false, reason: 'Notifications aren’t configured for this build yet.' };
  }
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: pid });
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        { token, user_id: userId, platform: Platform.OS, updated_at: new Date().toISOString() },
        { onConflict: 'token' },
      );
    if (error) return { ok: false, reason: error.message };
    return { ok: true, token };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Could not register for push.' };
  }
}

/** Remove this device's token (used on sign-out / disabling reminders). */
export async function unregisterPushToken(): Promise<void> {
  if (!Notifications || !Device.isDevice) return;
  const pid = projectId();
  if (!pid) return;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: pid });
    await supabase.from('push_tokens').delete().eq('token', token);
  } catch {
    // best-effort
  }
}

/**
 * Quietly refresh the token on app start when permission is already granted —
 * never prompts (priming/permission is a user-initiated action in Settings).
 */
export async function refreshPushTokenIfGranted(userId: string): Promise<void> {
  if ((await getPermissionState()) === 'granted') {
    await registerPushToken(userId);
  }
}

// --- Notification display, categories & actions ---------------------------

export const REMINDER_CATEGORY = 'reminder';

/** One-time setup: foreground display behaviour, Android channel, action buttons. */
export async function configureNotifications(): Promise<void> {
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
      { identifier: 'mark-handled', buttonTitle: 'Mark handled', options: { opensAppToForeground: false } },
      { identifier: 'snooze', buttonTitle: 'Snooze 1 day', options: { opensAppToForeground: false } },
    ]);
  } catch {
    // native module absent — actions simply won't be available
  }
}

export type NotificationAction = { action: string; dateId?: string; occursOn?: string };

/** Listen for action-button taps on reminders. Returns an unsubscribe fn. */
export function addNotificationResponseListener(
  handler: (a: NotificationAction) => void,
): () => void {
  if (!Notifications) return () => {};
  try {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const action = response.actionIdentifier;
      // Action buttons don't auto-dismiss on Android — tapping "Mark handled" or
      // "Snooze" leaves the notification in the shade unless we clear it. Dismiss
      // the source notification first so it always disappears on tap.
      if (action === 'mark-handled' || action === 'snooze') {
        Notifications!
          .dismissNotificationAsync(response.notification.request.identifier)
          .catch(() => {});
      }
      const data = response.notification.request.content.data as {
        dateId?: string;
        occursOn?: string;
      };
      handler({ action, dateId: data?.dateId, occursOn: data?.occursOn });
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

/** Re-notify about a date in ~24h (used by the Snooze action). */
export async function snoozeReminder(title: string, body: string, dateId?: string): Promise<void> {
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, categoryIdentifier: REMINDER_CATEGORY, data: { dateId } },
      trigger: { seconds: 24 * 60 * 60, channelId: 'default' } as any,
    });
  } catch {
    // best-effort
  }
}

/**
 * Fire a local notification immediately — same UI + action buttons as a real
 * reminder, but no server/FCM needed. Powers the "Send a test reminder" button
 * and lets us validate the notification UX on the emulator.
 */
export async function sendTestNotification(): Promise<RegisterResult> {
  if (!Notifications) return { ok: false, reason: 'Update the app to enable notifications.' };
  const granted = await requestPermission();
  if (!granted) return { ok: false, reason: 'Allow notifications to send a test.' };
  try {
    await configureNotifications();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎂 Test reminder',
        body: 'This is how DatePad reminders look — try the Mark handled / Snooze actions.',
        categoryIdentifier: REMINDER_CATEGORY,
        data: { dateId: 'test' },
      },
      trigger: null, // immediate
    });
    return { ok: true, token: 'test' };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : 'Could not send test.' };
  }
}
