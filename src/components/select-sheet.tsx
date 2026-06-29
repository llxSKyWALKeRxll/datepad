/**
 * A bottom-sheet single-select picker with optional search. Used in place of
 * horizontal chip rows so a long list (e.g. many tags) stays one tap away
 * instead of a sideways scroll. Theme-aware via useColors()/makeStyles().
 */
import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing, ThemeColors } from '@/constants/theme';
import { useColors } from '@/lib/theme';

export interface SelectOption {
  value: string;
  label: string;
  emoji?: string;
}

export function SelectSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  searchable = false,
  footer,
}: {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  searchable?: boolean;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;

  function close() {
    setQuery('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.md }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>

        {searchable && (
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={c.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={c.textMuted}
              style={styles.searchInput}
              autoFocus
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={c.textMuted} />
              </Pressable>
            )}
          </View>
        )}

        <ScrollView
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {shown.length === 0 ? (
            <Text style={styles.empty}>No matches.</Text>
          ) : (
            shown.map((o) => {
              const active = o.value === selected;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => {
                    onSelect(o.value);
                    close();
                  }}
                  style={[styles.row, active && styles.rowActive]}>
                  {o.emoji ? <Text style={styles.rowEmoji}>{o.emoji}</Text> : null}
                  <Text style={[styles.rowText, active && styles.rowTextActive]}>{o.label}</Text>
                  {active && <Ionicons name="checkmark" size={20} color={c.accent} />}
                </Pressable>
              );
            })
          )}
        </ScrollView>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </Modal>
  );
}

const makeStyles = (c: ThemeColors) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: c.background,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  title: { fontSize: 18, fontWeight: '800', color: c.text, marginBottom: Spacing.sm },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 46,
    backgroundColor: c.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: c.border,
    marginBottom: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15, color: c.text, padding: 0 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
  },
  rowActive: { backgroundColor: c.surface },
  rowEmoji: { fontSize: 18 },
  rowText: { flex: 1, fontSize: 16, color: c.text, fontWeight: '600' },
  rowTextActive: { color: c.accent },
  empty: { fontSize: 14, color: c.textMuted, textAlign: 'center', paddingVertical: Spacing.lg },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, marginTop: Spacing.xs },
});
