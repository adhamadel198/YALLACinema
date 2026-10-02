import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { rememberBooking } from '../../api/myBookings';
import { RESALE_BUYER_FEE, resaleApi } from '../../api/resale';
import type { PaymentMethod } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { SeatToggles, SignInPrompt } from '../../components/resale';
import { Button, Line, Message, Panel } from '../../components/ui';
import { useAuth } from '../../auth';
import { showDate } from '../../format';
import { useI18n } from '../../i18n';
import { describeSeats } from '../../seats';
import { useTheme } from '../../theme';

/**
 * Buy tickets from a resale listing (BRD 11): pick seats, see the total (price + 5 EGP per ticket), pay.
 * The seller's ticket is invalidated and the buyer gets a replacement in a new booking.
 */
export default function BuyResale() {
  const theme = useTheme();
  const { t, lang } = useI18n();
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

  const title = <Stack.Screen options={{ title: t.resaleBuyTitle }} />;
  if (listing.error && !listing.data) return <>{title}<Message text={t.loadFailed} onRetry={listing.reload} /></>;
  if (listing.data === undefined) return <>{title}<ActivityIndicator style={{ flex: 1 }} color={theme.accent} /></>;
  if (listing.data === null || !listing.data.tickets.length) {
    return <>{title}<Message text={t.resaleClosed} onRetry={() => (router.canGoBack() ? router.back() : router.replace('/resale'))} retryLabel={t.resaleBackToMarket} /></>;
  }
  const l = listing.data;
  const n = selected.length;
  const price = { tickets: l.price * n, fees: RESALE_BUYER_FEE * n, total: (l.price + RESALE_BUYER_FEE) * n };
  const methods: { value: PaymentMethod; label: string }[] = [
    { value: 'card', label: t.card },
    { value: 'wallet', label: t.wallet },
  ];

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

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {title}
      <Panel>
        <Text style={[styles.title, { color: theme.ink }]}>{l.showtime.movie.title}</Text>
        <Text style={{ color: theme.muted, marginBottom: 10 }}>{l.showtime.cinema.name}</Text>
        <Line label={t.dateTime} value={showDate(l.showtime.startsAt, t)} />
        <Line label={t.seats} value={describeSeats(l.tickets.map((x) => x.seat))} />
      </Panel>

      {l.tickets.length > 1 && (
        <>
          <Text style={[styles.h2, { color: theme.ink }]}>{t.resaleChooseTickets}</Text>
          <SeatToggles
            options={l.tickets.map((x) => ({ id: x.ticketId, label: t.seat(x.seat) }))}
            selected={selected}
            onToggle={(ticketId) => setSelected((s) => (s.includes(ticketId) ? s.filter((x) => x !== ticketId) : [...s, ticketId]))}
          />
        </>
      )}

      <Panel style={{ marginTop: 16 }}>
        <Line label={t.ticketsLine(n, t.egp(l.price))} value={t.egp(price.tickets)} />
        <Line label={t.platformFee} value={t.egp(price.fees)} />
        <Line label={t.total} value={t.egp(price.total)} strong />
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8, lineHeight: 18 }}>{t.resaleNewTicketNote}</Text>
      </Panel>

      {!ready ? null : !account ? (
        <SignInPrompt text={t.resaleSignInToBuy} style={{ marginTop: 16 }} />
      ) : l.mine ? (
        <Panel style={{ marginTop: 16 }}>
          <Text style={{ color: theme.ink, marginBottom: 12 }}>{t.resaleOwnListing}</Text>
          <Button title={t.resaleMyListings} kind="secondary" onPress={() => router.push('/resale/mine')} />
        </Panel>
      ) : (
        <>
          <Text style={[styles.h2, { color: theme.ink }]}>{t.paymentMethod}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {methods.map((m) => {
              const on = m.value === method;
              return (
                <Pressable key={m.value} onPress={() => setMethod(m.value)} accessibilityRole="radio" aria-checked={on}
                  style={[styles.method, { borderColor: on ? theme.accent : theme.line, backgroundColor: theme.panel }]}>
                  <Text style={{ color: theme.ink, fontWeight: on ? '800' : '500' }}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>{t.paymentSimulated}</Text>
          <Text style={{ color: theme.muted, fontSize: 12, marginTop: 6, marginBottom: 16 }}>{t.resaleRefundNote}</Text>

          {error && <Text style={{ color: theme.accent, marginBottom: 12 }}>{error}</Text>}
          <Button title={t.pay(t.egp(price.total))} onPress={buy} busy={busy} disabled={n === 0} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800' },
  h2: { fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  method: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14, alignItems: 'center' },
});
