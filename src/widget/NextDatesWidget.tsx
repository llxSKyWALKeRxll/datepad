/**
 * The DatePad home-screen widget UI (Android). Built with react-native-android-
 * widget's primitives — these render to native RemoteViews, not real RN views,
 * so only the library's style subset is available. Tapping opens the app.
 */
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export interface WidgetItem {
  name: string;
  sub: string;
  badge: string;
  color: string;
}

export function NextDatesWidget({ items }: { items: WidgetItem[] }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'column',
      }}>
      <TextWidget
        text="DatePad"
        style={{ fontSize: 13, fontFamily: 'sans-serif-medium', color: '#FF6B5E', marginBottom: 6 }}
      />

      {items.length === 0 ? (
        <TextWidget text="No upcoming dates" style={{ fontSize: 13, color: '#8A817C' }} />
      ) : (
        items.map((it, i) => (
          <FlexWidget
            key={i}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              width: 'match_parent',
              marginBottom: 6,
            }}>
            <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
              <TextWidget text={it.name} maxLines={1} style={{ fontSize: 14, color: '#22201E' }} />
              <TextWidget text={it.sub} maxLines={1} style={{ fontSize: 11, color: '#8A817C' }} />
            </FlexWidget>
            <FlexWidget
              style={{
                backgroundColor: it.color as `#${string}`,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 4,
              }}>
              <TextWidget text={it.badge} style={{ fontSize: 12, color: '#FFFFFF' }} />
            </FlexWidget>
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}
