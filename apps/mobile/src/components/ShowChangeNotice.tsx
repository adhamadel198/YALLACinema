import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ShowChange } from '../api/operator';
import { clock } from '../format';
import { useI18n } from '../i18n';
import { colors } from '../theme';
import { useType } from '../typography';
import { Line } from './ui';

/**
 * On a ticket whose show the cinema changed or cancelled after it was booked (BRD 9): a cream notice card in the
 * live `.notice` colours, with a gold border when the show is cancelled.
 */
export function ShowChangeNotice({ change, style }: { change?: ShowChange | null; style?: StyleProp<ViewStyle> }) {
  const { t } = useI18n();
  const { font } = useType();
  if (!change) return null;
  const cancelled = change.kind === 'cancelled';
  return (
    <View role="alert" style={[styles.box, cancelled && styles.cancelled, style]} testID="show-change-notice">
      <Text role="heading" aria-level={2} style={[font(800), styles.title]}>{cancelled ? t.op.noticeCancelledTitle : t.op.noticeChangedTitle}</Text>
      {change.kind === 'changed' && change.changed.includes('time') ? <Line tone="cream" label={t.op.newTime} value={clock(change.localTime, t)} strong /> : null}
      {change.kind === 'changed' && change.changed.includes('format') ? <Line tone="cream" label={t.op.newFormat} value={t.op.formatName(change.format)} strong /> : null}
      <Text style={[font(400), styles.body]}>{cancelled ? t.op.noticeCancelledBody : t.op.noticeChangedBody}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.noticeBg, borderRadius: 11, padding: 14, borderWidth: 1, borderColor: colors.noticeBg },
  cancelled: { borderWidth: 2, borderColor: colors.eyebrow },
  title: { color: colors.badgeInk, fontSize: 15, lineHeight: 22, marginBottom: 4 },
  body: { color: colors.noticeInk, fontSize: 13, lineHeight: 20, marginTop: 4 },
});
