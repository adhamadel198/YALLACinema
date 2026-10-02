import type { ReactNode } from 'react';
import { Pressable, Text, View, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';
import type { StaffBooking } from '../../api/operator';
import { useI18n } from '../../i18n';
import type { Strings } from '../../i18n/strings';
import { useLayout } from '../../layout';
import { describeSeats } from '../../seats';
import { colors } from '../../theme';
import { tracking, upper, useType } from '../../typography';
import { Badge, Panel } from '../ui';

// Pieces of the live operator.html admin panel shared by the cinema portal screens.

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
  parts.filter(Boolean).map((p) => (rtl ? `‏${p}` : p)).join(' · ');

/** "2 valid · 1 used" */
export function ticketSummary(tickets: StaffBooking['tickets'], t: Strings) {
  const counts = new Map<string, number>();
  for (const ticket of tickets) counts.set(ticket.status, (counts.get(ticket.status) ?? 0) + 1);
  return [...counts].map(([status, n]) => t.op.statusCount(n, t.op.ticketStatus[status] ?? status)).join(' · ');
}

/** The 36px Manrope title of the portal's account panels (the live account.html card h1). */
export function PanelTitle({ children }: { children: string }) {
  const { type } = useType();
  return <Text role="heading" aria-level={1} style={[type.h1Phone, { fontSize: 36, lineHeight: 39, marginTop: 7, marginBottom: 12 }]}>{children}</Text>;
}

/** A stat tile (`.stat`): Manrope 25 value, 11px muted label, and an optional red note ("1 cancelled"). */
export function Stat({ value, label, note, style }: { value: string; label: string; note?: string; style?: StyleProp<ViewStyle> }) {
  const { font, type } = useType();
  return (
    <Panel padding={16} style={style}>
      <Text style={[font(800, 'display'), { color: colors.ink, fontSize: 25, lineHeight: 30 }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={type.micro}>{label}</Text>
      {note ? <Text style={[font(800), { color: colors.danger, fontSize: 11, lineHeight: 17 }]}>{note}</Text> : null}
    </Panel>
  );
}

type Hoverable = PressableStateCallbackType & { hovered?: boolean };

/** A sidebar link or action in the `.sideitem` look (the days use `Chips variant="side"`). */
export function SideLink({ label, onPress, role = 'link' }: { label: string; onPress: () => void; role?: 'link' | 'button' }) {
  const { font } = useType();
  return (
    <Pressable onPress={onPress} accessibilityRole={role}
      style={(s: Hoverable) => [{ borderRadius: 9, paddingVertical: 10, paddingHorizontal: 12 }, s.hovered && { backgroundColor: '#ffffff08' }]}>
      {(s: Hoverable) => (
        <Text numberOfLines={1} style={[font(400), { color: s.hovered ? colors.goldSelected : colors.mutedSoft, fontSize: 15, lineHeight: 22 }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export type Column = { label: string; flex: number };

/**
 * The live dark `table`: a header row of 11px uppercase labels on #292319, then 13px rows split by bronze lines,
 * in a rounded block. A cell is text or any content.
 */
export function DataTable({ columns, rows, label, padX = 12 }: { columns: Column[]; rows: { key: string; cells: ReactNode[] }[]; label?: string; padX?: number }) {
  const { type, font, rtl } = useType();
  const cell = (content: ReactNode, i: number) => (
    <View key={i} style={{ flex: columns[i].flex, paddingVertical: 12, paddingHorizontal: padX, minWidth: 0, justifyContent: 'center' }}>
      {typeof content === 'string' || typeof content === 'number'
        ? <Text style={[type.small, { color: colors.ink }]}>{content}</Text>
        : content}
    </View>
  );
  return (
    <View role="table" aria-label={label} style={{ backgroundColor: colors.panel, borderRadius: 12, overflow: 'hidden' }}>
      <View role="row" style={{ flexDirection: 'row', backgroundColor: colors.tagBg, borderBottomWidth: 1, borderBottomColor: '#f0e9df' }}>
        {columns.map((c, i) => (
          <View key={c.label || i} role="columnheader" style={{ flex: c.flex, paddingVertical: 12, paddingHorizontal: padX, minWidth: 0 }}>
            <Text style={[font(700), { color: colors.fieldLine, fontSize: 11, lineHeight: 17, letterSpacing: tracking(0.7, rtl) }, upper(rtl)]}>{c.label}</Text>
          </View>
        ))}
      </View>
      {rows.map((r) => (
        <View key={r.key} role="row" style={{ flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: colors.line }}>
          {r.cells.map(cell)}
        </View>
      ))}
    </View>
  );
}

/** The phone version of a table: stacked rows split by bronze hairlines, in the same dark rounded block. */
export function RowsBlock({ children }: { children: ReactNode[] }) {
  return (
    <View role="list" style={{ backgroundColor: colors.panel, borderRadius: 12, paddingVertical: 2, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line }}>
      {children.map((c, i) => (
        <View key={i} role="listitem" style={[{ paddingVertical: 12 }, i < children.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }]}>{c}</View>
      ))}
    </View>
  );
}

/** A booking's tickets: a cream badge when every ticket is valid ("2 valid"), plain text otherwise. */
export function TicketsCell({ booking: b }: { booking: StaffBooking }) {
  const { t } = useI18n();
  const { type } = useType();
  const summary = ticketSummary(b.tickets, t);
  return b.tickets.every((x) => x.status === 'valid') ? <Badge label={summary} /> : <Text style={[type.small, { color: colors.ink }]}>{summary}</Text>;
}

/**
 * Bookings as a table on wide screens, stacked rows on phones. `showOf` adds a Show column (time and movie), for the
 * day's bookings across shows.
 */
export function BookingsTable({ bookings, showOf }: { bookings: StaffBooking[]; showOf?: (b: StaffBooking) => string }) {
  const { t } = useI18n();
  const { type, font } = useType();
  const { wide } = useLayout();
  if (!bookings.length) return <Text style={[type.small, { color: colors.muted, paddingVertical: 4 }]}>{t.op.noBookings}</Text>;
  if (!wide) return <RowsBlock>{bookings.map((b) => <BookingRow key={b.reference} booking={b} show={showOf?.(b)} />)}</RowsBlock>;
  const columns: Column[] = [
    { label: t.op.colReference, flex: 1.3 },
    { label: t.op.colName, flex: 1.2 },
    ...(showOf ? [{ label: t.operatorUi.colShow, flex: 1.5 }] : []),
    { label: t.op.colSeats, flex: 0.9 },
    { label: t.op.colTickets, flex: 1.4 },
    { label: t.op.colPaid, flex: 0.9 },
  ];
  return (
    <DataTable padX={showOf ? 12 : 10} columns={columns} rows={bookings.map((b) => ({
      key: b.reference,
      cells: [
        <Text key="r" style={[font(800), { color: colors.ink, fontSize: 13, lineHeight: 20 }]}>{b.reference}</Text>,
        b.holderName,
        ...(showOf ? [showOf(b)] : []),
        describeSeats(b.seats),
        <TicketsCell key="t" booking={b} />,
        t.egp(b.price.total),
      ],
    }))} />
  );
}

/** One booking as two lines: reference, name and amount, then show, seats and tickets. */
export function BookingRow({ booking: b, show, tone = 'dark' }: { booking: StaffBooking; show?: string; tone?: 'dark' | 'cream' }) {
  const { t } = useI18n();
  const { font, type } = useType();
  const ink = tone === 'cream' ? colors.fieldInk : colors.ink;
  const muted = tone === 'cream' ? colors.creamMuted : colors.muted;
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'baseline' }}>
        <Text style={[font(800), { color: ink, fontSize: 13 }]}>{b.reference}</Text>
        <Text style={[type.small, { color: ink, flex: 1 }]} numberOfLines={1}>{b.holderName}</Text>
        <Text style={[font(700), { color: ink, fontSize: 13 }]}>{t.egp(b.price.total)}</Text>
      </View>
      <Text style={[type.caption, { color: muted, marginTop: 2 }]}>
        {[show, t.seatsList(describeSeats(b.seats)), ticketSummary(b.tickets, t)].filter(Boolean).join(' · ')}
      </Text>
    </View>
  );
}
