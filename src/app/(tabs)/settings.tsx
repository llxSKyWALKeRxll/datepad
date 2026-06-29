import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountCard } from '@/components/account-card';
import { Radius, Spacing, ThemeColors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { shareDatesCsv } from '@/lib/export';
import {
  getPermissionState,
  notificationsAvailable,
  PermissionState,
  registerPushToken,
  requestPermission,
  sendTestNotification,
} from '@/lib/notifications';
import { useStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { ThemeMode, useColors, useTheme } from '@/lib/theme';

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'system', label: 'System' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
];

function formatHour(h: number): string {
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${ampm}`;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);

  const { dates, categories, synced } = useStore();
  const { session, signOut } = useAuth();
  const { mode, setMode } = useTheme();
  const userId = session?.user?.id ?? null;

  // --- Notifications --------------------------------------------------------
  const [permState, setPermState] = useState<PermissionState>('undetermined');
  const [pushNote, setPushNote] = useState<string | null>(null);
  const [notifBusy, setNotifBusy] = useState(false);

  useEffect(() => {
    getPermissionState().then(setPermState);
  }, []);

  const notifAvailable = notificationsAvailable() && permState !== 'unavailable';

  async function onToggleNotifications(value: boolean) {
    if (!value) {
      setPushNote('To turn reminders off, disable notifications in your system settings.');
      return;
    }
    setNotifBusy(true);
    const granted = await requestPermission();
    setPermState(await getPermissionState());
    if (!granted) {
      setPushNote('Permission denied — enable notifications in your system settings.');
    } else if (!userId) {
      setPushNote('Sign in above so reminders can reach you.');
    } else {
      const res = await registerPushToken(userId);
      setPushNote(res.ok ? 'Reminders are on for this device.' : res.reason);
    }
    setNotifBusy(false);
  }

  async function onTestReminder() {
    const res = await sendTestNotification();
    setPushNote(res.ok ? 'Sent! Check your notification shade.' : res.reason);
  }

  // --- Reminder time (per-user, synced only) --------------------------------
  const [reminderHour, setReminderHour] = useState(9);
  const [showHourPicker, setShowHourPicker] = useState(false);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('reminder_hour')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.reminder_hour != null) setReminderHour(data.reminder_hour);
      });
  }, [userId]);

  function onHourChange(event: DateTimePickerEvent, picked?: Date) {
    if (Platform.OS !== 'ios') setShowHourPicker(false);
    if (event.type === 'dismissed' || !picked) return;
    const h = picked.getHours();
    setReminderHour(h);
    if (userId) {
      supabase
        .from('profiles')
        .upsert(
          { user_id: userId, reminder_hour: h, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
        .then(() => {});
    }
  }

  // --- Data -----------------------------------------------------------------
  async function onExport() {
    if (dates.length === 0) {
      Alert.alert('Nothing to export', 'Add a date first, then you can export your list.');
      return;
    }
    try {
      await shareDatesCsv(dates, categories);
    } catch {
      // user dismissed the share sheet
    }
  }

  function onDeleteAccount() {
    Alert.alert(
      'Delete account',
      'This permanently deletes your account and all your dates from the cloud. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('delete_my_account');
            if (error) {
              Alert.alert('Could not delete', error.message);
              return;
            }
            await signOut();
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}>
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.sectionLabel}>ACCOUNT</Text>
      <AccountCard />

      <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <Ionicons name="notifications-outline" size={20} color={c.accent} />
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Reminders</Text>
            {!notifAvailable && (
              <Text style={styles.rowSub}>Update the app to enable notifications.</Text>
            )}
          </View>
          <Switch
            value={permState === 'granted'}
            disabled={!notifAvailable || notifBusy}
            onValueChange={onToggleNotifications}
            trackColor={{ true: c.accent, false: c.border }}
            thumbColor="#fff"
          />
        </View>

        {synced && (
          <Pressable
            onPress={() => setShowHourPicker(true)}
            style={[styles.row, styles.rowTop]}>
            <Ionicons name="time-outline" size={20} color={c.accent} />
            <Text style={styles.rowLabel}>Reminder time</Text>
            <Text style={styles.rowValue}>{formatHour(reminderHour)}</Text>
          </Pressable>
        )}

        {synced && (
          <View style={[styles.row, styles.rowTop]}>
            <Ionicons name="mail-outline" size={20} color={c.accent} />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Email reminders</Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                {session?.user.email} · verified · enable per date
              </Text>
            </View>
          </View>
        )}

        <Pressable onPress={onTestReminder} style={[styles.row, styles.rowTop]}>
          <Ionicons name="paper-plane-outline" size={20} color={c.accent} />
          <Text style={styles.rowLabel}>Send a test reminder</Text>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </Pressable>
      </View>
      {pushNote && <Text style={styles.note}>{pushNote}</Text>}
      {!synced && (
        <Text style={styles.note}>Reminders need an account so the server knows where to send them.</Text>
      )}

      {showHourPicker && (
        <DateTimePicker
          value={(() => {
            const d = new Date();
            d.setHours(reminderHour, 0, 0, 0);
            return d;
          })()}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={onHourChange}
        />
      )}

      <Text style={styles.sectionLabel}>APPEARANCE</Text>
      <View style={styles.segment}>
        {THEME_OPTIONS.map((opt) => {
          const active = opt.mode === mode;
          return (
            <Pressable
              key={opt.mode}
              onPress={() => setMode(opt.mode)}
              style={[styles.segmentBtn, active && styles.segmentBtnActive]}>
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>DATA</Text>
      <View style={styles.group}>
        <Pressable onPress={onExport} style={styles.row}>
          <Ionicons name="download-outline" size={20} color={c.accent} />
          <Text style={styles.rowLabel}>Export my dates (CSV)</Text>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </Pressable>
        {synced && (
          <Pressable onPress={onDeleteAccount} style={[styles.row, styles.rowTop]}>
            <Ionicons name="trash-outline" size={20} color={c.today} />
            <Text style={[styles.rowLabel, { color: c.today }]}>Delete account</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.sectionLabel}>ABOUT</Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <Ionicons name="information-circle-outline" size={20} color={c.accent} />
          <Text style={styles.rowLabel}>Version</Text>
          <Text style={styles.rowValue}>v0.1</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.xl },
    title: { fontSize: 30, fontWeight: '800', color: c.text, marginBottom: Spacing.md },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      color: c.textMuted,
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
    },
    group: {
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.md,
      paddingVertical: 16,
      paddingHorizontal: Spacing.md,
    },
    rowTop: { borderTopWidth: 1, borderTopColor: c.border },
    rowText: { flex: 1 },
    rowLabel: { flex: 1, fontSize: 16, color: c.text, fontWeight: '600' },
    rowSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    rowValue: { fontSize: 15, color: c.textMuted, fontWeight: '600' },
    note: { fontSize: 13, color: c.textMuted, lineHeight: 19, paddingHorizontal: Spacing.xs },
    segment: {
      flexDirection: 'row',
      backgroundColor: c.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.border,
      padding: 4,
      gap: 4,
    },
    segmentBtn: {
      flex: 1,
      height: 40,
      borderRadius: Radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentBtnActive: { backgroundColor: c.accent },
    segmentText: { fontSize: 14, fontWeight: '700', color: c.text },
    segmentTextActive: { color: '#fff' },
  });
