import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import type { Arrangement } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { Poster } from '../../components/Poster';
import { useTheme } from '../../theme';

const arrangements: { value: Arrangement; label: string }[] = [
  { value: 'either', label: 'Either' },
  { value: 'connected', label: 'Together' },
  { value: 'separated', label: 'Separated' },
];

/** Movie details plus the seat-group showtime search (GET /v1/movies/:id/showtimes). Seat map and checkout are next. */
export default function MovieScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [count, setCount] = useState(2);
  const [arrangement, setArrangement] = useState<Arrangement>('either');
  const movie = useRequest(() => api.movie(id), [id]);
  const shows = useRequest(() => api.showtimes(id, count, arrangement), [id, count, arrangement]);

  if (!movie.data) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;
  const m = movie.data;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: m.title }} />
      <Poster movie={m} style={{ height: 260 }} />
      <Text style={[styles.h1, { color: t.ink }]}>{m.title}</Text>
      <Text style={{ color: t.muted }}>{m.genre} · {m.ageRating} · {m.language}</Text>
      <Text style={[styles.body, { color: t.ink }]}>{m.synopsis}</Text>
      <Text style={{ color: t.muted, fontSize: 13 }}>{m.credits}</Text>

      <Text style={[styles.h2, { color: t.ink }]}>How many seats do you need?</Text>
      <View style={styles.row}>
        <Pressable accessibilityLabel="Fewer seats" onPress={() => setCount((c) => Math.max(1, c - 1))} style={[styles.step, { borderColor: t.line }]}>
          <Text style={{ color: t.ink, fontSize: 18 }}>−</Text>
        </Pressable>
        <Text style={[styles.count, { color: t.ink }]}>{count}</Text>
        <Pressable accessibilityLabel="More seats" onPress={() => setCount((c) => c + 1)} style={[styles.step, { borderColor: t.line }]}>
          <Text style={{ color: t.ink, fontSize: 18 }}>+</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        {arrangements.map((a) => {
          const on = a.value === arrangement;
          return (
            <Pressable key={a.value} onPress={() => setArrangement(a.value)}
              style={[styles.chip, { borderColor: on ? t.accent : t.line, backgroundColor: on ? t.accent : 'transparent' }]}>
              <Text style={{ color: on ? t.accentInk : t.ink, fontWeight: '600' }}>{a.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {shows.loading && <ActivityIndicator color={t.accent} style={{ marginTop: 16 }} />}
      {shows.error && <Text style={{ color: t.ink, marginTop: 16 }}>Couldn’t load showtimes: {shows.error}</Text>}
      {shows.data?.length === 0 && (
        <Text style={{ color: t.muted, marginTop: 16 }}>
          No showtimes can seat {count} {arrangement === 'connected' ? 'together' : ''} right now. Try a different number or arrangement.
        </Text>
      )}
      {shows.data?.map((s) => (
        <View key={s.showtimeId} style={[styles.show, { backgroundColor: t.panel, borderColor: t.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.ink, fontWeight: '800' }}>{s.cinema.name}</Text>
            <Text style={{ color: t.muted, fontSize: 12 }}>{s.cinema.detail}</Text>
            <Text style={{ color: t.good, fontSize: 12, marginTop: 4 }}>
              {[s.matches.connected ? `${s.matches.connected} together ${s.matches.connected === 1 ? 'option' : 'options'}` : null,
                s.matches.separated ? `split ${s.matches.separated.join('+')}` : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: t.ink, fontWeight: '800', fontSize: 16 }}>{s.localTime}</Text>
            <Text style={{ color: t.muted, fontSize: 12 }}>{s.price} EGP + 5 fee</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '800', marginTop: 16, letterSpacing: -0.6 },
  h2: { fontSize: 20, fontWeight: '800', marginTop: 28, marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22, marginVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  step: { width: 40, height: 40, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  count: { fontSize: 20, fontWeight: '800', minWidth: 32, textAlign: 'center' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  show: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 10, gap: 12 },
});
