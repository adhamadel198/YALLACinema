import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, ApiError } from '../../../api/client';
import { RESALE_BUYER_FEE, RESALE_SELLER_FEE, resaleApi, sellerReceives, type PayoutDetails, type PayoutMethod } from '../../../api/resale';
import { useRequest } from '../../../api/useRequest';
import { Chips } from '../../../components/Chips';
import { SeatToggles, SignInPrompt } from '../../../components/resale';
import { Button, Line, Message, Panel } from '../../../components/ui';
import { useAuth } from '../../../auth';
import { showDate } from '../../../format';
import { useI18n } from '../../../i18n';
import { useTheme } from '../../../theme';

type PayoutForm = { kind: PayoutDetails['kind']; mobile: string; bankName: string; accountName: string; accountNumber: string };
const emptyPayout: PayoutForm = { kind: 'wallet', mobile: '', bankName: '', accountName: '', accountNumber: '' };

/** Arabic keyboards type ٠١٢…; prices and account numbers need 012…. */
const latinDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660));

/**
 * List tickets from one booking for resale (BRD 11): payout details first, then which tickets and the price
 * (at most what the seller paid per ticket, excluding fees), with what the buyer pays and the seller receives.
 */
export default function SellTickets() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { account, ready } = useAuth();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const data = useRequest(async () => {
    const [booking, payout] = await Promise.all([api.booking(bookingId), account ? resaleApi.payoutMethod() : null]);
    return { booking, payout };
  }, [bookingId, lang, account?.id]);

  const [payout, setPayout] = useState<PayoutMethod | null>();
  const [editingPayout, setEditingPayout] = useState(false);
  const [form, setForm] = useState<PayoutForm>(emptyPayout);
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState<string>();
  const [selected, setSelected] = useState<string[]>([]);
  const [priceText, setPriceText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const loaded = data.data;
  useEffect(() => {
    if (!loaded) return;
    setPayout(loaded.payout);
    setSelected(loaded.booking.tickets.filter((x) => x.status === 'valid').map((x) => x.id));
    setPriceText((p) => p || String(loaded.booking.showtime.price));
  }, [loaded]);

  const title = <Stack.Screen options={{ title: t.resaleSellTitle }} />;
  if (!ready || (account && !loaded && !data.error)) return <>{title}<ActivityIndicator style={{ flex: 1 }} color={theme.accent} /></>;
  if (!account) {
    return <>{title}<View style={{ padding: 16 }}><SignInPrompt text={t.resaleSignInToSell} /></View></>;
  }
  if (!loaded) return <>{title}<Message text={t.loadFailed} onRetry={data.reload} /></>;

  const b = loaded.booking;
  if (b.accountId !== account.id) return <>{title}<Message text={t.resaleNotOwner} /></>;
  if (Date.parse(b.showtime.startsAt) <= Date.now()) return <>{title}<Message text={t.resaleShowStarted} /></>;
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
      setSavingPayout(false);
    }
  }

  async function list() {
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
      setBusy(false);
    }
  }

  const field = (key: Exclude<keyof PayoutForm, 'kind'>, label: string, props: Partial<ComponentProps<typeof TextInput>> = {}, ltr = false) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <TextInput
        value={form[key]}
        onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
        placeholderTextColor={theme.muted}
        accessibilityLabel={label}
        {...props}
        style={[styles.input, { color: theme.ink, borderColor: theme.line, backgroundColor: theme.panel },
          ltr && { direction: 'ltr', textAlign: lang === 'ar' ? 'right' : 'left' }]}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {title}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Panel>
          <Text style={[styles.title, { color: theme.ink }]}>{b.showtime.movie.title}</Text>
          <Text style={{ color: theme.muted }}>{b.showtime.cinema.name}</Text>
          <Text style={{ color: theme.muted, marginBottom: 10 }}>{showDate(b.showtime.startsAt, t)}</Text>
          <Text style={{ color: theme.ink }}>{t.resaleYouPaid(t.egp(paid))}</Text>
        </Panel>

        <Text style={[styles.h2, { color: theme.ink }]}>{t.resalePayoutTitle}</Text>
        {showPayoutForm ? (
          <Panel>
            <Text style={{ color: theme.muted, marginBottom: 12 }}>{t.resalePayoutWhy}</Text>
            <View style={{ marginBottom: 14 }}>
              <Chips
                label={t.resalePayoutTitle}
                options={[{ value: 'wallet' as const, label: t.resalePayoutWallet }, { value: 'bank' as const, label: t.resalePayoutBank }]}
                value={form.kind}
                onChange={(kind) => setForm((f) => ({ ...f, kind }))}
              />
            </View>
            {form.kind === 'wallet' ? (
              field('mobile', t.resaleWalletNumber, { keyboardType: 'phone-pad', placeholder: t.mobilePlaceholder, autoComplete: 'tel' }, true)
            ) : (
              <>
                {field('bankName', t.resaleBankName)}
                {field('accountName', t.resaleAccountName, { autoComplete: 'name' })}
                {field('accountNumber', t.resaleAccountNumber, { autoCapitalize: 'characters' }, true)}
              </>
            )}
            <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 12 }}>{t.resaleUnverified}</Text>
            {payoutError && <Text style={{ color: theme.accent, marginBottom: 12 }}>{payoutError}</Text>}
            <Button title={t.resaleSavePayout} onPress={savePayout} busy={savingPayout} disabled={!payoutValid} />
          </Panel>
        ) : (
          <Panel>
            <View style={styles.row}>
              <Text style={{ color: theme.ink, fontWeight: '700', flex: 1 }}>{t.resalePayoutTo(payout.label)}</Text>
              <Button title={t.resaleChange} kind="secondary" onPress={() => setEditingPayout(true)} style={{ minHeight: 36, paddingHorizontal: 12 }} />
            </View>
            {payout.verification !== 'verified' && (
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>{t.resaleUnverified}</Text>
            )}
          </Panel>
        )}

        <Text style={[styles.h2, { color: theme.ink }]}>{t.resaleTicketsToSell}</Text>
        <SeatToggles
          options={b.tickets.map((x) => ({
            id: x.id, label: t.seat(x.seat), disabled: x.status !== 'valid',
            note: x.status === 'valid' ? undefined : t.resaleTicketStatus[x.status as keyof typeof t.resaleTicketStatus],
          }))}
          selected={selected}
          onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))}
        />
        {!sellable.length && <Text style={{ color: theme.muted, marginTop: 8 }}>{t.resaleNothingToSell}</Text>}

        <Text style={[styles.h2, { color: theme.ink }]}>{t.resalePriceLabel(t.egp(paid))}</Text>
        <TextInput
          value={priceText}
          onChangeText={setPriceText}
          keyboardType="number-pad"
          accessibilityLabel={t.resalePriceLabel(t.egp(paid))}
          style={[styles.input, { color: theme.ink, borderColor: priceOk ? theme.line : theme.accent, backgroundColor: theme.panel, direction: 'ltr', textAlign: lang === 'ar' ? 'right' : 'left' }]}
        />
        {!priceOk && <Text style={{ color: theme.accent, marginTop: 6 }}>{t.resalePriceCap}</Text>}

        <Panel style={{ marginTop: 16 }}>
          <Line label={t.resaleBuyerPaysLine} value={priceOk ? t.egp(price + RESALE_BUYER_FEE) : '–'} />
          <Line label={t.resaleFeeLine} value={`−${t.egp(RESALE_SELLER_FEE)}`} />
          <Line label={t.resaleYouGetLine} value={priceOk ? t.egp(each) : '–'} strong />
          {selected.length > 1 && <Line label={t.resaleTotalIfSold} value={priceOk ? t.egp(each * selected.length) : '–'} />}
          <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8, lineHeight: 18 }}>{t.resaleSellerRules}</Text>
        </Panel>

        {error && <Text style={{ color: theme.accent, marginVertical: 12 }}>{error}</Text>}
        <Button title={t.resaleListButton(selected.length)} onPress={list} busy={busy}
          disabled={!payout || editingPayout || !selected.length || !priceOk} style={{ marginTop: 16 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800' },
  h2: { fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 10 },
  label: { fontSize: 13, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
