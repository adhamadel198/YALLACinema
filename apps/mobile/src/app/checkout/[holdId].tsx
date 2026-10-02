import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';
import { api, ApiError } from '../../api/client';
import { rememberBooking } from '../../api/myBookings';
import type { Guest, PaymentMethod } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { useAuth } from '../../auth';
import { signInHref } from '../../auth/routes';
import { HoldTimer, OrderSummary, PayOptions, PolicyCheck } from '../../components/checkout/CheckoutParts';
import { Field } from '../../components/form';
import { Columns, Crumbs, Page, PageIntro, Steps } from '../../components/page';
import { Button, H2, Notice, Panel, Spinner, StatusText, TextLink } from '../../components/ui';
import { mmss } from '../../format';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { colors } from '../../theme';
import { useType } from '../../typography';

/** Guest checkout (BRD 6, 7.3, 7.4): contact details, payment method, cinema policy, then pay. */
export default function Checkout() {
  const { t, lang } = useI18n();
  const { type } = useType();
  const { wide } = useLayout();
  const { holdId } = useLocalSearchParams<{ holdId: string }>();
  const hold = useRequest(() => api.getHold(holdId), [holdId, lang]);
  const { account } = useAuth();
  const [guest, setGuest] = useState<Guest>({ name: '', email: '', mobile: '' });
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  /** A second Pay while one is in flight is ignored, so nobody pays twice. */
  const paying = useRef(false);
  const [error, setError] = useState<string>();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Saved details (BRD 5.1): fill in from the account, keeping anything already typed.
  useEffect(() => {
    if (account) setGuest((g) => ({ name: g.name || account.name, email: g.email || account.email, mobile: g.mobile || account.mobile }));
  }, [account]);

  const crumbs = [{ label: t.shell.crumbHome, href: '/' as const }, { label: t.shell.crumbBooking }, { label: t.checkout }];
  const head = (lead: string) => (
    <>
      <Stack.Screen options={{ title: t.checkout }} />
      <Crumbs items={crumbs} />
      <PageIntro eyebrow={t.checkoutUi.eyebrow} title={t.checkout} lead={lead} />
      <Steps step={2} />
    </>
  );

  const h = hold.data;
  const left = h ? Date.parse(h.expiresAt) - now : 0;

  // The hold is gone (expired, released or unknown): say so and send the person back to the seat map.
  if (hold.error || (h && left <= 0)) {
    return (
      <Page footer="checkout">
        {head(t.checkoutUi.lead)}
        <Panel padding={23} style={{ maxWidth: 560 }}>
          <H2>{t.checkoutUi.expiredTitle}</H2>
          <Notice tone="danger" role="alert">{t.holdExpired}</Notice>
          <Button title={t.checkoutUi.chooseAgain} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} inline style={{ marginTop: 18 }} />
        </Panel>
      </Page>
    );
  }
  if (!h) {
    return <Page footer="checkout">{head(t.checkoutUi.lead)}<Spinner /></Page>;
  }

  const valid = guest.name.trim().length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guest.email.trim()) && /^\+?[0-9 ]{8,16}$/.test(guest.mobile.trim());
  const set = (key: keyof Guest) => (v: string) => setGuest((g) => ({ ...g, [key]: v }));

  async function pay() {
    if (paying.current) return;
    paying.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const booking = await api.book(holdId, { name: guest.name.trim(), email: guest.email.trim(), mobile: guest.mobile.trim() }, method);
      await rememberBooking(booking.id);
      router.dismissAll();
      router.push({ pathname: '/ticket/[id]', params: { id: booking.id } });
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      setError(status === 402 ? t.paymentFailed : status === 409 ? t.cinemaFailed : status === 410 ? t.holdExpired : t.genericError);
    } finally {
      paying.current = false;
      setBusy(false);
    }
  }

  async function cancel() {
    await api.releaseHold(holdId).catch(() => {});
    router.back();
  }

  const fieldGap = { marginTop: 13, marginBottom: 0 };
  const form = (
    <Panel key="form" padding={23} testID="checkout-form">
      <H2 style={{ marginBottom: 0 }}>{t.yourDetails}</H2>
      {account ? null : (
        <View style={{ marginTop: 6 }}>
          <Text style={[type.small, { color: colors.muted }]}>{t.noAccountNeeded}</Text>
          <TextLink title={t.checkoutSignInPrompt} size={13} onPress={() => router.push(signInHref(`/checkout/${holdId}`))} style={{ alignSelf: 'flex-start' }} />
        </View>
      )}
      <Field label={t.fullName} value={guest.name} onChangeText={set('name')} placeholder={t.checkoutUi.namePlaceholder}
        autoComplete="name" textContentType="name" style={fieldGap} />
      <Field label={t.email} value={guest.email} onChangeText={set('email')} placeholder={t.checkoutUi.emailPlaceholder} ltr
        autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" style={fieldGap} />
      <Field label={t.mobile} value={guest.mobile} onChangeText={set('mobile')} placeholder={t.mobilePlaceholder} ltr
        autoComplete="tel" keyboardType="phone-pad" textContentType="telephoneNumber" style={fieldGap} />

      <H2 style={{ marginTop: 25 }}>{t.paymentMethod}</H2>
      <PayOptions value={method} onChange={setMethod} />

      <PolicyCheck checked={accepted} onToggle={() => setAccepted((a) => !a)} cinema={h.showtime.cinema.name} policy={h.showtime.cinema.cancellationPolicy} />
      <Notice style={{ marginTop: 16 }}>{`🔒 ${t.paymentSimulated}`}</Notice>

      {error ? <StatusText tone="danger" style={{ marginTop: 14 }}>{error}</StatusText> : null}
      <Button title={t.checkoutUi.paySecurely(t.egp(h.price.total))} onPress={pay} busy={busy} disabled={!valid || !accepted}
        style={{ marginTop: error ? 8 : 16 }} testID="pay" />
      <Button title={t.cancelHold} kind="dark" onPress={cancel} style={{ marginTop: 14 }} />
    </Panel>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Page footer="checkout">
        {head(account ? t.checkoutSignedIn(account.email) : t.checkoutUi.lead)}
        <HoldTimer left={left} style={{ marginTop: -8, marginBottom: 22 }} />
        <Columns ratio={[1.25, 0.75]} stickyEnd>
          {[form, <OrderSummary key="summary" hold={h} left={wide ? left : undefined} />]}
        </Columns>
      </Page>
    </KeyboardAvoidingView>
  );
}
