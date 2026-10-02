import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError } from '../../api/client';
import { MAX_SEATS_PER_BOOKING, type Arrangement, type SeatGroup } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { ageRating, showWhen } from '../../components/booking/when';
import { ChoiceChip } from '../../components/Chips';
import { Columns, Crumbs, Page, PageIntro, Steps } from '../../components/page';
import { ScreenArc, SeatGrid, SeatLegend } from '../../components/SeatGrid';
import { Button, H2, Line, Message, Panel, Spinner, StatusText } from '../../components/ui';
import { clock } from '../../format';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { seatPattern, tapSeat, type Selection } from '../../seatChoice';
import { describeSeats } from '../../seats';
import { colors, shadows } from '../../theme';
import { useType } from '../../typography';

const MAX_CHOICES = 8;

/** Keeps a run of seat ids in its own direction inside Arabic text. */
const isolate = (s: string) => `⁨${s}⁩`;

/**
 * Seat map (BRD 7.1, 7.2), laid out like the live seats.html: the map and its group choices on one side, the
 * booking summary on the other. Starts with the best matching group picked, so holding it is one tap. The customer
 * can pick another matching group, or tap any free seats to build their own selection of exactly the number they
 * asked for, together or scattered. On phones a bar at the bottom keeps the total and the button in view.
 */
