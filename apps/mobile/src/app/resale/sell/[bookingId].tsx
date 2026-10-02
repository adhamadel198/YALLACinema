import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { api, ApiError } from '../../../api/client';
import { RESALE_BUYER_FEE, RESALE_SELLER_FEE, resaleApi, sellerReceives, type PayoutDetails, type PayoutMethod, type TicketStatus } from '../../../api/resale';
import { useRequest } from '../../../api/useRequest';
import { useAuth } from '../../../auth';
import { signInHref } from '../../../auth/routes';
import { Chips } from '../../../components/Chips';
import { Field } from '../../../components/form';
import { Crumbs, Page } from '../../../components/page';
import { SeatToggles } from '../../../components/resale';
import { PanelHead, showWhen, Subtle, VerifyBox, VerifyLine } from '../../../components/resale/parts';
import { Button, Line, Notice, Panel, Spinner, StatusText } from '../../../components/ui';
import { useI18n } from '../../../i18n';
import { showStarted, showStartsAt } from '../../../liveShow';
import { colors } from '../../../theme';
import { useType } from '../../../typography';

type PayoutForm = { kind: PayoutDetails['kind']; mobile: string; bankName: string; accountName: string; accountNumber: string };
const emptyPayout: PayoutForm = { kind: 'wallet', mobile: '', bankName: '', accountName: '', accountNumber: '' };

/** Arabic keyboards type ٠١٢…; prices and account numbers need 012…. */
const latinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660));

const backToMarket = () => (router.canGoBack() ? router.back() : router.replace('/resale'));

/**
 * List tickets from one booking for resale (BRD 11): payout details first, then which tickets and the price
 * (at most what the seller paid per ticket, excluding fees), with what the buyer pays and the seller receives.
 * Drawn as the live resale.html "For ticket owners" panel.
 */
