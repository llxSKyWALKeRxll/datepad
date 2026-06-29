import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { SelectSheet } from '@/components/select-sheet';
import { Radius, Spacing, ThemeColors } from '@/constants/theme';
import {
  daysUntilNext,
  Horizon,
  horizonOf,
  HORIZON_LABELS,
  ImportantDate,
} from '@/lib/dates';
import { useStore } from '@/lib/store';
import { useColors } from '@/lib/theme';

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
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const { dates, categories, loaded } = useStore();
  const [filter, setFilter] = useState<string>(ALL);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('soon');
  const [sortSheet, setSortSheet] = useState(false);
  const [filterSheet, setFilterSheet] = useState(false);

  // Only offer tag filters for tags that are actually in use.
  const usedCategories = useMemo(() => {
    const ids = new Set(dates.map((d) => d.categoryId));
    return categories.filter((c) => ids.has(c.id));
  }, [dates, categories]);

  // Drop a tag filter once its last date is gone (deleted/retagged), so the
  // pill never gets stranded on a tag that no longer appears in the list.
  useEffect(() => {
    if (filter !== ALL && !usedCategories.some((c) => c.id === filter)) {
      setFilter(ALL);
    }
  }, [filter, usedCategories]);

  const sortLabel = SORTS.find((s) => s.key === sort)?.label ?? 'Soonest';
  const activeCat = usedCategories.find((c) => c.id === filter);
  const filterLabel = filter === ALL ? 'All tags' : `${activeCat?.emoji ?? ''} ${activeCat?.label ?? ''}`.trim();

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
            { backgroundColor: pressed ? c.accentPressed : c.accent },
          ]}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      </View>

      {!loaded ? (
        <View style={styles.empty}>
          <ActivityIndicator color={c.accent} />
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
            <Ionicons name="search" size={18} color={c.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search names & notes"
              placeholderTextColor={c.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={c.textMuted} />
              </Pressable>
            )}
          </View>

          <View style={styles.controls}>
            <ControlPill icon="swap-vertical" label={sortLabel} onPress={() => setSortSheet(true)} />
            {usedCategories.length > 0 && (
              <ControlPill
                icon="pricetag-outline"
                label={filterLabel}
                active={filter !== ALL}
                onPress={() => setFilterSheet(true)}
              />
            )}
          </View>

          <SelectSheet
            visible={sortSheet}
            title="Sort by"
            options={SORTS.map((s) => ({ value: s.key, label: s.label }))}
            selected={sort}
            onSelect={(v) => setSort(v as SortKey)}
            onClose={() => setSortSheet(false)}
          />
          <SelectSheet
            visible={filterSheet}
            title="Filter by tag"
            searchable={usedCategories.length > 6}
            options={[
              { value: ALL, label: 'All tags' },
              ...usedCategories.map((c) => ({ value: c.id, label: c.label, emoji: c.emoji })),
            ]}
            selected={filter}
            onSelect={setFilter}
            onClose={() => setFilterSheet(false)}
          />

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

function ControlPill({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Ionicons name={icon} size={16} color={active ? c.accent : c.textMuted} />
      <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={15} color={active ? c.accent : c.textMuted} />
    </Pressable>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: { fontSize: 30, fontWeight: '800', color: c.text },
  tagline: { fontSize: 14, color: c.textMuted, marginTop: 2 },
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
    backgroundColor: c.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: c.text, padding: 0 },
  controls: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  pillActive: { borderColor: c.accent },
  pillText: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: c.text },
  pillTextActive: { color: c.accent },
  list: { padding: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.lg },
  section: { gap: Spacing.md },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: c.textMuted,
  },
  noneInFilter: {
    fontSize: 14,
    color: c.textMuted,
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
  emptyTitle: { fontSize: 22, fontWeight: '800', color: c.text },
  emptyBody: {
    fontSize: 15,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
    lineHeight: 22,
  },
});
