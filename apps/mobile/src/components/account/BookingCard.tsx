import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type PressableStateCallbackType } from 'react-native';
import type { Booking } from '../../api/types';
import { clock, showDate } from '../../format';
import { useI18n } from '../../i18n';
import type { Strings } from '../../i18n/strings';
import { useLayout } from '../../layout';
import { showStartsAt } from '../../liveShow';
import { describeSeats } from '../../seats';
import { colors } from '../../theme';
import { useType } from '../../typography';
import { AlertPill, Badge, Button, Panel, StatusPill } from '../ui';
import { Facts } from './parts';

type Hoverable = PressableStateCallbackType & { hovered?: boolean };

/** "Fri 2 Oct · 7:45 PM": the show's day, and its time the way the live site writes it. */
const when = (iso: string, t: Strings) => `${showDate(iso, t).split(' · ')[0]} · ${clock(iso, t)}`;

/**
 * One booking on the My Tickets tab, in the live resale listing card's shape (`.listing-card`): title with its
 * pills, a facts line and the reference on the start side; the amount paid and "View ticket" on the end side
 * (under it, spread apart, on phones). The whole card opens the ticket.
 */
export function BookingCard({ booking }: { booking: Booking }) {
  const { t } = useI18n();
  const { type, font } = useType();
  const { wide } = useLayout();
  const open = () => router.push({ pathname: '/ticket/[id]', params: { id: booking.id } });
  const listed = booking.tickets.filter((x) => x.status === 'listed').length;
  const sold = booking.tickets.filter((x) => x.status === 'transferred').length;
  const change = booking.showChange?.kind;

  return (
    // The card is a large tap target; screen readers and keyboards use its "View ticket" button.
    <Pressable onPress={open} accessible={false} focusable={false} testID="booking-card">
      {(state: Hoverable) => (
        <Panel padding={17} style={[styles.card, wide && styles.cardWide, state.hovered && { borderColor: colors.lineDark }]}>
          <View style={wide && styles.main}>
            <View style={styles.titleRow}>
              <Text style={[font(800), { color: colors.ink, fontSize: 15, lineHeight: 23 }]}>{booking.showtime.movie.title}</Text>
              {change === 'cancelled' ? <AlertPill label={t.op.ticketBadge.cancelled} />
                : change === 'changed' ? <Badge label={t.op.ticketBadge.changed} /> : null}
              {listed ? <StatusPill label={t.accountUi.onResale(listed)} /> : null}
              {sold ? <Badge label={t.accountUi.soldOnResale(sold)} /> : null}
            </View>
            <Facts parts={[
              booking.showtime.cinema.name,
              when(showStartsAt(booking), t),
              t.seatsList(describeSeats(booking.tickets.map((x) => x.seat))),
            ]} />
            <Text selectable style={[type.micro, styles.reference]}>{booking.reference}</Text>
          </View>
          <View style={[styles.end, !wide && styles.endPhone]}>
            <Text style={[font(700), styles.amount]}>{t.egp(booking.price.total)}</Text>
            <Button size="small" inline title={t.accountUi.viewTicket} onPress={open}
              accessibilityLabel={`${t.accountUi.viewTicket}, ${booking.showtime.movie.title}, ${booking.reference}`} />
          </View>
        </Panel>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  cardWide: { flexDirection: 'row', alignItems: 'center' },
  main: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 9, rowGap: 4 },
  reference: { writingDirection: 'ltr', alignSelf: 'flex-start', marginTop: 2 },
  end: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  endPhone: { justifyContent: 'space-between' },
  amount: { color: colors.ink, fontSize: 15, lineHeight: 23 },
});
