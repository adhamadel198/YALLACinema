import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import { useRequest } from '../../api/useRequest';
import { Poster } from '../../components/Poster';
import { Message } from '../../components/ui';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme';

/** Movie discovery: the first screen wired end to end to the API (GET /v1/movies). */
export default function Discovery() {
  const theme = useTheme();
  const { t, lang, rtl } = useI18n();
  const { data, error, loading, reload } = useRequest(api.movies, [lang]);

  if (loading && !data) return <ActivityIndicator style={{ flex: 1 }} color={theme.accent} />;
  if (error) return <Message text={t.loadFailed} onRetry={reload} />;

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
          <Text style={[styles.kicker, { color: theme.accent }, rtl && styles.noTracking]}>{t.nowShowing}</Text>
          <Text style={[styles.h1, { color: theme.ink }, rtl && styles.noTracking]}>{t.heroTitle}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.card} accessibilityLabel={`${item.title}, ${item.genre}`}
          onPress={() => router.push({ pathname: '/movie/[id]', params: { id: item.id } })}>
          <Poster movie={item} style={{ height: 230 }} />
          <Text style={[styles.title, { color: theme.ink }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.meta, { color: theme.muted }]}>
            {item.genre} · {t.runtime(Math.floor(item.runtimeMinutes / 60), String(item.runtimeMinutes % 60).padStart(2, '0'))} · {item.ageRating}
          </Text>
          {item.fromPrice != null && item.showtimeCount != null && (
            <Text style={[styles.meta, { color: theme.good }]}>{t.showtimesFrom(item.showtimeCount, t.egp(item.fromPrice))}</Text>
          )}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 16 },
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8, marginTop: 4 },
  noTracking: { letterSpacing: 0 }, // Arabic is cursive; letter spacing breaks the joins.
  card: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', marginTop: 8 },
  meta: { fontSize: 12, marginTop: 2 },
});
