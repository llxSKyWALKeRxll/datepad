/**
 * Auth context for DatePad. Sign-in is optional (email one-time code); signed-
 * out users keep working against local storage. The store reacts to `session`
 * to decide local vs. cloud mode — see store.tsx.
 */
import { Session } from '@supabase/supabase-js';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';

interface AuthValue {
  /** Null when signed out. */
  session: Session | null;
  /** True until the persisted session has been restored on launch. */
  initializing: boolean;
  /** Email the OTP is currently being sent to / verified against. */
  sendCode: (email: string) => Promise<{ error?: string }>;
  verifyCode: (email: string, code: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setInitializing(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthValue = {
    session,
    initializing,
    sendCode: async (email) => {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      return { error: error?.message };
    },
    verifyCode: async (email, code) => {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'email',
      });
      return { error: error?.message };
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
