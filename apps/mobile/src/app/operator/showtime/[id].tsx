import { router, Stack, useLocalSearchParams } from 'expo-router';
import { HeaderBackButton } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { ApiError } from '../../../api/client';
import { operatorApi, type ChangeRecord, type Correction, type StaffShowDetail } from '../../../api/operator';
import { useRequest } from '../../../api/useRequest';
import { ChoiceChip } from '../../../components/Chips';
import { Field } from '../../../components/form';
import { BookingsTable, cairoClock, dayLabel, joinLine } from '../../../components/operator/parts';
import { StaffGate } from '../../../components/operator/StaffGate';
import { Columns, Crumbs, Page } from '../../../components/page';
import { AlertPill, Badge, Button, Eyebrow, H2, Message, Notice, Panel, Spinner, StatusText } from '../../../components/ui';
import { useI18n } from '../../../i18n';
import type { Strings } from '../../../i18n/strings';
import { colors } from '../../../theme';
import { useType } from '../../../typography';

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
  const { t } = useI18n();
  const { type } = useType();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useRequest(() => operatorApi.show(id).catch((e) => {
    throw new Error(e instanceof ApiError && e.status === 404 ? t.op.notToday : e instanceof ApiError && e.status === 403 ? t.op.otherCinema : t.loadFailed);
  }), [id, t]);

  const crumbs = <Crumbs items={[{ label: t.operatorUi.crumbPortal, href: '/operator' }, { label: t.op.correctTitle }]} />;
  const top = { paddingTop: Platform.OS === 'web' ? 0 : 25 };
  if (!detail.data && detail.error) return <Page footer="operator" contentStyle={top}>{crumbs}<Message text={detail.error} onRetry={detail.reload} /></Page>;
  if (!detail.data) return <Page footer="operator" contentStyle={top}>{crumbs}<Spinner /></Page>;
  const d = detail.data;

  return (
    <Page footer="operator" contentStyle={top}>
      {crumbs}
      <Summary detail={d} />
      <Columns ratio={[1, 1]}>
        {[
          <Editor key="editor" detail={d} onSaved={detail.reload} />,
          <View key="side" style={{ gap: 16 }}>
            <Panel>
              <H2 small style={{ marginBottom: 12 }}>{t.op.bookingsTitle}</H2>
              <BookingsTable bookings={d.show.bookings} />
              {d.show.bookings.length ? (
                <Text style={[type.caption, { marginTop: 10 }]}>
                  {t.op.showTotals(d.show.totals.bookings, d.show.totals.tickets, t.egp(d.show.totals.ticketRevenue))}
                </Text>
              ) : null}
            </Panel>
            <History changes={d.changes} />
          </View>,
        ]}
      </Columns>
    </Page>
  );
}

/** The page header: day and time, the movie with its state, and what customers see. */
function Summary({ detail: { show: s } }: { detail: StaffShowDetail }) {
  const { t, rtl } = useI18n();
  const { type } = useType();
  return (
    <View style={{ marginBottom: 22 }}>
      <Eyebrow>{`${dayLabel(s.startsAt.slice(0, 10), t)} · ${s.localTime}`}</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 4, marginVertical: 4 }}>
        <Text role="heading" aria-level={1} style={[type.h2, { fontSize: 25, lineHeight: 30 }]}>{s.movie.title}</Text>
        {s.cancelled ? <AlertPill label={t.op.cancelled} /> : s.corrected ? <Badge label={t.op.corrected} /> : null}
      </View>
      <Text style={[type.small, { color: colors.muted }]}>
        {joinLine(rtl, t.op.formatName(s.format), t.egp(s.price), s.seatsLeft != null && t.op.seatsLeft(s.seatsLeft))}
      </Text>
      {s.corrected && s.listed ? (
        <Text style={[type.micro, { marginTop: 2 }]}>{t.op.listedAs(s.listed.localTime, t.op.formatName(s.listed.format), t.egp(s.listed.price))}</Text>
      ) : null}
    </View>
  );
}

