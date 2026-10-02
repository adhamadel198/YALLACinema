import { StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { colors } from '../../theme';
import { tracking, useType } from '../../typography';
import { useColumnStyle } from '../page';
import { Notice } from '../ui';
import { HomeHead } from './parts';

/**
 * "How it works" (index.html `.how`): a full-bleed band with the three booking steps and the pricing note
 * (cinema price + the 5 EGP platform fee per ticket, shown before payment).
 */
export function HowItWorks() {
  const { t } = useI18n();
  const { font, rtl } = useType();
  const { width } = useLayout();
  const column = useColumnStyle(true);
  const stacked = width <= 580;
  return (
    <View style={styles.band}>
      <View style={column}>
        <HomeHead size="small" kicker={t.home.easy123} title={t.home.seatWaiting} style={{ marginBottom: 4.3 }} />
        <View role="list" style={[{ gap: stacked ? 5 : 22 }, !stacked && { flexDirection: 'row' }]}>
          {t.home.steps.map((s) => (
            <View role="listitem" key={s.num} style={[styles.step, { paddingVertical: stacked ? 13 : 17 }, !stacked && { flex: 1, flexBasis: 0 }]}>
              <Text style={[font(800), { color: colors.kicker, fontSize: 12, lineHeight: 18, letterSpacing: tracking(1, rtl) }]}>{s.num}</Text>
              <Text role="heading" aria-level={3} style={[font(700), { color: colors.ink, fontSize: 16, lineHeight: 24, marginTop: 9, marginBottom: 5 }]}>{s.title}</Text>
              <Text style={[font(400), { color: colors.muted, fontSize: 13, lineHeight: 19.5, maxWidth: 300 }]}>{s.body}</Text>
            </View>
          ))}
        </View>
        <Notice tone="fee" style={{ marginTop: 22 }}>
          {/* ⓘ is a Latin letter to the bidi algorithm, so set the direction instead of letting it pick LTR. */}
          <Text style={[font(400), { color: colors.feeInk, fontSize: 12, lineHeight: 18, writingDirection: rtl ? 'rtl' : 'ltr' }]}>
            {'ⓘ  '}{t.home.feeNoteA}
            <Text style={[font(700), { color: colors.feeStrong }]}>{t.home.feeNoteB}</Text>
            {t.home.feeNoteC}
          </Text>
        </Notice>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { backgroundColor: colors.surface, paddingVertical: 48 },
  step: { borderTopWidth: 1, borderTopColor: '#493c26' },
});
