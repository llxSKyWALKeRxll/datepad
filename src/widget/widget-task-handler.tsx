/**
 * Headless handler the OS calls to (re)render the widget — e.g. when it's first
 * added or on a periodic update, possibly while the app isn't running. It reads
 * the snapshot the app persisted and renders from that.
 */
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { loadWidgetItems } from '@/lib/widget';
import { NextDatesWidget } from '@/widget/NextDatesWidget';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const items = await loadWidgetItems();
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<NextDatesWidget items={items} />);
      break;
    default:
      break;
  }
}
