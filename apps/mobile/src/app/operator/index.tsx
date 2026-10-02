import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { Account } from '../../api/auth';
import { ApiError } from '../../api/client';
import { operatorApi, type StaffBooking, type StaffDay, type StaffShow } from '../../api/operator';
import { useRequest } from '../../api/useRequest';
import { useAuth } from '../../auth';
import { Chips } from '../../components/Chips';
import { Field } from '../../components/form';
import { BookingRow, BookingsTable, DataTable, dayLabel, joinLine, RowsBlock, SideLink, Stat } from '../../components/operator/parts';
import { StaffGate } from '../../components/operator/StaffGate';
import { Page } from '../../components/page';
import { AlertPill, Badge, Button, Eyebrow, H2, Message, Notice, Panel, Spinner, StatusText } from '../../components/ui';
import { useI18n } from '../../i18n';
import type { Strings } from '../../i18n/strings';
import { useLayout } from '../../layout';
import { colors } from '../../theme';
import { useType } from '../../typography';

/** Cinema operator portal (BRD 5.2, 7.5): staff see their cinema's bookings by day and show, and correct listings. */
export default function OperatorPortal() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t.operatorTitle }} />
      <StaffGate>{(account) => <Dashboard account={account} />}</StaffGate>
    </>
  );
}

const openShow = (id: string) => router.push({ pathname: '/operator/showtime/[id]', params: { id } });

/** The live `.admin` panel: a sidebar (cinema, days, help, sign out) beside the day's stats, listings and bookings. */
function Dashboard({ account }: { account: Account }) {
  const { t } = useI18n();
  const { type, font } = useType();
  const { wide } = useLayout();
  const { signOut } = useAuth();
  const [day, setDay] = useState<string>();
  // A session that expired signs out (AuthProvider), which brings back the sign-in form.
  const data = useRequest(() => operatorApi.day(day).catch((e) => {
    throw new Error(e instanceof ApiError && e.status === 403 ? t.op.noCinema : t.loadFailed);
  }), [day, t]);
  // Back from correcting a show: show what changed.
  useFocusEffect(useCallback(() => data.reload(), [data.reload]));

  if (!data.data && data.error) return <Page footer="operator"><Message text={data.error} onRetry={data.reload} /></Page>;
  if (!data.data) return <Page footer="operator"><Spinner /></Page>;
  const d = data.data;
  const today = d.day === d.today;
  const dayName = today ? t.op.today : dayLabel(d.day, t);
  const days = (
    <Chips variant="side" column={wide} scroll={!wide} label={t.op.day} value={d.day} onChange={setDay}
      options={d.days.map((x) => ({ value: x, label: x === d.today ? t.op.today : dayLabel(x, t) }))} />
  );
  const extra = (
    <>
      <SideLink label={t.operatorUi.help} onPress={() => router.push('/support')} />
      <SideLink label={t.op.signOut} onPress={signOut} role="button" />
    </>
  );

  const sidebar = (
    <View style={wide
      ? { width: 220, padding: 20, borderEndWidth: 1, borderEndColor: colors.line }
      : { padding: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Eyebrow style={{ paddingHorizontal: 12, paddingTop: 9 }}>{t.operatorUi.workspace}</Eyebrow>
      <View style={{ marginHorizontal: 12, marginTop: 4, marginBottom: 12 }}>
        <Text style={[font(800), { color: colors.ink, fontSize: 16, lineHeight: 22 }]}>{d.cinema.name}</Text>
        <Text style={type.caption}>{t.operatorUi.signedInAs(account.name)}</Text>
      </View>
      {wide ? (
        <>
          {days}
          <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 12 }} />
          {extra}
        </>
      ) : (
        // Wraps rather than scrolls on phones, so "Sign out" is never cut off (the Arabic labels are wider).
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
          {days}
          <View style={{ width: 1, height: 22, backgroundColor: colors.line, marginHorizontal: 6 }} />
          {extra}
        </View>
      )}
    </View>
  );

  const showsAt = new Map(d.shows.map((s) => [s.id, s]));
  const bookings = d.shows.flatMap((s) => s.bookings);
  const main = (
    <View style={{ flex: wide ? 1 : undefined, minWidth: 0, paddingVertical: wide ? 25 : 17, paddingHorizontal: wide ? 25 : 10 }}>
      <FindBooking>
        {(search, result) => (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 }}>
              <View style={{ flexShrink: 1, minWidth: 220 }}>
                <Eyebrow>{t.operatorUi.kicker}</Eyebrow>
                <Text role="heading" aria-level={1} style={[type.h2, { fontSize: 25, lineHeight: 30, marginVertical: 4 }]}>{t.op.bookingsOn(dayName)}</Text>
                <Text style={[type.small, { color: colors.muted }]}>{t.operatorUi.glance}</Text>
              </View>
              {search}
            </View>
            {result}
          </>
        )}
      </FindBooking>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 18 }}>
        {[
          { value: String(d.totals.bookings), label: t.op.statBookings },
          { value: String(d.totals.tickets), label: t.op.statTickets },
          { value: t.egp(d.totals.ticketRevenue), label: t.op.statRevenue },
          { value: String(d.totals.shows), label: t.op.statShows, note: d.totals.cancelled ? t.op.cancelledCount(d.totals.cancelled) : undefined },
        ].map((s) => <Stat key={s.label} {...s} style={{ flexGrow: 1, flexBasis: wide ? 0 : '40%' }} />)}
      </View>
      <Notice>{t.op.revenueNote}</Notice>

      <View style={{ paddingTop: 24 }}>
        <H2 small style={{ marginBottom: 12 }}>{today ? t.operatorUi.listingsToday : t.operatorUi.listingsOn(dayName)}</H2>
        {d.shows.length ? <ShowsTable day={d} /> : <Text style={[type.small, { color: colors.muted }]}>{t.op.noShows}</Text>}
      </View>

      <View style={{ paddingTop: 24 }}>
        <H2 small style={{ marginBottom: 12 }}>{t.operatorUi.bookingsSection}</H2>
        <BookingsTable bookings={bookings} showOf={(b: StaffBooking) => {
          const s = showsAt.get(b.showtimeId);
          return s ? `${s.localTime} · ${s.movie.title}` : '';
        }} />
      </View>
    </View>
  );

  return (
    <Page footer="operator" contentStyle={{ paddingTop: 25 }}>
      <Panel padding={0} style={[{ overflow: 'hidden', minHeight: 550 }, wide && { flexDirection: 'row' }]}>
        {sidebar}
        {main}
      </Panel>
    </Page>
  );
}

