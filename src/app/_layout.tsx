import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/lib/auth';
import { DatesProvider } from '@/lib/store';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DatesProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="date/[id]" />
          <Stack.Screen name="add" options={{ presentation: 'modal' }} />
          <Stack.Screen name="edit/[id]" options={{ presentation: 'modal' }} />
        </Stack>
          <StatusBar style="dark" />
        </DatesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
