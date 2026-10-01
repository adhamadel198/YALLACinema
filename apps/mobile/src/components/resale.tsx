import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { Booking } from '../api/types';
import type { TicketStatus } from '../api/resale';
import { useAuth } from '../auth';
import { signInHref } from '../auth/routes';
import { useI18n } from '../i18n';
import { showStarted } from '../liveShow';
import { useTheme } from '../theme';
import { Button, Panel } from './ui';

/** Resale needs an account: sign in, then come back to this screen. */
export function SignInPrompt({ text, style }: { text: string; style?: ViewStyle }) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <Panel style={style}>
      <Text style={{ color: theme.ink, marginBottom: 12, lineHeight: 21 }}>{text}</Text>
      <Button title={t.resaleGoSignIn} onPress={() => router.push(signInHref())} />
    </Panel>
  );
}

/**
 * One line of facts joined by " · ", e.g. cinema and date. Each part is its own Text, so Latin names, seat ids
 * and Arabic words keep their own direction instead of being reordered together, and the row flips in Arabic.
 */
export function Parts({ parts, color, style }: { parts: string[]; color: string; style?: ViewStyle }) {
  return (
    <View style={[styles.parts, style]}>
      {parts.flatMap((part, i) => [
        ...(i ? [<Text key={`dot${i}`} style={{ color }}>·</Text>] : []),
        <Text key={i} style={{ color }}>{part}</Text>,
      ])}
    </View>
  );
}

/** A small rounded label, e.g. a listing's status. */
export function Pill({ label, tone = 'muted' }: { label: string; tone?: 'accent' | 'good' | 'muted' }) {
  const theme = useTheme();
  const color = tone === 'accent' ? theme.accent : tone === 'good' ? theme.good : theme.muted;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

/** Multi-select pills, one per seat; disabled ones show why (e.g. "Listed"). */
export function SeatToggles({ options, selected, onToggle }: {
  options: { id: string; label: string; note?: string; disabled?: boolean }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.toggles}>
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <Pressable key={o.id} disabled={o.disabled} onPress={() => onToggle(o.id)}
            accessibilityRole="checkbox" aria-checked={on} aria-disabled={o.disabled}
            accessibilityLabel={o.note ? `${o.label}, ${o.note}` : o.label}
            style={[styles.toggle, { borderColor: on ? theme.accent : theme.line, backgroundColor: on ? theme.accent : theme.panel }, o.disabled && { opacity: 0.55 }]}>
            <Text style={{ color: on ? theme.accentInk : theme.ink, fontWeight: '800' }}>{on ? `✓ ${o.label}` : o.label}</Text>
            {o.note && <Text style={{ color: on ? theme.accentInk : theme.muted, fontSize: 11, marginTop: 2 }}>{o.note}</Text>}
          </Pressable>
        );
      })}
    </View>
  );
}

/** Shown in place of a ticket's QR code when it can't be used at the entrance. */
export function HiddenCode({ status: raw }: { status: string }) {
  const theme = useTheme();
  const { t } = useI18n();
  const status = raw as Exclude<TicketStatus, 'valid'>;
  return (
    <View style={[styles.hidden, { borderColor: theme.line, backgroundColor: theme.panel }]}>
      <Text style={{ color: status === 'transferred' ? theme.muted : theme.accent, fontWeight: '800', marginBottom: 6 }}>
        {t.resaleTicketStatus[status] ?? raw}
      </Text>
      <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center' }}>{t.resaleCodeHidden[status] ?? ''}</Text>
    </View>
  );
}

/**
 * The resale part of a ticket screen: its owner can sell tickets that are still valid until the show starts,
 * and sees which are listed or sold.
 */
export function TicketResale({ booking }: { booking: Booking }) {
  const theme = useTheme();
  const { t } = useI18n();
  const { account, ready } = useAuth();
  const count = (status: TicketStatus) => booking.tickets.filter((x) => x.status === status).length;
  const listed = count('listed');
  const sold = count('transferred');
  const sellable = count('valid');
  const canSell = sellable > 0 && !showStarted(booking) && booking.showChange?.kind !== 'cancelled';

  if (!ready) return null;
  if (!booking.accountId) {
    return canSell ? <Text style={[styles.note, { color: theme.muted }]}>{t.resaleGuestBooking}</Text> : null;
  }
  if (!account) return canSell || listed ? <SignInPrompt text={t.resaleSignInToSell} style={{ marginTop: 12 }} /> : null;
  if (account.id !== booking.accountId || (!canSell && !listed && !sold)) return null;

  return (
    <Panel style={{ marginTop: 12 }}>
      <Text style={[styles.h2, { color: theme.ink }]}>{t.resaleTitle}</Text>
      {listed > 0 && <Text style={{ color: theme.accent, fontWeight: '700', marginBottom: 4 }}>{t.resaleListedCount(listed)}</Text>}
      {sold > 0 && <Text style={{ color: theme.good, fontWeight: '700', marginBottom: 4 }}>{t.resaleSoldCount(sold)}</Text>}
      {canSell && <Text style={{ color: theme.muted, marginBottom: 12, lineHeight: 20 }}>{t.resaleSellHint}</Text>}
      {canSell && (
        <Button title={t.resaleSellTitle} onPress={() => router.push({ pathname: '/resale/sell/[bookingId]', params: { bookingId: booking.id } })} />
      )}
      {(listed > 0 || sold > 0) && (
        <Button title={t.resaleManage} kind="secondary" onPress={() => router.push('/resale/mine')} style={{ marginTop: canSell ? 10 : 8 }} />
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  parts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 5 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' },
  toggles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggle: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9, minWidth: 72, alignItems: 'center' },
  hidden: { width: 152, height: 152, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: 12, marginTop: 12, lineHeight: 18 },
  h2: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
});
