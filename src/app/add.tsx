import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { DateType } from '@/lib/dates';

const TYPES: { key: DateType; label: string }[] = [
  { key: 'birthday', label: 'Birthday' },
  { key: 'anniversary', label: 'Anniversary' },
  { key: 'custom', label: 'Other' },
];

export default function AddDateScreen() {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [type, setType] = useState<DateType>('birthday');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');

  function onSave() {
    // Persistence (Supabase) comes next — base build just validates + closes.
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    if (!name.trim() || !(m >= 1 && m <= 12) || !(d >= 1 && d <= 31)) {
      Alert.alert('Almost there', 'Add a name and a valid month (1–12) and day (1–31).');
      return;
    }
    Alert.alert('Saved (preview)', `${name} — ${m}/${d}.\nPersistence lands with Supabase next.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.topbar}>
        <Text style={styles.title}>Add a date</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={24} color={Colors.textMuted} />
        </Pressable>
      </View>

      <Text style={styles.label}>Who or what is it?</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Mom, Alex & Sam, Passport renewal"
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
      />

      <Text style={styles.label}>Type</Text>
      <View style={styles.segment}>
        {TYPES.map((t) => {
          const active = t.key === type;
          return (
            <Pressable
              key={t.key}
              onPress={() => setType(t.key)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Date</Text>
      <View style={styles.dateRow}>
        <TextInput
          value={month}
          onChangeText={setMonth}
          placeholder="MM"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          maxLength={2}
          style={[styles.input, styles.dateInput]}
        />
        <TextInput
          value={day}
          onChangeText={setDay}
          placeholder="DD"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
          maxLength={2}
          style={[styles.input, styles.dateInput]}
        />
      </View>

      <PrimaryButton label="Save date" onPress={onSave} style={{ marginTop: Spacing.xl }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background, padding: Spacing.lg },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text },
  close: { padding: 4 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
    fontSize: 16,
    color: Colors.text,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: 4,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    height: 42,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentItemActive: { backgroundColor: Colors.accent },
  segmentText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  segmentTextActive: { color: '#fff' },
  dateRow: { flexDirection: 'row', gap: Spacing.md },
  dateInput: { flex: 1, textAlign: 'center', letterSpacing: 2 },
});
