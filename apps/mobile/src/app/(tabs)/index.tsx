import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { RefreshControl, ScrollView, Text, View, type LayoutChangeEvent } from 'react-native';
import { api } from '../../api/client';
import type { Area, Arrangement, Movie } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { Chips } from '../../components/Chips';
import { Hero } from '../../components/home/Hero';
import { HowItWorks } from '../../components/home/HowItWorks';
import { MovieGrid } from '../../components/home/MovieGrid';
import { HomeHead } from '../../components/home/parts';
import { PopularShowtimes } from '../../components/home/PopularShowtimes';
import { SearchBar } from '../../components/home/SearchBar';
import { useColumnStyle } from '../../components/page';
import { SiteFooter } from '../../components/shell/Footer';
import { Message, Spinner, TextLink } from '../../components/ui';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { colors } from '../../theme';
import { useType } from '../../typography';

type Section = 'movies' | 'shows';

/**
 * The Movies tab, laid out like the live home page (index.html): hero, search bar, "Now showing" with genre chips
 * and the poster grid, "Popular showtimes" (real showtimes for the first film on screen), "How it works", footer.
 * The search bar's seat count, arrangement and area go with every tap to a film or a showtime.
 */
export default function Discovery() {
  const { t, lang } = useI18n();
  const { type } = useType();
  const { width } = useLayout();
  const column = useColumnStyle(true);
  const movies = useRequest(api.movies, [lang]);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('');
  const [count, setCount] = useState(2);
  const [arrangement, setArrangement] = useState<Arrangement>('either');
  const [area, setArea] = useState<Area | ''>('');
  const [refresh, setRefresh] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const offsets = useRef<Record<Section, number>>({ movies: 0, shows: 0 });

  const list = movies.data ?? [];
  // Genres come localized from the API, so a genre picked in the other language falls back to "All films".
  const genres = [...new Set(list.map((m) => m.genre))];
  const activeGenre = genres.includes(genre) ? genre : '';
  const term = query.trim().toLocaleLowerCase();
  const visible = list.filter((m) => (!activeGenre || m.genre === activeGenre) && (!term || m.title.toLocaleLowerCase().includes(term)));
  // Popular showtimes follow the first film on screen (narrowed by search or genre), else the first film.
  const featured = visible[0] ?? list[0];

  const scrollTo = (section: Section) => scroll.current?.scrollTo({ y: offsets.current[section], animated: true });

  const openMovie = (m: Movie) => router.push({
    pathname: '/movie/[id]',
    params: { id: m.id, count: String(count), arrangement, ...(area ? { area } : {}) },
  });

  // "Find matching shows": one film matches → open it; no text → today's showtimes; otherwise the filtered grid.
  const submit = () => {
    if (!term) scrollTo('shows');
    else if (visible.length === 1) openMovie(visible[0]);
    else scrollTo('movies');
  };

  const showAll = () => { setQuery(''); setGenre(''); };

  return (
    <ScrollView
      ref={scroll}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={movies.loading && !!movies.data} tintColor={colors.gold}
        onRefresh={() => { movies.reload(); setRefresh((n) => n + 1); }} />}
    >
      <Hero onExplore={() => scrollTo('movies')} onShows={() => scrollTo('shows')} />
      <View style={[column, { marginTop: -28 }]}>
        <SearchBar query={query} onQuery={setQuery} area={area} onArea={setArea} count={count} onCount={setCount}
          arrangement={arrangement} onArrangement={setArrangement} onSubmit={submit} />
      </View>

      <View onLayout={(e: LayoutChangeEvent) => { offsets.current.movies = e.nativeEvent.layout.y; }} style={[column, { paddingTop: width <= 580 ? 37 : 48, paddingBottom: 25 }]}>
        <HomeHead kicker={t.home.pickYourStory} title={t.home.nowShowingTitle}
          action={<TextLink title={t.home.allMovies} arrow onPress={showAll} size={width <= 580 ? 12 : 15} />} />
        {movies.error && !movies.data ? (
          <Message text={t.loadFailed} onRetry={movies.reload} />
        ) : !movies.data ? (
          <Spinner />
        ) : (
          <>
            <Chips scroll label={t.home.genreLabel} value={activeGenre} onChange={setGenre} style={{ marginBottom: 18 }}
              options={[{ value: '', label: t.home.allFilms }, ...genres.map((g) => ({ value: g, label: g }))]} />
            <MovieGrid movies={visible} onOpen={openMovie} />
            {visible.length === 0 ? <Text role="status" style={[type.body, { color: colors.muted }]}>{t.home.noMovies}</Text> : null}
          </>
        )}
      </View>

      <View onLayout={(e: LayoutChangeEvent) => { offsets.current.shows = e.nativeEvent.layout.y; }} style={[column, { paddingTop: 43, paddingBottom: 72 }]}>
        {featured ? (
          <PopularShowtimes movie={featured} count={count} arrangement={arrangement} area={area} refresh={refresh}
            onChangeMovie={() => scrollTo('movies')} />
        ) : null}
      </View>

      <HowItWorks />
      <SiteFooter preset="home" home />
    </ScrollView>
  );
}
