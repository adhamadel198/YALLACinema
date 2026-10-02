import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';
import type { Movie, ShowtimeResult } from '../../api/types';
import { clock } from '../../format';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { backgroundImage, colors } from '../../theme';
import { useType } from '../../typography';
import { ChoiceChip } from '../Chips';
import { Badge, Button, Panel } from '../ui';

// Pieces of the movie page (live movie.html): the hero art, the fact tags, the gold search toggle and the cinema
// cards with their show times.

type Hoverable = PressableStateCallbackType & { hovered?: boolean };

/**
 * The movie page's hero art (`.heroPoster`): a gold radial glow, the film's symbol drawn large, and the audience
 * rating badge in the bottom corner. Mirrored in Arabic.
 */
export function MovieHero({ movie }: { movie: Pick<Movie, 'poster' | 'audienceScore'> }) {
  const { t } = useI18n();
  const { rtl } = useType();
  const { phone } = useLayout();
  const glow = `radial-gradient(circle at ${rtl ? 28 : 72}% 32%, #d7b96f, #816534 32%, #292319 68%, #11100e)`;
  return (
    // The art is drawn left to right with explicit sides (like Poster), so it mirrors the same way on web and native.
    <View style={[styles.hero, backgroundImage(glow)]}>
      <Text aria-hidden style={[styles.glyph, phone ? styles.glyphPhone : null, rtl ? { left: phone ? '4%' : '12%' } : { right: phone ? '4%' : '12%' }]}>{movie.poster.symbol}</Text>
      {/* Opposite corner to the symbol: bottom left, bottom right in Arabic (Badge pins its own alignSelf). */}
      <Badge label={t.booking.ratingBadge(movie.audienceScore.toFixed(1))} style={{ alignSelf: rtl ? 'flex-end' : 'flex-start' }} />
    </View>
  );
}

/** A movie fact on the details page ("Drama", "2h 08m", "16+"): the live page's light tag. */
export function FactTag({ label }: { label: string }) {
  const { font } = useType();
  return (
    <View style={styles.tag}>
      <Text numberOfLines={1} style={[font(400), styles.tagText]}>{label}</Text>
    </View>
  );
}

/** A gold button (the live `.btn`) that opens and closes a panel, so it reports aria-expanded. */
export function ToggleButton({ title, expanded, onPress, style }: { title: string; expanded: boolean; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const { type } = useType();
  return (
    <Pressable accessibilityRole="button" aria-expanded={expanded} onPress={onPress}
      style={(s: Hoverable) => {
        const lift = s.hovered || s.pressed;
        return [styles.gold, { boxShadow: lift ? '0 6px 0 #89672f' : '0 4px 0 #89672f' } as ViewStyle, lift && !s.pressed ? { transform: [{ translateY: -2 }] } : null, style];
      }}>
      <Text style={[type.button, { color: colors.onGold }]}>{title}</Text>
    </Pressable>
  );
}

/**
 * "Number of seats": a cream field like the live number input (49 high, so it lines up with the arrangement
 * select), with − and + inside it.
 */
export function SeatCount({ label, value, max, onChange, style }: {
  label: string; value: number; max: number; onChange: (n: number) => void; style?: StyleProp<ViewStyle>;
}) {
  const { t } = useI18n();
  const { type, font } = useType();
  const step = (d: number, sign: string, a11y: string) => {
    const off = d < 0 ? value <= 1 : value >= max;
    return (
      <Pressable onPress={() => onChange(value + d)} disabled={off} accessibilityRole="button" accessibilityLabel={a11y} aria-disabled={off} hitSlop={4}
        style={(s: Hoverable) => [styles.stepBtn, s.hovered && !off && { backgroundColor: '#f1e7d0' }, off && { opacity: 0.35 }]}>
        <Text style={[font(700), { color: colors.fieldInk, fontSize: 19, lineHeight: 22 }]}>{sign}</Text>
      </Pressable>
    );
  };
  return (
    <View style={[{ gap: 6 }, style]}>
      <Text style={type.label}>{label}</Text>
      <View style={styles.count}>
        {step(-1, '−', t.shell.decrease(label))}
        <Text role="status" aria-live="polite" accessibilityLabel={`${label}: ${value}`}
          style={[font(400), { flex: 1, color: colors.fieldInk, fontSize: 15, lineHeight: 20, textAlign: 'center' }]}>{value}</Text>
        {step(1, '+', t.shell.increase(label))}
      </View>
    </View>
  );
}

/** A labelled group inside the "Refine your search" panel. */
export function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  const { type } = useType();
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={[type.label, { marginBottom: 7 }]}>{label}</Text>
      {children}
    </View>
  );
}

