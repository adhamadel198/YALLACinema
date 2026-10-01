import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../../api/client';
import { rememberBooking } from '../../api/myBookings';
import type { Guest, PaymentMethod } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { Button, Line, Message, Panel } from '../../components/ui';
import { egp, mmss, showDate } from '../../format';
import { describeSeats } from '../../seats';
import { useTheme } from '../../theme';

const methods: { value: PaymentMethod; label: string }[] = [
  { value: 'card', label: '💳  Bank card' },
  { value: 'wallet', label: '📱  Local wallet' },
];

/** Guest checkout (BRD 6, 7.3, 7.4): contact details, payment method, cinema policy, then pay. */
export default function Checkout() {
  const t = useTheme();
  const { holdId } = useLocalSearchParams<{ holdId: string }>();
  const hold = useRequest(() => api.getHold(holdId), [holdId]);
  const [guest, setGuest] = useState<Guest>({ name: '', email: '', mobile: '' });
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (hold.error) return <Message text="Your seat hold has expired. Please choose your seats again." onRetry={() => router.back()} />;
  if (!hold.data) return <ActivityIndicator style={{ flex: 1 }} color={t.accent} />;
  const h = hold.data;
  const left = Date.parse(h.expiresAt) - now;
  const valid = guest.name.trim().length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(guest.email.trim()) && /^\+?[0-9 ]{8,16}$/.test(guest.mobile.trim());

  async function pay() {
    setBusy(true);
    setError(undefined);
    try {
      const booking = await api.book(holdId, { name: guest.name.trim(), email: guest.email.trim(), mobile: guest.mobile.trim() }, method);
      await rememberBooking(booking.id);
      router.dismissAll();
      router.push({ pathname: '/ticket/[id]', params: { id: booking.id } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    await api.releaseHold(holdId).catch(() => {});
    router.back();
  }

  if (left <= 0) return <Message text="Your seat hold has expired. Please choose your seats again." onRetry={() => router.back()} />;

  const field = (key: keyof Guest, label: string, props: Partial<ComponentProps<typeof TextInput>>) => (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.label, { color: t.muted }]}>{label}</Text>
      <TextInput
        value={guest[key]}
        onChangeText={(v) => setGuest((g) => ({ ...g, [key]: v }))}
        style={[styles.input, { color: t.ink, borderColor: t.line, backgroundColor: t.panel }]}
        placeholderTextColor={t.muted}
        accessibilityLabel={label}
        {...props}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: 'Checkout' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Panel>
          <Text style={[styles.title, { color: t.ink }]}>{h.showtime.movie.title}</Text>
          <Text style={{ color: t.muted, marginBottom: 10 }}>{h.showtime.cinema.name} · {showDate(h.showtime.startsAt)}</Text>
          <Line label="Seats" value={describeSeats(h.seats)} />
          <Line label={`Tickets ${h.seats.length} × ${egp(h.showtime.price)}`} value={egp(h.price.tickets)} />
          <Line label="Platform fee · 5 EGP per ticket" value={egp(h.price.fees)} />
          <Line label="Total" value={egp(h.price.total)} strong />
          <Text style={{ color: left < 120000 ? t.accent : t.good, marginTop: 8, fontSize: 13 }}>
            Seats held for {mmss(left)}
          </Text>
        </Panel>

        <Text style={[styles.h2, { color: t.ink }]}>Your details</Text>
        <Text style={{ color: t.muted, marginBottom: 12 }}>No account needed. We’ll send your ticket to this email.</Text>
        {field('name', 'Full name', { autoComplete: 'name', textContentType: 'name' })}
        {field('email', 'Email address', { autoComplete: 'email', keyboardType: 'email-address', autoCapitalize: 'none', textContentType: 'emailAddress' })}
        {field('mobile', 'Mobile number', { autoComplete: 'tel', keyboardType: 'phone-pad', placeholder: '+20 1XX XXX XXXX', textContentType: 'telephoneNumber' })}

        <Text style={[styles.h2, { color: t.ink }]}>Payment method</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {methods.map((m) => {
            const on = m.value === method;
            return (
              <Pressable key={m.value} onPress={() => setMethod(m.value)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                style={[styles.method, { borderColor: on ? t.accent : t.line, backgroundColor: t.panel }]}>
                <Text style={{ color: t.ink, fontWeight: on ? '800' : '500' }}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ color: t.muted, fontSize: 12, marginTop: 8 }}>
          Payment is simulated in this build. Card and wallet details will be entered on the payment provider’s secure page.
        </Text>

        <Pressable onPress={() => setAccepted((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} style={styles.policy}>
          <View style={[styles.box, { borderColor: accepted ? t.accent : t.line, backgroundColor: accepted ? t.accent : 'transparent' }]}>
            {accepted && <Text style={{ color: t.accentInk, fontSize: 12, fontWeight: '900' }}>✓</Text>}
          </View>
          <Text style={{ color: t.ink, flex: 1 }}>
            I accept {h.showtime.cinema.name}’s cancellation policy:{' '}
            <Text style={{ color: t.muted }}>{h.showtime.cinema.cancellationPolicy}</Text>
          </Text>
        </Pressable>

        {error && <Text style={{ color: t.accent, marginBottom: 12 }}>{error}</Text>}
        <Button title={`Pay ${egp(h.price.total)}`} onPress={pay} busy={busy} disabled={!valid || !accepted} />
        <Button title="Cancel and release seats" kind="secondary" onPress={cancel} style={{ marginTop: 10 }} />
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
