import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, ApiError } from '../../api/client';
import { MAX_SEATS_PER_BOOKING, type Arrangement, type SeatGroup } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { SeatGrid, SeatLegend } from '../../components/SeatGrid';
import { Button, Message } from '../../components/ui';
import { showDate } from '../../format';
import { useI18n } from '../../i18n';
import { seatPattern, tapSeat, type Selection } from '../../seatChoice';
import { describeSeats } from '../../seats';
import { useTheme } from '../../theme';

const MAX_CHOICES = 8;

/**
 * Seat map (BRD 7.1, 7.2). Starts with the best matching group picked, so holding it is one tap.
 * The customer can pick another matching group, or tap any free seats to build their own selection
 * of exactly the number they asked for, together or scattered.
 */
export default function SeatScreen() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; count?: string; arrangement?: Arrangement }>();
  // The count arrives in the URL, so keep it to a whole number the API accepts.
  const count = Math.min(MAX_SEATS_PER_BOOKING, Math.max(1, Math.floor(Number(params.count)) || 2));
  const arrangement = params.arrangement ?? 'either';
  const show = useRequest(() => api.showtime(params.id), [params.id, lang]);
  const map = useRequest(() => api.seats(params.id, count, arrangement), [params.id, count, arrangement]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string>();

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
    setNotice(full ? t.allPicked(count) : undefined);
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
        setNotice(selection?.source === 'suggested' || !lost.length ? t.seatsJustTaken : t.seatsGone(describeSeats(lost), lost.length));
        map.reload();
      } else setNotice(e instanceof ApiError && e.status === 429 ? t.tooManyHolds : t.genericError);
    } finally {
      setBusy(false);
    }
  }

  if (map.error || show.error) return <Message text={t.loadFailed} onRetry={() => { map.reload(); show.reload(); }} />;
  if (!map.data || !show.data || !selection) return <ActivityIndicator style={{ flex: 1 }} color={theme.accent} />;
  const { rows, cols, aisles } = map.data;
  const price = show.data.price;
  const pattern = seatPattern(seats, aisles);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }}>
        <Text style={[styles.h1, { color: theme.ink }]}>{show.data.movie.title}</Text>
        <Text style={{ color: theme.muted }}>{show.data.cinema.name} · {showDate(show.data.startsAt, t)}</Text>
        {canBook && (
          <Text style={[styles.hint, { color: theme.ink }]}>
            {selection.source === 'suggested' && seats.length ? t.suggestedHint : t.tapHint}
          </Text>
        )}

        <SeatGrid rows={rows} cols={cols} aisles={aisles} unavailable={unavailable} picked={canBook ? picked : new Set()} matched={matchedSeats} onSeat={onSeat} />
        <SeatLegend />

        {!canBook ? (
          <Message text={t.notEnoughSeats(count)} />
        ) : map.data.groups.length === 0 ? (
          <Text style={{ color: theme.muted, marginTop: 16 }}>{t.noMatchPickYourself}</Text>
        ) : (
          <>
            <Text style={[styles.h2, { color: theme.ink }]}>{t.matchingSeats}</Text>
            <View style={styles.choices}>
              {choices.map((g, i) => {
                const on = sameSeats(g);
                return (
                  <Pressable key={g.seats.join()} onPress={() => choose({ seats: g.seats, source: i === 0 ? 'suggested' : 'group' })}
                    accessibilityRole="radio" aria-checked={on}
                    style={[styles.chip, { borderColor: on ? theme.accent : theme.line, backgroundColor: on ? theme.accent : 'transparent' }]}>
                    <Text style={{ color: on ? theme.accentInk : theme.ink, fontWeight: '600' }}>
                      {i === 0 ? `${t.best} · ` : ''}{describeSeats(g.seats)}{g.type === 'separated' ? ` (${g.pattern.join('+')})` : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {canBook && (
        // Always in view while tapping seats: what is picked, what it costs, and the hold button.
        <View style={[styles.footer, { backgroundColor: theme.panel, borderColor: theme.line, paddingBottom: 12 + insets.bottom }]}>
          <View style={styles.footerRow}>
            <View style={{ flex: 1 }} accessibilityLiveRegion="polite">
              <Text style={{ color: theme.muted, fontSize: 12 }}>{t.yourSeats} · {t.pickedOf(seats.length, count)}</Text>
              {seats.length ? (
                <View style={styles.picked}>
                  <Text style={[styles.pickedSeats, { color: theme.ink }]}>{describeSeats(seats)}</Text>
                  {seats.length > 1 && (
                    <Text style={{ color: pattern.length > 1 ? theme.muted : theme.good, fontSize: 13 }}>
                      {pattern.length === 1 ? t.togetherTag : pattern.length <= 4 ? t.split(pattern.join('+')) : t.splitPlaces(pattern.length)}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={{ color: theme.ink, marginTop: 2 }}>{t.noSeatsPicked}</Text>
              )}
            </View>
            {seats.length > 0 && (
              <Pressable onPress={() => choose({ seats: [], source: 'own' })} accessibilityRole="button" accessibilityLabel={t.clearSeatsLabel}
                hitSlop={8} style={[styles.clear, { borderColor: theme.line }]}>
                <Text style={{ color: theme.ink, fontWeight: '700' }}>✕  {t.clearSeats}</Text>
              </Pressable>
            )}
          </View>
          {seats.length > 0 && (
            <View style={[styles.footerRow, { marginTop: 6 }]}>
              <Text style={{ color: theme.muted, flex: 1, fontSize: 13 }}>{t.priceLine(seats.length, t.egp(price), t.egp(seats.length * 5))}</Text>
              <Text style={{ color: theme.ink, fontWeight: '800' }}>{t.total} {t.egp(seats.length * (price + 5))}</Text>
            </View>
          )}
          {notice && <Text style={{ color: theme.accent, marginTop: 8 }}>{notice}</Text>}
          <Button title={seats.length === count ? t.holdSeats : t.pickMore(count - seats.length, seats.length > 0)} onPress={continueToCheckout}
            busy={busy} disabled={seats.length !== count} style={{ marginTop: 10 }} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 18, fontWeight: '800', marginTop: 20, marginBottom: 8 },
  hint: { fontSize: 14, lineHeight: 20, marginTop: 12 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  footer: { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  picked: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8, marginTop: 2 },
  pickedSeats: { fontSize: 17, fontWeight: '800' },
  clear: { minHeight: 40, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
});
