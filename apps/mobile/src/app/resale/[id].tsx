import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { rememberBooking } from '../../api/myBookings';
import { RESALE_BUYER_FEE, resaleApi } from '../../api/resale';
import type { PaymentMethod } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { useAuth } from '../../auth';
import { signInHref } from '../../auth/routes';
import { ChoiceChip } from '../../components/Chips';
import { Page } from '../../components/page';
import { Parts, SeatToggles } from '../../components/resale';
import { showWhen } from '../../components/resale/parts';
import { Button, Line, Notice, Panel, Spinner, StatusText } from '../../components/ui';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { describeSeats } from '../../seats';
import { colors } from '../../theme';
import { useType } from '../../typography';

/** Back to where the buyer came from, or the market when opened from a link. */
const leave = () => (router.canGoBack() ? router.back() : router.replace('/resale'));

/**
 * Buy tickets from a resale listing (BRD 11): pick seats, see the total (price + 5 EGP per ticket), pay.
 * The seller's ticket is invalidated and the buyer gets a replacement in a new booking.
 * Drawn as the live resale.html buy sheet: one cream card, centred.
 */
export default function BuyResale() {
  const { t, lang } = useI18n();
  const { type, font } = useType();
  const { narrow } = useLayout();
  const { account, ready } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  // null once the listing has closed (sold out, withdrawn or the show started). Loads once the saved session is
  // restored, so a seller never sees Pay on their own listing.
  const listing = useRequest(() => (!ready ? Promise.resolve(undefined) : resaleApi.listing(id).catch((e) => {
    if (e instanceof ApiError && (e.status === 410 || e.status === 404)) return null;
    throw e;
  })), [id, lang, ready, account?.id]);
  const [selected, setSelected] = useState<string[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [busy, setBusy] = useState(false);
  /** A second Pay while one is in flight is ignored, so nobody pays twice. */
  const paying = useRef(false);
  const [error, setError] = useState<string>();

  // Everything for sale starts selected; seats someone else bought meanwhile drop out of the choice on reload.
  const available = listing.data?.tickets.map((x) => x.ticketId).join();
  useEffect(() => {
    if (!available) return;
    const ids = available.split(',');
    setSelected((s) => (s.length ? s.filter((x) => ids.includes(x)) : ids));
  }, [available]);

  const label = [font(800), { color: '#5b4a26', fontSize: 12, lineHeight: 18.6, marginBottom: 6 }];
  const sheet = (children: ReactNode) => (
    <Page footer="resale" contentStyle={{ paddingTop: narrow ? 14 : 32 }}>
      <Stack.Screen options={{ title: t.resaleBuyTitle }} />
      <Panel tone="cream" padding={23} style={{ width: '100%', maxWidth: 480, alignSelf: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.45)' }}>
        <Text style={[type.eyebrow, { marginBottom: 2 }]}>{t.resaleUi.checkoutKicker}</Text>
        {children}
      </Panel>
    </Page>
  );

  if (listing.error && !listing.data) {
    return sheet(
      <>
        <Text style={[type.body, { color: colors.fieldInk, marginVertical: 12 }]}>{t.loadFailed}</Text>
        <Button title={t.tryAgain} size="small" inline onPress={listing.reload} />
      </>,
    );
  }
  if (listing.data === undefined) return sheet(<Spinner />);
  if (listing.data === null || !listing.data.tickets.length) {
    return sheet(
      <>
        <Text role="alert" style={[type.body, { color: colors.fieldInk, marginVertical: 12 }]}>{t.resaleClosed}</Text>
        <Button title={t.resaleBackToMarket} kind="soft" inline onPress={leave} />
      </>,
    );
  }
  const l = listing.data;
  const s = l.showtime;
  const n = selected.length;
  const price = { tickets: l.price * n, fees: RESALE_BUYER_FEE * n, total: (l.price + RESALE_BUYER_FEE) * n };

  async function buy() {
    if (paying.current) return;
    paying.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const booking = await resaleApi.buy(l.id, selected, method);
      await rememberBooking(booking.id);
      router.dismissAll();
      router.push({ pathname: '/ticket/[id]', params: { id: booking.id } });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      const body = e instanceof ApiError ? e.body : {};
      const code = body.code;
      if (code === 'unavailable') listing.reload();
      setError(
        status === 401 ? t.resaleSignInToBuy
          : status === 402 ? t.resalePaymentFailed
          : code === 'transfer-failed' ? t.resaleTransferFailed
          : code === 'show-cancelled' ? t.resaleBuyShowCancelled
          : code === 'purchase-cancelled' ? t.resalePurchaseCancelled
          // Charged and not refunded: the reference lets support find the payment.
          : code === 'refund-failed' ? t.resaleRefundFailed(String(body.reference ?? ''))
          : code === 'unavailable' ? t.resaleGone
          : status === 410 ? t.resaleClosed
          : t.genericError,
      );
    } finally {
      paying.current = false;
      setBusy(false);
    }
  }

  const seats = describeSeats(l.tickets.map((x) => x.seat));
  return sheet(
    <>
      <Text role="heading" aria-level={1} style={[type.h2, { color: colors.fieldInk, marginBottom: 12 }]}>{t.resaleUi.buyHeading(s.movie.title)}</Text>
      <Parts color={colors.creamMuted} textStyle={{ fontSize: 15, lineHeight: 23 }}
        parts={[s.cinema.name, showWhen(s.startsAt, t), s.format, t.seatsList(seats), t.resaleTicketCount(l.tickets.length), t.resaleUi.unusedEligible]} />

      {l.tickets.length > 1 && (
        <View style={{ marginTop: 16 }}>
          <Text style={label}>{t.resaleUi.ticketsFromListing}</Text>
          <SeatToggles tone="cream" columns
            options={l.tickets.map((x) => ({ id: x.ticketId, label: t.seat(x.seat), note: t.resaleUi.seatUnusedVerified }))}
            selected={selected}
            onToggle={(ticketId) => setSelected((cur) => (cur.includes(ticketId) ? cur.filter((x) => x !== ticketId) : [...cur, ticketId]))}
          />
        </View>
      )}

      <View style={{ marginTop: 12 }}>
        <Line tone="cream" label={t.resaleUi.ticketPriceLine} hint={n ? t.resaleUi.ticketPriceHint(n, t.egp(l.price)) : undefined} value={t.egp(price.tickets)} />
        <Line tone="cream" label={t.resaleUi.buyerFeeLine} value={t.egp(price.fees)} />
        <Line tone="cream" total label={t.resaleUi.buyerTotal} value={t.egp(price.total)} />
        <Text style={[type.micro, { color: colors.creamMuted, marginTop: 6 }]}>{t.resaleNewTicketNote}</Text>
      </View>

      {!ready ? null : !account ? (
        <View style={{ marginTop: 16, gap: 12 }}>
          <Notice>{t.resaleSignInToBuy}</Notice>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
            <Button title={t.resaleGoSignIn} size="small" inline onPress={() => router.push(signInHref(`/resale/${l.id}`))} />
            <Button title={t.resaleCancelChange} kind="soft" size="small" inline onPress={leave} />
          </View>
        </View>
      ) : l.mine ? (
        <View style={{ marginTop: 16, gap: 12 }}>
          <Notice>{t.resaleOwnListing}</Notice>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
            <Button title={t.resaleUi.manageListings} kind="soft" size="small" inline onPress={() => router.push('/resale/mine')} />
          </View>
        </View>
      ) : (
        <>
          <View style={{ marginTop: 16 }}>
            <Text style={label}>{t.paymentMethod}</Text>
            <View role="radiogroup" aria-label={t.paymentMethod} style={{ flexDirection: narrow ? 'column' : 'row', gap: 8 }}>
              {([['card', t.card], ['wallet', t.wallet]] as const).map(([value, name]) => {
                const on = method === value;
                return (
                  <ChoiceChip key={value} variant="cream" label={name} selected={on} onPress={() => setMethod(value)}
                    textStyle={{ fontSize: 15, lineHeight: 21 }}
                    style={[{ flex: narrow ? undefined : 1, padding: 13, alignItems: 'center' }, !on && { backgroundColor: '#ffffff', borderColor: '#e2d5b5' }]} />
                );
              })}
            </View>
          </View>
          <Notice style={{ marginTop: 14 }}>{t.paymentSimulated}</Notice>
          <Text style={[type.micro, { color: colors.creamMuted, marginTop: 8 }]}>{t.resaleRefundNote}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 17 }}>
            <Button title={t.pay(t.egp(price.total))} onPress={buy} busy={busy} disabled={n === 0} inline />
            <Button title={t.resaleCancelChange} kind="soft" onPress={leave} inline />
          </View>
          {error ? <StatusText tone="danger" style={{ color: colors.dangerOnCream, marginTop: 9 }}>{error}</StatusText> : null}
        </>
      )}
    </>,
  );
}
