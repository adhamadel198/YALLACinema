import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { accountsApi } from '../../api/accounts';
import { api, ApiError } from '../../api/client';
import { myBookingIds } from '../../api/myBookings';
import type { Booking } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { useAuth } from '../../auth';
import { signInHref } from '../../auth/routes';
import { Button, Panel } from '../../components/ui';
import { showDate } from '../../format';
import { describeSeats } from '../../seats';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme';

/**
 * Bookings made on this device, plus the account's booking history when signed in (BRD 5.1),
 * newest first and without duplicates. Resale listings join this tab when resale is migrated.
 */
export default function Tickets() {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { account, ready } = useAuth();
  const bookings = useRequest(async () => {
    if (!ready) return null;
    let mine: Booking[] = [];
    let accountFailed = false;
    if (account) {
      try {
        mine = await accountsApi.bookings();
      } catch (e) {
        // A session the API no longer knows signs out (AuthProvider); this device's tickets still show.
        if (!(e instanceof ApiError && e.status === 401)) accountFailed = true;
      }
    }
    const listed = new Set(mine.map((b) => b.id));
    // A booking the API no longer knows (the dev server keeps data in memory) is skipped.
    const device = await Promise.all((await myBookingIds()).filter((id) => !listed.has(id)).map((id) => api.booking(id).catch(() => null)));
    const all = [...mine, ...device.filter((b) => b !== null)].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { all, accountFailed };
  }, [lang, ready, account?.id]);
  useFocusEffect(useCallback(() => bookings.reload(), [bookings.reload]));

  if (!bookings.data) return <ActivityIndicator style={{ flex: 1 }} color={theme.accent} />;
  const { all, accountFailed } = bookings.data;

  return (
    <FlatList
      data={all}
      keyExtractor={(b) => b.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={accountFailed ? (
        <Panel style={{ borderColor: theme.accent }}>
          <Text style={{ color: theme.ink, marginBottom: 10 }}>{t.historyAccountFailed}</Text>
          <Button title={t.tryAgain} kind="secondary" onPress={bookings.reload} />
        </Panel>
      ) : null}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: theme.ink }]}>{t.noTicketsTitle}</Text>
          <Text style={[styles.body, { color: theme.muted }]}>{account ? t.historySignedInEmpty : t.noTicketsBody}</Text>
        </View>
      }
      ListFooterComponent={account ? null : (
        <Panel style={{ marginTop: all.length ? 8 : 0 }}>
          <Text style={[styles.body, { color: theme.ink, marginBottom: 12 }]}>{t.historySignInPrompt}</Text>
          <Button title={t.signIn} kind="secondary" onPress={() => router.push(signInHref('/tickets'))} />
        </Panel>
      )}
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push({ pathname: '/ticket/[id]', params: { id: item.id } })}>
          <Panel>
            <Text style={[styles.title, { color: theme.ink }]}>{item.showtime.movie.title}</Text>
            <Text style={{ color: theme.muted }}>{item.showtime.cinema.name}</Text>
            <Text style={{ color: theme.ink, marginTop: 6 }}>
              {showDate(item.showtime.startsAt, t)} · {t.seatsList(describeSeats(item.tickets.map((x) => x.seat)))}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 12, marginTop: 4 }}>{item.reference}</Text>
          </Panel>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12, flexGrow: 1 },
  title: { fontSize: 17, fontWeight: '800' },
  empty: { paddingHorizontal: 8, paddingTop: 40, paddingBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
});
