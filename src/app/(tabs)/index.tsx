import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateCard } from '@/components/date-card';
import { PrimaryButton } from '@/components/primary-button';
import { Colors, Radius, Spacing } from '@/constants/theme';
import {
  daysUntilNext,
  Horizon,
  horizonOf,
  HORIZON_LABELS,
  ImportantDate,
} from '@/lib/dates';
import { useStore } from '@/lib/store';

const ALL = 'all';
const ORDER: Horizon[] = ['today', 'week', 'later', 'passed'];

type SortKey = 'soon' | 'name' | 'added';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'soon', label: 'Soonest' },
  { key: 'name', label: 'A–Z' },
  { key: 'added', label: 'Newest' },
];

export default function UpcomingScreen() {
  const insets = useSafeAreaInsets();
  const { dates, categories, loaded } = useStore();
  const [filter, setFilter] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('soon');

  // Only offer filter chips for tags that are actually in use.
  const usedCategories = useMemo(() => {
    const ids = new Set(dates.map((d) => d.categoryId));
    return categories.filter((c) => ids.has(c.id));
  }, [dates, categories]);

  const q = query.trim().toLowerCase();

  const visible = useMemo(() => {
    let arr = dates;
    if (q) {
      arr = arr.filter(
        (d) => d.name.toLowerCase().includes(q) || (d.note?.toLowerCase().includes(q) ?? false),
      );
    }
    if (filter !== ALL) arr = arr.filter((d) => d.categoryId === filter);
    const out = [...arr];
    if (sort === 'name') out.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'added') out.sort((a, b) => b.createdAt - a.createdAt);
    else out.sort((a, b) => daysUntilNext(a) - daysUntilNext(b));
    return out;
  }, [dates, q, filter, sort]);

  // Horizon grouping only makes sense for the default "soonest" view.
  const grouped = sort === 'soon' && !q;

  const groups = useMemo(() => {
    if (!grouped) return [];
    const map = new Map<Horizon, ImportantDate[]>();
    for (const d of visible) {
      const h = horizonOf(daysUntilNext(d));
      const arr = map.get(h);
      if (arr) arr.push(d);
      else map.set(h, [d]);
    }
    return ORDER.map((h) => ({ horizon: h, items: map.get(h) ?? [] })).filter(
      (g) => g.items.length > 0,
    );
  }, [visible, grouped]);

  const isEmpty = loaded && dates.length === 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>DatePad</Text>
          <Text style={styles.tagline}>Never forget a date that matters.</Text>
        </View>
        <Pressable
          onPress={() => router.push('/add')}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: pressed ? Colors.accentPressed : Colors.accent },
          ]}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      </View>

      {!loaded ? (
        <View style={styles.empty}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : isEmpty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🎂</Text>
          <Text style={styles.emptyTitle}>No dates yet</Text>
          <Text style={styles.emptyBody}>
            Add your first birthday or important date and we’ll remind you well
            in advance.
          </Text>
          <PrimaryButton
            label="Add a date"
            onPress={() => router.push('/add')}
            style={{ marginTop: Spacing.lg, alignSelf: 'stretch' }}
          />
        </View>
      ) : (
        <>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search names & notes"
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}>
            {SORTS.map((s) => (
              <FilterChip
                key={s.key}
                label={s.label}
                active={sort === s.key}
                onPress={() => setSort(s.key)}
              />
            ))}
            {usedCategories.length > 0 && <View style={styles.divider} />}
            {usedCategories.length > 0 && (
              <FilterChip label="All" active={filter === ALL} onPress={() => setFilter(ALL)} />
            )}
            {usedCategories.map((c) => (
              <FilterChip
                key={c.id}
                label={`${c.emoji} ${c.label}`}
                active={filter === c.id}
                onPress={() => setFilter(c.id)}
              />
            ))}
          </ScrollView>

          <ScrollView
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {visible.length === 0 ? (
              <Text style={styles.noneInFilter}>
                {q ? `No matches for “${query.trim()}”.` : 'Nothing tagged here yet.'}
              </Text>
            ) : grouped ? (
              groups.map((g) => (
                <View key={g.horizon} style={styles.section}>
                  <Text style={styles.sectionLabel}>{HORIZON_LABELS[g.horizon]}</Text>
                  {g.items.map((d) => (
                    <DateCard
                      key={d.id}
                      date={d}
                      onPress={() =>
                        router.push({ pathname: '/date/[id]', params: { id: d.id } })
                      }
                    />
                  ))}
                </View>
              ))
            ) : (
              <View style={styles.section}>
                {visible.map((d) => (
                  <DateCard
                    key={d.id}
                    date={d}
                    onPress={() =>
                      router.push({ pathname: '/date/[id]', params: { id: d.id } })
                    }
                  />
                ))}
              </View>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: 30, fontWeight: '800', color: Colors.text },
  tagline: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    height: 44,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text, padding: 0 },
  filters: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
  filterChip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  filterTextActive: { color: '#fff' },
  list: { padding: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.lg },
  section: { gap: Spacing.md },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textMuted,
  },
  noneInFilter: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyEmoji: { fontSize: 56, marginBottom: Spacing.md },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  emptyBody: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
});