/** The correction form, and cancelling or reinstating the show. */
function Editor({ detail: { show: s, formats, maxPrice }, onSaved }: { detail: StaffShowDetail; onSaved: () => void }) {
  const { t } = useI18n();
  const { type, font } = useType();
  const [time, setTime] = useState(s.localTime);
  const [format, setFormat] = useState(s.format);
  const [price, setPrice] = useState(String(s.price));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  /** A second save, cancel or reinstate while one is in flight is ignored. */
  const sending = useRef(false);
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
    if (sending.current) return;
    sending.current = true;
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
      sending.current = false;
      setBusy(false);
    }
  }

  function reset() {
    setTime(s.localTime);
    setFormat(s.format);
    setPrice(String(s.price));
    setDone(undefined);
  }

  const status = (done || error) ? <StatusText tone={error ? 'danger' : 'success'} style={{ marginBottom: 10 }}>{error ?? done}</StatusText> : null;

  if (s.cancelled) {
    return (
      <Panel padding={23}>
        <H2 small style={{ marginBottom: 12 }}>{t.op.correctTitle}</H2>
        <Notice style={{ marginBottom: 14 }}>{t.op.cancelledNotice}</Notice>
        {status}
        <Button title={t.op.reinstate} onPress={() => send({ cancelled: false }, t.op.reinstated)} busy={busy} />
      </Panel>
    );
  }

  return (
    <Panel padding={23}>
      <H2 small style={{ marginBottom: 0 }}>{t.op.correctTitle}</H2>
      <Field label={t.op.startTime} hint={t.op.startTimeHint} error={time && !newTime ? t.op.badTime : undefined}
        value={time} onChangeText={(v) => { setTime(v); setDone(undefined); }} ltr keyboardType="numbers-and-punctuation" maxLength={5} />
      <Text style={[type.label, { marginBottom: 6 }]}>{t.op.format}</Text>
      <View role="radiogroup" aria-label={t.op.format} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {formats.map((f) => (
          <ChoiceChip key={f} variant="time" label={t.op.formatName(f)} selected={f === format} textStyle={{ fontSize: 14, lineHeight: 20 }}
            onPress={() => { setFormat(f); setDone(undefined); }} style={{ paddingHorizontal: 13, paddingVertical: 9 }} />
        ))}
      </View>
      <Field label={t.op.price} hint={t.op.priceHint} error={price && !priceOk ? t.op.badPrice(maxPrice) : undefined}
        value={price} onChangeText={(v) => { setPrice(v); setDone(undefined); }} ltr keyboardType="number-pad" maxLength={5} />

      {edited && sold > 0 ? (
        <Notice style={{ marginBottom: 14 }}>{fix.time || fix.format ? t.op.affectsBookings(sold) : t.op.priceOnly}</Notice>
      ) : null}
      {status}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Button title={t.op.save} onPress={() => send(fix, t.op.saved)} busy={busy && !confirming} disabled={!edited || !valid} style={{ flexGrow: 1 }} />
        {edited ? <Button title={t.op.reset} kind="soft" onPress={reset} style={{ flexGrow: 1 }} /> : null}
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: colors.line, marginTop: 18, paddingTop: 18 }}>
        {confirming ? (
          <>
            <Text role="heading" aria-level={3} style={[font(800, 'display'), { color: colors.ink, fontSize: 16, lineHeight: 22, marginBottom: 6 }]}>
              {t.op.cancelConfirm(s.localTime, s.movie.title)}
            </Text>
            <Text style={[type.small, { color: colors.muted, marginBottom: 14 }]}>{t.op.cancelConfirmBody(sold)}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              <Button title={t.op.confirmCancel} onPress={() => send({ cancelled: true })} busy={busy} style={{ flexGrow: 1 }} />
              <Button title={t.op.keepShow} kind="soft" onPress={() => setConfirming(false)} style={{ flexGrow: 1 }} />
            </View>
          </>
        ) : (
          <Button title={t.op.cancelShow} kind="dark" onPress={() => { setConfirming(true); setDone(undefined); }} />
        )}
      </View>
    </Panel>
  );
}

/** Every change to the show, newest first, with the bookings it affected (BRD 9). */
function History({ changes }: { changes: ChangeRecord[] }) {
  const { t, rtl } = useI18n();
  const { type, font } = useType();
  const anyAffected = changes.some((c) => c.affected.length > 0);
  return (
    <Panel>
      <H2 small style={{ marginBottom: 12 }}>{t.op.historyTitle}</H2>
      {!changes.length ? <Text style={[type.small, { color: colors.muted }]}>{t.op.noHistory}</Text> : null}
      {changes.map((c, i) => (
        <View key={c.at + i} style={[{ paddingVertical: 12 }, i < changes.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.line }, i === 0 && { paddingTop: 0 }]}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
            {c.kind === 'cancelled' ? <AlertPill label={t.op.changeKind[c.kind]} /> : <Badge label={t.op.changeKind[c.kind] ?? c.kind} />}
            <Text style={type.caption}>{joinLine(rtl, cairoClock(c.at), c.by)}</Text>
          </View>
          {describeChange(c, t).map((line) => <Text key={line} style={[type.small, { marginTop: 6 }]}>{line}</Text>)}
          {c.affected.length ? (
            <View style={{ marginTop: 6 }}>
              <Text style={[font(700), { color: colors.ink, fontSize: 12, lineHeight: 18.6 }]}>{t.op.affected(c.affected.length)}</Text>
              {c.affected.map((a) => (
                <Text key={a.reference} style={type.caption}>
                  {joinLine(rtl, a.reference, a.holderName, a.notifiedAt ? cairoClock(a.notifiedAt) : t.op.notNotified)}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      ))}
      {anyAffected ? <Text style={[type.micro, { marginTop: 10 }]}>{t.op.notifyNote}</Text> : null}
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
