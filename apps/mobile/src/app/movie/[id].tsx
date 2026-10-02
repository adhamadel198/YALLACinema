import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Text, View, type ScrollView } from 'react-native';
import { api } from '../../api/client';
import { MAX_SEATS_PER_BOOKING, type Area, type Arrangement, type ShowtimeFilters, type ShowtimeResult } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { FactTag, FilterGroup, MovieHero, SeatCount, ShowCard, ToggleButton } from '../../components/booking/movie';
import { ageRating, dayName, isToday } from '../../components/booking/when';
import { Chips } from '../../components/Chips';
import { Select } from '../../components/form';
import { Crumbs, Page } from '../../components/page';
import { Button, Eyebrow, H1, H2, H3, Lead, Message, Notice, Panel, Spinner } from '../../components/ui';
import { clock } from '../../format';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { distanceText, DistanceSortFilter, DistanceSortSummary } from '../../location/DistanceSort';
import { useDistanceSort } from '../../location/useDistanceSort';
import { colors } from '../../theme';
import { useType } from '../../typography';

const areas: Area[] = ['Downtown Cairo', 'Maadi', 'New Cairo', '6th of October'];
const arrangements: Arrangement[] = ['either', 'connected', 'separated'];

const timeRanges = {
  any: {},
  early: { to: '17:59' },
  evening: { from: '18:00', to: '20:59' },
  late: { from: '21:00' },
} satisfies Record<string, Pick<ShowtimeFilters, 'from' | 'to'>>;

/**
 * Movie details plus the seat-group showtime search (GET /v1/movies/:id/showtimes), laid out like the live
 * movie.html. Optional route params set the starting search: `count`, `arrangement`, `area`, and
 * `focus=showtimes` to open scrolled to the cinemas.
 */
