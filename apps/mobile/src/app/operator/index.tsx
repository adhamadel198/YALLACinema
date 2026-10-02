import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Account } from '../../api/auth';
import { ApiError } from '../../api/client';
import { operatorApi, type StaffBooking, type StaffShow } from '../../api/operator';
import { useRequest } from '../../api/useRequest';
import { useAuth } from '../../auth';
import { Chips } from '../../components/Chips';
import { Badge, BookingRow, BookingsTable, dayLabel, Field, joinLine, Kicker, Page, Stat, useWide } from '../../components/operator/parts';
import { StaffGate } from '../../components/operator/StaffGate';
import { Button, Message, Panel } from '../../components/ui';
import { useI18n } from '../../i18n';
import type { Strings } from '../../i18n/strings';
import { useTheme } from '../../theme';

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

function Dashboard({ account }: { account: Account }) {
  const theme = useTheme();
  const { t } = useI18n();
  const { signOut } = useAuth();
  const wide = useWide();
  const [day, setDay] = useState<string>();
  // A session that expired signs out (AuthProvider), which brings back the sign-in form.
  const data = useRequest(() => operatorApi.day(day).catch((e) => {
    throw new Error(e instanceof ApiError && e.status === 403 ? t.op.noCinema : t.loadFailed);
  }), [day, t]);
  // Back from correcting a show: show what changed.
  useFocusEffect(useCallback(() => data.reload(), [data.reload]));

  if (!data.data && data.error) return <Message text={data.error} onRetry={data.reload} />;
  if (!data.data) return <ActivityIndicator style={{ flex: 1 }} color={theme.accent} />;
  const d = data.data;
  const dayName = d.day === d.today ? t.op.today : dayLabel(d.day, t);

  const side = (
    <>
      <Panel style={{ marginBottom: 16 }}>
        <Kicker>{t.op.kicker}</Kicker>
        <Text style={[styles.cinema, { color: theme.ink }]}>{d.cinema.name}</Text>
        <Text style={{ color: theme.muted, marginBottom: 12 }}>{t.op.signedInAs(account.name)}</Text>
        <Button title={t.op.signOut} kind="secondary" onPress={signOut} style={styles.small} />
      </Panel>
      <FindBooking />
      <Text style={[styles.label, { color: theme.ink }]}>{t.op.day}</Text>
      <Chips label={t.op.day} value={d.day} onChange={setDay}
        options={d.days.map((x) => ({ value: x, label: x === d.today ? t.op.today : dayLabel(x, t) }))} />
    </>
  );

  const main = (
    <>
      <Text style={[styles.h1, { color: theme.ink }]}>{t.op.bookingsOn(dayName)}</Text>
      <View style={styles.stats}>
        <Stat value={String(d.totals.bookings)} label={t.op.statBookings} />
        <Stat value={String(d.totals.tickets)} label={t.op.statTickets} />
        <Stat value={t.egp(d.totals.ticketRevenue)} label={t.op.statRevenue} />
        <Stat value={String(d.totals.shows)} label={t.op.statShows} note={d.totals.cancelled ? t.op.cancelledCount(d.totals.cancelled) : undefined} />
      </View>
      <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 14 }}>{t.op.revenueNote}</Text>
      {d.shows.length ? d.shows.map((s) => <ShowCard key={s.id} show={s} wide={wide} />)
        : <Text style={{ color: theme.muted, paddingVertical: 24 }}>{t.op.noShows}</Text>}
    </>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: wide ? 24 : 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Page style={wide ? styles.columns : undefined}>
        {wide ? (
          <>
            <View style={styles.side}>{side}</View>
            <View style={{ flex: 1 }}>{main}</View>
          </>
        ) : (
          <>
            {side}
            <View style={{ height: 20 }} />
            {main}
          </>
        )}
      </Page>
    </ScrollView>
  );
}

