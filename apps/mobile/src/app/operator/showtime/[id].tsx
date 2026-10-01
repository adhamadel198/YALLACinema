import { router, Stack, useLocalSearchParams } from 'expo-router';
import { HeaderBackButton } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../../api/client';
import { operatorApi, type ChangeRecord, type Correction, type StaffShowDetail } from '../../../api/operator';
import { useRequest } from '../../../api/useRequest';
import { Chips } from '../../../components/Chips';
import { Badge, BookingsTable, cairoClock, dayLabel, Field, joinLine, Kicker, Page, useWide } from '../../../components/operator/parts';
import { StaffGate } from '../../../components/operator/StaffGate';
import { Button, Message, Panel } from '../../../components/ui';
import { useI18n } from '../../../i18n';
import type { Strings } from '../../../i18n/strings';
import { useTheme } from '../../../theme';

/** Correct one of today's listings (BRD 7.5): time, format and price, or cancel the show (BRD 9). */
export default function CorrectShowScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{
        title: t.op.correctTitle,
        // Opened from a link or after a reload there is nothing to go back to: go to the cinema's bookings.
        ...(router.canGoBack() ? {} : { headerLeft: (props) => <HeaderBackButton {...props} onPress={() => router.replace('/operator')} /> }),
      }} />
      <StaffGate>{() => <CorrectShow />}</StaffGate>
    </>
  );
}

/** Arabic keyboards type Arabic-Indic digits; the API wants 0-9. */
const latinDigits = (s: string) => s.replace(/[٠-٩۰-۹]/g, (c) => String(c.charCodeAt(0) & 0xf));

/** "9:30" or "09:30" → "09:30"; anything else → undefined. */
function parseTime(input: string) {
  const m = /^(\d{1,2})[:.](\d{2})$/.exec(latinDigits(input.trim()));
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return undefined;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function CorrectShow() {
  const theme = useTheme();
  const { t } = useI18n();
  const wide = useWide();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useRequest(() => operatorApi.show(id).catch((e) => {
    throw new Error(e instanceof ApiError && e.status === 404 ? t.op.notToday : e instanceof ApiError && e.status === 403 ? t.op.otherCinema : t.loadFailed);
  }), [id, t]);

  if (!detail.data && detail.error) return <Message text={detail.error} onRetry={detail.reload} />;
  if (!detail.data) return <ActivityIndicator style={{ flex: 1 }} color={theme.accent} />;
  const d = detail.data;

  const bookings = (
    <Panel style={{ marginBottom: 16 }}>
      <Text style={[styles.h2, { color: theme.ink }]}>{t.op.bookingsTitle}</Text>
      <BookingsTable bookings={d.show.bookings} wide={wide} />
      {d.show.bookings.length ? (
        <Text style={{ color: theme.muted, fontSize: 13, marginTop: 8 }}>
          {t.op.showTotals(d.show.totals.bookings, d.show.totals.tickets, t.egp(d.show.totals.ticketRevenue))}
        </Text>
      ) : null}
    </Panel>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: wide ? 24 : 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Page style={wide ? styles.columns : undefined}>
        <View style={wide ? { flex: 1 } : undefined}>
          <Summary detail={d} />
          <Editor detail={d} onSaved={detail.reload} />
        </View>
        <View style={wide ? { flex: 1 } : undefined}>
          {bookings}
          <History changes={d.changes} />
        </View>
      </Page>
    </ScrollView>
  );
}

function Summary({ detail: { show: s } }: { detail: StaffShowDetail }) {
  const theme = useTheme();
  const { t, rtl } = useI18n();
  return (
    <Panel style={{ marginBottom: 16 }}>
      <Kicker>{`${dayLabel(s.startsAt.slice(0, 10), t)} · ${s.localTime}`}</Kicker>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.ink }]}>{s.movie.title}</Text>
        {s.cancelled ? <Badge label={t.op.cancelled} tone="alert" /> : s.corrected ? <Badge label={t.op.corrected} tone="note" /> : null}
      </View>
      <Text style={{ color: theme.muted }}>
        {joinLine(rtl, t.op.formatName(s.format), t.egp(s.price), s.seatsLeft != null && t.op.seatsLeft(s.seatsLeft))}
      </Text>
      {s.corrected && s.listed ? (
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>{t.op.listedAs(s.listed.localTime, t.op.formatName(s.listed.format), t.egp(s.listed.price))}</Text>
      ) : null}
    </Panel>
  );
}

