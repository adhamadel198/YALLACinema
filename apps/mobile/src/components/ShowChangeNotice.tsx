import { StyleSheet, Text, View } from 'react-native';
import type { ShowChange } from '../api/operator';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { Line } from './ui';

/** On a ticket whose show the cinema changed or cancelled after it was booked (BRD 9). */
export function ShowChangeNotice({ change }: { change?: ShowChange | null }) {
  const theme = useTheme();
  const { t } = useI18n();
  if (!change) return null;
  const cancelled = change.kind === 'cancelled';
  return (
    <View accessibilityRole="alert" style={[styles.box, { borderColor: theme.accent, backgroundColor: theme.panel }]}>
      <Text style={[styles.title, { color: theme.accent }]}>{cancelled ? t.op.noticeCancelledTitle : t.op.noticeChangedTitle}</Text>
      {change.kind === 'changed' && change.changed.includes('time') ? <Line label={t.op.newTime} value={change.localTime} strong /> : null}
      {change.kind === 'changed' && change.changed.includes('format') ? <Line label={t.op.newFormat} value={t.op.formatName(change.format)} strong /> : null}
      <Text style={{ color: theme.ink, marginTop: 4, lineHeight: 20 }}>{cancelled ? t.op.noticeCancelledBody : t.op.noticeChangedBody}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1.5, borderStartWidth: 5, borderRadius: 14, padding: 14, marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
});
