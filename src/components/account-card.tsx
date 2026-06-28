/**
 * Account & sync card for the Settings screen. Email one-time-code sign-in is
 * optional — signed-out users keep their data locally; signing in syncs it to
 * the cloud (migration handled in the store). Two steps: email → 6-digit code.
 */
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AccountCard() {
  const { session, sendCode, verifyCode, signOut } = useAuth();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSendCode() {
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await sendCode(email);
    setBusy(false);
    if (error) setError(error);
    else setStep('code');
  }

  async function onVerify() {
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await verifyCode(email, code);
    setBusy(false);
    if (error) setError(error);
    // On success, onAuthStateChange flips the UI to the signed-in state.
  }

  function reset() {
    setStep('email');
    setCode('');
    setError(null);
  }

  // --- Signed in ------------------------------------------------------------
  if (session) {
    return (
      <View style={styles.card}>
        <View style={styles.syncedRow}>
          <View style={styles.syncedBadge}>
            <Ionicons name="cloud-done" size={20} color={Colors.far} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Synced</Text>
            <Text style={styles.subtle}>{session.user.email}</Text>
          </View>
        </View>
        <Pressable onPress={signOut} style={styles.secondaryBtn}>
          <Text style={styles.secondaryText}>Sign out</Text>
        </Pressable>
      </View>
    );
  }

  // --- Signed out: email step ----------------------------------------------
  if (step === 'email') {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Sync across devices</Text>
        <Text style={styles.subtle}>
          Add your email to back up your dates and sync them everywhere. Optional — DatePad
          works fine without an account.
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          style={styles.input}
          editable={!busy}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable onPress={onSendCode} disabled={busy} style={[styles.primaryBtn, busy && styles.btnDisabled]}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Send code</Text>}
        </Pressable>
      </View>
    );
  }

  // --- Signed out: code step -----------------------------------------------
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Enter your code</Text>
      <Text style={styles.subtle}>We sent a 6-digit code to {email}.</Text>
      <TextInput
        value={code}
        onChangeText={(t) => setCode(t.replace(/[^0-9]/g, ''))}
        placeholder="123456"
        placeholderTextColor={Colors.textMuted}
        keyboardType="number-pad"
        maxLength={6}
        style={[styles.input, styles.codeInput]}
        editable={!busy}
        autoFocus
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable onPress={onVerify} disabled={busy} style={[styles.primaryBtn, busy && styles.btnDisabled]}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Verify & sync</Text>}
      </Pressable>
      <Pressable onPress={reset} disabled={busy} style={styles.linkBtn}>
        <Text style={styles.linkText}>Use a different email</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  title: { fontSize: 17, fontWeight: '800', color: Colors.text },
  subtle: { fontSize: 13, color: Colors.textMuted, lineHeight: 19 },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 50,
    fontSize: 16,
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: '700' },
  error: { fontSize: 13, color: Colors.today, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  btnDisabled: { opacity: 0.6 },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  secondaryText: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  linkBtn: { alignItems: 'center', paddingVertical: Spacing.xs },
  linkText: { color: Colors.accent, fontSize: 14, fontWeight: '600' },
  syncedRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  syncedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
