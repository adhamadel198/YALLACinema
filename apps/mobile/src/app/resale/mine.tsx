import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { resaleApi, type ListingStatus, type MyListing } from '../../api/resale';
import { useRequest } from '../../api/useRequest';
import { Pill, SignInPrompt } from '../../components/resale';
import { Button, Message, Panel } from '../../components/ui';
import { useAuth } from '../../auth';
import { showDate } from '../../format';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme';

const tone: Record<ListingStatus, 'accent' | 'good' | 'muted'> = { open: 'accent', sold: 'good', withdrawn: 'muted', expired: 'muted', closed: 'muted' };

/** The seller's listings (BRD 11): what sold, what they receive, and withdrawing what hasn't sold. */
export default function MyListings() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { account, ready } = useAuth();
  // Loads once the saved session is restored, so "no listings" never shows before the seller's listings arrive.
  const listings = useRequest(() => (ready && account ? resaleApi.myListings() : Promise.resolve(null)), [lang, ready, account?.id]);
  useFocusEffect(useCallback(() => listings.reload(), [listings.reload]));

  const title = <Stack.Screen options={{ title: t.resaleMyListings }} />;
  if (!ready) return <>{title}<ActivityIndicator style={{ flex: 1 }} color={theme.accent} /></>;
  if (!account) return <>{title}<View style={{ padding: 16 }}><SignInPrompt text={t.resaleSignInNote} /></View></>;
  if (listings.error && !listings.data) return <>{title}<Message text={t.loadFailed} onRetry={listings.reload} /></>;
  if (!listings.data) return <>{title}<ActivityIndicator style={{ flex: 1 }} color={theme.accent} /></>;

  return (
    <>
      {title}
      <FlatList
        data={listings.data}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        refreshing={listings.loading}
        onRefresh={listings.reload}
        ListEmptyComponent={<Text style={{ color: theme.muted, lineHeight: 21 }}>{t.resaleMineEmpty}</Text>}
        renderItem={({ item }) => <ListingCard listing={item} onChanged={listings.reload} />}
      />
    </>
  );
}

function ListingCard({ listing: l, onChanged }: { listing: MyListing; onChanged: () => void }) {
  const theme = useTheme();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();
  const unsold = l.tickets.some((x) => x.state === 'listed');
  const waiting = l.tickets.some((x) => x.ticketStatus === 'pending-reactivation');
  const reviewing = l.tickets.some((x) => x.ticketStatus === 'under-review');

  async function withdraw() {
    setBusy(true);
    setNote(undefined);
    try {
      await resaleApi.withdraw(l.id);
      setNote(t.resaleWithdrawn);
      onChanged();
    } catch (e) {
      setNote(e instanceof ApiError && e.body.code === 'busy' ? t.resaleBusy : t.genericError);
      if (e instanceof ApiError && e.status === 409) onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <View style={styles.row}>
        <Text style={[styles.title, { color: theme.ink }]}>{l.showtime.movie.title}</Text>
        <Pill label={t.resaleStatus[l.status]} tone={tone[l.status]} />
      </View>
      <Text style={{ color: theme.muted }}>{l.showtime.cinema.name}</Text>
      <Text style={{ color: theme.muted }}>{showDate(l.showtime.startsAt, t)}</Text>
      <Text style={{ color: theme.ink, marginTop: 8, fontWeight: '700' }}>{t.resalePriceEach(t.egp(l.price))}</Text>
      <Text style={{ color: theme.muted, marginTop: 2 }}>{t.resaleYouReceiveEach(t.egp(l.sellerReceives))}</Text>

      <View style={[styles.seats, { borderColor: theme.line }]}>
        {l.tickets.map((x) => (
          <View key={x.ticketId} style={styles.seat}>
            <Text style={{ color: theme.ink, fontWeight: '700' }}>{t.seat(x.seat)}</Text>
            <Text style={{ color: x.state === 'sold' ? theme.good : x.state === 'listed' ? theme.accent : theme.muted, fontSize: 12 }}>
              {x.ticketStatus === 'pending-reactivation' || x.ticketStatus === 'under-review' ? t.resaleTicketStatus[x.ticketStatus] : t.resaleTicketState[x.state]}
            </Text>
          </View>
        ))}
      </View>

      {l.pendingPayout > 0 && <Text style={{ color: theme.good, fontWeight: '700', marginTop: 10 }}>{t.resalePendingPayout(t.egp(l.pendingPayout))}</Text>}
      {waiting && <Text style={{ color: theme.accent, fontSize: 12, marginTop: 8 }}>{t.resaleWaitingCinema}</Text>}
      {reviewing && <Text style={{ color: theme.accent, fontSize: 12, marginTop: 8 }}>{t.resaleUnderReview}</Text>}
      {note && <Text style={{ color: note === t.resaleWithdrawn ? theme.good : theme.accent, marginTop: 10 }}>{note}</Text>}
      {l.status === 'open' && unsold && (
        <Button title={t.resaleWithdraw} kind="secondary" onPress={withdraw} busy={busy} style={{ marginTop: 12 }} />
      )}
    </Panel>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  title: { fontSize: 17, fontWeight: '800', flexShrink: 1 },
  seats: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  seat: { minWidth: 72 },
});
