import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useColors } from '@/lib/theme';

export default function TabsLayout() {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Upcoming',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-clear-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