/** The live/correction state of a listing: Published, Corrected, or Cancelled. */
function ListingState({ show: s, t }: { show: Pick<StaffShow, 'cancelled' | 'corrected'>; t: Strings }) {
  if (s.cancelled) return <AlertPill label={t.op.cancelled} />;
  return <Badge label={s.corrected ? t.op.corrected : t.operatorUi.published} />;
}

/** The day's shows: a table on wide screens, stacked rows on phones. */
function ShowsTable({ day: d }: { day: StaffDay }) {
  const { t, rtl } = useI18n();
  const { type, font } = useType();
  const { wide } = useLayout();
  const action = (s: StaffShow) => (s.editable
    ? <Button title={s.cancelled ? t.op.viewShow : t.op.correctListing} kind="soft" size="small" inline onPress={() => openShow(s.id)} />
    : null);
  const listedAs = (s: StaffShow) => (s.corrected && s.listed
    ? <Text style={[type.micro, { marginTop: 2 }]}>{t.op.listedAs(s.listed.localTime, t.op.formatName(s.listed.format), t.egp(s.listed.price))}</Text>
    : null);
  const booked = (s: StaffShow) => (s.bookings.length ? t.op.showTotals(s.totals.bookings, s.totals.tickets, t.egp(s.totals.ticketRevenue)) : '–');
  const time = (s: StaffShow, size: number) => (
    <Text style={[font(800), { color: s.cancelled ? colors.muted : colors.ink, fontSize: size, lineHeight: Math.round(size * 1.4) }, s.cancelled && { textDecorationLine: 'line-through' }]}>
      {s.localTime}
    </Text>
  );

  if (!wide) {
    return (
      <RowsBlock>
        {d.shows.map((s) => (
          <View key={s.id} style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {time(s, 20)}
              <Text style={[font(700), { color: colors.ink, fontSize: 15, flexShrink: 1 }]}>{s.movie.title}</Text>
              <ListingState show={s} t={t} />
            </View>
            <Text style={type.caption}>{joinLine(rtl, t.op.formatName(s.format), t.egp(s.price), s.seatsLeft != null && t.op.seatsLeft(s.seatsLeft))}</Text>
            {listedAs(s)}
            {s.bookings.length ? <Text style={type.caption}>{booked(s)}</Text> : null}
            {s.editable ? <View style={{ flexDirection: 'row', marginTop: 4 }}>{action(s)}</View> : null}
          </View>
        ))}
      </RowsBlock>
    );
  }
  return (
    <DataTable
      columns={[
        { label: t.operatorUi.colMovie, flex: 1.2 },
        { label: t.operatorUi.colShowtime, flex: 0.9 },
        { label: t.operatorUi.colFormat, flex: 0.95 },
        { label: t.operatorUi.colPrice, flex: 0.8 },
        { label: t.operatorUi.colSeatsLeft, flex: 0.65 },
        { label: t.operatorUi.colBooked, flex: 1.25 },
        { label: t.operatorUi.colStatus, flex: 1 },
        { label: '', flex: 1.4 },
      ]}
      padX={10}
      rows={d.shows.map((s) => ({
        key: s.id,
        cells: [
          <View key="m"><Text style={[font(700), { color: colors.ink, fontSize: 13, lineHeight: 20 }]}>{s.movie.title}</Text>{listedAs(s)}</View>,
          time(s, 13),
          t.op.formatName(s.format),
          t.egp(s.price),
          s.seatsLeft != null ? String(s.seatsLeft) : '–',
          booked(s),
          <ListingState key="s" show={s} t={t} />,
          action(s),
        ],
      }))}
    />
  );
}

