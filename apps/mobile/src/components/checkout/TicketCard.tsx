import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { Booking } from '../../api/types';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { showStartsAt } from '../../liveShow';
import { describeSeats } from '../../seats';
import { colors } from '../../theme';
import { upper, useType } from '../../typography';
import { HiddenCode } from '../resale';
import { Button, Panel } from '../ui';
import { showWhen } from './when';

// The e-ticket card of the live ticket.html: a black top band with a faint ring, dashed fact rows, one real QR
// code per seat (so each guest can enter separately), the total and the actions.

/** A fact row: muted label (uppercase in English), bold value, dashed rule under it. */
function TicketRow({ label, value, caps, ltr }: { label: string; value: string; caps?: boolean; ltr?: boolean }) {
  const { font, rtl } = useType();
  return (
    <View style={styles.row}>
      <Text style={[font(400), styles.rowText, { color: caps ? colors.muted : colors.ink, flexShrink: 1 }, caps && upper(rtl)]}>{label}</Text>
      <Text selectable style={[font(700), styles.rowText, { color: colors.ink, textAlign: rtl ? 'left' : 'right' }, ltr && { writingDirection: 'ltr' }]}>{value}</Text>
    </View>
  );
}

/** One seat's entry code: the QR on a white frame with a bronze ring, or why it's hidden (listed, sold…). */
function SeatCode({ ticket }: { ticket: Booking['tickets'][number] }) {
  const { t } = useI18n();
  const { font } = useType();
  return (
    <View style={styles.code}>
      {ticket.status === 'valid' ? (
        <View role="img" aria-label={t.checkoutUi.qrLabel(ticket.seat)} style={styles.qrFrame}>
          <QRCode value={ticket.qr} size={126} />
        </View>
      ) : <HiddenCode status={ticket.status} />}
      <Text style={[font(800), { color: colors.ink, fontSize: 13, lineHeight: 20, marginTop: 8 }]}>{t.seat(ticket.seat)}</Text>
    </View>
  );
}

export function TicketCard({ booking: b, style }: { booking: Booking; style?: ViewStyle }) {
  const { t } = useI18n();
  const { type, font, rtl } = useType();
  const { narrow } = useLayout();
  const cancelled = b.showChange?.kind === 'cancelled';
  const pad = narrow ? { padding: 20 } : { paddingVertical: 24, paddingHorizontal: 26 };
  let codes: ReactNode;
  if (cancelled) {
    codes = <Text style={[font(700), styles.void]}>{t.op.codesCancelled}</Text>;
  } else {
    codes = (
      <>
        <View style={styles.codes}>{b.tickets.map((ticket) => <SeatCode key={ticket.id} ticket={ticket} />)}</View>
        <Text style={[type.micro, { textAlign: 'center' }]}>{t.showCodes}</Text>
      </>
    );
  }
  return (
    <Panel padding={0} style={[styles.card, cancelled && { marginTop: 10 }, style]} testID="e-ticket">
      <View style={[styles.top, pad]}>
        {/* The ring sits in the corner away from the text: top right, or top left in Arabic. On the web the page
            flips with CSS direction, which `end` doesn't follow; on iOS/Android `end` follows the app direction. */}
        <View aria-hidden style={[styles.ring, Platform.OS === 'web' ? (rtl ? { left: -25 } : { right: -25 }) : { end: -25 }]} />
        <Text style={[type.eyebrow, { color: colors.ticketAccent }]}>{t.eTicket}</Text>
        <Text role="heading" aria-level={2} style={[font(800, 'display'), styles.title, { letterSpacing: rtl ? 0 : -0.3 }]}>{b.showtime.movie.title}</Text>
        <Text style={[font(400), { color: '#eee5f3', fontSize: 15, lineHeight: 23 }]}>{b.showtime.cinema.name}</Text>
      </View>
      <View style={pad}>
        <TicketRow caps label={t.dateTime} value={showWhen(showStartsAt(b), t, 'dot')} />
        <TicketRow caps ltr label={t.seats} value={describeSeats(b.tickets.map((x) => x.seat))} />
        <TicketRow caps ltr label={t.reference} value={b.reference} />
        {codes}
        <TicketRow label={t.totalPaid} value={t.egp(b.price.total)} />
        <View style={styles.actions}>
          {Platform.OS === 'web' ? <Button kind="soft" inline title={t.checkoutUi.printTicket} onPress={() => window.print()} /> : null}
          <Button inline title={t.findAnother} onPress={() => router.dismissTo('/')} />
        </View>
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%', maxWidth: 590, alignSelf: 'center', overflow: 'hidden', marginVertical: 28 },
  top: { backgroundColor: colors.bg, position: 'relative', overflow: 'hidden' },
  ring: {
    position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 22, borderColor: '#ffffff12',
    top: -52,
  },
  title: { color: '#ffffff', fontSize: 27, lineHeight: 34, marginTop: 8, marginBottom: 3 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 15, paddingVertical: 11,
    borderBottomWidth: 1, borderStyle: 'dashed', borderColor: '#e5dbcf',
  },
  rowText: { fontSize: 15, lineHeight: 23 },
  codes: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginVertical: 17 },
  code: { alignItems: 'center' },
  qrFrame: { backgroundColor: '#ffffff', padding: 9, boxShadow: `0 0 0 1px ${colors.line}` },
  void: { color: colors.link, fontSize: 14, lineHeight: 21, textAlign: 'center', marginVertical: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 20 },
});
