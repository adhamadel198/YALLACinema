import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../api/client';
import { useRequest } from '../../api/useRequest';
import { Button, Line, Message, Panel } from '../../components/ui';
import { egp, showDate } from '../../format';
import { describeSeats } from '../../seats';
import { useTheme } from '../../theme';

/** Scannable e-ticket (BRD 6 step 9). One QR per seat so each guest can enter separately. */
export default function TicketScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const booking = useRequest(() => api.booking(id), [id]);

  if (booking.error) return <Message text={`Couldn’t load this booking: ${booking.error}`} onRetry={booking.reload} />;
  if (!booking.data) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;
  const b = booking.data;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: 'Your ticket' }} />
      <Text style={[styles.ok, { color: t.good }]}>✓ Booking confirmed</Text>
      <Text style={[styles.h1, { color: t.ink }]}>You’re going to the movies.</Text>

      <Panel style={{ marginTop: 16 }}>
        <Text style={[styles.kicker, { color: t.accent }]}>YALLA · E-TICKET</Text>
        <Text style={[styles.title, { color: t.ink }]}>{b.showtime.movie.title}</Text>
        <Text style={{ color: t.muted, marginBottom: 12 }}>{b.showtime.cinema.name}</Text>
        <Line label="Date & time" value={showDate(b.showtime.startsAt)} />
        <Line label="Seats" value={describeSeats(b.tickets.map((x) => x.seat))} />
        <Line label="Booking reference" value={b.reference} strong />
        <Line label="Total paid" value={egp(b.price.total)} />

        <View style={styles.qrs}>
          {b.tickets.map((ticket) => (
            <View key={ticket.id} style={styles.qrItem}>
              <View style={styles.qrFrame}>
                <QRCode value={ticket.qr} size={132} />
              </View>
              <Text style={{ color: t.ink, fontWeight: '800', marginTop: 6 }}>Seat {ticket.seat}</Text>
            </View>
          ))}
        </View>
        <Text style={{ color: t.muted, fontSize: 12, textAlign: 'center' }}>Show these codes at the cinema entrance.</Text>
      </Panel>

      <Text style={{ color: t.muted, fontSize: 12, marginVertical: 12 }}>
        Sent to {b.holder.email} once email delivery is connected. {b.showtime.cinema.cancellationPolicy}
      </Text>
      <Button title="Find another movie" kind="secondary" onPress={() => router.dismissTo('/')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ok: { fontWeight: '800', fontSize: 14 },
  h1: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  qrs: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginVertical: 16 },
  qrItem: { alignItems: 'center' },
  qrFrame: { backgroundColor: '#fff', padding: 10, borderRadius: 12 },
});