export default function MovieScreen() {
  const { t, lang } = useI18n();
  const { type, rtl } = useType();
  const { wide } = useLayout();
  const params = useLocalSearchParams<{ id: string; count?: string; arrangement?: string; area?: string; focus?: string }>();
  const id = params.id;
  const [count, setCount] = useState(() => Math.min(MAX_SEATS_PER_BOOKING, Math.max(1, Math.floor(Number(params.count)) || 2)));
  const [arrangement, setArrangement] = useState<Arrangement>(() => (arrangements as string[]).includes(params.arrangement ?? '') ? params.arrangement as Arrangement : 'either');
  const movie = useRequest(() => api.movie(id), [id, lang]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [area, setArea] = useState<Area | ''>(() => (areas as string[]).includes(params.area ?? '') ? params.area as Area : '');
  const [cinemaId, setCinemaId] = useState('');
  const [time, setTime] = useState<keyof typeof timeRanges>('any');
  const distance = useDistanceSort();
  const filters: ShowtimeFilters = { area: area || undefined, cinemaId: cinemaId || undefined, ...timeRanges[time], ...distance.query };
  const activeFilters = [area, cinemaId, time !== 'any', distance.sort === 'distance'].filter(Boolean).length;
  const shows = useRequest(() => api.showtimes(id, count, arrangement, filters), [id, count, arrangement, lang, JSON.stringify(filters)]);
  const cinemas = useRequest(api.cinemas, [lang]);
  // The time picked on each cinema card; a card starts on its soonest show.
  const [picked, setPicked] = useState<Record<string, string>>({});

  const scroll = useRef<ScrollView>(null);
  const showtimesY = useRef(0);
  const focused = useRef(params.focus !== 'showtimes');
  const toShowtimes = () => scroll.current?.scrollTo({ y: Math.max(0, showtimesY.current - 12), animated: true });
  useEffect(() => {
    if (focused.current || !shows.data) return;
    focused.current = true;
    setTimeout(toShowtimes, 50);
  }, [shows.data]);

  // One card per cinema, in the API's order (soonest or nearest first).
  const groups = useMemo(() => {
    const byCinema = new Map<string, { cinema: ShowtimeResult['cinema']; shows: ShowtimeResult[] }>();
    for (const s of shows.data ?? []) {
      const g = byCinema.get(s.cinema.id) ?? byCinema.set(s.cinema.id, { cinema: s.cinema, shows: [] }).get(s.cinema.id)!;
      g.shows.push(s);
    }
    return [...byCinema.values()];
  }, [shows.data]);

  if (movie.error) return <Message text={t.loadFailed} onRetry={movie.reload} />;
  if (!movie.data) return <Spinner style={{ flex: 1 }} />;
  const m = movie.data;
  const arrangementLabel = { either: t.booking.arrEither, connected: t.booking.arrConnected, separated: t.booking.arrSeparated };
  const runtime = t.runtime(Math.floor(m.runtimeMinutes / 60), String(m.runtimeMinutes % 60).padStart(2, '0'));
  const days = new Set((shows.data ?? []).map((s) => s.startsAt.slice(0, 10)));
  const first = shows.data?.[0];
  const listings = days.size === 1 && first ? t.booking.listingsOn(isToday(first.startsAt) ? t.booking.todayWord : dayName(first.startsAt, t)) : t.booking.listings;
  const showLabel = (s: ShowtimeResult) =>
    [`${s.cinema.name} ${clock(s.startsAt, t)}`, s.distanceKm != null && distanceText(t, distance.near, s.distanceKm)].filter(Boolean).join(', ');
  const clearFilters = () => { setArea(''); setCinemaId(''); setTime('any'); distance.reset(); };

  return (
    <Page footer="movie" scrollRef={scroll}>
      <Stack.Screen options={{ title: m.title }} />
      <Crumbs items={[{ label: t.shell.crumbHome, href: '/' }, { label: t.shell.crumbMovies }, { label: m.title }]} />
      {Platform.OS !== 'web' ? <View style={{ height: 16 }} /> : null}

      {/* Details: hero art beside the title, facts, synopsis and credits (stacked on phones). */}
      <View style={wide ? { flexDirection: 'row', alignItems: 'center', gap: 24 } : { gap: 24 }}>
        <View style={wide ? { flex: 1 } : null}><MovieHero movie={m} /></View>
        <View style={wide ? { flex: 1 } : null}>
          <Eyebrow style={{ marginBottom: 7 }}>{t.booking.nowShowing}</Eyebrow>
          <H1>{m.title}</H1>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
            {[m.genre, runtime, ageRating(m.ageRating, rtl), m.language].map((f) => <FactTag key={f} label={f} />)}
          </View>
          <Lead style={{ marginTop: 16 }}>{m.synopsis}</Lead>
          <Text style={[type.body, { color: colors.muted, marginTop: 15 }]}>{m.credits}</Text>
          <Button title={t.booking.chooseShowtime} onPress={toShowtimes} inline style={{ marginTop: 18 }} />
        </View>
      </View>

      {/* How many seats, and how they should sit. Results below update as soon as either changes. */}
      <View style={{ paddingTop: 44 }} onLayout={(e) => { showtimesY.current = e.nativeEvent.layout.y; }}>
        <Eyebrow style={{ marginBottom: 2 }}>{t.booking.findYourSeats}</Eyebrow>
        <H2 style={{ marginBottom: 0 }}>{t.howManySeats}</H2>
        <Text style={[type.body, { color: colors.muted, marginTop: 14, marginBottom: 16 }]}>{t.booking.exactOnly}</Text>
        <Panel padding={16}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
            <SeatCount label={t.booking.numberOfSeats} value={count} max={MAX_SEATS_PER_BOOKING} onChange={setCount} style={{ width: 222 }} />
            <Select label={t.booking.seatArrangement} value={arrangement} onChange={setArrangement}
              options={arrangements.map((a) => ({ value: a, label: arrangementLabel[a] }))} style={{ marginVertical: 0, width: 230 }} />
            <ToggleButton title={activeFilters ? t.booking.refineCount(activeFilters) : t.booking.refine} expanded={filtersOpen}
              onPress={() => setFiltersOpen((o) => !o)} />
          </View>
          {count >= MAX_SEATS_PER_BOOKING ? <Text style={[type.caption, { marginTop: 8 }]}>{t.maxSeats(MAX_SEATS_PER_BOOKING)}</Text> : null}
        </Panel>

        {filtersOpen && (
          <Panel padding={18} style={{ marginTop: 12 }}>
            <H3 style={[{ fontSize: 18, lineHeight: 24 }]}>{t.booking.refineTitle}</H3>
            <FilterGroup label={t.area}>
              <Chips variant="time" label={t.area} value={area} onChange={(a) => { setArea(a); setCinemaId(''); }}
                options={[{ value: '' as const, label: t.booking.allAreas }, ...areas.map((a) => ({ value: a, label: t.areas[a] }))]} />
            </FilterGroup>
            <FilterGroup label={t.cinema}>
              <Chips variant="time" label={t.cinema} value={cinemaId} onChange={setCinemaId}
                options={[{ value: '', label: t.booking.allCinemas }, ...(cinemas.data ?? []).filter((c) => !area || c.area === area).map((c) => ({ value: c.id, label: c.name }))]} />
            </FilterGroup>
            <FilterGroup label={t.booking.showtimeLabel}>
              <Chips variant="time" label={t.booking.showtimeLabel} value={time} onChange={setTime}
                options={[{ value: 'any', label: t.anyTime }, { value: 'early', label: t.beforeSix }, { value: 'evening', label: t.sixToNine }, { value: 'late', label: t.afterNine }]} />
            </FilterGroup>
            <DistanceSortFilter ds={distance} />
            {activeFilters > 0 && <Button kind="link" size="small" title={t.clearFilters} onPress={clearFilters} style={{ marginTop: 10 }} />}
          </Panel>
        )}

        {/* The matching cinemas and times (live: "Pick a cinema & time"). */}
        <Eyebrow style={{ marginTop: 27, marginBottom: 2 }}>{listings}</Eyebrow>
        <H2 style={{ marginBottom: 0 }}>{t.booking.pickCinemaTime}</H2>
        {groups.length > 0 && (
          <Text style={[type.body, { color: colors.muted, marginTop: 14 }]}>
            {t.booking.resultsLine(groups.length, count, arrangementLabel[arrangement])}
          </Text>
        )}
        {!filtersOpen && <DistanceSortSummary ds={distance} onChange={() => setFiltersOpen(true)} />}
        <View style={{ marginTop: 10 }}>
          {shows.loading && !shows.data ? <Spinner /> : null}
          {shows.error ? <Message text={t.loadFailed} onRetry={shows.reload} /> : null}
          {shows.data?.length === 0 && (
            <Panel padding={30} style={{ alignItems: 'center', marginVertical: 6 }}>
              <H3 style={{ textAlign: 'center' }}>{t.booking.noExactTitle}</H3>
              <Text style={[type.small, { color: colors.muted, textAlign: 'center', marginTop: 6, maxWidth: 520 }]}>{t.booking.noExactBody}</Text>
            </Panel>
          )}
          <View style={shows.loading ? { opacity: 0.6 } : null}>
            {groups.map(({ cinema, shows: list }) => {
              const selected = list.find((s) => s.showtimeId === picked[cinema.id]) ?? list[0];
              return (
                <ShowCard key={cinema.id} cinema={cinema} shows={list} selected={selected} timeLabel={showLabel}
                  distance={selected.distanceKm != null ? distanceText(t, distance.near, selected.distanceKm) : undefined}
                  onSelect={(sid) => setPicked((p) => ({ ...p, [cinema.id]: sid }))}
                  onFindSeats={() => router.push({ pathname: '/showtime/[id]', params: { id: selected.showtimeId, count: String(count), arrangement } })} />
              );
            })}
          </View>
        </View>
        <Notice style={{ marginTop: 6 }}>{t.booking.recheckNotice}</Notice>
      </View>
    </Page>
  );
}
