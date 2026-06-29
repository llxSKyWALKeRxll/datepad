/**
 * Date + category model and pure helpers for DatePad.
 * State/persistence lives in store.tsx; this file is logic only.
 */
import { Urgency } from '@/constants/theme';

/** How a category phrases the optional `year` on a date. */
export type YearMode = 'age' | 'years' | 'none';

export interface Category {
  id: string;
  label: string;
  emoji: string;
  builtIn?: boolean;
  yearMode: YearMode;
}

/**
 * How a date repeats. `annual` (default) and `monthly` ignore the year; `once`
 * and `everyNYears` use `year` as the anchor (so they need a year set); `custom`
 * is a hand-picked list of specific dates (`customDates`) that need not share a
 * day-of-month — for events that move around (festivals, irregular meetings).
 */
export type RecurrenceType = 'annual' | 'monthly' | 'once' | 'everyNYears' | 'custom';

export interface ImportantDate {
  id: string;
  name: string;
  categoryId: string;
  month: number; // 1-12
  day: number; // 1-31
  year?: number; // reference year (birthday) OR anchor year (once / everyNYears)
  hour?: number; // optional time-of-day, 0-23
  minute?: number; // 0-59
  note?: string;
  /** Defaults to 'annual' when absent (back-compat with pre-recurrence rows). */
  recurrence?: RecurrenceType;
  /** Interval in years for `everyNYears` (>= 2). */
  recurrenceYears?: number;
  /** Specific ISO dates (YYYY-MM-DD) for `custom` recurrence, ascending. */
  customDates?: string[];
  /** Days-before the date that a reminder fires. Absent ⇒ DEFAULT_LEAD_DAYS. */
  leadDays?: number[];
  /** Master on/off for this date's reminders. Absent ⇒ true. */
  remindersEnabled?: boolean;
  /** Also email the reminder (in addition to push). Requires a signed-in account. */
  emailReminders?: boolean;
  /** ISO date (YYYY-MM-DD) of an occurrence the user marked handled (reminders skipped). */
  handledOccurrence?: string;
  createdAt: number;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'birthday', label: 'Birthday', emoji: '🎂', builtIn: true, yearMode: 'age' },
  { id: 'anniversary', label: 'Anniversary', emoji: '💞', builtIn: true, yearMode: 'years' },
  { id: 'holiday', label: 'Holiday', emoji: '🎉', builtIn: true, yearMode: 'none' },
  { id: 'reminder', label: 'Reminder', emoji: '📌', builtIn: true, yearMode: 'none' },
];

/** Lead times offered in the reminder editor, and the app-wide default. */
export const LEAD_PRESETS: number[] = [0, 1, 3, 7, 14, 30];
export const DEFAULT_LEAD_DAYS: number[] = [7, 1, 0];

export const RECURRENCE_OPTIONS: { type: RecurrenceType; label: string }[] = [
  { type: 'annual', label: 'Every year' },
  { type: 'monthly', label: 'Every month' },
  { type: 'everyNYears', label: 'Every N years' },
  { type: 'custom', label: 'Custom dates' },
  { type: 'once', label: 'One-off' },
];

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysInMonth(year: number, month1: number): number {
  // Day 0 of the next month is the last day of `month1` (1-based).
  return new Date(year, month1, 0).getDate();
}

/** A date that clamps the day to the month length and normalizes month overflow. */
function occOf(year: number, month0: number, day: number): Date {
  const y = year + Math.floor(month0 / 12);
  const m0 = ((month0 % 12) + 12) % 12;
  return new Date(y, m0, Math.min(day, daysInMonth(y, m0 + 1)));
}

export function recurrenceOf(date: ImportantDate): RecurrenceType {
  return date.recurrence ?? 'annual';
}

export function leadDaysOf(date: ImportantDate): number[] {
  return date.leadDays && date.leadDays.length ? date.leadDays : DEFAULT_LEAD_DAYS;
}

/** Sorted, de-duplicated custom dates (ISO YYYY-MM-DD) for a custom-recurrence date. */
export function customDatesOf(date: ImportantDate): string[] {
  return Array.from(new Set((date.customDates ?? []).filter(Boolean))).sort();
}

/** Parse an ISO YYYY-MM-DD into a local-midnight Date (no timezone drift). */
function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** The next occurrence of this date (today counts). Past one-offs return their own past date. */
export function nextOccurrence(date: ImportantDate, from: Date = new Date()): Date {
  const today = startOfDay(from);
  const rec = recurrenceOf(date);

  if (rec === 'custom') {
    const list = customDatesOf(date);
    if (list.length === 0) return occOf(today.getFullYear(), date.month - 1, date.day);
    const todayISO = toISODate(today);
    return parseISODate(list.find((iso) => iso >= todayISO) ?? list[list.length - 1]);
  }

  if (rec === 'once') {
    const y = date.year ?? today.getFullYear();
    return occOf(y, date.month - 1, date.day);
  }

  if (rec === 'monthly') {
    let cand = occOf(today.getFullYear(), today.getMonth(), date.day);
    if (cand.getTime() < today.getTime()) {
      cand = occOf(today.getFullYear(), today.getMonth() + 1, date.day);
    }
    return cand;
  }

  if (rec === 'everyNYears') {
    const n = Math.max(date.recurrenceYears ?? 1, 1);
    let y = date.year ?? today.getFullYear();
    let cand = occOf(y, date.month - 1, date.day);
    while (cand.getTime() < today.getTime()) {
      y += n;
      cand = occOf(y, date.month - 1, date.day);
    }
    return cand;
  }

  // annual
  let next = occOf(today.getFullYear(), date.month - 1, date.day);
  if (next.getTime() < today.getTime()) {
    next = occOf(today.getFullYear() + 1, date.month - 1, date.day);
  }
  return next;
}

