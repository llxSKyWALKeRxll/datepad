import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, ThemeColors } from '@/constants/theme';
import {
  countdownLabel,
  daysUntilNext,
  formatDate,
  formatTime,
  ImportantDate,
  urgencyColor,
  yearsPhrase,
} from '@/lib/dates';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

export function DateCard({ date, onPress }: { date: ImportantDate; onPress?: () => void }) {
  const { getCategory } = useStore();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const category = getCategory(date.categoryId);

  const days = daysUntilNext(date);
  const color = urgencyColor(days);
  const years = yearsPhrase(date, category);

  const subtitle = [category?.label ?? 'Date', years, formatDate(date), formatTime(date)]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.emojiWrap}>
        <Text style={styles.emoji}>{category?.emoji ?? '📌'}</Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>
          {date.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{countdownLabel(days)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  pressed: { opacity: 0.7 },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  middle: { flex: 1, marginLeft: 4 },
  name: { fontSize: 17, fontWeight: '700', color: c.text },
  sub: { fontSize: 13, color: c.textMuted, marginTop: 2 },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    minWidth: 64,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
