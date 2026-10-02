import { router } from 'expo-router';
import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import type { Booking } from '../api/types';
import type { TicketStatus } from '../api/resale';
import { useAuth } from '../auth';
import { signInHref } from '../auth/routes';
import { useI18n } from '../i18n';
import { useLayout } from '../layout';
import { showStarted } from '../liveShow';
import { colors } from '../theme';
import { useType } from '../typography';
import { CheckRow } from './form';
import { Badge, Button, Eyebrow, H2, Panel, type BadgeTone } from './ui';

/** Resale needs an account: sign in, then come back to this screen. */
export function SignInPrompt({ text, style }: { text: string; style?: StyleProp<ViewStyle> }) {
  const { t } = useI18n();
  const { type } = useType();
  return (
    <Panel style={style}>
      <Text style={[type.body, { marginBottom: 12 }]}>{text}</Text>
      <Button title={t.resaleGoSignIn} size="small" inline onPress={() => router.push(signInHref())} />
    </Panel>
  );
}

/**
 * One line of facts joined by " · ", e.g. cinema and date. Each part is its own Text, so Latin names, seat ids
 * and Arabic words keep their own direction instead of being reordered together, and the row flips in Arabic.
 * Default text is the live `.list-info`: 12/18.6 in `color`.
 */
export function Parts({ parts, color = colors.muted, style, textStyle }: {
  parts: (string | false | null | undefined)[]; color?: string; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>;
}) {
  const { font } = useType();
  const text = [font(400), { color, fontSize: 12, lineHeight: 18.6 }, textStyle];
  return (
    <View style={[styles.parts, style]}>
      {parts.filter((p): p is string => !!p).flatMap((part, i) => [
        ...(i ? [<Text key={`dot${i}`} aria-hidden style={text}>·</Text>] : []),
        <Text key={i} style={text}>{part}</Text>,
      ])}
    </View>
  );
}

const PILL: Record<'accent' | 'good' | 'muted', BadgeTone> = { good: 'good', accent: 'cream', muted: 'dark' };

/** A small rounded label, e.g. a listing's status: good = green pill, accent = cream badge, muted = dark pill. */
export function Pill({ label, tone = 'muted', style }: { label: string; tone?: 'accent' | 'good' | 'muted'; style?: StyleProp<ViewStyle> }) {
  return <Badge label={label} tone={PILL[tone]} style={style} />;
}

/**
 * Checkbox rows, one per seat (live `.elig-ticket`); disabled ones show why (e.g. "Seat D8 · Listed").
 * `tone="cream"` for the cream buy sheet; `columns` puts two rows side by side on wide screens.
 */
export function SeatToggles({ options, selected, onToggle, tone = 'dark', columns }: {
  options: { id: string; label: string; note?: string; disabled?: boolean }[];
  selected: string[];
  onToggle: (id: string) => void;
  tone?: 'dark' | 'cream';
  columns?: boolean;
}) {
  const { wide } = useLayout();
  const two = columns && wide && options.length > 1;
  return (
    <View style={two ? styles.twoCols : undefined}>
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <CheckRow key={o.id} title={o.label} sub={o.note} checked={on} disabled={o.disabled} tone={tone}
            onToggle={() => onToggle(o.id)} accessibilityLabel={o.note ? `${o.label}, ${o.note}` : o.label}
            style={[{ marginVertical: 4 }, two && styles.half]} />
        );
      })}
    </View>
  );
}

/** Shown in place of a ticket's QR code when it can't be used at the entrance (146px, like the framed codes). */
export function HiddenCode({ status: raw }: { status: string }) {
  const { t } = useI18n();
  const { font } = useType();
  const status = raw as Exclude<TicketStatus, 'valid'>;
  return (
    <View style={styles.hidden}>
      <Text style={[font(800), { color: status === 'transferred' ? colors.muted : colors.goldText, fontSize: 13, marginBottom: 6, textAlign: 'center' }]}>
        {t.resaleTicketStatus[status] ?? raw}
      </Text>
      <Text style={[font(400), { color: colors.muted, fontSize: 11, lineHeight: 16, textAlign: 'center' }]}>{t.resaleCodeHidden[status] ?? ''}</Text>
    </View>
  );
}

/**
 * The resale part of a ticket screen: its owner can sell tickets that are still valid until the show starts,
 * and sees which are listed or sold. It stretches to its container; the screen spaces it.
 */
export function TicketResale({ booking }: { booking: Booking }) {
  const { t } = useI18n();
  const { type, font } = useType();
  const { account, ready } = useAuth();
  const { narrow } = useLayout();
  const count = (status: TicketStatus) => booking.tickets.filter((x) => x.status === status).length;
  const listed = count('listed');
  const sold = count('transferred');
  const sellable = count('valid');
  const canSell = sellable > 0 && !showStarted(booking) && booking.showChange?.kind !== 'cancelled';

  if (!ready) return null;
  if (!booking.accountId) {
    return canSell ? <Text style={[type.caption, { textAlign: 'center' }]}>{t.resaleGuestBooking}</Text> : null;
  }
  if (!account) return canSell || listed ? <SignInPrompt text={t.resaleSignInToSell} style={narrow ? null : TICKET_PAD} /> : null;
  if (account.id !== booking.accountId || (!canSell && !listed && !sold)) return null;

  return (
    <Panel style={narrow ? null : TICKET_PAD}>
      <Eyebrow style={{ marginBottom: 4 }}>{t.resaleUi.ticketKicker}</Eyebrow>
      <H2 small>{t.resaleTitle}</H2>
      {listed > 0 && <Text style={[font(700), styles.count, { color: colors.link }]}>{t.resaleListedCount(listed)}</Text>}
      {sold > 0 && <Text style={[font(700), styles.count, { color: colors.success }]}>{t.resaleSoldCount(sold)}</Text>}
      {canSell && <Text style={[type.small, { color: colors.muted, marginBottom: 14 }]}>{t.resaleSellHint}</Text>}
      <View style={styles.actions}>
        {canSell && (
          <Button title={t.resaleSellTitle} inline onPress={() => router.push({ pathname: '/resale/sell/[bookingId]', params: { bookingId: booking.id } })} />
        )}
        {(listed > 0 || sold > 0) && <Button title={t.resaleUi.manageListings} kind="dark" inline onPress={() => router.push('/resale/mine')} />}
      </View>
    </Panel>
  );
}

/** On wide screens the panel under the e-ticket lines its text up with the ticket's own 24/26 padding. */
const TICKET_PAD = { paddingVertical: 24, paddingHorizontal: 26 };

const styles = StyleSheet.create({
  parts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 5 },
  twoCols: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10 },
  half: { flexBasis: '48%', flexGrow: 1 },
  hidden: {
    // The same 144px square as a framed QR code (126 + 2 × 9), so the seat labels under them line up.
    width: 144, height: 144, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, backgroundColor: colors.control,
    borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center',
  },
  count: { fontSize: 13, lineHeight: 20, marginBottom: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
});