function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

/** ISO (YYYY-MM-DD) of this date's next occurrence — the key used for "handled". */
export function occurrenceISO(date: ImportantDate, from: Date = new Date()): string {
  return toISODate(nextOccurrence(date, from));
}

/** True when the user has marked the current upcoming occurrence as handled. */
export function isHandled(date: ImportantDate, from: Date = new Date()): boolean {
  return !!date.handledOccurrence && date.handledOccurrence === occurrenceISO(date, from);
}

/** Days until the next occurrence (0 = today; negative = a past one-off). */
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
  if (daysLeft < 0) return Urgency.passed;
  if (daysLeft === 0) return Urgency.today;
  if (daysLeft <= 7) return Urgency.soon;
  return Urgency.far;
}

export function countdownLabel(daysLeft: number): string {
  if (daysLeft < 0) return daysLeft === -1 ? 'Yesterday' : `${-daysLeft} days ago`;
  if (daysLeft === 0) return 'Today';
  if (daysLeft === 1) return 'Tomorrow';
  return `${daysLeft} days`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(date: ImportantDate): string {
  // Custom dates land on a specific calendar day — show the next one with year.
  if (recurrenceOf(date) === 'custom') {
    const next = nextOccurrence(date);
    return `${MONTHS[next.getMonth()]} ${next.getDate()}, ${next.getFullYear()}`;
  }
  // One-offs are a specific calendar day, so include the year.
  const base = `${MONTHS[date.month - 1]} ${date.day}`;
  return recurrenceOf(date) === 'once' && date.year ? `${base}, ${date.year}` : base;
}

/** Builds the "turns 30" / "8 years" phrase for a date under a category, if applicable. */
export function yearsPhrase(date: ImportantDate, category?: Category): string | undefined {
  // For one-offs / custom dates the year is the event's own, not a count-from reference.
  const rec = recurrenceOf(date);
  if (rec === 'once' || rec === 'custom') return undefined;
  const years = upcomingYears(date);
  if (years === undefined || !category || category.yearMode === 'none') return undefined;
  if (category.yearMode === 'age') return `turns ${years}`;
  return `${years} ${years === 1 ? 'year' : 'years'}`;
}

export function recurrenceLabel(date: ImportantDate): string {
  switch (recurrenceOf(date)) {
    case 'monthly':
      return 'Every month';
    case 'once':
      return 'One-off';
    case 'everyNYears':
      return `Every ${date.recurrenceYears ?? 2} years`;
    case 'custom': {
      const n = customDatesOf(date).length;
      return `Custom · ${n} ${n === 1 ? 'date' : 'dates'}`;
    }
    default:
      return 'Every year';
  }
}

/** Human label for a single lead time, e.g. 7 ⇒ "1 week before". */
export function leadLabel(days: number): string {
  if (days <= 0) return 'On the day';
  if (days === 1) return '1 day before';
  if (days === 7) return '1 week before';
  if (days === 14) return '2 weeks before';
  if (days === 30) return '1 month before';
  return `${days} days before`;
}

/** "1 week, 1 day, on the day" — or "Off" when reminders are disabled. */
export function leadSummary(date: ImportantDate): string {
  if (date.remindersEnabled === false) return 'Off';
  const leads = [...leadDaysOf(date)].sort((a, b) => b - a);
  if (leads.length === 0) return 'Off';
  return leads.map((d) => leadLabel(d).replace(/ before$/, '')).join(', ');
}

/** Shareable one-liner for a date. */
export function shareText(date: ImportantDate, category?: Category): string {
  const days = daysUntilNext(date);
  const when = countdownLabel(days).toLowerCase();
  const years = yearsPhrase(date, category);
  const subject = years ? `${date.name} (${years})` : date.name;
  return `📅 ${subject} — ${formatDate(date)} (${when}). Tracked with DatePad.`;
}

export function isValidMonthDay(month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= 31;
}

export function isValidTime(hour: number, minute: number): boolean {
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

/** "6:30 PM" if a time is set, else undefined. */
export function formatTime(date: ImportantDate): string | undefined {
  if (date.hour == null) return undefined;
  const h = date.hour;
  const m = date.minute ?? 0;
  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** Horizon bucket for grouping the upcoming list. */
export type Horizon = 'today' | 'week' | 'later' | 'passed';

export function horizonOf(daysLeft: number): Horizon {
  if (daysLeft < 0) return 'passed';
  if (daysLeft === 0) return 'today';
  if (daysLeft <= 7) return 'week';
  return 'later';
}

export const HORIZON_LABELS: Record<Horizon, string> = {
  today: 'TODAY',
  week: 'THIS WEEK',
  later: 'LATER',
  passed: 'PASSED',
};
