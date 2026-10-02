import { Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useI18n } from '../i18n';
import { useLayout } from '../layout';
import { colors } from '../theme';
import { tracking, useType } from '../typography';

// The live seats.html seat map: a curved screen, cream seats with their numbers, gold for your seats and a gold
// outline on seats that also match the search.

type SeatState = 'free' | 'matched' | 'picked' | 'taken';

/** How each kind of seat is drawn, shared by the map and its legend so they always agree. */
const LOOK: Record<SeatState, { box: ViewStyle; ink: string }> = {
  free: { box: { backgroundColor: colors.seatFree, borderColor: colors.seatFreeLine }, ink: colors.seatInk },
  // The live `.match-alt`: a 3px gold outline, 1px off the seat.
  matched: { box: { backgroundColor: colors.seatFree, borderColor: colors.seatFreeLine, outlineColor: colors.seatAlso, outlineStyle: 'solid', outlineWidth: 3, outlineOffset: 1 }, ink: colors.seatInk },
  picked: { box: { backgroundColor: colors.seatPicked, borderColor: colors.seatPickedLine }, ink: colors.onGold },
  // Dimmed so a taken seat never reads as a free one: every free seat can be picked here, not only matching ones.
  taken: { box: { backgroundColor: colors.seatTaken, borderColor: colors.seatTaken, opacity: 0.5 }, ink: colors.seatInk },
};

type Props = {
  rows: number;
  cols: number;
  /** Seat numbers with a walkway after them. */
  aisles?: number[];
  /** Taken or held by someone else: shown, never pickable. */
  unavailable: Set<string>;
  picked: Set<string>;
  /** Seats in a group that matches the search (BRD 7.1), outlined. */
  matched: Set<string>;
  onSeat: (id: string) => void;
};

/** The curved screen at the top of the map (`.screenbar`): a gold arc, thickest in the middle, over "SCREEN". */
export function ScreenArc() {
  const { t } = useI18n();
  const { font, rtl } = useType();
  return (
    <View aria-hidden style={styles.screen}>
      <Svg width="100%" height={15} viewBox="0 0 100 15" preserveAspectRatio="none">
        <Path d="M0 15 A50 15 0 0 1 100 15 A50 10 0 0 0 0 15 Z" fill={colors.ticketAccent} />
      </Svg>
      {/* Centred by its box, not textAlign: on the web the app's right-to-left text rule overrides textAlign. */}
      <Text style={[font(400), styles.screenLabel, { letterSpacing: tracking(3, rtl) }]}>{t.screen}</Text>
    </View>
  );
}

/**
 * The hall, seat by seat. It keeps its physical layout in both languages: seat 1 is always on the left facing the
 * screen. Each seat shows its number; row letters run down both sides. Each seat's whole cell is its tap target
 * (38 points tall), so seats stay easy to hit at phone width.
 */
export function SeatGrid({ rows, cols, aisles = [], unavailable, picked, matched, onSeat }: Props) {
  const { t } = useI18n();
  const { font } = useType();
  const { narrow } = useLayout();
  const walkways = new Set(aisles.filter((a) => a > 0 && a < cols));
  const cellPad = narrow ? 2.5 : 4.5;
  const seatText: TextStyle = { ...font(400), fontSize: narrow ? 8 : 9, lineHeight: narrow ? 10 : 12 };
  const columns = (cell: (c: number) => ReactNode) =>
    Array.from({ length: cols }, (_, c) => (
      <Fragment key={c}>
        {cell(c)}
        {walkways.has(c + 1) && <View style={styles.aisle} />}
      </Fragment>
    ));

  return (
    <View style={[styles.hall, { maxWidth: narrow ? 440 : 560 }]} accessibilityLabel={t.seatMap}>
      {Array.from({ length: rows }, (_, r) => {
        const letter = String.fromCharCode(65 + r);
        const rowLabel = (
          <View style={styles.rowLabel} aria-hidden>
            <Text style={[font(700), styles.label]}>{letter}</Text>
          </View>
        );
        return (
          <View key={letter} style={styles.row}>
            {rowLabel}
            {columns((c) => {
              const id = letter + (c + 1);
              const taken = unavailable.has(id);
              const on = !taken && picked.has(id);
              const state: SeatState = taken ? 'taken' : on ? 'picked' : matched.has(id) ? 'matched' : 'free';
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={t.seatLabel(id, taken ? 'taken' : '')}
                  aria-checked={on}
                  aria-disabled={taken}
                  disabled={taken}
                  onPress={() => onSeat(id)}
                  style={[styles.cell, { paddingHorizontal: cellPad }]}
                >
                  {({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => (
                    <View style={[styles.seat, { height: narrow ? 26 : 30 }, LOOK[state].box, hovered && !taken && !on && { borderColor: colors.gold }, pressed && { opacity: 0.6 }]}>
                      <Text style={[seatText, { color: LOOK[state].ink }]}>{c + 1}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
            {rowLabel}
          </View>
        );
      })}
    </View>
  );
}

/** Key to the seat map: your seats, also matches, available, unavailable. */
export function SeatLegend() {
  const { t } = useI18n();
  const { type } = useType();
  const items: [SeatState, string][] = [['picked', t.yourSeats], ['matched', t.alsoMatches], ['free', t.booking.available], ['taken', t.booking.unavailable]];
  return (
    <View style={styles.legend}>
      {items.map(([state, label]) => (
        <View key={state} style={styles.legendItem}>
          <View style={[styles.swatch, LOOK[state].box, state === 'matched' && { outlineWidth: 2, outlineOffset: 1, marginHorizontal: 3 }]} />
          <Text style={type.micro}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: '76%', alignSelf: 'center', alignItems: 'center', marginTop: 6, marginBottom: 29 },
  screenLabel: { color: colors.screenLabel, fontSize: 10, lineHeight: 15, marginTop: 1 },
  hall: { direction: 'ltr', width: '100%', alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { width: 18, alignItems: 'center' },
  label: { fontSize: 10, color: colors.screenLabel },
  // The cell is the tap target: full column width and 38 points tall, with the drawn seat inside it.
  cell: { flex: 1, height: 38, alignItems: 'stretch', justifyContent: 'center' },
  seat: {
    borderWidth: 1, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  aisle: { width: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 15, rowGap: 6, justifyContent: 'center', marginTop: 21 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  swatch: { width: 10, height: 10, borderRadius: 3, borderWidth: 1 },
});
