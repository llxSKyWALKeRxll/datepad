import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryButton } from '@/components/primary-button';
import { SelectSheet } from '@/components/select-sheet';
import { Radius, Spacing, ThemeColors } from '@/constants/theme';
import {
  customDatesOf,
  DEFAULT_LEAD_DAYS,
  ImportantDate,
  leadLabel,
  LEAD_PRESETS,
  RECURRENCE_OPTIONS,
  RecurrenceType,
} from '@/lib/dates';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** A Date whose month/day (and year when known) seed the picker. */
function seedDate(existing?: ImportantDate): Date {
  const now = new Date();
  if (!existing) return now;
  return new Date(existing.year ?? now.getFullYear(), existing.month - 1, existing.day);
}

/** A Date carrying the existing time-of-day, or a sensible default (9:00 AM). */
function seedTime(existing?: ImportantDate): Date {
  const d = new Date();
  d.setHours(existing?.hour ?? 9, existing?.minute ?? 0, 0, 0);
  return d;
}

function isoOf(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

const SHORT_MONTHS = FULL_MONTHS.map((m) => m.slice(0, 3));

/** "Aug 20, 2026" for a custom-date chip. */
function formatChip(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${SHORT_MONTHS[(m || 1) - 1]} ${d}, ${y}`;
}

function formatTimeOfDay(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function DateForm({ existing }: { existing?: ImportantDate }) {
  const insets = useSafeAreaInsets();
  const { categories, addDate, updateDate, addCategory, synced } = useStore();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const isEdit = !!existing;
  const [name, setName] = useState(existing?.name ?? '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? categories[0]?.id ?? 'birthday');

  const [dateValue, setDateValue] = useState<Date>(() => seedDate(existing));
  const [includeYear, setIncludeYear] = useState<boolean>(existing?.year != null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [timeEnabled, setTimeEnabled] = useState<boolean>(existing?.hour != null);
  const [timeValue, setTimeValue] = useState<Date>(() => seedTime(existing));
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [recurrence, setRecurrence] = useState<RecurrenceType>(existing?.recurrence ?? 'annual');
  const [recurrenceYears, setRecurrenceYears] = useState(String(existing?.recurrenceYears ?? 4));

  const [tagSheet, setTagSheet] = useState(false);

  // Custom-recurrence: a hand-picked list of ISO dates.
  const [customDates, setCustomDates] = useState<string[]>(() =>
    existing ? customDatesOf(existing) : [],
  );
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const [remindersEnabled, setRemindersEnabled] = useState(existing?.remindersEnabled !== false);
  const [leadDays, setLeadDays] = useState<number[]>(existing?.leadDays ?? DEFAULT_LEAD_DAYS);
  const [emailReminders, setEmailReminders] = useState(existing?.emailReminders ?? false);

  const [note, setNote] = useState(existing?.note ?? '');

  // `once` / `everyNYears` anchor on a real year, so the year is mandatory there.
  const yearRequired = recurrence === 'once' || recurrence === 'everyNYears';
  const showYear = yearRequired || includeYear;

  function toggleLead(d: number) {
    setLeadDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
    );
  }

  // Inline "new tag" state
  const [creatingTag, setCreatingTag] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [newTagEmoji, setNewTagEmoji] = useState('');

  function onDateChange(event: DateTimePickerEvent, picked?: Date) {
    // Android fires once and dismisses itself; iOS stays open (inline spinner).
    if (Platform.OS !== 'ios') setShowDatePicker(false);
    if (event.type === 'dismissed' || !picked) return;
    setDateValue(picked);
  }

  function onTimeChange(event: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS !== 'ios') setShowTimePicker(false);
    if (event.type === 'dismissed' || !picked) return;
    setTimeValue(picked);
  }

  function onCustomDateChange(event: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS !== 'ios') setShowCustomPicker(false);
    if (event.type === 'dismissed' || !picked) return;
    const iso = isoOf(picked);
    setCustomDates((prev) =>
      prev.includes(iso) ? prev : [...prev, iso].sort(),
    );
  }

  function removeCustomDate(iso: string) {
    setCustomDates((prev) => prev.filter((x) => x !== iso));
  }

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
    if (!name.trim()) {
      Alert.alert('Almost there', 'Add a name so you know who or what this date is for.');
      return;
    }

    const isCustom = recurrence === 'custom';
    const custom = Array.from(new Set(customDates)).sort();
    if (isCustom && custom.length === 0) {
      Alert.alert('Add a date', 'Pick at least one date for this custom schedule.');
      return;
    }

    // For custom, month/day/year mirror the next (or last) date so list cards,
    // the widget, and "since" rows have a concrete day to fall back on.
    let month = dateValue.getMonth() + 1;
    let day = dateValue.getDate();
    let year: number | undefined = showYear ? dateValue.getFullYear() : undefined;
    if (isCustom) {
      const todayISO = isoOf(new Date());
      const rep = custom.find((d) => d >= todayISO) ?? custom[custom.length - 1];
      const [ry, rm, rd] = rep.split('-').map(Number);
      month = rm;
      day = rd;
      year = ry;
    }

    const years = Math.max(parseInt(recurrenceYears, 10) || 2, 2);
    const payload = {
      name: name.trim(),
      categoryId,
      month,
      day,
      year,
      hour: timeEnabled ? timeValue.getHours() : undefined,
      minute: timeEnabled ? timeValue.getMinutes() : undefined,
      note: note.trim() || undefined,
      recurrence,
      recurrenceYears: recurrence === 'everyNYears' ? years : undefined,
      customDates: isCustom ? custom : undefined,
      leadDays: remindersEnabled ? [...leadDays].sort((a, b) => a - b) : [],
      remindersEnabled,
      emailReminders: remindersEnabled && synced ? emailReminders : false,
    };
    if (isEdit) updateDate(existing!.id, payload);
    else addDate(payload);
    router.back();
  }

  const dateLabel = showYear
    ? `${FULL_MONTHS[dateValue.getMonth()]} ${dateValue.getDate()}, ${dateValue.getFullYear()}`
    : `${FULL_MONTHS[dateValue.getMonth()]} ${dateValue.getDate()}`;

  const selectedCategory = categories.find((cat) => cat.id === categoryId);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + Spacing.sm }]}>
      <View style={styles.topbar}>
        <Text style={styles.title}>{isEdit ? 'Edit date' : 'Add a date'}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.close}>
          <Ionicons name="close" size={24} color={c.textMuted} />
        </Pressable>
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Who or what is it?</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Mom, Alex & Sam, Passport renewal"
          placeholderTextColor={c.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Tag</Text>
        <Pressable onPress={() => setTagSheet(true)} style={styles.pickerField}>
          <Text style={styles.chipEmoji}>{selectedCategory?.emoji ?? '📌'}</Text>
          <Text style={styles.pickerValue}>{selectedCategory?.label ?? 'Choose a tag'}</Text>
          <Ionicons name="chevron-down" size={18} color={c.textMuted} />
        </Pressable>
        <SelectSheet
          visible={tagSheet}
          title="Choose a tag"
          searchable={categories.length > 6}
          options={categories.map((cat) => ({ value: cat.id, label: cat.label, emoji: cat.emoji }))}
          selected={categoryId}
          onSelect={setCategoryId}
          onClose={() => setTagSheet(false)}
          footer={
            <Pressable
              onPress={() => {
                setTagSheet(false);
                setCreatingTag(true);
              }}
              style={styles.sheetNewTag}>
              <Ionicons name="add" size={18} color={c.accent} />
              <Text style={styles.sheetNewTagText}>New tag</Text>
            </Pressable>
          }
        />

        {creatingTag && (
          <View style={styles.newTagPanel}>
            <TextInput
              value={newTagEmoji}
              onChangeText={setNewTagEmoji}
              placeholder="📌"
              placeholderTextColor={c.textMuted}
              maxLength={2}
              style={[styles.input, styles.emojiInput]}
            />
            <TextInput
              value={newTagLabel}
              onChangeText={setNewTagLabel}
              placeholder="Tag name (e.g. Bill, Visa, Meeting)"
              placeholderTextColor={c.textMuted}
              style={[styles.input, { flex: 1 }]}
              onSubmitEditing={confirmNewTag}
              returnKeyType="done"
            />
            <Pressable onPress={confirmNewTag} style={styles.newTagAdd}>
              <Ionicons name="checkmark" size={22} color="#fff" />
            </Pressable>
          </View>
        )}

        <Text style={styles.label}>Repeats</Text>
        <View style={styles.chips}>
          {RECURRENCE_OPTIONS.map((opt) => {
            const active = opt.type === recurrence;
            return (
              <Pressable
                key={opt.type}
                onPress={() => setRecurrence(opt.type)}
                style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {recurrence === 'everyNYears' && (
          <View style={styles.everyRow}>
            <Text style={styles.everyText}>Every</Text>
            <TextInput
              value={recurrenceYears}
              onChangeText={(t) => setRecurrenceYears(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={2}
              style={[styles.input, styles.everyInput]}
            />
            <Text style={styles.everyText}>years</Text>
          </View>
        )}

        {recurrence === 'custom' ? (
          <>
            <Text style={styles.label}>Dates</Text>
            {customDates.length > 0 && (
              <View style={styles.chips}>
                {customDates.map((iso) => (
                  <Pressable
                    key={iso}
                    onPress={() => removeCustomDate(iso)}
                    style={[styles.chip, styles.chipActive]}>
                    <Text style={[styles.chipText, styles.chipTextActive]}>{formatChip(iso)}</Text>
                    <Ionicons name="close" size={15} color="#fff" />
                  </Pressable>
                ))}
              </View>
            )}
            <Pressable
              onPress={() => setShowCustomPicker(true)}
              style={[styles.pickerField, { marginTop: customDates.length > 0 ? Spacing.sm : 0 }]}>
              <Ionicons name="add-circle-outline" size={20} color={c.accent} />
              <Text style={[styles.pickerValue, { color: c.accent }]}>Add a date</Text>
            </Pressable>
            <Text style={styles.hint}>Tap a date to remove it. Reminders use the next upcoming one.</Text>
            {showCustomPicker && (
              <DateTimePicker value={new Date()} mode="date" display="default" onChange={onCustomDateChange} />
            )}
          </>
        ) : (
          <>
            <Text style={styles.label}>{recurrence === 'once' ? 'Date' : 'Next date'}</Text>
            <Pressable onPress={() => setShowDatePicker(true)} style={styles.pickerField}>
              <Ionicons name="calendar-outline" size={20} color={c.accent} />
              <Text style={styles.pickerValue}>{dateLabel}</Text>
              <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
            </Pressable>
            {recurrence === 'monthly' && (
              <Text style={styles.hint}>Repeats on day {dateValue.getDate()} of every month.</Text>
            )}

            {!yearRequired && (
              <View style={styles.toggleRow}>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleTitle}>Include year</Text>
                  <Text style={styles.hint}>Shows age / years (e.g. “turns 30”).</Text>
                </View>
                <Switch
                  value={includeYear}
                  onValueChange={setIncludeYear}
                  trackColor={{ true: c.accent, false: c.border }}
                  thumbColor="#fff"
                />
              </View>
            )}

            {showDatePicker && (
              <DateTimePicker value={dateValue} mode="date" display="default" onChange={onDateChange} />
            )}
          </>
        )}

        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Set a time</Text>
            <Text style={styles.hint}>Off = all-day reminder.</Text>
          </View>
          <Switch
            value={timeEnabled}
            onValueChange={setTimeEnabled}
            trackColor={{ true: c.accent, false: c.border }}
            thumbColor="#fff"
          />
        </View>

        {timeEnabled && (
          <Pressable onPress={() => setShowTimePicker(true)} style={styles.pickerField}>
            <Ionicons name="time-outline" size={20} color={c.accent} />
            <Text style={styles.pickerValue}>{formatTimeOfDay(timeValue)}</Text>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </Pressable>
        )}

        {showTimePicker && (
          <DateTimePicker
            value={timeValue}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}

        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={styles.toggleTitle}>Reminders</Text>
            <Text style={styles.hint}>Get a heads-up before the day.</Text>
          </View>
          <Switch
            value={remindersEnabled}
            onValueChange={setRemindersEnabled}
            trackColor={{ true: c.accent, false: c.border }}
            thumbColor="#fff"
          />
        </View>

        {remindersEnabled && (
          <View style={styles.leadChips}>
            {LEAD_PRESETS.map((d) => {
              const active = leadDays.includes(d);
              return (
                <Pressable
                  key={d}
                  onPress={() => toggleLead(d)}
                  style={[styles.leadChip, active && styles.chipActive]}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {leadLabel(d)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {remindersEnabled && (
          <View style={styles.toggleRow}>
            <View style={styles.toggleText}>
              <Text style={styles.toggleTitle}>Also email me</Text>
              <Text style={styles.hint}>
                {synced ? 'Sent to your account email too.' : 'Sign in to enable email reminders.'}
              </Text>
            </View>
            <Switch
              value={synced && emailReminders}
              onValueChange={setEmailReminders}
              disabled={!synced}
              trackColor={{ true: c.accent, false: c.border }}
              thumbColor="#fff"
            />
          </View>
        )}

        <Text style={styles.label}>Note (optional)</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Gift ideas, hat size, anything…"
          placeholderTextColor={c.textMuted}
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

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background, paddingHorizontal: Spacing.lg },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  title: { fontSize: 24, fontWeight: '800', color: c.text },
  close: { padding: 4 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textMuted,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
    fontSize: 16,
    color: c.text,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  chipActive: { backgroundColor: c.accent, borderColor: c.accent },
  chipNew: { borderStyle: 'dashed', borderColor: c.accent },
  everyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  everyText: { fontSize: 15, color: c.text, fontWeight: '600' },
  everyInput: { width: 64, textAlign: 'center', height: 48 },
  leadChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  leadChip: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipEmoji: { fontSize: 15 },
  chipText: { fontSize: 14, fontWeight: '600', color: c.text },
  chipTextActive: { color: '#fff' },
  sheetNewTag: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: Spacing.sm },
  sheetNewTagText: { fontSize: 16, fontWeight: '700', color: c.accent },
  newTagPanel: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  emojiInput: { width: 56, textAlign: 'center', fontSize: 20 },
  newTagAdd: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: c.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  pickerValue: { flex: 1, fontSize: 16, color: c.text, fontWeight: '600' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
  },
  toggleText: { flex: 1, paddingRight: Spacing.md },
  toggleTitle: { fontSize: 15, fontWeight: '700', color: c.text },
  hint: { fontSize: 12, color: c.textMuted, marginTop: Spacing.xs },
  note: { height: 96, paddingTop: 14, textAlignVertical: 'top' },
});
