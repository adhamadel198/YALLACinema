import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Hold, PaymentMethod } from '../../api/types';
import { mmss } from '../../format';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { describeSeats } from '../../seats';
import { colors } from '../../theme';
import { useType } from '../../typography';
import { ChoiceChip } from '../Chips';
import { H2, Line, Panel } from '../ui';
import { showWhen } from './when';

// Pieces of the checkout page (live checkout.html): hold countdown, payment options, policy row, order summary.

/** Under this many milliseconds the hold countdown turns urgent. */
const SOON = 120000;

/**
 * "⏱ Seats held for 8:52" as a cream pill (app-only: the live prototype has no hold). Under two minutes it turns
 * red-brown so the deadline stands out. `line` draws it as the summary panel's last line instead of a pill.
 */
export function HoldTimer({ left, line, style }: { left: number; line?: boolean; style?: StyleProp<ViewStyle> }) {
  const { t } = useI18n();
  const { font } = useType();
  const soon = left < SOON;
  const text = t.checkoutUi.heldBadge(mmss(Math.max(0, left)));
  if (line) {
    return (
      <View style={[styles.timerLine, style]}>
        <Text role="timer" style={[font(soon ? 800 : 700), { color: soon ? colors.danger : colors.success, fontSize: 12, lineHeight: 18, fontVariant: ['tabular-nums'] }]}>{text}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.pill, soon && styles.pillSoon, style]}>
      <Text role="timer" style={[font(800), { color: soon ? colors.dangerOnCream : colors.badgeInk, fontSize: 12, lineHeight: 17, fontVariant: ['tabular-nums'] }]}>{text}</Text>
    </View>
  );
}

/** Bank card / Local wallet (`.payopt`): two equal boxes side by side, stacked on narrow phones. */
export function PayOptions({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  const { t } = useI18n();
  const { narrow } = useLayout();
  const options: { value: PaymentMethod; label: string }[] = [
    { value: 'card', label: t.card },
    { value: 'wallet', label: t.wallet },
  ];
  return (
    <View role="radiogroup" aria-label={t.paymentMethod} style={[styles.pay, narrow && { flexDirection: 'column' }]}>
      {options.map((o) => (
        <ChoiceChip key={o.value} variant="pay" label={o.label} selected={o.value === value} onPress={() => onChange(o.value)}
          style={narrow ? { flexBasis: 'auto' } : null} />
      ))}
    </View>
  );
}

/** The cinema's cancellation policy with a checkbox (the live policy row): 12px, gold box when ticked. */
export function PolicyCheck({ checked, onToggle, cinema, policy }: { checked: boolean; onToggle: () => void; cinema: string; policy: string }) {
  const { t } = useI18n();
  const { font } = useType();
  return (
    <Pressable onPress={onToggle} accessibilityRole="checkbox" aria-checked={checked} style={styles.policy} testID="accept-policy">
      <View aria-hidden style={[styles.box, checked && { backgroundColor: colors.gold, borderColor: colors.gold }]}>
        {checked ? <Text style={[font(800), { color: colors.onGold, fontSize: 12, lineHeight: 14 }]}>✓</Text> : null}
      </View>
      <Text style={[font(400), { flex: 1, color: '#c0b49a', fontSize: 12, lineHeight: 18.6 }]}>
        {t.acceptPolicy(cinema)}
        <Text style={{ color: colors.inkControl }}>{policy}</Text>
      </Text>
    </Pressable>
  );
}

/** The order summary panel (`.summary`): film, cinema and time, seats, prices, total, then the policy note. */
export function OrderSummary({ hold, left, style }: { hold: Required<Hold>; left?: number; style?: StyleProp<ViewStyle> }) {
  const { t } = useI18n();
  const { type, font } = useType();
  const s = hold.showtime;
  const plain = (v: string) => <Text style={[font(400), { color: colors.ink, fontSize: 13, lineHeight: 19.5 }]}>{v}</Text>;
  return (
    <Panel style={style} testID="order-summary">
      <H2 small style={{ marginBottom: 0 }}>{t.checkoutUi.orderSummary}</H2>
      <Text style={[font(800), { color: colors.ink, fontSize: 15, lineHeight: 23, marginTop: 15 }]}>{s.movie.title}</Text>
      <Text style={[type.caption, { marginTop: 13, marginBottom: 6 }]}>
        <Text>{s.cinema.name}</Text>
        <Text aria-hidden>{' · '}</Text>
        <Text>{showWhen(s.startsAt, t, 'comma')}</Text>
      </Text>
      <Line label={t.seats} value={<Text style={[font(800), { color: colors.ink, fontSize: 13, lineHeight: 19.5, writingDirection: 'ltr' }]}>{describeSeats(hold.seats)}</Text>} />
      <Line label={t.ticketsLine(hold.seats.length, t.egp(s.price))} value={plain(t.egp(hold.price.tickets))} />
      <Line label={t.platformFee} value={plain(t.egp(hold.price.fees))} />
      <Line total label={t.total} value={t.egp(hold.price.total)} />
      <Text style={[type.micro, { marginTop: 15 }]}>{t.checkoutUi.orderNote}</Text>
      {left !== undefined ? <HoldTimer line left={left} /> : null}
    </Panel>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', borderRadius: 99, paddingVertical: 6, paddingHorizontal: 11,
    backgroundColor: colors.badgeBg, borderWidth: 1, borderColor: colors.badgeBg,
  },
  pillSoon: { backgroundColor: colors.noticeBg, borderColor: colors.dangerLine },
  timerLine: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 14, paddingTop: 12 },
  pay: { flexDirection: 'row', gap: 10 },
  policy: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 20 },
  box: {
    width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: colors.muted, marginTop: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
