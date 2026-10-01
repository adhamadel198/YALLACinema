import { Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { useTheme, type Theme } from '../theme';

type SeatState = 'free' | 'matched' | 'picked' | 'taken';

/** How each kind of seat is drawn, shared by the map and its legend so they always agree. */
function seatLook(theme: Theme, state: SeatState) {
  switch (state) {
    // Free seats are all pickable, so they need a clearly visible outline (theme.line is too faint on the page).
    case 'free': return { borderColor: theme.muted + '8c' };
    case 'matched': return { borderColor: theme.accent };
    case 'picked': return { backgroundColor: theme.accent, borderColor: theme.accent };
    case 'taken': return { backgroundColor: theme.muted, borderColor: theme.muted, opacity: 0.3 };
  }
}

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

/**
 * The hall, seat by seat. It keeps its physical layout in both languages: seat 1 is always on the left
 * facing the screen. Each seat's whole cell is its tap target, so seats stay easy to hit at phone width.
 */
export function SeatGrid({ rows, cols, aisles = [], unavailable, picked, matched, onSeat }: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const walkways = new Set(aisles.filter((a) => a > 0 && a < cols));
  const columns = (cell: (c: number) => ReactNode) =>
    Array.from({ length: cols }, (_, c) => (
      <Fragment key={c}>
        {cell(c)}
        {walkways.has(c + 1) && <View style={styles.aisle} />}
      </Fragment>
    ));

  return (
    <View style={styles.hall} accessibilityLabel={t.seatMap}>
      <View style={styles.row} aria-hidden>
        <View style={styles.rowLabel} />
        {columns((c) => <Text style={[styles.number, { color: theme.muted }]}>{c + 1}</Text>)}
      </View>
      {Array.from({ length: rows }, (_, r) => {
        const letter = String.fromCharCode(65 + r);
        return (
          <View key={letter} style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.muted }]}>{letter}</Text>
            {columns((c) => {
              const id = letter + (c + 1);
              const taken = unavailable.has(id);
              const on = !taken && picked.has(id);
              const state: SeatState = taken ? 'taken' : on ? 'picked' : matched.has(id) ? 'matched' : 'free';
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel={t.seatLabel(id, taken ? 'taken' : '')}
                  accessibilityState={{ checked: on, disabled: taken }}
                  disabled={taken}
                  onPress={() => onSeat(id)}
                  style={({ pressed }) => [styles.cell, pressed && { opacity: 0.55 }]}
                >
                  <View style={[styles.seat, seatLook(theme, state)]}>
                    {on && <Text style={[styles.seatNumber, { color: theme.accentInk }]}>{c + 1}</Text>}
                  </View>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

/** Key to the seat map. */
export function SeatLegend() {
  const theme = useTheme();
  const { t } = useI18n();
  const items: [SeatState, string][] = [['picked', t.yourSeats], ['matched', t.alsoMatches], ['free', t.free], ['taken', t.taken]];
  return (
    <View style={styles.legend}>
      {items.map(([state, label]) => (
        <View key={state} style={styles.legendItem}>
          <View style={[styles.legendSwatch, seatLook(theme, state)]} />
          <Text style={{ color: theme.muted, fontSize: 12 }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hall: { direction: 'ltr', width: '100%', maxWidth: 480, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { width: 16, fontSize: 11, textAlign: 'center' },
  number: { flex: 1, fontSize: 9, textAlign: 'center', marginBottom: 2 },
  // The cell is the tap target: full column width and 38 points tall, with the drawn seat inside it.
  cell: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  seat: {
    width: '100%', maxWidth: 30, aspectRatio: 1, borderWidth: 1.5, borderRadius: 6, borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  seatNumber: { fontSize: 10, fontWeight: '800' },
  aisle: { width: 10 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5 },
});
