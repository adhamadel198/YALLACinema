import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

export function Placeholder({ title, body }: { title: string; body: string }) {
  const t = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }]}>
      <Text style={[styles.title, { color: t.ink }]}>{title}</Text>
      <Text style={[styles.body, { color: t.muted }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
});