/**
 * One cinema with its matching show times (`.showcard`): name, detail and availability on the start side, the
 * time buttons in the middle, "Find seats" at the end. On phones the times wrap under the name.
 */
export function ShowCard({ cinema, shows, selected, onSelect, onFindSeats, distance, timeLabel }: {
  cinema: ShowtimeResult['cinema'];
  shows: ShowtimeResult[];
  selected: ShowtimeResult;
  onSelect: (id: string) => void;
  onFindSeats: () => void;
  /** "1.2 km from you", when sorting by distance. */
  distance?: string;
  /** Accessibility label of a time button. */
  timeLabel: (show: ShowtimeResult) => string;
}) {
  const { t } = useI18n();
  const { type, font } = useType();
  const { wide } = useLayout();
  const m = selected.matches;
  // What the selected show offers for this search: one pill each, so they wrap rather than run under the button.
  const availability = [m.connected ? t.togetherOptions(m.connected) : null, m.separated ? t.split(m.separated.join('+')) : null]
    .filter((a): a is string => !!a);

  const info = (
    <View style={{ flex: wide ? 1.3 : 1, minWidth: 0 }}>
      <Text role="heading" aria-level={3} style={[font(700), styles.cinema]}>{cinema.name}</Text>
      <Text style={[type.body, { color: colors.muted }]}>{[cinema.detail, distance].filter(Boolean).join(' · ')}</Text>
      {availability.length ? (
        <View style={styles.pills}>{availability.map((a, i) => <Badge key={a} label={i ? a : `●  ${a}`} />)}</View>
      ) : null}
    </View>
  );
  const times = (
    <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
      <View role="radiogroup" aria-label={cinema.name} style={styles.times}>
        {shows.map((s) => (
          <ChoiceChip key={s.showtimeId} variant="time" label={clock(s.startsAt, t)} selected={s.showtimeId === selected.showtimeId}
            onPress={() => onSelect(s.showtimeId)} accessibilityLabel={timeLabel(s)} style={{ margin: 3 }} textStyle={styles.timeText} />
        ))}
      </View>
      <Text style={[type.micro, { marginTop: 3 }]}>{t.booking.showPrice(t.egp(selected.price), selected.format)}</Text>
    </View>
  );
  const action = (
    <Button kind="primary" size="small" inline title={t.booking.findSeats} onPress={onFindSeats}
      accessibilityLabel={t.booking.findSeatsAt(cinema.name, clock(selected.startsAt, t))} style={{ alignSelf: 'center' }} />
  );

  return (
    <Panel padding={18} style={[styles.card, !wide && { gap: 12 }]}>
      {wide ? (
        <View style={styles.row}>{info}{times}{action}</View>
      ) : (
        <>
          <View style={[styles.row, { gap: 12 }]}>{info}{action}</View>
          {times}
        </>
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 330, borderRadius: 22, padding: 28, overflow: 'hidden', justifyContent: 'flex-end', backgroundColor: '#292319',
    direction: 'ltr',
  },
  glyph: {
    position: 'absolute', top: '11%', fontSize: 190, lineHeight: 190, color: '#ffffff88',
    textShadowColor: '#39233d44', textShadowOffset: { width: 0, height: 14 }, textShadowRadius: 20,
  },
  glyphPhone: { fontSize: 140, lineHeight: 140 },
  tag: { backgroundColor: '#f2ece4', borderRadius: 7, paddingVertical: 5, paddingHorizontal: 9 },
  tagText: { color: '#655f72', fontSize: 11, lineHeight: 15 },
  gold: {
    minHeight: 49, paddingVertical: 13, paddingHorizontal: 19, borderRadius: 12, backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
    ...(Platform.OS === 'web' ? ({ transitionProperty: 'transform, box-shadow', transitionDuration: '150ms' } as ViewStyle) : null),
  },
  count: {
    flexDirection: 'row', alignItems: 'center', minHeight: 49, paddingHorizontal: 5, borderWidth: 1, borderColor: colors.fieldLine,
    borderRadius: 10, backgroundColor: colors.fieldBg, direction: 'ltr',
  },
  stepBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  card: { paddingHorizontal: 20, marginVertical: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  cinema: { fontSize: 17.5, lineHeight: 25, color: colors.ink, marginBottom: 3 },
  times: { flexDirection: 'row', flexWrap: 'wrap' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 },
  timeText: { fontSize: 15, lineHeight: 21 },
});
