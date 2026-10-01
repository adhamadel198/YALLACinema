import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import type { Arrangement } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { Poster } from '../../components/Poster';
import { Message } from '../../components/ui';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme';

/** Movie details plus the seat-group showtime search (GET /v1/movies/:id/showtimes). */
export default function MovieScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [count, setCount] = useState(2);
  const [arrangement, setArrangement] = useState<Arrangement>('either');
  const movie = useRequest(() => api.movie(id), [id, lang]);
  const shows = useRequest(() => api.showtimes(id, count, arrangement), [id, count, arrangement, lang]);
  const arrangements: { value: Arrangement; label: string }[] = [
    { value: 'either', label: t.either },
    { value: 'connected', label: t.together },
    { value: 'separated', label: t.separated },
  ];

  if (movie.error) return <Message text={t.loadFailed} onRetry={movie.reload} />;
  if (!movie.data) return <ActivityIndicator style={{ flex: 1 }} color={theme.accent} />;
  const m = movie.data;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: m.title }} />
      <Poster movie={m} style={{ height: 260 }} />
      <Text style={[styles.h1, { color: theme.ink }]}>{m.title}</Text>
      <Text style={{ color: theme.muted }}>{m.genre} · {m.ageRating} · {m.language}</Text>
      <Text style={[styles.body, { color: theme.ink }]}>{m.synopsis}</Text>
      <Text style={{ color: theme.muted, fontSize: 13 }}>{m.credits}</Text>

      <Text style={[styles.h2, { color: theme.ink }]}>{t.howManySeats}</Text>
      <View style={styles.row}>
        <Pressable accessibilityLabel={t.fewerSeats} onPress={() => setCount((c) => Math.max(1, c - 1))} style={[styles.step, { borderColor: theme.line }]}>
          <Text style={{ color: theme.ink, fontSize: 18 }}>−</Text>
        </Pressable>
        <Text style={[styles.count, { color: theme.ink }]}>{count}</Text>
        <Pressable accessibilityLabel={t.moreSeats} onPress={() => setCount((c) => c + 1)} style={[styles.step, { borderColor: theme.line }]}>
          <Text style={{ color: theme.ink, fontSize: 18 }}>+</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        {arrangements.map((a) => {
          const on = a.value === arrangement;
          return (
            <Pressable key={a.value} onPress={() => setArrangement(a.value)}
              style={[styles.chip, { borderColor: on ? theme.accent : theme.line, backgroundColor: on ? theme.accent : 'transparent' }]}>
              <Text style={{ color: on ? theme.accentInk : theme.ink, fontWeight: '600' }}>{a.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {shows.loading && <ActivityIndicator color={theme.accent} style={{ marginTop: 16 }} />}
      {shows.error && <Text style={{ color: theme.ink, marginTop: 16 }}>{t.loadFailed}</Text>}
      {shows.data?.length === 0 && <Text style={{ color: theme.muted, marginTop: 16 }}>{t.noShowtimes(count)}</Text>}
      {shows.data?.map((s) => (
        <Pressable key={s.showtimeId}
          onPress={() => router.push({ pathname: '/showtime/[id]', params: { id: s.showtimeId, count: String(count), arrangement } })}
          accessibilityLabel={`${s.cinema.name} ${s.localTime}`} style={[styles.show, { backgroundColor: theme.panel, borderColor: theme.line }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.ink, fontWeight: '800' }}>{s.cinema.name}</Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>{s.cinema.detail}</Text>
            <Text style={{ color: theme.good, fontSize: 12, marginTop: 4 }}>
              {[s.matches.connected ? t.togetherOptions(s.matches.connected) : null,
                s.matches.separated ? t.split(s.matches.separated.join('+')) : null].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: theme.ink, fontWeight: '800', fontSize: 16 }}>{s.localTime}</Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>{t.plusFee(t.egp(s.price))}</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: '800', marginTop: 16, letterSpacing: -0.6 },
  h2: { fontSize: 20, fontWeight: '800', marginTop: 28, marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 24, marginVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  step: { width: 40, height: 40, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  count: { fontSize: 20, fontWeight: '800', minWidth: 32, textAlign: 'center' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  show: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 10, gap: 12 },
});