/** The correction form, and cancelling or reinstating the show. */
function Editor({ detail: { show: s, formats, maxPrice }, onSaved }: { detail: StaffShowDetail; onSaved: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const [time, setTime] = useState(s.localTime);
  const [format, setFormat] = useState(s.format);
  const [price, setPrice] = useState(String(s.price));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string>();
  const [error, setError] = useState<string>();

  // After a save the show reloads: start from what customers now see.
  useEffect(() => {
    setTime(s.localTime);
    setFormat(s.format);
    setPrice(String(s.price));
  }, [s.localTime, s.format, s.price]);

  const newTime = parseTime(time);
  const priceText = latinDigits(price.trim());
  const newPrice = /^\d+$/.test(priceText) ? Number(priceText) : NaN;
  const priceOk = Number.isInteger(newPrice) && newPrice >= 1 && newPrice <= maxPrice;
  const fix: Correction = {
    ...(newTime && newTime !== s.localTime ? { time: newTime } : {}),
    ...(format !== s.format ? { format } : {}),
    ...(priceOk && newPrice !== s.price ? { price: newPrice } : {}),
  };
  const edited = Object.keys(fix).length > 0;
  const valid = !!newTime && priceOk;
  const sold = s.totals.bookings;

  /** `message` confirms the change; a cancelled show says so itself. */
  async function send(body: Correction, message?: string) {
    setBusy(true);
    setError(undefined);
    setDone(undefined);
    try {
      await operatorApi.correct(s.id, body);
      setDone(message);
      setConfirming(false);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? t.op.notToday : t.genericError);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setTime(s.localTime);
    setFormat(s.format);
    setPrice(String(s.price));
    setDone(undefined);
  }

  const status = (done || error) ? (
    <Text accessibilityRole="alert" style={{ color: error ? theme.accent : theme.good, marginBottom: 12, fontWeight: '600' }}>{error ?? done}</Text>
  ) : null;

  if (s.cancelled) {
    return (
      <Panel style={{ marginBottom: 16 }}>
        <Text style={{ color: theme.ink, marginBottom: 12, lineHeight: 21 }}>{t.op.cancelledNotice}</Text>
        {status}
        <Button title={t.op.reinstate} onPress={() => send({ cancelled: false }, t.op.reinstated)} busy={busy} />
      </Panel>
    );
  }

  return (
    <Panel style={{ marginBottom: 16 }}>
      <Field label={t.op.startTime} hint={t.op.startTimeHint} error={time && !newTime ? t.op.badTime : undefined}
        value={time} onChangeText={(v) => { setTime(v); setDone(undefined); }} ltr keyboardType="numbers-and-punctuation" maxLength={5} />
      <Text style={[styles.label, { color: theme.ink }]}>{t.op.format}</Text>
      <Chips label={t.op.format} value={format} onChange={(v) => { setFormat(v); setDone(undefined); }}
        options={formats.map((f) => ({ value: f, label: t.op.formatName(f) }))} />
      <View style={{ height: 14 }} />
      <Field label={t.op.price} hint={t.op.priceHint} error={price && !priceOk ? t.op.badPrice(maxPrice) : undefined}
        value={price} onChangeText={(v) => { setPrice(v); setDone(undefined); }} ltr keyboardType="number-pad" maxLength={5} />

      {edited && sold > 0 ? (
        <Text style={[styles.impact, { color: theme.ink, borderColor: theme.accent }]}>
          {fix.time || fix.format ? t.op.affectsBookings(sold) : t.op.priceOnly}
        </Text>
      ) : null}
      {status}
      <View style={styles.actions}>
        <Button title={t.op.save} onPress={() => send(fix, t.op.saved)} busy={busy && !confirming} disabled={!edited || !valid} style={{ flexGrow: 1 }} />
        {edited ? <Button title={t.op.reset} kind="secondary" onPress={reset} style={{ flexGrow: 1 }} /> : null}
      </View>

      <View style={[styles.cancelBox, { borderColor: theme.line }]}>
        {confirming ? (
          <>
            <Text style={[styles.h2, { color: theme.ink }]}>{t.op.cancelConfirm(s.localTime, s.movie.title)}</Text>
            <Text style={{ color: theme.muted, marginBottom: 12, lineHeight: 20 }}>{t.op.cancelConfirmBody(sold)}</Text>
            <View style={styles.actions}>
              <Button title={t.op.confirmCancel} onPress={() => send({ cancelled: true })} busy={busy} style={{ flexGrow: 1 }} />
              <Button title={t.op.keepShow} kind="secondary" onPress={() => setConfirming(false)} style={{ flexGrow: 1 }} />
            </View>
          </>
        ) : (
          <Button title={t.op.cancelShow} kind="secondary" onPress={() => { setConfirming(true); setDone(undefined); }} />
        )}
      </View>
    </Panel>
  );
}

/** Every change to the show, newest first, with the bookings it affected (BRD 9). */
function History({ changes }: { changes: ChangeRecord[] }) {
  const theme = useTheme();
  const { t, rtl } = useI18n();
  const anyAffected = changes.some((c) => c.affected.length > 0);
  return (
    <Panel>
      <Text style={[styles.h2, { color: theme.ink }]}>{t.op.historyTitle}</Text>
      {!changes.length ? <Text style={{ color: theme.muted }}>{t.op.noHistory}</Text> : null}
      {changes.map((c, i) => (
        <View key={c.at + i} style={[styles.change, { borderColor: theme.line }, i === changes.length - 1 && { borderBottomWidth: 0 }]}>
          <View style={styles.titleRow}>
            <Badge label={t.op.changeKind[c.kind] ?? c.kind} tone={c.kind === 'cancelled' ? 'alert' : 'note'} />
            <Text style={{ color: theme.muted, fontSize: 13 }}>{joinLine(rtl, cairoClock(c.at), c.by)}</Text>
          </View>
          {describeChange(c, t).map((line) => <Text key={line} style={{ color: theme.ink, marginTop: 4 }}>{line}</Text>)}
          {c.affected.length ? (
            <View style={{ marginTop: 6 }}>
              <Text style={{ color: theme.ink, fontWeight: '700', fontSize: 13 }}>{t.op.affected(c.affected.length)}</Text>
              {c.affected.map((a) => (
                <Text key={a.reference} style={{ color: theme.muted, fontSize: 13 }}>
                  {joinLine(rtl, a.reference, a.holderName, a.notifiedAt ? cairoClock(a.notifiedAt) : t.op.notNotified)}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ))}
      {anyAffected ? <Text style={{ color: theme.muted, fontSize: 12, marginTop: 10 }}>{t.op.notifyNote}</Text> : null}
    </Panel>
  );
}

function describeChange({ before: b, after: a }: ChangeRecord, t: Strings) {
  const lines: string[] = [];
  if (b.startsAt !== a.startsAt) lines.push(t.op.changeTime(b.startsAt.slice(11, 16), a.startsAt.slice(11, 16)));
  if (b.format !== a.format) lines.push(t.op.changeFormat(t.op.formatName(b.format), t.op.formatName(a.format)));
  if (b.price !== a.price) lines.push(t.op.changePrice(t.egp(b.price), t.egp(a.price)));
  return lines;
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: 24, alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  h2: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  impact: { borderStartWidth: 3, paddingStart: 10, marginBottom: 12, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cancelBox: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 18, paddingTop: 16 },
  change: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
});
