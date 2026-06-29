/**
 * Data export for DatePad. Builds a CSV of the user's dates, writes it to a real
 * .csv file in the cache directory, and hands that file to the native share sheet
 * (so it can be saved to Files/Drive or attached to mail — not just pasted text).
 * Falls back to sharing the CSV as text if file sharing is unavailable.
 */
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import { Category, customDatesOf, ImportantDate, leadDaysOf, recurrenceOf } from '@/lib/dates';

function csvCell(value: string | number | undefined | null): string {
  const s = value == null ? '' : String(value);
  // Quote if the cell contains a comma, quote, or newline; double inner quotes.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADERS = [
  'name',
  'category',
  'month',
  'day',
  'year',
  'time',
  'recurrence',
  'recurrence_years',
  'custom_dates',
  'lead_days',
  'reminders_enabled',
  'note',
];

export function buildCsv(dates: ImportantDate[], categories: Category[]): string {
  const catLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;
  const rows = dates.map((d) =>
    [
      d.name,
      catLabel(d.categoryId),
      d.month,
      d.day,
      d.year ?? '',
      d.hour != null ? `${String(d.hour).padStart(2, '0')}:${String(d.minute ?? 0).padStart(2, '0')}` : '',
      recurrenceOf(d),
      d.recurrenceYears ?? '',
      recurrenceOf(d) === 'custom' ? customDatesOf(d).join(' ') : '',
      leadDaysOf(d).join(' '),
      d.remindersEnabled === false ? 'no' : 'yes',
      d.note ?? '',
    ]
      .map(csvCell)
      .join(','),
  );
  return [HEADERS.join(','), ...rows].join('\n');
}

const FILE_NAME = 'datepad-export.csv';

/** Write the CSV to a cache file and open the native share sheet with it. */
export async function shareDatesCsv(dates: ImportantDate[], categories: Category[]): Promise<void> {
  const csv = buildCsv(dates, categories);

  try {
    if (await Sharing.isAvailableAsync()) {
      const file = new File(Paths.cache, FILE_NAME);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export DatePad data',
        UTI: 'public.comma-separated-values-text',
      });
      return;
    }
  } catch {
    // fall through to the text share below
  }

  // Fallback: share the CSV as plain text.
  await Share.share({ title: 'DatePad export', message: csv });
}
