/**
 * DatePad store — dates + custom categories, with two interchangeable backends
 * behind a single useStore() interface:
 *
 *   - Signed out  → AsyncStorage (local-only, works offline, no account).
 *   - Signed in   → Supabase (synced across devices, RLS-scoped to the user).
 *
 * On sign-in we migrate any local rows up to Supabase (idempotent), then read
 * from the cloud. Built-in categories are client constants and are never
 * persisted; only user-created categories are stored.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAuth } from '@/lib/auth';
import {
  Category,
  DEFAULT_CATEGORIES,
  genId,
  ImportantDate,
  leadDaysOf,
  recurrenceOf,
} from '@/lib/dates';
import { supabase } from '@/lib/supabase';

const DATES_KEY = 'datepad.dates.v1';
const CUSTOM_CATS_KEY = 'datepad.customcats.v1';
const LEGACY_CATS_KEY = 'datepad.categories.v1'; // pre-v2: stored built-ins + custom merged

export type NewDate = Omit<ImportantDate, 'id' | 'createdAt'>;

interface StoreValue {
  loaded: boolean;
  /** True while signed in (data is cloud-synced). */
  synced: boolean;
  dates: ImportantDate[];
  categories: Category[];
  getDate: (id: string) => ImportantDate | undefined;
  getCategory: (id: string) => Category | undefined;
  addDate: (input: NewDate) => ImportantDate;
  updateDate: (id: string, patch: Partial<NewDate>) => void;
  deleteDate: (id: string) => void;
  addCategory: (label: string, emoji: string) => Category;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within <DatesProvider>');
  return ctx;
}

/** Sample dates seeded on first local launch — real, editable, deletable. */
function seedDates(from: Date = new Date()): ImportantDate[] {
  const mk = (offsetDays: number) => {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays);
    return { month: d.getMonth() + 1, day: d.getDate() };
  };
  const base = Date.now();
  return [
    { id: genId(), name: 'Mom', categoryId: 'birthday', ...mk(0), year: 1965, createdAt: base },
    { id: genId(), name: 'Alex & Sam', categoryId: 'anniversary', ...mk(4), year: 2018, createdAt: base + 1 },
    { id: genId(), name: 'Priya', categoryId: 'birthday', ...mk(20), year: 1996, createdAt: base + 2 },
  ];
}

const byCreated = (a: ImportantDate, b: ImportantDate) => a.createdAt - b.createdAt;

// --- Local (AsyncStorage) loaders -------------------------------------------

async function loadLocalDates(): Promise<ImportantDate[]> {
  const raw = await AsyncStorage.getItem(DATES_KEY);
  if (raw) return JSON.parse(raw) as ImportantDate[];
  const seeded = seedDates();
  await AsyncStorage.setItem(DATES_KEY, JSON.stringify(seeded));
  return seeded;
}

async function loadLocalCustomCats(): Promise<Category[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_CATS_KEY);
  if (raw) return JSON.parse(raw) as Category[];
  // Migrate from the old merged key: keep only the non-built-in categories.
  const legacy = await AsyncStorage.getItem(LEGACY_CATS_KEY);
  if (legacy) {
    const all = JSON.parse(legacy) as Category[];
    const custom = all.filter(
      (c) => !c.builtIn && !DEFAULT_CATEGORIES.some((d) => d.id === c.id),
    );
    await AsyncStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(custom));
    return custom;
  }
  return [];
}

// --- Cloud (Supabase) row mappers -------------------------------------------

function dateToRow(d: ImportantDate, userId: string) {
  return {
    id: d.id,
    user_id: userId,
    name: d.name,
    category_id: d.categoryId,
    month: d.month,
    day: d.day,
    year: d.year ?? null,
    hour: d.hour ?? null,
    minute: d.minute ?? null,
    note: d.note ?? null,
    recurrence: recurrenceOf(d),
    recurrence_years: d.recurrenceYears ?? null,
    lead_days: leadDaysOf(d),
    reminders_enabled: d.remindersEnabled ?? true,
    created_at: new Date(d.createdAt).toISOString(),
  };
}

function rowToDate(r: any): ImportantDate {
  return {
    id: r.id,
    name: r.name,
    categoryId: r.category_id,
    month: r.month,
    day: r.day,
    year: r.year ?? undefined,
    hour: r.hour ?? undefined,
    minute: r.minute ?? undefined,
    note: r.note ?? undefined,
    recurrence: r.recurrence ?? undefined,
    recurrenceYears: r.recurrence_years ?? undefined,
    leadDays: r.lead_days ?? undefined,
    remindersEnabled: r.reminders_enabled ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
  };
}

function catToRow(c: Category, userId: string) {
  return { id: c.id, user_id: userId, label: c.label, emoji: c.emoji, year_mode: c.yearMode };
}

function rowToCat(r: any): Category {
  return { id: r.id, label: r.label, emoji: r.emoji, builtIn: false, yearMode: r.year_mode };
}

