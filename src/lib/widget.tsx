/**
 * Keeps the Android home-screen widget in sync with the user's next dates.
 * The app pushes updates (requestWidgetUpdate) whenever dates change, and also
 * persists a snapshot to AsyncStorage so the headless widget task handler can
 * re-render on system-initiated updates without the app running.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  Category,
  countdownLabel,
  daysUntilNext,
  formatDate,
  ImportantDate,
  urgencyColor,
} from '@/lib/dates';
import { NextDatesWidget, WidgetItem } from '@/widget/NextDatesWidget';

const KEY = 'datepad.widget.v1';
const WIDGET_NAME = 'NextDates';

/** The next 3 upcoming dates, shaped for the widget. */
export function buildWidgetItems(dates: ImportantDate[], categories: Category[]): WidgetItem[] {
  const catLabel = (id: string) => categories.find((c) => c.id === id)?.label;
  return [...dates]
    .filter((d) => daysUntilNext(d) >= 0)
    .sort((a, b) => daysUntilNext(a) - daysUntilNext(b))
    .slice(0, 3)
    .map((d) => {
      const days = daysUntilNext(d);
      return {
        name: d.name,
        sub: [catLabel(d.categoryId), formatDate(d)].filter(Boolean).join(' · '),
        badge: countdownLabel(days),
        color: urgencyColor(days),
      };
    });
}

export async function loadWidgetItems(): Promise<WidgetItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as WidgetItem[]) : [];
  } catch {
    return [];
  }
}

/** Persist a fresh snapshot and re-render any placed widget. Android-only. */
export async function updateWidget(dates: ImportantDate[], categories: Category[]): Promise<void> {
  if (Platform.OS !== 'android') return;
  const items = buildWidgetItems(dates, categories);
  await AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {});
  try {
    // Lazy require so a build lacking the native module never crashes the app.
    const { requestWidgetUpdate } = require('react-native-android-widget');
    await requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: () => <NextDatesWidget items={items} />,
      widgetNotFound: () => {},
    });
  } catch {
    // native widget module absent (older build) or no widget placed
  }
}
