import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, ThemeColors } from '@/constants/theme';
import {
  countdownLabel,
  daysUntilNext,
  formatDate,
  formatTime,
  isHandled,
  leadSummary,
  occurrenceISO,
  recurrenceLabel,
  recurrenceOf,
  shareText,
  urgencyColor,
  yearsPhrase,
} from '@/lib/dates';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export default function DateDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getDate, getCategory, deleteDate, updateDate } = useStore();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const date = getDate(id);

  if (!date) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.missing}>This date no longer exists.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const category = getCategory(date.categoryId);
  const days = daysUntilNext(date);
  const color = urgencyColor(days);
  const years = yearsPhrase(date, category);

  const handled = isHandled(date);
  const canHandle = daysUntilNext(date) >= 0;

  function onShare() {
    Share.share({ message: shareText(date!, category) }).catch(() => {});
  }

  function onToggleHandled() {
    updateDate(date!.id, { handledOccurrence: handled ? undefined : occurrenceISO(date!) });
  }

  function onDelete() {
    Alert.alert('Delete date', `Remove “${date!.name}” from DatePad?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteDate(date!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <View style={styles.topActions}>
          <Pressable onPress={onShare} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="share-outline" size={22} color={c.text} />
          </Pressable>
          <Pressable onPress={onDelete} hitSlop={10} style={styles.iconBtn}>
            <Ionicons name="trash-outline" size={22} color={c.accent} />
          </Pressable>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.emojiWrap}>
          <Text style={styles.emoji}>{category?.emoji ?? '📌'}</Text>
        </View>
        <Text style={styles.name}>{date.name}</Text>
        <Text style={styles.meta}>
          {[category?.label, years].filter(Boolean).join(' · ')}
        </Text>
        <View style={[styles.badge, { backgroundColor: color }]}>
          <Text style={styles.badgeText}>{countdownLabel(days)}</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <InfoRow icon="calendar-outline" label="Date" value={formatDate(date)} />
        <InfoRow icon="repeat-outline" label="Repeats" value={recurrenceLabel(date)} />
        {formatTime(date) ? (
          <InfoRow icon="alarm-outline" label="Time" value={formatTime(date)!} />
        ) : null}
        {date.year && recurrenceOf(date) !== 'once' && recurrenceOf(date) !== 'custom' ? (
          <InfoRow icon="time-outline" label="Since" value={String(date.year)} />
        ) : null}
        <InfoRow icon="notifications-outline" label="Remind" value={leadSummary(date)} />
        {date.note ? <InfoRow icon="document-text-outline" label="Note" value={date.note} /> : null}
      </View>

      {canHandle && (
        <Pressable
          onPress={onToggleHandled}
          style={[styles.handledBtn, handled && styles.handledBtnActive]}>
          <Ionicons
            name={handled ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={20}
            color={handled ? '#fff' : c.far}
          />
          <Text style={[styles.handledText, handled && styles.handledTextActive]}>
            {handled ? 'Handled — reminders off · undo' : 'Mark as handled'}
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={() => router.push({ pathname: '/edit/[id]', params: { id: date.id } })}
        style={({ pressed }) => [
          styles.editBtn,
          { backgroundColor: pressed ? c.accentPressed : c.accent },
        ]}>
        <Ionicons name="create-outline" size={20} color="#fff" />
        <Text style={styles.editText}>Edit date</Text>
      </Pressable>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={c.accent} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background, paddingHorizontal: Spacing.lg },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  missing: { fontSize: 16, color: c.textMuted },
  link: { fontSize: 16, color: c.accent, fontWeight: '700' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  iconBtn: { padding: 4 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  hero: { alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg },
  emojiWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 44 },
  name: { fontSize: 28, fontWeight: '800', color: c.text, marginTop: Spacing.md },
  meta: { fontSize: 15, color: c.textMuted, marginTop: 4 },
  badge: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  infoCard: {
    backgroundColor: c.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  infoLabel: { fontSize: 15, color: c.textMuted, width: 56 },
  infoValue: { flex: 1, fontSize: 16, color: c.text, fontWeight: '600' },
  handledBtn: {
    flexDirection: 'row',
    gap: 8,
    height: 50,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.far,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  handledBtnActive: { backgroundColor: c.far, borderColor: c.far },
  handledText: { color: c.far, fontSize: 15, fontWeight: '700' },
  handledTextActive: { color: '#fff' },
  editBtn: {
    flexDirection: 'row',
    gap: 8,
    height: 54,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  editText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
