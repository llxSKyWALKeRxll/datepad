/**
 * Date + category model and pure helpers for DatePad.
 * State/persistence lives in store.tsx; this file is logic only.
 */
import { Colors } from '@/constants/theme';

/** How a category phrases the optional `year` on a date. */
export type YearMode = 'age' | 'years' | 'none';

export interface Category {
  id: string;
  label: string;
  emoji: string;
  builtIn?: boolean;
  yearMode: YearMode;
}

export interface ImportantDate {
  id: string;
  name: string;
  categoryId: string;
  month: number; // 1-12
  day: number; // 1-31
  year?: number; // optional reference year (birth year, wedding year, ...)
  note?: string;
  createdAt: number;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'birthday', label: 'Birthday', emoji: '🎂', builtIn: true, yearMode: 'age' },
  { id: 'anniversary', label: 'Anniversary', emoji: '💞', builtIn: true, yearMode: 'years' },
  { id: 'holiday', label: 'Holiday', emoji: '🎉', builtIn: true, yearMode: 'none' },
  { id: 'reminder', label: 'Reminder', emoji: '📌', builtIn: true, yearMode: 'none' },
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** The next calendar occurrence of this annual date (today counts as the occurrence). */
export function nextOccurrence(date: ImportantDate, from: Date = new Date()): Date {
  const today = startOfDay(from);
  let next = new Date(today.getFullYear(), date.month - 1, date.day);
  if (next.getTime() < today.getTime()) {
    next = new Date(today.getFullYear() + 1, date.month - 1, date.day);
  }
  return next;
}

/** Days until the next occurrence (0 = today). */
export function daysUntilNext(date: ImportantDate, from: Date = new Date()): number {
  const today = startOfDay(from);
  const next = nextOccurrence(date, from);
  return Math.round((next.getTime() - today.getTime()) / MS_PER_DAY);
}

/** Years on the next occurrence, if a reference year is known. */
export function upcomingYears(date: ImportantDate, from: Date = new Date()): number | undefined {
  if (!date.year) return undefined;
  return nextOccurrence(date, from).getFullYear() - date.year;
}

export function urgencyColor(daysLeft: number): string {
  if (daysLeft <= 0) return Colors.today;
  if (daysLeft <= 7) return Colors.soon;
  return Colors.far;
}

export function countdownLabel(daysLeft: number): string {
  if (daysLeft === 0) return 'Today';
  if (daysLeft === 1) return 'Tomorrow';
  return `${daysLeft} days`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(date: ImportantDate): string {
  return `${MONTHS[date.month - 1]} ${date.day}`;
}

/** Builds the "turns 30" / "8 years" phrase for a date under a category, if applicable. */
export function yearsPhrase(date: ImportantDate, category?: Category): string | undefined {
  const years = upcomingYears(date);
  if (years === undefined || !category || category.yearMode === 'none') return undefined;
  if (category.yearMode === 'age') return `turns ${years}`;
  return `${years} ${years === 1 ? 'year' : 'years'}`;
}

export function isValidMonthDay(month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}
