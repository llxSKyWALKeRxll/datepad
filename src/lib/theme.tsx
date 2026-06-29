/**
 * Runtime theming for DatePad. Holds the user's choice (system / light / dark),
 * persists it, and resolves it against the OS color scheme into a live palette
 * that components read via useColors(). Switching re-renders the whole tree.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, ThemeColors } from '@/constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'datepad.theme.v1';

interface ThemeValue {
  mode: ThemeMode;
  scheme: 'light' | 'dark';
  colors: ThemeColors;
  setMode: (m: ThemeMode) => void;
}

const ThemeCtx = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
    });
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const scheme: 'light' | 'dark' =
      mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
    return {
      mode,
      scheme,
      colors: scheme === 'dark' ? darkColors : lightColors,
      setMode: (m: ThemeMode) => {
        setModeState(m);
        AsyncStorage.setItem(KEY, m).catch(() => {});
      },
    };
  }, [mode, system]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}

export function useColors(): ThemeColors {
  return useTheme().colors;
}
