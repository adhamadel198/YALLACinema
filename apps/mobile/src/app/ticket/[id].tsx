import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../api/client';
import { useRequest } from '../../api/useRequest';
import { HiddenCode, TicketResale } from '../../components/resale';
import { Button, Line, Message, Panel } from '../../components/ui';
import { showDate } from '../../format';
import { useI18n } from '../../i18n';
import { describeSeats } from '../../seats';
import { useTheme } from '../../theme';

/** Scannable e-ticket (BRD 6 step 9). One QR per seat so each guest can enter separately. */
export default function TicketScreen() {
  const theme = useTheme();
  const { t, lang, rtl } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useRequest(() => api.booking(id), [id, lang]);
  // Coming back from selling or managing listings shows the tickets' new status.
  useFocusEffect(useCallback(() => booking.reload(), [booking.reload]));

  if (booking.error) return <Message text={t.loadFailed} onRetry={booking.reload} />;
  if (!booking.data) return <ActivityIndicator style={{ flex: 1 }} color={theme.accent} />;
  const b = booking.data;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={[styles.ok, { color: theme.good }]}>{t.bookingConfirmed}</Text>
      <Text style={[styles.h1, { color: theme.ink }, rtl && styles.noTracking]}>{t.goingToMovies}</Text>

      <Panel style={{ marginTop: 16 }}>
        <Text style={[styles.kicker, { color: theme.accent }, rtl && styles.noTracking]}>{t.eTicket}</Text>
        <Text style={[styles.title, { color: theme.ink }]}>{b.showtime.movie.title}</Text>
        <Text style={{ color: theme.muted, marginBottom: 12 }}>{b.showtime.cinema.name}</Text>
        <Line label={t.dateTime} value={showDate(b.showtime.startsAt, t)} />
        <Line label={t.seats} value={describeSeats(b.tickets.map((x) => x.seat))} />
        <Line label={t.reference} value={b.reference} strong />
        <Line label={t.totalPaid} value={t.egp(b.price.total)} />

        <View style={styles.qrs}>
          {b.tickets.map((ticket) => (
            <View key={ticket.id} style={styles.qrItem}>
              {ticket.status === 'valid' ? (
                <View style={styles.qrFrame}>
                  <QRCode value={ticket.qr} size={132} />
                </View>
              ) : <HiddenCode status={ticket.status} />}
              <Text style={{ color: theme.ink, fontWeight: '800', marginTop: 6 }}>{t.seat(ticket.seat)}</Text>
            </View>
          ))}
        </View>
        <Text style={{ color: theme.muted, fontSize: 12, textAlign: 'center' }}>{t.showCodes}</Text>
      </Panel>
      <TicketResale booking={b} />

      <Text style={{ color: theme.muted, fontSize: 12, marginVertical: 12 }}>
        {t.emailNote(b.holder.email)} {b.showtime.cinema.cancellationPolicy}
      </Text>
      <Button title={t.findAnother} kind="secondary" onPress={() => router.dismissTo('/')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ok: { fontWeight: '800', fontSize: 14 },
  h1: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  noTracking: { letterSpacing: 0 }, // Arabic is cursive; letter spacing breaks the joins.
  title: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  qrs: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginVertical: 16 },
  qrItem: { alignItems: 'center' },
  qrFrame: { backgroundColor: '#fff', padding: 10, borderRadius: 12 },
});