/**
 * On a user's first ever sign-in, push their local rows up to the cloud. Runs
 * once per user (guarded by a flag) — re-running on later sign-ins would
 * resurrect rows they deleted in the cloud, since the stale local copy lingers.
 */
async function migrateLocalToCloud(userId: string): Promise<void> {
  const flagKey = `datepad.migrated.${userId}`;
  if (await AsyncStorage.getItem(flagKey)) return;

  const [rawDates, rawCats] = await Promise.all([
    AsyncStorage.getItem(DATES_KEY),
    AsyncStorage.getItem(CUSTOM_CATS_KEY),
  ]);
  const localCats: Category[] = rawCats ? JSON.parse(rawCats) : [];
  const localDates: ImportantDate[] = rawDates ? JSON.parse(rawDates) : [];

  if (localCats.length) {
    await supabase
      .from('categories')
      .upsert(localCats.map((c) => catToRow(c, userId)), { onConflict: 'id', ignoreDuplicates: true });
  }
  if (localDates.length) {
    await supabase
      .from('important_dates')
      .upsert(localDates.map((d) => dateToRow(d, userId)), { onConflict: 'id', ignoreDuplicates: true });
  }

  await AsyncStorage.setItem(flagKey, '1');
}

export function DatesProvider({ children }: PropsWithChildren) {
  const { session, initializing } = useAuth();
  const userId = session?.user?.id ?? null;

  const [loaded, setLoaded] = useState(false);
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [customCats, setCustomCats] = useState<Category[]>([]);

  const categories = useMemo(() => [...DEFAULT_CATEGORIES, ...customCats], [customCats]);

  // Latest values for the persist helpers, free of stale closures.
  const datesRef = useRef(dates);
  const customCatsRef = useRef(customCats);
  const catsRef = useRef(categories);
  const userIdRef = useRef(userId);
  datesRef.current = dates;
  customCatsRef.current = customCats;
  catsRef.current = categories;
  userIdRef.current = userId;

  // (Re)load whenever auth state settles or the signed-in user changes.
  useEffect(() => {
    if (initializing) return;
    let cancelled = false;

    (async () => {
      setLoaded(false);
      if (userId) {
        await migrateLocalToCloud(userId);
        const [dRes, cRes] = await Promise.all([
          supabase.from('important_dates').select('*'),
          supabase.from('categories').select('*'),
        ]);
        if (cancelled) return;
        setDates((dRes.data ?? []).map(rowToDate).sort(byCreated));
        setCustomCats((cRes.data ?? []).map(rowToCat));
      } else {
        const [d, c] = await Promise.all([loadLocalDates(), loadLocalCustomCats()]);
        if (cancelled) return;
        setDates(d.sort(byCreated));
        setCustomCats(c);
      }
      if (!cancelled) setLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, initializing]);

  const value = useMemo<StoreValue>(() => {
    const persistLocalDates = (next: ImportantDate[]) =>
      AsyncStorage.setItem(DATES_KEY, JSON.stringify(next)).catch(() => {});
    const persistLocalCats = (next: Category[]) =>
      AsyncStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(next)).catch(() => {});
    const warn = (e: { message: string } | null) => e && console.warn('[datepad sync]', e.message);

    return {
      loaded,
      synced: !!userId,
      dates,
      categories,
      getDate: (id) => datesRef.current.find((x) => x.id === id),
      getCategory: (id) => catsRef.current.find((x) => x.id === id),

      addDate: (input) => {
        const created: ImportantDate = { ...input, id: genId(), createdAt: Date.now() };
        const next = [...datesRef.current, created];
        setDates(next);
        const uid = userIdRef.current;
        if (uid) {
          supabase.from('important_dates').insert(dateToRow(created, uid)).then(({ error }) => warn(error));
        } else {
          persistLocalDates(next);
        }
        return created;
      },

      updateDate: (id, patch) => {
        const next = datesRef.current.map((x) => (x.id === id ? { ...x, ...patch } : x));
        setDates(next);
        const uid = userIdRef.current;
        if (uid) {
          const row = next.find((x) => x.id === id);
          if (row) {
            supabase.from('important_dates').update(dateToRow(row, uid)).eq('id', id).then(({ error }) => warn(error));
          }
        } else {
          persistLocalDates(next);
        }
      },

      deleteDate: (id) => {
        const next = datesRef.current.filter((x) => x.id !== id);
        setDates(next);
        const uid = userIdRef.current;
        if (uid) {
          supabase.from('important_dates').delete().eq('id', id).then(({ error }) => warn(error));
        } else {
          persistLocalDates(next);
        }
      },

      addCategory: (label, emoji) => {
        const created: Category = {
          id: genId(),
          label: label.trim(),
          emoji: emoji.trim() || '📌',
          builtIn: false,
          yearMode: 'none',
        };
        const next = [...customCatsRef.current, created];
        setCustomCats(next);
        const uid = userIdRef.current;
        if (uid) {
          supabase.from('categories').insert(catToRow(created, uid)).then(({ error }) => warn(error));
        } else {
          persistLocalCats(next);
        }
        return created;
      },
    };
  }, [loaded, userId, dates, categories, customCats]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
