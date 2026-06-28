/**
 * DatePad local store — dates + categories, persisted to AsyncStorage.
 * This is the seam we'll swap for Supabase later; screens only touch useStore().
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

import { Category, DEFAULT_CATEGORIES, genId, ImportantDate } from '@/lib/dates';

const DATES_KEY = 'datepad.dates.v1';
const CATS_KEY = 'datepad.categories.v1';

export type NewDate = Omit<ImportantDate, 'id' | 'createdAt'>;

interface StoreValue {
  loaded: boolean;
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

/** Sample dates seeded on first launch — real, editable, deletable entries. */
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

export function DatesProvider({ children }: PropsWithChildren) {
  const [loaded, setLoaded] = useState(false);
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);

  // Keep latest values for the persist helpers without stale closures.
  const datesRef = useRef(dates);
  const catsRef = useRef(categories);
  datesRef.current = dates;
  catsRef.current = categories;

  useEffect(() => {
    (async () => {
      try {
        const [d, c] = await Promise.all([
          AsyncStorage.getItem(DATES_KEY),
          AsyncStorage.getItem(CATS_KEY),
        ]);

        if (c) {
          setCategories(JSON.parse(c) as Category[]);
        } else {
          await AsyncStorage.setItem(CATS_KEY, JSON.stringify(DEFAULT_CATEGORIES));
        }

        if (d) {
          setDates(JSON.parse(d) as ImportantDate[]);
        } else {
          const seeded = seedDates();
          setDates(seeded);
          await AsyncStorage.setItem(DATES_KEY, JSON.stringify(seeded));
        }
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const value = useMemo<StoreValue>(() => {
    const persistDates = (next: ImportantDate[]) => {
      setDates(next);
      AsyncStorage.setItem(DATES_KEY, JSON.stringify(next)).catch(() => {});
    };
    const persistCats = (next: Category[]) => {
      setCategories(next);
      AsyncStorage.setItem(CATS_KEY, JSON.stringify(next)).catch(() => {});
    };

    return {
      loaded,
      dates,
      categories,
      getDate: (id) => datesRef.current.find((x) => x.id === id),
      getCategory: (id) => catsRef.current.find((x) => x.id === id),
      addDate: (input) => {
        const created: ImportantDate = { ...input, id: genId(), createdAt: Date.now() };
        persistDates([...datesRef.current, created]);
        return created;
      },
      updateDate: (id, patch) => {
        persistDates(datesRef.current.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      },
      deleteDate: (id) => {
        persistDates(datesRef.current.filter((x) => x.id !== id));
      },
      addCategory: (label, emoji) => {
        const created: Category = {
          id: genId(),
          label: label.trim(),
          emoji: emoji.trim() || '📌',
          builtIn: false,
          yearMode: 'none',
        };
        persistCats([...catsRef.current, created]);
        return created;
      },
    };
  }, [loaded, dates, categories]);

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
