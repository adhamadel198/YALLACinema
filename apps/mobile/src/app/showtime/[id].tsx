import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '../../api/client';
import type { Arrangement, SeatGroup } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { Button, Line, Message, Panel } from '../../components/ui';
import { egp, showDate } from '../../format';
import { describeSeats } from '../../seats';
import { useTheme } from '../../theme';

const MAX_CHOICES = 8;

/** Seat map: highlights the best matching group and lets the customer pick another qualifying one (BRD 7.1). */
export default function SeatScreen() {
  const t = useTheme();
  const params = useLocalSearchParams<{ id: string; count?: string; arrangement?: Arrangement }>();
  const count = Math.max(1, Number(params.count ?? 2));
  const arrangement = params.arrangement ?? 'either';
  const show = useRequest(() => api.showtime(params.id), [params.id]);
  const map = useRequest(() => api.seats(params.id, count, arrangement), [params.id, count, arrangement]);
  const [chosen, setChosen] = useState<SeatGroup | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

  useEffect(() => setChosen(map.data?.best ?? null), [map.data]);

  const choices = useMemo(() => {
    if (!map.data) return [];
    const rest = map.data.groups.filter((g) => g !== map.data!.best && g.seats.join() !== map.data!.best?.seats.join());
    return [map.data.best, ...rest].filter(Boolean).slice(0, MAX_CHOICES) as SeatGroup[];
  }, [map.data]);
  const matchedSeats = useMemo(() => new Set(map.data?.groups.flatMap((g) => g.seats)), [map.data]);
  const unavailable = useMemo(() => new Set(map.data?.unavailable), [map.data]);
  const picked = new Set(chosen?.seats);

  async function continueToCheckout() {
    if (!chosen) return;
    setBusy(true);
    setNotice(undefined);
    try {
      const hold = await api.hold(params.id, chosen.seats);
      router.push({ pathname: '/checkout/[holdId]', params: { holdId: hold.id } });
    } catch (e) {
      // Someone else took a seat between viewing and holding: refresh and show what is still available.
      if (e instanceof ApiError && e.status === 409) {
        setNotice('Those seats were just taken. The map has been refreshed with what is still available.');
        map.reload();
      } else setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (map.error) return <Message text={`Couldn’t load seats: ${map.error}`} onRetry={map.reload} />;
  if (!map.data || !show.data) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;
  const { rows, cols } = map.data;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: 'Choose seats' }} />
      <Text style={[styles.h1, { color: t.ink }]}>{show.data.movie.title}</Text>
      <Text style={{ color: t.muted }}>{show.data.cinema.name} · {showDate(show.data.startsAt)}</Text>

      <View style={[styles.screen, { backgroundColor: t.accent }]} />
      <Text style={[styles.screenLabel, { color: t.muted }]}>SCREEN</Text>
      <View style={{ gap: 5 }} accessibilityLabel="Seat map">
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={styles.seatRow}>
            <Text style={[styles.rowLabel, { color: t.muted }]}>{String.fromCharCode(65 + r)}</Text>
            {Array.from({ length: cols }, (_, c) => {
              const id = String.fromCharCode(65 + r) + (c + 1);
              const taken = unavailable.has(id);
              const on = picked.has(id);
              const match = !on && matchedSeats.has(id);
              return (
                <Pressable
                  key={id}
                  accessibilityLabel={`Seat ${id}${taken ? ', unavailable' : on ? ', selected' : ''}`}
                  disabled={taken || !match}
                  onPress={() => setChosen(map.data!.groups.find((g) => g.seats.includes(id)) ?? null)}
                  style={[
                    styles.seat,
                    { borderColor: t.line },
                    taken && { backgroundColor: t.muted, borderColor: t.muted, opacity: 0.3 },
                    match && { borderColor: t.accent },
                    on && { backgroundColor: t.accent, borderColor: t.accent },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <Legend color={t.accent} filled label="Your seats" />
        <Legend color={t.accent} label="Also matches" />
        <Legend color={t.line} label="Free" />
        <Legend color={t.muted} filled label="Taken" />
      </View>

      {map.data.groups.length === 0 ? (
        <Message text={`No group of ${count} seats is left at this showtime. Go back to pick another time.`} />
      ) : (
        <>
          <Text style={[styles.h2, { color: t.ink }]}>Matching seats</Text>
          <View style={styles.choices}>
            {choices.map((g, i) => {
              const on = chosen?.seats.join() === g.seats.join();
              return (
                <Pressable key={g.seats.join()} onPress={() => setChosen(g)}
                  style={[styles.chip, { borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accent : 'transparent' }]}>
                  <Text style={{ color: on ? t.accentInk : t.ink, fontWeight: '600' }}>
                    {i === 0 ? 'Best · ' : ''}{describeSeats(g.seats)}{g.type === 'separated' ? ` (${g.pattern.join('+')})` : ''}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {chosen && (
            <Panel style={{ marginTop: 16 }}>
              <Line label={`Tickets ${chosen.seats.length} × ${egp(show.data.price)}`} value={egp(chosen.seats.length * show.data.price)} />
              <Line label="Platform fee · 5 EGP per ticket" value={egp(chosen.seats.length * 5)} />
              <Line label="Total" value={egp(chosen.seats.length * (show.data.price + 5))} strong />
            </Panel>
          )}
          {notice && <Text style={{ color: t.accent, marginTop: 12 }}>{notice}</Text>}
          <Button title="Hold these seats" onPress={continueToCheckout} busy={busy} disabled={!chosen} style={{ marginTop: 16 }} />
        </>
      )}
    </ScrollView>
  );
}

function Legend({ color, filled, label }: { color: string; filled?: boolean; label: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={[styles.legendSwatch, { borderColor: color }, filled && { backgroundColor: color }]} />
      <Text style={{ color: t.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '800', marginTop: 20, marginBottom: 8 },
  screen: { height: 5, borderRadius: 4, marginTop: 24, marginHorizontal: '12%', opacity: 0.7 },
  screenLabel: { textAlign: 'center', fontSize: 10, letterSpacing: 3, marginTop: 4, marginBottom: 14 },
  seatRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowLabel: { width: 16, fontSize: 11, textAlign: 'center' },
  seat: { flex: 1, aspectRatio: 1, maxWidth: 32, borderWidth: 1.5, borderRadius: 6, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 14 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3, borderWidth: 1.5 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
});
