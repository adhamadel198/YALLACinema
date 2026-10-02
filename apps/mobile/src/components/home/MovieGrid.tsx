import { Pressable, Text, View, type PressableStateCallbackType } from 'react-native';
import type { Movie } from '../../api/types';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { colors } from '../../theme';
import { useType } from '../../typography';
import { Poster } from '../Poster';

/** "Drama · 2h 08m · 16+" */
export function movieMeta(m: Movie, t: ReturnType<typeof useI18n>['t']) {
  return `${m.genre} · ${t.runtime(Math.floor(m.runtimeMinutes / 60), String(m.runtimeMinutes % 60).padStart(2, '0'))} · ${m.ageRating}`;
}

/**
 * The "Now showing" poster grid (index.html `.movies`): 5 columns on desktop, 3 at ≤850px, 2 at ≤580px, every film
 * shown. Rows are flex rows, so columns share the width the page really has (a scrollbar can't push a card down).
 */
export function MovieGrid({ movies, onOpen }: { movies: Movie[]; onOpen: (m: Movie) => void }) {
  const { width, homeCols } = useLayout();
  const gap = width <= 580 ? 10 : 17;
  const posterHeight = width <= 580 ? 235 : width <= 850 ? 250 : 276;
  const rows: Movie[][] = [];
  for (let i = 0; i < movies.length; i += homeCols) rows.push(movies.slice(i, i + homeCols));
  return (
    <View role="list" style={{ gap }}>
      {rows.map((row) => (
        <View key={row[0].id} style={{ flexDirection: 'row', gap }}>
          {row.map((m) => <MovieCard key={m.id} movie={m} height={posterHeight} onPress={() => onOpen(m)} />)}
          {Array.from({ length: homeCols - row.length }, (_, i) => <View key={`pad-${i}`} style={{ flex: 1 }} />)}
        </View>
      ))}
    </View>
  );
}

function MovieCard({ movie, height, onPress }: { movie: Movie; height: number; onPress: () => void }) {
  const { t } = useI18n();
  const { font } = useType();
  const meta = movieMeta(movie, t);
  const times = movie.fromPrice != null && movie.showtimeCount != null ? t.showtimesFrom(movie.showtimeCount, t.egp(movie.fromPrice)) : null;
  return (
    <View role="listitem" style={{ flex: 1, minWidth: 0 }}>
      <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={t.home.movieCard(movie.title, [meta, times].filter(Boolean).join(', '))}>
        {(state: PressableStateCallbackType & { hovered?: boolean }) => (
          <>
            <Poster movie={movie} hovered={state.hovered} style={{ height }} />
            <View style={{ paddingVertical: 11, paddingHorizontal: 2 }}>
              <Text numberOfLines={1} style={[font(700), { color: colors.ink, fontSize: 15, lineHeight: 22.5 }]}>{movie.title}</Text>
              <Text numberOfLines={1} style={[font(400), { color: colors.mutedSoft, fontSize: 12, lineHeight: 18, marginTop: 4 }]}>{meta}</Text>
              {times ? <Text numberOfLines={1} style={[font(400), { color: colors.good, fontSize: 12, lineHeight: 18, marginTop: 2 }]}>{times}</Text> : null}
            </View>
          </>
        )}
      </Pressable>
    </View>
  );
}
