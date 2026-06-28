import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateCard } from '@/components/date-card';
import { PrimaryButton } from '@/components/primary-button';
import { Colors, Spacing } from '@/constants/theme';
import { daysUntilNext, sampleDates } from '@/lib/dates';

export default function UpcomingScreen() {
  const insets = useSafeAreaInsets();

  // Sorted by soonest. In-memory sample data for the base build.
  const dates = useMemo(
    () => [...sampleDates()].sort((a, b) => daysUntilNext(a) - daysUntilNext(b)),
    [],
  );

  const isEmpty = dates.length === 0;

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

      {isEmpty ? (
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
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>UPCOMING</Text>
          {dates.map((d) => (
            <DateCard key={d.id} date={d} />
          ))}
          <Text style={styles.footnote}>
            Sample data — add your own with the + button.
          </Text>
        </ScrollView>
      )}
    </View>
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
  list: { padding: Spacing.lg, gap: Spacing.md },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  footnote: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
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
