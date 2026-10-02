import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, ApiError } from '../../api/client';
import { rememberBooking } from '../../api/myBookings';
import type { Guest, PaymentMethod } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { useAuth } from '../../auth';
import { signInHref } from '../../auth/routes';
import { Button, Line, Message, Panel } from '../../components/ui';
import { mmss, showDate } from '../../format';
import { useI18n } from '../../i18n';
import { describeSeats } from '../../seats';
import { useTheme } from '../../theme';

/** Guest checkout (BRD 6, 7.3, 7.4): contact details, payment method, cinema policy, then pay. */
export default function Checkout() {
  const theme = useTheme();
  const { t, lang } = useI18n();
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

  const methods: { value: PaymentMethod; label: string }[] = [
    { value: 'card', label: t.card },
    { value: 'wallet', label: t.wallet },
  ];

  if (hold.error) return <Message text={t.holdExpired} onRetry={() => router.back()} retryLabel={t.goBack} />;
  if (!hold.data) return <ActivityIndicator style={{ flex: 1 }} color={theme.accent} />;
  const h = hold.data;
  const left = Date.parse(h.expiresAt) - now;
  const valid = guest.name.trim().length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guest.email.trim()) && /^\+?[0-9 ]{8,16}$/.test(guest.mobile.trim());

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

  if (left <= 0) return <Message text={t.holdExpired} onRetry={() => router.back()} retryLabel={t.goBack} />;

  const field = (key: keyof Guest, label: string, props: Partial<ComponentProps<typeof TextInput>>) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <TextInput
        value={guest[key]}
        onChangeText={(v) => setGuest((g) => ({ ...g, [key]: v }))}
        placeholderTextColor={theme.muted}
        accessibilityLabel={label}
        {...props}
        style={[styles.input, { color: theme.ink, borderColor: theme.line, backgroundColor: theme.panel }, key !== 'name' && { direction: 'ltr', textAlign: lang === 'ar' ? 'right' : 'left' }]}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Panel>
          <Text style={[styles.title, { color: theme.ink }]}>{h.showtime.movie.title}</Text>
          <Text style={{ color: theme.muted, marginBottom: 10 }}>{h.showtime.cinema.name} · {showDate(h.showtime.startsAt, t)}</Text>
          <Line label={t.seats} value={describeSeats(h.seats)} />
          <Line label={t.ticketsLine(h.seats.length, t.egp(h.showtime.price))} value={t.egp(h.price.tickets)} />
          <Line label={t.platformFee} value={t.egp(h.price.fees)} />
          <Line label={t.total} value={t.egp(h.price.total)} strong />
          <Text style={{ color: left < 120000 ? theme.accent : theme.good, marginTop: 8, fontSize: 13 }}>
            {t.heldFor(mmss(left))}
          </Text>
        </Panel>

        <Text style={[styles.h2, { color: theme.ink }]}>{t.yourDetails}</Text>
        {account ? (
          <Text style={{ color: theme.muted, marginBottom: 12 }}>{t.checkoutSignedIn(account.email)}</Text>
        ) : (
          <>
            <Text style={{ color: theme.muted }}>{t.noAccountNeeded}</Text>
            <Pressable onPress={() => router.push(signInHref(`/checkout/${holdId}`))} accessibilityRole="link" style={{ marginTop: 4, marginBottom: 12, alignSelf: 'flex-start' }}>
              <Text style={{ color: theme.accent, fontWeight: '700' }}>{t.checkoutSignInPrompt}</Text>
            </Pressable>
          </>
        )}
        {field('name', t.fullName, { autoComplete: 'name', textContentType: 'name' })}
        {field('email', t.email, { autoComplete: 'email', keyboardType: 'email-address', autoCapitalize: 'none', textContentType: 'emailAddress' })}
        {field('mobile', t.mobile, { autoComplete: 'tel', keyboardType: 'phone-pad', placeholder: t.mobilePlaceholder, textContentType: 'telephoneNumber' })}

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
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>
          {t.paymentSimulated}
        </Text>

        <Pressable onPress={() => setAccepted((a) => !a)} accessibilityRole="checkbox" aria-checked={accepted} style={styles.policy}>
          <View style={[styles.box, { borderColor: accepted ? theme.accent : theme.line, backgroundColor: accepted ? theme.accent : 'transparent' }]}>
            {accepted && <Text style={{ color: theme.accentInk, fontSize: 12, fontWeight: '900' }}>✓</Text>}
          </View>
          <Text style={{ color: theme.ink, flex: 1 }}>
            {t.acceptPolicy(h.showtime.cinema.name)}
            <Text style={{ color: theme.muted }}>{h.showtime.cinema.cancellationPolicy}</Text>
          </Text>
        </Pressable>

        {error && <Text style={{ color: theme.accent, marginBottom: 12 }}>{error}</Text>}
        <Button title={t.pay(t.egp(h.price.total))} onPress={pay} busy={busy} disabled={!valid || !accepted} />
        <Button title={t.cancelHold} kind="secondary" onPress={cancel} style={{ marginTop: 10 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800' },
  h2: { fontSize: 18, fontWeight: '800', marginTop: 24, marginBottom: 6 },
  label: { fontSize: 13, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  method: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14, alignItems: 'center' },
  policy: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginVertical: 20 },
  box: { width: 22, height: 22, borderWidth: 1.5, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
