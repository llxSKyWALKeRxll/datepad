// Custom entry: expo-router's app entry, plus registering the Android widget's
// headless task handler. Guarded so a build without the native widget module
// (or any non-Android platform) still boots normally.
import 'expo-router/entry';

try {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./src/widget/widget-task-handler');
  registerWidgetTaskHandler(widgetTaskHandler);
} catch {
  // native widget module not present in this build
}
