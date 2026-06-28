import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  countdownLabel,
  daysUntilNext,
  formatDate,
  ImportantDate,
  urgencyColor,
  yearsPhrase,
} from '@/lib/dates';
import { useStore } from '@/lib/store';

export function DateCard({ date, onPress }: { date: ImportantDate; onPress?: () => void }) {
  const { getCategory } = useStore();
  const category = getCategory(date.categoryId);

  const days = daysUntilNext(date);
  const color = urgencyColor(days);
  const years = yearsPhrase(date, category);

  const subtitle = [category?.label ?? 'Date', years, formatDate(date)]
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
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  pressed: { opacity: 0.7 },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  middle: { flex: 1, marginLeft: 4 },
  name: { fontSize: 17, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    minWidth: 64,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
