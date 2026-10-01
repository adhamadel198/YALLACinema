import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

export function Button({ title, onPress, disabled, busy, kind = 'primary', style }: {
  title: string; onPress: () => void; disabled?: boolean; busy?: boolean; kind?: 'primary' | 'secondary'; style?: ViewStyle;
}) {
  const t = useTheme();
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={[styles.button, primary ? { backgroundColor: t.accent } : { borderColor: t.line, borderWidth: 1 }, (disabled || busy) && { opacity: 0.5 }, style]}
    >
      {busy ? <ActivityIndicator color={primary ? t.accentInk : t.ink} /> : <Text style={[styles.buttonText, { color: primary ? t.accentInk : t.ink }]}>{title}</Text>}
    </Pressable>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[styles.panel, { backgroundColor: t.panel, borderColor: t.line }, style]}>{children}</View>;
}

export function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const t = useTheme();
  return (
    <View style={styles.line}>
      <Text style={{ color: strong ? t.ink : t.muted, fontWeight: strong ? '800' : '400', flex: 1 }}>{label}</Text>
      <Text style={{ color: t.ink, fontWeight: strong ? '800' : '600' }}>{value}</Text>
    </View>
  );
}

export function Message({ text, onRetry, retryLabel }: { text: string; onRetry?: () => void; retryLabel?: string }) {
  const t = useTheme();
  const { t: s } = useI18n();
  return (
    <View style={styles.center}>
      <Text style={{ color: t.ink, textAlign: 'center', marginBottom: 12 }}>{text}</Text>
      {onRetry && <Button title={retryLabel ?? s.tryAgain} onPress={onRetry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderRadius: 13, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontWeight: '800', fontSize: 15 },
  panel: { borderWidth: 1, borderRadius: 16, padding: 16 },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