export default function SeatScreen() {
  const { t, lang } = useI18n();
  const { type, font, rtl } = useType();
  const { wide, narrow } = useLayout();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; count?: string; arrangement?: Arrangement }>();
  // The count arrives in the URL, so keep it to a whole number the API accepts.
  const count = Math.min(MAX_SEATS_PER_BOOKING, Math.max(1, Math.floor(Number(params.count)) || 2));
  const arrangement = params.arrangement ?? 'either';
  const show = useRequest(() => api.showtime(params.id), [params.id, lang]);
  const map = useRequest(() => api.seats(params.id, count, arrangement), [params.id, count, arrangement]);
  // Only for the age rating in the summary; the summary works without it.
  const movieId = show.data?.movie.id;
  const movie = useRequest(() => (movieId ? api.movie(movieId) : Promise.resolve(null)), [movieId, lang]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'info' | 'danger' }>();

  // Fresh availability: keep the suggestion current, or keep the customer's own seats that are still free.
  useEffect(() => {
    const data = map.data;
    if (!data) return;
    setSelection((sel) => {
      if (!sel || sel.source === 'suggested' || sel.seats.length > count) return { seats: data.best?.seats ?? [], source: 'suggested' };
      const gone = new Set(data.unavailable);
      const kept = sel.seats.filter((s) => !gone.has(s));
      return kept.length === sel.seats.length ? sel : { seats: kept, source: 'own' };
    });
  }, [map.data, count]);

  const choices = useMemo(() => {
    if (!map.data) return [];
    const rest = map.data.groups.filter((g) => g !== map.data!.best && g.seats.join() !== map.data!.best?.seats.join());
    return [map.data.best, ...rest].filter(Boolean).slice(0, MAX_CHOICES) as SeatGroup[];
  }, [map.data]);
  const matchedSeats = useMemo(() => new Set(map.data?.groups.flatMap((g) => g.seats)), [map.data]);
  const unavailable = useMemo(() => new Set(map.data?.unavailable), [map.data]);
  const seats = selection?.seats ?? [];
  const picked = useMemo(() => new Set(seats), [seats]);
  const sameSeats = (g: SeatGroup) => g.seats.length === seats.length && g.seats.every((s) => picked.has(s));
  // Free choice needs only enough free seats, wherever they are.
  const canBook = !!map.data && map.data.rows * map.data.cols - unavailable.size >= count;

  function onSeat(id: string) {
    if (!selection || !canBook) return;
    const { selection: next, full } = tapSeat(selection, id, count);
    setSelection(next);
    setNotice(full ? { text: t.allPicked(count), tone: 'info' } : undefined);
  }

  function choose(next: Selection) {
    setSelection(next);
    setNotice(undefined);
  }

  async function continueToCheckout() {
    if (seats.length !== count) return;
    setBusy(true);
    setNotice(undefined);
    try {
      const hold = await api.hold(params.id, seats);
      router.push({ pathname: '/checkout/[holdId]', params: { holdId: hold.id } });
    } catch (e) {
      // Someone else took a seat between viewing and holding: refresh, and say which seats went.
      if (e instanceof ApiError && e.status === 409) {
        const lost = Array.isArray(e.body.unavailable) ? (e.body.unavailable as string[]) : [];
        setNotice({ text: selection?.source === 'suggested' || !lost.length ? t.seatsJustTaken : t.seatsGone(describeSeats(lost), lost.length), tone: 'danger' });
        map.reload();
      } else setNotice({ text: e instanceof ApiError && e.status === 429 ? t.tooManyHolds : t.genericError, tone: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  if (map.error || show.error) return <Message text={t.loadFailed} onRetry={() => { map.reload(); show.reload(); }} />;
  if (!map.data || !show.data || !selection) return <Spinner style={{ flex: 1 }} />;
  const { rows, cols, aisles } = map.data;
  const s = show.data;
  const price = s.price;
  const n = seats.length;
  const pattern = seatPattern(seats, aisles);
  const together = pattern.length === 1;
  const patternTag = together ? t.togetherTag : pattern.length <= 4 ? t.splitTag(pattern.join('+')) : t.splitPlaces(pattern.length);
  const buttonTitle = n === count ? t.booking.continueCheckout : t.pickMore(count - n, n > 0);
  const groupLabel = (g: SeatGroup, best: boolean) => [
    best ? t.booking.bestMatch : null,
    isolate(g.type === 'separated' ? describeSeats(g.seats).split(', ').join(' + ') : describeSeats(g.seats)),
    g.type === 'separated' ? t.splitTag(g.pattern.join('+')) : t.togetherTag,
  ].filter(Boolean).join(' · ');
  const centred = { textAlign: 'center' as const, alignSelf: 'center' as const };
  const status = notice ? <StatusText tone={notice.tone} style={{ marginTop: 11 }}>{notice.text}</StatusText> : null;

  const seatPanel = (
    <Panel padding={narrow ? 8 : 22} style={narrow ? { paddingVertical: 15 } : null}>
      <ScreenArc />
      {canBook ? (
        <>
          <Text style={[type.body, centred, { marginBottom: 10 }]}>
            {map.data.groups.length ? t.booking.qualifyingGroups(map.data.groups.length, count) : t.noMatchPickYourself}
          </Text>
          {choices.length > 0 && (
            <View role="radiogroup" aria-label={t.matchingSeats} style={styles.choices}>
              {choices.map((g, i) => (
                <ChoiceChip key={g.seats.join()} variant="choice" selected={sameSeats(g)} label={groupLabel(g, i === 0)}
                  onPress={() => choose({ seats: g.seats, source: i === 0 ? 'suggested' : 'group' })} />
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={{ alignItems: 'center', marginBottom: 20, gap: 8 }}>
          <Text role="alert" style={[type.body, centred]}>{t.booking.noLongerAvailable}</Text>
          <Text style={[type.caption, centred, { maxWidth: 420 }]}>{t.notEnoughSeats(count)}</Text>
          <Button kind="soft" size="small" inline title={t.booking.refreshShowtimes} style={{ alignSelf: 'center' }}
            onPress={() => router.dismissTo({ pathname: '/movie/[id]', params: { id: s.movie.id, count: String(count), arrangement } })} />
        </View>
      )}

      <SeatGrid rows={rows} cols={cols} aisles={aisles} unavailable={unavailable} picked={canBook ? picked : new Set()} matched={matchedSeats} onSeat={onSeat} />
      <SeatLegend />
      {canBook && (
        <Text style={[type.caption, centred, { marginTop: 12, maxWidth: 470 }]}>
          {selection.source === 'suggested' && n ? t.suggestedHint : t.tapHint}
        </Text>
      )}
      <Button kind="link" size="small" title={t.booking.refreshAvailability} onPress={map.reload} busy={map.loading}
        textStyle={{ fontSize: 12 }} style={{ marginTop: 8, marginHorizontal: narrow ? 7 : 0 }} />
    </Panel>
  );

  // As on the live summary, every line but the total is in the muted colour: the facts bold, the sums plain.
  const plain = (text: string) => <Text style={[type.small, { color: colors.muted, lineHeight: 19.5 }]}>{text}</Text>;
  const fact = (text: string) => <Text style={[font(700), { color: colors.muted, fontSize: 13, lineHeight: 19.5 }]}>{text}</Text>;
  const seatsValue = n ? (
    <Text style={[font(700), { color: colors.muted, fontSize: 13, lineHeight: 19.5 }]}>
      {describeSeats(seats)}
      {n > 1 ? <Text style={[font(400), { color: together ? colors.good : colors.muted }]}>{`  ${patternTag}`}</Text> : null}
    </Text>
  ) : plain(t.booking.chooseOnMap);

  const summary = (
    <Panel padding={20}>
      <View style={styles.summaryHead}>
        <H2 small style={{ marginBottom: 6, flexShrink: 1 }}>{t.booking.bookingSummary}</H2>
        {n > 0 && canBook && wide ? (
          <Button kind="link" size="small" title={`✕  ${t.clearSeats}`} accessibilityLabel={t.clearSeatsLabel}
            onPress={() => choose({ seats: [], source: 'own' })} textStyle={{ fontSize: 12 }} style={{ paddingVertical: 4 }} />
        ) : null}
      </View>
      <Line label={s.movie.title} value={fact(movie.data ? ageRating(movie.data.ageRating, rtl) : '')} />
      <Line label={s.cinema.name} value={fact(clock(s.startsAt, t))} />
      <Line label={t.seats} value={seatsValue} />
      <Line label={t.ticketsLine(n, t.egp(price))} value={plain(t.egp(n * price))} />
      <Line label={t.booking.platformFee} hint={t.booking.feeTimesTickets} value={plain(t.egp(n * 5))} />
      <Line total label={t.total} value={t.egp(n * (price + 5))} />
      <Text style={[type.micro, { marginTop: 10 }]}>{t.booking.heldNote}</Text>
      {wide && canBook ? (
        <>
          <Button title={buttonTitle} onPress={continueToCheckout} busy={busy} disabled={n !== count} style={{ marginTop: 12 }} />
          {/* Room for a hold error, kept even when empty so the panel doesn't jump (the live `.inlineNotice`). */}
          <View style={{ minHeight: 29 }}>{status}</View>
        </>
      ) : null}
    </Panel>
  );

  return (
    <View style={{ flex: 1 }}>
      <Page footer="seats">
        <Crumbs items={[
          { label: t.shell.crumbHome, href: '/' },
          { label: s.movie.title, href: { pathname: '/movie/[id]', params: { id: s.movie.id } } },
          { label: t.chooseSeats },
        ]} />
        <PageIntro eyebrow={t.booking.yourMovieNight} title={t.booking.chooseYourSeats} lead={t.booking.seatsMeta(count, s.cinema.name, showWhen(s.startsAt, t))} />
        <Steps step={1} />
        <Columns ratio={[1.2, 0.8]} endMin={260} stickyEnd>{[
          <View key="map">{seatPanel}</View>,
          <View key="summary">{summary}</View>,
        ]}</Columns>
      </Page>

      {!wide && canBook && (
        // Phones: always in view while tapping seats — what is picked, what it costs, and the button.
        <View style={[styles.bar, shadows.tabBar, { paddingBottom: 12 + insets.bottom }]}>
          <View style={styles.barRow}>
            <View style={{ flex: 1 }} accessibilityLiveRegion="polite">
              <Text style={type.caption}>{t.yourSeats} · {t.pickedOf(n, count)}</Text>
              {n ? (
                <View style={styles.picked}>
                  <Text style={[font(800), { color: colors.ink, fontSize: 17, lineHeight: 23 }]}>{describeSeats(seats)}</Text>
                  {n > 1 && <Text style={[type.small, { color: together ? colors.good : colors.muted }]}>{patternTag}</Text>}
                </View>
              ) : (
                <Text style={[type.small, { marginTop: 2 }]}>{t.noSeatsPicked}</Text>
              )}
            </View>
            {n > 0 && (
              <Button kind="soft" size="small" inline title={`✕  ${t.clearSeats}`} accessibilityLabel={t.clearSeatsLabel}
                onPress={() => choose({ seats: [], source: 'own' })} />
            )}
          </View>
          {n > 0 && (
            <View style={[styles.barRow, { marginTop: 6 }]}>
              <Text style={[type.small, { color: colors.muted, flex: 1 }]}>{t.priceLine(n, t.egp(price), t.egp(n * 5))}</Text>
              <Text style={[font(800), { color: colors.ink, fontSize: 15 }]}>{t.total} {t.egp(n * (price + 5))}</Text>
            </View>
          )}
          {status}
          <Button title={buttonTitle} onPress={continueToCheckout} busy={busy} disabled={n !== count} style={{ marginTop: 10 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, maxWidth: 500, width: '100%', alignSelf: 'center', marginTop: 5, marginBottom: 20 },
  summaryHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 },
  bar: { backgroundColor: colors.panel, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 16, paddingTop: 12 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  picked: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8, marginTop: 2 },
});