/** One show: its listing as customers see it now, its bookings and totals. */
function ShowCard({ show: s, wide }: { show: StaffShow; wide: boolean }) {
  const theme = useTheme();
  const { t, rtl } = useI18n();
  const action = s.editable
    ? <Button title={s.cancelled ? t.op.viewShow : t.op.correctListing} kind="secondary" onPress={() => openShow(s.id)} style={styles.small} />
    : null;
  return (
    <Panel style={{ marginBottom: 12 }}>
      <View style={styles.showHead}>
        <Text style={[styles.time, { color: s.cancelled ? theme.muted : theme.ink }, s.cancelled && styles.struck]}>{s.localTime}</Text>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.movie, { color: theme.ink }]}>{s.movie.title}</Text>
            {s.cancelled ? <Badge label={t.op.cancelled} tone="alert" /> : s.corrected ? <Badge label={t.op.corrected} tone="note" /> : null}
          </View>
          <Text style={{ color: theme.muted, marginTop: 2 }}>
            {joinLine(rtl, t.op.formatName(s.format), t.egp(s.price), s.seatsLeft != null && t.op.seatsLeft(s.seatsLeft))}
          </Text>
          {s.corrected && s.listed ? (
            <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{t.op.listedAs(s.listed.localTime, t.op.formatName(s.listed.format), t.egp(s.listed.price))}</Text>
          ) : null}
        </View>
        {wide ? action : null}
      </View>
      <View style={{ marginTop: 10 }}>
        <BookingsTable bookings={s.bookings} wide={wide} />
      </View>
      {s.bookings.length || (action && !wide) ? (
        <View style={[styles.showFoot, { borderColor: theme.line }]}>
          <Text style={{ color: theme.muted, fontSize: 13, flex: 1 }}>
            {s.bookings.length ? t.op.showTotals(s.totals.bookings, s.totals.tickets, t.egp(s.totals.ticketRevenue)) : ''}
          </Text>
          {wide ? null : action}
        </View>
      ) : null}
    </Panel>
  );
}

/** Search by the reference printed on the ticket. Another cinema's booking is refused by the API (403). */
function FindBooking() {
  const theme = useTheme();
  const { t } = useI18n();
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

  return (
    <Panel style={{ marginBottom: 16 }}>
      <Text style={[styles.h2, { color: theme.ink }]}>{t.op.findBooking}</Text>
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <Field label={t.op.referenceLabel} value={reference} onChangeText={(v) => setReference(v.toUpperCase())} placeholder={t.op.referencePlaceholder}
            ltr autoCapitalize="characters" autoCorrect={false} onSubmitEditing={find} returnKeyType="search" error={error} />
        </View>
        <Button title={t.op.find} onPress={find} busy={busy} disabled={!reference.trim()} style={styles.findButton} />
      </View>
      {found ? <FoundBooking booking={found.booking} show={found.show} onClear={clear} t={t} /> : null}
      {!found && error && reference ? <Button title={t.op.clear} kind="secondary" onPress={clear} style={styles.small} /> : null}
    </Panel>
  );
}

function FoundBooking({ booking: b, show, onClear, t }: {
  booking: StaffBooking; show: Omit<StaffShow, 'bookings' | 'totals' | 'seatsLeft'>; onClear: () => void; t: Strings;
}) {
  const theme = useTheme();
  const { rtl } = useI18n();
  const moved = b.sold.startsAt !== show.startsAt || b.sold.format !== show.format;
  return (
    <View style={[styles.found, { borderColor: theme.line }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.movie, { color: theme.ink }]}>{show.movie.title}</Text>
        {show.cancelled ? <Badge label={t.op.cancelled} tone="alert" /> : null}
      </View>
      <Text style={{ color: theme.muted, marginBottom: 4 }}>
        {joinLine(rtl, dayLabel(show.startsAt.slice(0, 10), t), show.localTime, t.op.formatName(show.format))}
      </Text>
      {moved ? <Text style={{ color: theme.accent, fontSize: 12, marginBottom: 4 }}>{t.op.soldAs(b.sold.startsAt.slice(11, 16), t.op.formatName(b.sold.format))}</Text> : null}
      <BookingRow booking={b} last />
      <Text style={{ color: theme.muted, fontSize: 12 }}>{t.op.paidBy(t.op.payment[b.paymentMethod] ?? b.paymentMethod)}</Text>
      <View style={styles.foundActions}>
        {show.editable ? <Button title={t.op.viewShow} kind="secondary" onPress={() => openShow(show.id)} style={styles.small} /> : null}
        <Button title={t.op.clear} kind="secondary" onPress={onClear} style={styles.small} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  side: { width: 320 },
  cinema: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  h1: { fontSize: 24, fontWeight: '800', marginBottom: 12 },
  h2: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  small: { minHeight: 38, paddingHorizontal: 14, alignSelf: 'flex-start' },
  showHead: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  time: { fontSize: 22, fontWeight: '800', minWidth: 62 },
  struck: { textDecorationLine: 'line-through' },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  movie: { fontSize: 17, fontWeight: '800' },
  showFoot: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  searchRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  findButton: { marginTop: 25, minHeight: 46 },
  found: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 2 },
  foundActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
