import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { useRequest } from '../../api/useRequest';
import { Poster } from '../../components/Poster';
import { useTheme } from '../../theme';

const hours = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;

/** Movie discovery: the first screen wired end to end to the API (GET /v1/movies). */
export default function Discovery() {
  const t = useTheme();
  const { data, error, loading, reload } = useRequest(api.movies, []);

  if (loading && !data) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;
  if (error)
    return (
      <View style={styles.center}>
        <Text style={{ color: t.ink, marginBottom: 12 }}>Couldn’t load movies: {error}</Text>
        <Pressable onPress={reload} style={[styles.button, { backgroundColor: t.accent }]}>
          <Text style={{ color: t.accentInk, fontWeight: '800' }}>Try again</Text>
        </Pressable>
      </View>
    );

  return (
    <FlatList
      data={data}
      keyExtractor={(m) => m.id}
      numColumns={2}
      contentContainerStyle={styles.list}
      columnWrapperStyle={{ gap: 12 }}
      refreshing={loading}
      onRefresh={reload}
      ListHeaderComponent={
        <View style={{ marginBottom: 16 }}>
          <Text style={[styles.kicker, { color: t.accent }]}>NOW SHOWING · CAIRO & GIZA</Text>
          <Text style={[styles.h1, { color: t.ink }]}>Pick a movie, we’ll find the seats.</Text>
        </View>
      }
      renderItem={({ item }) => (
          <Pressable style={styles.card} accessibilityLabel={`${item.title}, ${item.genre}`}
            onPress={() => router.push({ pathname: '/movie/[id]', params: { id: item.id } })}>
            <Poster movie={item} style={{ height: 230 }} />
            <Text style={[styles.title, { color: t.ink }]} numberOfLines={1}>{item.title}</Text>
            <Text style={[styles.meta, { color: t.muted }]}>
              {item.genre} · {hours(item.runtimeMinutes)} · {item.ageRating}
            </Text>
            {item.fromPrice != null && (
              <Text style={[styles.meta, { color: t.good }]}>{item.showtimeCount} showtimes · from {item.fromPrice} EGP</Text>
            )}
          </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  button: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  card: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', marginTop: 8 },
  meta: { fontSize: 12, marginTop: 2 },
});
