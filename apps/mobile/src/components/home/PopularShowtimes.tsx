import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api } from '../../api/client';
import type { Area, Arrangement, Movie, ShowtimeResult } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { clock } from '../../format';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { useDistanceSort, type Near } from '../../location/useDistanceSort';
import { colors, shadows } from '../../theme';
import { useType } from '../../typography';
import { ChoiceChip } from '../Chips';
import { Button, Spinner, Tag, TextLink } from '../ui';
import { NearSort } from './NearSort';
import { HomeGoldButton, HomeHead } from './parts';

/** Cinemas shown in the section (the live page shows three). */
const CINEMAS = 3;

type CinemaShows = { cinema: ShowtimeResult['cinema']; shows: ShowtimeResult[] };

/** Showtimes grouped by cinema, in the API's order (soonest first). */
function byCinema(results: ShowtimeResult[]): CinemaShows[] {
  const groups = new Map<string, CinemaShows>();
  for (const s of results) {
    const g = groups.get(s.cinema.id);
    if (g) g.shows.push(s);
    else groups.set(s.cinema.id, { cinema: s.cinema, shows: [s] });
  }
  return [...groups.values()];
}

/**
 * "Popular showtimes" (index.html `#showtimes`): today's real showtimes of one film for the seat count,
 * arrangement and area chosen in the search bar, one card per cinema (first three cinemas). "Sort by" puts the
 * nearest cinemas first (device location or an area); the kicker then reads "Near you · Today", as on the live page.
 * `refresh` changes to reload (pull to refresh).
 */
export function PopularShowtimes({ movie, count, arrangement, area, refresh, onChangeMovie }: {
  movie: Movie; count: number; arrangement: Arrangement; area: Area | ''; refresh: number; onChangeMovie: () => void;
}) {
  const { t, lang } = useI18n();
  const { type } = useType();
  const { width } = useLayout();
  const distance = useDistanceSort();
  const { sort, nearArea, lat, lon } = distance.query;
  const shows = useRequest(() => api.showtimes(movie.id, count, arrangement, { area: area || undefined, ...distance.query }),
    [movie.id, count, arrangement, area, lang, refresh, sort, nearArea, lat, lon]);
  const groups = shows.data ? byCinema(shows.data).slice(0, CINEMAS) : [];
  const areaLabel = area ? t.areas[area] : null;
  const nearLabel = distance.near && distance.near !== 'here' ? t.areas[distance.near] : null;
  const kicker = !distance.byDistance ? t.home.todayIn(areaLabel ?? t.home.allCairoGiza)
    : t.home.nearToday(nearLabel, areaLabel === nearLabel ? null : areaLabel);
  return (
    <View>
      <HomeHead size="small" kicker={kicker} title={t.home.popularShowtimes}
        sub={t.home.filmSeats(movie.title, count)}
        action={<TextLink title={t.home.changeMovie} onPress={onChangeMovie} size={width <= 580 ? 12 : 15} />} />
      <NearSort ds={distance} />
      {shows.error ? (
        <View style={{ alignItems: 'flex-start', gap: 12 }}>
          <Text style={type.body}>{t.loadFailed}</Text>
          <Button title={t.tryAgain} onPress={shows.reload} inline size="small" />
        </View>
      ) : !shows.data ? (
        <Spinner />
      ) : groups.length === 0 ? (
        <Text style={[type.body, { color: colors.muted }]}>{t.noShowtimes(count)}</Text>
      ) : (
        <View role="list" aria-busy={shows.loading} style={{ gap: 12, opacity: shows.loading ? 0.6 : 1 }}>
          {groups.map((g) => (
            <ShowCard key={`${movie.id}-${g.cinema.id}`} group={g} movie={movie} count={count} arrangement={arrangement}
              near={distance.byDistance ? distance.near : ''} />
          ))}
        </View>
      )}
    </View>
  );
}

/** One cinema's card (`.show-card`): cinema, tags, its times today, "Find seats" for the chosen time. */
function ShowCard({ group, movie, count, arrangement, near }: {
  group: CinemaShows; movie: Movie; count: number; arrangement: Arrangement; near: Near;
}) {
  const { t } = useI18n();
  const { font } = useType();
  const { width, homeWide } = useLayout();
  const phone = width <= 580;
  const [picked, setPicked] = useState(group.shows[0].showtimeId);
  const show = group.shows.find((s) => s.showtimeId === picked) ?? group.shows[0];
  const match = [show.matches.connected ? t.togetherOptions(show.matches.connected) : null, show.matches.separated ? t.split(show.matches.separated.join('+')) : null]
    .filter(Boolean).join(' · ');
  const from = Math.min(...group.shows.map((s) => s.price));
  // Sorted by distance: "≈ 3.2 km from you" / "from Maadi" after the cinema detail, as search.html does.
  const km = group.shows[0].distanceKm;
  const away = km == null || !near ? null : near === 'here' ? t.kmFromYou(km) : t.kmFromArea(km, t.areas[near]);
  const open = () => router.push({ pathname: '/showtime/[id]', params: { id: show.showtimeId, count: String(count), arrangement } });

  const info = (
    <View style={homeWide ? { flex: 1.4, flexBasis: 0, minWidth: 180 } : { flex: 1, minWidth: 0 }}>
      <Text role="heading" aria-level={3} style={[font(800), { color: colors.ink, fontSize: 16, lineHeight: 24 }]}>{group.cinema.name}</Text>
      <Text style={[font(400), { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 }]}>{away ? `${group.cinema.detail} · ${away}` : group.cinema.detail}</Text>
      {match ? <Text style={[font(400), { color: '#9dcc9e', fontSize: 11, lineHeight: 16.5, marginTop: 7 }]}>● {match}</Text> : null}
    </View>
  );
  const tags = (
    <View style={[styles.tags, homeWide && { flex: 1, flexBasis: 0 }]}>
      {/* The cinema line already names its hall format ("Maadi · Standard · Dolby sound"); say it once. */}
      {group.cinema.detail.includes(show.format) ? null : <Tag label={show.format} />}
      <Tag label={movie.language} />
    </View>
  );
  const times = (
    <View style={homeWide ? { flex: 1.4, flexBasis: 0 } : null}>
      <View role="radiogroup" aria-label={t.home.timesAt(group.cinema.name)} style={styles.times}>
        {group.shows.map((s) => (
          <ChoiceChip key={s.showtimeId} variant="time" label={clock(s.startsAt, t)} selected={s.showtimeId === show.showtimeId}
            onPress={() => setPicked(s.showtimeId)} style={{ borderRadius: 8 }} />
        ))}
      </View>
      <Text style={[font(400), { color: colors.muted, fontSize: 11, lineHeight: 16.5, marginTop: 7 }]}>● {t.home.fromPriceFee(t.egp(from))}</Text>
    </View>
  );
  const book = (
    <HomeGoldButton title={t.home.findSeats} onPress={open} accessibilityLabel={t.home.findSeatsAt(group.cinema.name, clock(show.startsAt, t))}
      style={!homeWide && { alignSelf: 'flex-start' }} />
  );

  return (
    <View role="listitem" style={[styles.card, shadows.card, homeWide ? styles.cardWide : [styles.cardPhone, { padding: phone ? 16 : 18 }]]}>
      {homeWide ? <>{info}{tags}{times}{book}</> : (
        <>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>{info}{book}</View>
          {tags}
          {times}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 16 },
  cardWide: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingVertical: 20, paddingHorizontal: 22 },
  cardPhone: { gap: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
