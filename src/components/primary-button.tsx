import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';
import { useColors } from '@/lib/theme';

export function PrimaryButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? c.accentPressed : c.accent },
        style,
      ]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 54,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
