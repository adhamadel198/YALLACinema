import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, useWindowDimensions, View, type TextInputProps, type ViewStyle } from 'react-native';
import type { StaffBooking } from '../../api/operator';
import { useI18n } from '../../i18n';
import type { Strings } from '../../i18n/strings';
import { describeSeats } from '../../seats';
import { useTheme } from '../../theme';

/** Staff often use a laptop: lay the portal out in columns from this width. */
export const useWide = () => useWindowDimensions().width >= 900;

/** "Thu 1 Oct" for a YYYY-MM-DD day. */
export function dayLabel(day: string, t: Strings) {
  const [y, m, d] = day.split('-').map(Number);
  return `${t.weekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${t.months[m - 1]}`;
}

/** "HH:MM" in Cairo for a moment (e.g. when a change was made). */
export function cairoClock(iso: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
  } catch {
    return new Date(iso).toTimeString().slice(0, 5);
  }
}

/**
 * Joins parts with " · ". In Arabic each part starts with a right-to-left mark, so parts keep their order and
 * a Latin word (a format like "Dolby Atmos", a name, a reference) does not pull the number after it to its side.
 */
export const joinLine = (rtl: boolean, ...parts: (string | null | undefined | false)[]) =>
  parts.filter(Boolean).map((p) => (rtl ? `\u200F${p}` : p)).join(' · ');

/** "2 valid · 1 used" */
export function ticketSummary(tickets: StaffBooking['tickets'], t: Strings) {
  const counts = new Map<string, number>();
  for (const ticket of tickets) counts.set(ticket.status, (counts.get(ticket.status) ?? 0) + 1);
  return [...counts].map(([status, n]) => t.op.statusCount(n, t.op.ticketStatus[status] ?? status)).join(' · ');
}

/** Centres the portal on wide screens. */
export function Page({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ width: '100%', maxWidth: 1120, alignSelf: 'center' }, style]}>{children}</View>;
}

export function Kicker({ children }: { children: string }) {
  const theme = useTheme();
  const { rtl } = useI18n();
  return <Text style={[styles.kicker, { color: theme.accent }, rtl && { letterSpacing: 0 }]}>{children}</Text>;
}

export function Badge({ label, tone }: { label: string; tone: 'alert' | 'note' }) {
  const theme = useTheme();
  const alert = tone === 'alert';
  return (
    <View style={[styles.badge, { borderColor: theme.accent, backgroundColor: alert ? theme.accent : 'transparent' }]}>
      <Text style={{ color: alert ? theme.accentInk : theme.accent, fontSize: 11, fontWeight: '800' }}>{label}</Text>
    </View>
  );
}

export function Stat({ value, label, note }: { value: string; label: string; note?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.panel, borderColor: theme.line }]}>
      <Text style={[styles.statValue, { color: theme.ink }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={{ color: theme.muted, fontSize: 12 }}>{label}</Text>
      {note ? <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>{note}</Text> : null}
    </View>
  );
}

/** A labelled text field. `ltr` keeps codes, times and numbers left-to-right inside Arabic layouts. */
export function Field({ label, hint, error, ltr, ...input }: TextInputProps & { label: string; hint?: string; error?: string; ltr?: boolean }) {
  const theme = useTheme();
  const { rtl } = useI18n();
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.label, { color: theme.ink }]}>{label}</Text>
      <TextInput
        placeholderTextColor={theme.muted}
        accessibilityLabel={label}
        {...input}
        style={[styles.input, { color: theme.ink, borderColor: error ? theme.accent : theme.line, backgroundColor: theme.panel },
          ltr && { direction: 'ltr', textAlign: rtl ? 'right' : 'left' }, input.style]}
      />
      {error ? <Text style={{ color: theme.accent, fontSize: 12, marginTop: 4 }}>{error}</Text>
        : hint ? <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>{hint}</Text> : null}
    </View>
  );
}

/** A show's bookings: a table on wide screens, stacked rows on phones. */
export function BookingsTable({ bookings, wide }: { bookings: StaffBooking[]; wide: boolean }) {
  const theme = useTheme();
  const { t } = useI18n();
  if (!bookings.length) return <Text style={{ color: theme.muted, paddingVertical: 8 }}>{t.op.noBookings}</Text>;
  if (!wide) return <View>{bookings.map((b, i) => <BookingRow key={b.reference} booking={b} last={i === bookings.length - 1} />)}</View>;
  const cell = (text: string, flex: number, strong?: boolean) => (
    <Text style={[styles.cell, { flex, color: theme.ink, fontWeight: strong ? '800' : '400' }]}>{text}</Text>
  );
  return (
    <View accessibilityRole="list">
      <View style={[styles.tableHead, { borderColor: theme.line }]}>
        {[t.op.colReference, t.op.colName, t.op.colSeats, t.op.colTickets, t.op.colPaid].map((h, i) => (
          <Text key={h} style={[styles.cell, styles.headCell, { flex: [1.1, 1.4, 1.2, 1.3, 0.8][i], color: theme.muted }]}>{h}</Text>
        ))}
      </View>
      {bookings.map((b, i) => (
        <View key={b.reference} style={[styles.tableRow, { borderColor: theme.line }, i === bookings.length - 1 && { borderBottomWidth: 0 }]}>
          {cell(b.reference, 1.1, true)}
          {cell(b.holderName, 1.4)}
          {cell(describeSeats(b.seats), 1.2)}
          {cell(ticketSummary(b.tickets, t), 1.3)}
          {cell(t.egp(b.price.total), 0.8)}
        </View>
      ))}
    </View>
  );
}

/** One booking as two lines: reference and name, then seats, tickets and amount paid. */
export function BookingRow({ booking: b, last }: { booking: StaffBooking; last?: boolean }) {
  const theme = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.row, { borderColor: theme.line }, last && { borderBottomWidth: 0 }]}>
      <View style={styles.rowTop}>
        <Text style={{ color: theme.ink, fontWeight: '800' }}>{b.reference}</Text>
        <Text style={{ color: theme.ink, flex: 1 }} numberOfLines={1}>{b.holderName}</Text>
        <Text style={{ color: theme.ink, fontWeight: '700' }}>{t.egp(b.price.total)}</Text>
      </View>
      <Text style={{ color: theme.muted, fontSize: 13, marginTop: 2 }}>
        {t.seatsList(describeSeats(b.seats))} · {ticketSummary(b.tickets, t)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'center' },
  stat: { flexGrow: 1, flexBasis: 140, borderWidth: 1, borderRadius: 14, padding: 14, gap: 2 },
  statValue: { fontSize: 24, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 16 },
  tableHead: { flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 6 },
  headCell: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 9, alignItems: 'center' },
  cell: { fontSize: 14, paddingEnd: 8 },
  row: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  rowTop: { flexDirection: 'row', gap: 10, alignItems: 'baseline' },
});