export default function SellTickets() {
  const { t, lang } = useI18n();
  const { type, font } = useType();
  const { account, ready } = useAuth();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  // Loads once the saved session is restored: loaded before it, a seller's payout details looked missing.
  const data = useRequest(async () => {
    if (!ready || !account) return null;
    const [booking, payout] = await Promise.all([api.booking(bookingId), resaleApi.payoutMethod()]);
    return { booking, payout };
  }, [bookingId, lang, ready, account?.id]);

  const [payout, setPayout] = useState<PayoutMethod | null>();
  const [editingPayout, setEditingPayout] = useState(false);
  const [form, setForm] = useState<PayoutForm>(emptyPayout);
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string>();
  const [selected, setSelected] = useState<string[]>([]);
  const [priceText, setPriceText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  /** Saving payout details or listing again while one is in flight is ignored. */
  const sending = useRef(false);

  const loaded = data.data;
  // Before the screen paints, so the payout form and price error never flash before the loaded values are in.
  useLayoutEffect(() => {
    if (!loaded) return;
    setPayout(loaded.payout);
    setSelected(loaded.booking.tickets.filter((x) => x.status === 'valid').map((x) => x.id));
    setPriceText((p) => p || String(loaded.booking.showtime.price));
  }, [loaded]);

  /** The page: breadcrumb (web) and one centred panel headed "For ticket owners · List your ticket". */
  const page = (children: ReactNode) => (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t.resaleSellTitle }} />
      <Page footer="resale" contentStyle={{ paddingTop: Platform.OS === 'web' ? 0 : 25 }}>
        <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center' }}>
          <Crumbs items={[{ label: t.shell.crumbHome, href: '/' }, { label: t.resaleTitle, href: '/resale' }, { label: t.resaleSellTitle }]} />
          <Panel>
            <PanelHead eyebrow={t.resaleUi.ownersKicker} title={t.resaleUi.ownersTitle} style={{ marginBottom: 1 }} />
            <Text style={[type.small, { color: colors.muted }]}>{t.resaleUi.ownersBody}</Text>
            {children}
          </Panel>
        </View>
      </Page>
    </KeyboardAvoidingView>
  );
  /** A guard state: the message in a notice, and a way back to the market. */
  const blocked = (message: string, action?: ReactNode) => page(
    <View style={{ marginTop: 14, gap: 12 }}>
      <Notice role="alert">{message}</Notice>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {action}
        <Button title={t.resaleBackToMarket} kind="soft" size="small" inline onPress={backToMarket} />
      </View>
    </View>,
  );

  if (!ready || (account && !loaded && !data.error)) return page(<Spinner />);
  if (!account) {
    return blocked(t.resaleSignInToSell,
      <Button title={t.resaleGoSignIn} size="small" inline onPress={() => router.push(signInHref(`/resale/sell/${bookingId}`))} />);
  }
  if (!loaded) return blocked(t.loadFailed, <Button title={t.tryAgain} size="small" inline onPress={data.reload} />);

  const b = loaded.booking;
  if (b.accountId !== account.id) return blocked(t.resaleNotOwner);
  if (b.showChange?.kind === 'cancelled') return blocked(t.resaleShowCancelled);
  if (showStarted(b)) return blocked(t.resaleShowStarted);
  const sellable = b.tickets.filter((x) => x.status === 'valid');
  const paid = b.showtime.price;
  const price = Number(latinDigits(priceText.trim()));
  const priceOk = /^\d+$/.test(latinDigits(priceText.trim())) && price >= 1 && price <= paid;
  const each = priceOk ? sellerReceives(price) : 0;
  const showPayoutForm = !payout || editingPayout;

  const payoutValid = form.kind === 'wallet'
    ? /^\+?[0-9 ]{10,16}$/.test(latinDigits(form.mobile.trim()))
    : form.bankName.trim().length >= 2 && form.accountName.trim().length >= 2 && /^[A-Za-z0-9 ]{6,40}$/.test(latinDigits(form.accountNumber.trim()));

  async function savePayout() {
    if (sending.current) return;
    sending.current = true;
    setSavingPayout(true);
    setPayoutError(undefined);
    try {
      const details: PayoutDetails = form.kind === 'wallet'
        ? { kind: 'wallet', mobile: latinDigits(form.mobile.trim()) }
        : { kind: 'bank', bankName: form.bankName.trim(), accountName: form.accountName.trim(), accountNumber: latinDigits(form.accountNumber.trim()) };
      setPayout(await resaleApi.setPayoutMethod(details));
      setEditingPayout(false);
      setForm(emptyPayout);
    } catch (e) {
      setPayoutError(e instanceof ApiError && e.status === 400 ? t.resalePayoutInvalid : t.genericError);
    } finally {
      sending.current = false;
      setSavingPayout(false);
    }
  }

  async function list() {
    if (sending.current) return;
    sending.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await resaleApi.list(b.id, selected, price);
      router.replace('/resale/mine');
    } catch (e) {
      const code = e instanceof ApiError ? e.body.code : undefined;
      if (code === 'ineligible') data.reload();
      if (code === 'payout-required') setPayout(null);
      setError(
        code === 'price-cap' ? t.resalePriceCap
          : code === 'ineligible' ? t.resaleIneligible
          : code === 'cinema-ineligible' ? t.resaleCinemaIneligible
          : code === 'show-started' ? t.resaleShowStarted
          : code === 'show-cancelled' ? t.resaleShowCancelled
          : code === 'not-owner' ? t.resaleNotOwner
          : code === 'payout-required' ? t.resalePayoutWhy
          : t.genericError,
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const field = (key: Exclude<keyof PayoutForm, 'kind'>, label: string, props: Partial<ComponentProps<typeof Field>> = {}) => (
    <Field tone="cream" label={label} value={form[key]} onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
      style={{ marginVertical: 4 }} {...props} />
  );

  return page(
    <>
      <VerifyBox style={{ marginTop: 13 }}>
        <VerifyLine label={t.resaleUi.accountLabel}>{account.name}</VerifyLine>
        {showPayoutForm ? (
          <>
            <VerifyLine>{t.resalePayoutWhy}</VerifyLine>
            <Chips variant="cream" label={t.resalePayoutTitle} value={form.kind} onChange={(kind) => setForm((f) => ({ ...f, kind }))}
              style={{ marginVertical: 2 }}
              options={[{ value: 'wallet' as const, label: t.resalePayoutWallet }, { value: 'bank' as const, label: t.resalePayoutBank }]} />
            {form.kind === 'wallet' ? (
              field('mobile', t.resaleWalletNumber, { keyboardType: 'phone-pad', placeholder: t.mobilePlaceholder, autoComplete: 'tel', ltr: true })
            ) : (
              <>
                {field('bankName', t.resaleBankName)}
                {field('accountName', t.resaleAccountName, { autoComplete: 'name' })}
                {field('accountNumber', t.resaleAccountNumber, { autoCapitalize: 'characters', ltr: true })}
              </>
            )}
            <Text style={[type.micro, { color: colors.creamMuted }]}>{t.resaleUnverified}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 2 }}>
              <Button title={t.resaleSavePayout} kind="soft" size="small" inline onPress={savePayout} busy={savingPayout} disabled={!payoutValid} />
              {payout ? (
                <Button title={t.resaleCancelChange} kind="soft" size="small" inline
                  onPress={() => { setEditingPayout(false); setForm(emptyPayout); setPayoutError(undefined); }} />
              ) : null}
            </View>
            {payoutError ? <VerifyLine tone="danger">{payoutError}</VerifyLine> : null}
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 10, rowGap: 6 }}>
              <Text style={[font(700), { color: colors.verifyInk, fontSize: 12, lineHeight: 18.6, flexShrink: 1 }]}>{t.resalePayoutTo(payout.label)}</Text>
              <Button title={t.resaleChange} kind="soft" size="small" inline onPress={() => setEditingPayout(true)} />
            </View>
            {payout.verification !== 'verified' ? <VerifyLine>{t.resaleUi.payoutUnverified}</VerifyLine> : null}
          </>
        )}
      </VerifyBox>

      <Text role="heading" aria-level={3} style={[font(700), { color: colors.ink, fontSize: 14, lineHeight: 21.7, marginTop: 17, marginBottom: 8 }]}>
        {t.resaleUi.eligibleBooking(b.reference)}
      </Text>
      <Text style={type.micro}>
        {`${b.showtime.movie.title} · ${b.showtime.cinema.name} · ${showWhen(showStartsAt(b), t)}\n${t.resaleUi.originalEach(t.egp(paid))}`}
      </Text>
      <View style={{ marginTop: 3 }}>
        <SeatToggles
          options={b.tickets.map((x) => {
            const status = x.status as TicketStatus;
            return status === 'valid'
              ? { id: x.id, label: t.seat(x.seat), note: t.resaleUi.seatUnused }
              : { id: x.id, label: t.resaleUi.seatWithState(t.seat(x.seat), t.resaleTicketStatus[status] ?? x.status), note: t.resaleUi.ticketWhy[status], disabled: true };
          })}
          selected={selected}
          onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
        />
      </View>
      {!sellable.length && <Text style={[type.small, { color: colors.muted, marginTop: 4 }]}>{t.resaleNothingToSell}</Text>}

      <Field label={t.resaleUi.priceLabel(t.egp(paid))} value={priceText} onChangeText={setPriceText} keyboardType="number-pad" ltr
        error={priceOk ? undefined : t.resalePriceCap} style={{ marginBottom: 5 }} />
      <Text style={type.micro}>{t.resaleUi.proceedsLine(priceOk ? t.egp(each) : '–')}</Text>

      <View style={{ marginTop: 10 }}>
        <Line label={t.resaleBuyerPaysLine} value={priceOk ? t.egp(price + RESALE_BUYER_FEE) : '–'} />
        <Line label={t.resaleFeeLine} value={`−${t.egp(RESALE_SELLER_FEE)}`} />
        <Line total label={t.resaleYouGetLine} value={priceOk ? t.egp(each) : '–'} />
        {selected.length > 1 && <Line label={t.resaleTotalIfSold} value={priceOk ? t.egp(each * selected.length) : '–'} />}
        <Text style={[type.micro, { marginTop: 6 }]}>{t.resaleSellerRules}</Text>
      </View>

      <Button title={t.resaleUi.publish} onPress={list} busy={busy}
        disabled={!payout || editingPayout || !selected.length || !priceOk} style={{ marginTop: 13 }} />
      {error ? <StatusText tone="danger" style={{ marginTop: 9 }}>{error}</StatusText> : null}
      <Subtle style={{ marginBottom: 0 }}>{t.resaleUi.closeNote}</Subtle>
    </>,
  );
}
