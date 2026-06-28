import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';

const ROWS: { icon: keyof typeof Ionicons.glyphMap; label: string; hint: string }[] = [
  { icon: 'notifications-outline', label: 'Reminder timing', hint: 'Soon' },
  { icon: 'cloud-upload-outline', label: 'Account & sync', hint: 'Soon' },
  { icon: 'star-outline', label: 'DatePad Premium', hint: 'Soon' },
  { icon: 'information-circle-outline', label: 'About', hint: 'v0.1' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.group}>
        {ROWS.map((r, i) => (
          <View
            key={r.label}
            style={[styles.row, i < ROWS.length - 1 && styles.rowDivider]}>
            <Ionicons name={r.icon} size={20} color={Colors.accent} />
            <Text style={styles.rowLabel}>{r.label}</Text>
            <Text style={styles.rowHint}>{r.hint}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  group: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { flex: 1, fontSize: 16, color: Colors.text, fontWeight: '600' },
  rowHint: { fontSize: 13, color: Colors.textMuted },
});