/**
 * Search by the reference printed on the ticket. Another cinema's booking is refused by the API (403).
 * Renders through `children(search, result)`: the search box sits in the header, the result card under it.
 */
function FindBooking({ children }: { children: (search: ReactNode, result: ReactNode) => ReactNode }) {
  const { t } = useI18n();
  const { wide } = useLayout();
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  // Enter in the field searches too: a second search while one is in flight is ignored.
  const finding = useRef(false);
  const [found, setFound] = useState<Awaited<ReturnType<typeof operatorApi.find>>>();
  const [error, setError] = useState<string>();

  async function find() {
    if (finding.current) return;
    const typed = reference.trim().toUpperCase();
    setFound(undefined);
    if (!/^[A-Z0-9-]{3,32}$/.test(typed)) return setError(t.op.badReference);
    finding.current = true;
    setBusy(true);
    setError(undefined);
    try {
      setFound(await operatorApi.find(typed));
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      setError(status === 404 ? t.op.notFound : status === 403 ? t.op.otherCinema : t.genericError);
    } finally {
      finding.current = false;
      setBusy(false);
    }
  }

  function clear() {
    setReference('');
    setFound(undefined);
    setError(undefined);
  }

  const search = (
    <View accessibilityLabel={t.op.findBooking} style={{ width: wide ? 290 : '100%', gap: 6 }}>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Field label={t.op.referenceLabel} hideLabel value={reference} onChangeText={(v) => setReference(v.toUpperCase())} placeholder={t.op.referencePlaceholder}
          ltr autoCapitalize="characters" autoCorrect={false} onSubmitEditing={find} returnKeyType="search" aria-invalid={!!error}
          style={{ flex: 1, marginVertical: 0 }} inputStyle={[{ minHeight: 40, paddingVertical: 8 }, !!error && { borderColor: colors.dangerLine }]} />
        <Button title={t.op.find} size="small" inline onPress={find} busy={busy} disabled={!reference.trim()} />
      </View>
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <StatusText tone="danger" style={{ flexShrink: 1 }}>{error}</StatusText>
          {reference ? <Button title={t.op.clear} kind="link" inline onPress={clear} /> : null}
        </View>
      ) : null}
    </View>
  );
  const result = found ? <FoundBooking booking={found.booking} show={found.show} onClear={clear} /> : null;
  return <>{children(search, result)}</>;
}

/** The booking a search found, as a cream verify card. */
function FoundBooking({ booking: b, show, onClear }: {
  booking: StaffBooking; show: Omit<StaffShow, 'bookings' | 'totals' | 'seatsLeft'>; onClear: () => void;
}) {
  const { t, rtl } = useI18n();
  const { type, font } = useType();
  const moved = b.sold.startsAt !== show.startsAt || b.sold.format !== show.format;
  return (
    <View role="status" style={{ backgroundColor: colors.verifyBg, borderWidth: 1, borderColor: colors.verifyLine, borderRadius: 11, padding: 13, gap: 4, marginTop: 16, maxWidth: 560 }}>
      <Text style={[type.eyebrow, { marginBottom: 2 }]}>{t.operatorUi.foundKicker}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <Text style={[font(800), { color: colors.fieldInk, fontSize: 15 }]}>{show.movie.title}</Text>
        {show.cancelled ? <AlertPill label={t.op.cancelled} /> : null}
      </View>
      <Text style={[type.caption, { color: colors.verifyInk }]}>
        {joinLine(rtl, dayLabel(show.startsAt.slice(0, 10), t), show.localTime, t.op.formatName(show.format))}
      </Text>
      {moved ? <Text style={[font(700), { color: colors.dangerOnCream, fontSize: 12 }]}>{t.op.soldAs(b.sold.startsAt.slice(11, 16), t.op.formatName(b.sold.format))}</Text> : null}
      <View style={{ borderTopWidth: 1, borderTopColor: colors.verifyLine, paddingTop: 8, marginTop: 4 }}>
        <BookingRow booking={b} tone="cream" />
        <Text style={[type.caption, { color: colors.creamMuted }]}>{t.op.paidBy(t.op.payment[b.paymentMethod] ?? b.paymentMethod)}</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        {show.editable ? <Button title={t.op.viewShow} kind="soft" size="small" inline onPress={() => openShow(show.id)} /> : null}
        <Button title={t.op.clear} kind="soft" size="small" inline onPress={onClear} />
      </View>
    </View>
  );
}
