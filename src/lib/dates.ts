/**
 * Date model + helpers for DatePad.
 * For the base setup these live in-memory; persistence (Supabase) comes next.
 */
import { Colors } from '@/constants/theme';

export type DateType = 'birthday' | 'anniversary' | 'custom';

export interface ImportantDate {
  id: string;
  name: string;
  type: DateType;
  month: number; // 1-12
  day: number; // 1-31
  year?: number; // optional — for age / years-since
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

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

/** Age / years-since on the next occurrence, if a year is known. */
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

export function typeLabel(type: DateType): string {
  switch (type) {
    case 'birthday':
      return 'Birthday';
    case 'anniversary':
      return 'Anniversary';
    default:
      return 'Important date';
  }
}

/**
 * Sample data so the Upcoming screen shows real UI in the base build.
 * Positioned relative to today so the urgency badges (today/soon/far) are visible.
 */
export function sampleDates(from: Date = new Date()): ImportantDate[] {
  const mk = (offsetDays: number) => {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays);
    return { month: d.getMonth() + 1, day: d.getDate() };
  };
  return [
    { id: '1', name: 'Mom', type: 'birthday', ...mk(0), year: 1965 },
    { id: '2', name: 'Alex & Sam', type: 'anniversary', ...mk(4), year: 2018 },
    { id: '3', name: 'Priya', type: 'birthday', ...mk(20), year: 1996 },
  ];
}
