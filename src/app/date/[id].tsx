import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  countdownLabel,
  daysUntilNext,
  formatDate,
  formatTime,
  urgencyColor,
  yearsPhrase,
} from '@/lib/dates';
import { useStore } from '@/lib/store';

export default function DateDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getDate, getCategory, deleteDate } = useStore();

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
          <Ionicons name="chevron-back" size={26} color={Colors.text} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="trash-outline" size={22} color={Colors.accent} />
        </Pressable>
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
        {formatTime(date) ? (
          <InfoRow icon="alarm-outline" label="Time" value={formatTime(date)!} />
        ) : null}
        {date.year ? (
          <InfoRow icon="time-outline" label="Since" value={String(date.year)} />
        ) : null}
        {date.note ? <InfoRow icon="document-text-outline" label="Note" value={date.note} /> : null}
      </View>

      <Pressable
        onPress={() => router.push({ pathname: '/edit/[id]', params: { id: date.id } })}
        style={({ pressed }) => [
          styles.editBtn,
          { backgroundColor: pressed ? Colors.accentPressed : Colors.accent },
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
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={20} color={Colors.accent} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.lg },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  missing: { fontSize: 16, color: Colors.textMuted },
  link: { fontSize: 16, color: Colors.accent, fontWeight: '700' },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
  },
  iconBtn: { padding: 4 },
  hero: { alignItems: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg },
  emojiWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 44 },
  name: { fontSize: 28, fontWeight: '800', color: Colors.text, marginTop: Spacing.md },
  meta: { fontSize: 15, color: Colors.textMuted, marginTop: 4 },
  badge: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 16,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  infoLabel: { fontSize: 15, color: Colors.textMuted, width: 56 },
  infoValue: { flex: 1, fontSize: 16, color: Colors.text, fontWeight: '600' },
  editBtn: {
    flexDirection: 'row',
    gap: 8,
    height: 54,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  editText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
