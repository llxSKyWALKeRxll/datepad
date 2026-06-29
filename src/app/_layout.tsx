import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth';
import {
  addNotificationResponseListener,
  configureNotifications,
  snoozeReminder,
} from '@/lib/notifications';
import { DatesProvider, useStore } from '@/lib/store';
import { ThemeProvider, useTheme } from '@/lib/theme';

/** Wires reminder action-button taps (Mark handled / Snooze) to the store. */
function useNotificationActions() {
  const { updateDate, getDate, getCategory } = useStore();
  useEffect(() => {
    configureNotifications();
  }, []);
  useEffect(() => {
    return addNotificationResponseListener(({ action, dateId, occursOn }) => {
      if (!dateId || dateId === 'test') return;
      if (action === 'mark-handled' && occursOn) {
        updateDate(dateId, { handledOccurrence: occursOn });
      } else if (action === 'snooze') {
        const d = getDate(dateId);
        if (d) {
          const noun = getCategory(d.categoryId)?.label ?? 'date';
          snoozeReminder(`Reminder: ${d.name}`, `${d.name}'s ${noun} is coming up.`, dateId);
        }
      }
    });
  }, [updateDate, getDate, getCategory]);
}

function Navigator() {
  const { colors, scheme } = useTheme();
  useNotificationActions();
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="date/[id]" />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit/[id]" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <DatesProvider>
            <Navigator />
          </DatesProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
