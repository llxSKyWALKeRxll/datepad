import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { ImportantDate, isValidMonthDay } from '@/lib/dates';
import { useStore } from '@/lib/store';

export function DateForm({ existing }: { existing?: ImportantDate }) {
  const insets = useSafeAreaInsets();
  const { categories, addDate, updateDate, addCategory } = useStore();

  const isEdit = !!existing;
  const [name, setName] = useState(existing?.name ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories[0]?.id ?? 'birthday');
  const [month, setMonth] = useState(existing ? String(existing.month) : '');
  const [day, setDay] = useState(existing ? String(existing.day) : '');
  const [year, setYear] = useState(existing?.year ? String(existing.year) : '');
  const [note, setNote] = useState(existing?.note ?? '');

  // Inline "new tag" state
  const [creatingTag, setCreatingTag] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagEmoji, setNewTagEmoji] = useState('');

  function confirmNewTag() {
    if (!newTagLabel.trim()) {
      Alert.alert('Name your tag', 'Give the new tag a short name.');
      return;
    }
    const cat = addCategory(newTagLabel, newTagEmoji);
    setCategoryId(cat.id);
    setNewTagLabel('');
    setNewTagEmoji('');
    setCreatingTag(false);
  }

  function onSave() {
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const y = year.trim() ? parseInt(year, 10) : undefined;
    if (!name.trim() || !isValidMonthDay(m, d)) {
      Alert.alert('Almost there', 'Add a name and a valid month (1–12) and day (1–31).');
      return;
    }
    const payload = {
      name: name.trim(),
      categoryId,
      month: m,
      day: d,
      year: y && y > 0 ? y : undefined,
      note: note.trim() || undefined,
    };
    if (isEdit) updateDate(existing!.id, payload);
    else addDate(payload);
    router.back();
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.topbar}>
        <Text style={styles.title}>{isEdit ? 'Edit date' : 'Add a date'}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={24} color={Colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Who or what is it?</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Mom, Alex & Sam, Passport renewal"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Tag</Text>
        <View style={styles.chips}>
          {categories.map((c) => {
            const active = c.id === categoryId;
            return (
              <Pressable
                key={c.id}
                onPress={() => setCategoryId(c.id)}
                style={[styles.chip, active && styles.chipActive]}>
                <Text style={styles.chipEmoji}>{c.emoji}</Text>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setCreatingTag((v) => !v)}
            style={[styles.chip, styles.chipNew]}>
            <Ionicons name={creatingTag ? 'close' : 'add'} size={16} color={Colors.accent} />
            <Text style={[styles.chipText, { color: Colors.accent }]}>New tag</Text>
          </Pressable>
        </View>

        {creatingTag && (
          <View style={styles.newTagPanel}>
            <TextInput
              value={newTagEmoji}
              onChangeText={setNewTagEmoji}
              placeholder="📌"
              placeholderTextColor={Colors.textMuted}
              maxLength={2}
              style={[styles.input, styles.emojiInput]}
            />
            <TextInput
              value={newTagLabel}
              onChangeText={setNewTagLabel}
              placeholder="Tag name (e.g. Bill, Visa, Meeting)"
              placeholderTextColor={Colors.textMuted}
              style={[styles.input, { flex: 1 }]}
              onSubmitEditing={confirmNewTag}
              returnKeyType="done"
            />
            <Pressable onPress={confirmNewTag} style={styles.newTagAdd}>
              <Ionicons name="checkmark" size={22} color="#fff" />
            </Pressable>
          </View>
        )}

        <Text style={styles.label}>Date</Text>
        <View style={styles.row}>
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
          <TextInput
            value={year}
            onChangeText={setYear}
            placeholder="YYYY"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            maxLength={4}
            style={[styles.input, styles.yearInput]}
          />
        </View>
        <Text style={styles.hint}>Year is optional — used to show age / years.</Text>

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Gift ideas, hat size, anything…"
          placeholderTextColor={Colors.textMuted}
          multiline
          style={[styles.input, styles.note]}
        />

        <PrimaryButton
          label={isEdit ? 'Save changes' : 'Save date'}
          onPress={onSave}
          style={{ marginTop: Spacing.xl, marginBottom: insets.bottom + Spacing.xl }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.lg },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipNew: { borderStyle: 'dashed', borderColor: Colors.accent },
  chipEmoji: { fontSize: 15 },
  chipText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  chipTextActive: { color: '#fff' },
  newTagPanel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  emojiInput: { width: 56, textAlign: 'center', fontSize: 20 },
  newTagAdd: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', gap: Spacing.md },
  dateInput: { flex: 1, textAlign: 'center', letterSpacing: 2 },
  yearInput: { flex: 1.4, textAlign: 'center', letterSpacing: 2 },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: Spacing.xs },
  note: { height: 96, paddingTop: 14, textAlignVertical: 'top' },
});
