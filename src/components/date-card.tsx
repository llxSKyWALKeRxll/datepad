import { StyleSheet, Text, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  countdownLabel,
  daysUntilNext,
  formatDate,
  ImportantDate,
  typeLabel,
  upcomingYears,
  urgencyColor,
} from '@/lib/dates';

const TYPE_EMOJI: Record<ImportantDate['type'], string> = {
  birthday: '🎂',
  anniversary: '💞',
  custom: '📌',
};

export function DateCard({ date }: { date: ImportantDate }) {
  const days = daysUntilNext(date);
  const color = urgencyColor(days);
  const years = upcomingYears(date);

  const yearsSuffix =
    years === undefined
      ? ''
      : date.type === 'birthday'
        ? ` · turns ${years}`
        : ` · ${years} ${years === 1 ? 'year' : 'years'}`;
  const subtitle = `${typeLabel(date.type)}${yearsSuffix}`;

  return (
    <View style={styles.card}>
      <View style={styles.emojiWrap}>
        <Text style={styles.emoji}>{TYPE_EMOJI[date.type]}</Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>
          {date.name}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {subtitle} · {formatDate(date)}
        </Text>
      </View>

      <View style={[styles.badge, { backgroundColor: color }]}>
        <Text style={styles.badgeText}>{countdownLabel(days)}</Text>
      </View>
    </View>
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
    gap: Spacing.md,
  },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  middle: { flex: 1 },
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
