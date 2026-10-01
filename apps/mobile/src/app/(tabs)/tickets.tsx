import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { api } from '../../api/client';
import { myBookingIds } from '../../api/myBookings';
import { useRequest } from '../../api/useRequest';
import { Placeholder } from '../../components/Placeholder';
import { Panel } from '../../components/ui';
import { showDate } from '../../format';
import { describeSeats } from '../../seats';
import { useTheme } from '../../theme';

/** Bookings made on this device. Resale listings join this tab when resale is migrated. */
export default function Tickets() {
  const t = useTheme();
  const bookings = useRequest(async () => {
    const ids = await myBookingIds();
    // A booking the API no longer knows (the dev server keeps data in memory) is skipped.
    const found = await Promise.all(ids.map((id) => api.booking(id).catch(() => null)));
    return found.filter((b) => b !== null);
  }, []);
  useFocusEffect(useCallback(() => bookings.reload(), [bookings.reload]));

  if (!bookings.data) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;
  if (!bookings.data.length) return <Placeholder title="No tickets yet" body="Tickets you book on this device appear here." />;

  return (
    <FlatList
      data={bookings.data}
      keyExtractor={(b) => b.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: item.id } })}>
          <Panel>
            <Text style={[styles.title, { color: t.ink }]}>{item.showtime.movie.title}</Text>
            <Text style={{ color: t.muted }}>{item.showtime.cinema.name}</Text>
            <Text style={{ color: t.ink, marginTop: 6 }}>
              {showDate(item.showtime.startsAt)} · Seats {describeSeats(item.tickets.map((x) => x.seat))}
            </Text>
            <Text style={{ color: t.muted, fontSize: 12, marginTop: 4 }}>{item.reference}</Text>
          </Panel>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({ title: { fontSize: 17, fontWeight: '800' } });
