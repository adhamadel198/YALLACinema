import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { accountsApi } from '../../api/accounts';
import { api, ApiError } from '../../api/client';
import { myBookingIds } from '../../api/myBookings';
import type { Booking } from '../../api/types';
import { useRequest } from '../../api/useRequest';
import { useAuth } from '../../auth';
import { signInHref } from '../../auth/routes';
import { BookingCard } from '../../components/account/BookingCard';
import { CardGrid, CardTitle, TicketsCard } from '../../components/account/parts';
import { Page, PageIntro } from '../../components/page';
import { goTo } from '../../components/shell/nav';
import { Button, Eyebrow, H3, Notice, Panel, Spinner } from '../../components/ui';
import { useI18n } from '../../i18n';
import { colors } from '../../theme';
import { useType } from '../../typography';

/**
 * My Tickets: bookings made on this device, plus the account's booking history when signed in (BRD 5.1), newest
 * first and without duplicates. Guest bookings made on this device with the account's email join the account when
 * signing in (AuthProvider claims them), so they show once. Ends with the live "Your tickets" resale card.
 */
export default function Tickets() {
  const { t, lang } = useI18n();
  const { type } = useType();
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
    // A booking the API no longer knows (the dev server keeps data in memory) is skipped, and so are tickets of an
    // account that isn't signed in here (they show again after signing in to it).
    const device = await Promise.all((await myBookingIds()).filter((id) => !listed.has(id)).map((id) => api.booking(id).catch(() => null)));
    const shown = device.filter((b): b is Booking => b !== null && (b.accountId === null || b.accountId === account?.id));
    const all = [...mine, ...shown].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { all, accountFailed };
  }, [lang, ready, account?.id]);
  useFocusEffect(useCallback(() => bookings.reload(), [bookings.reload]));

  const c = t.accountUi;
  const all = bookings.data?.all;

  return (
    <Page footer="account"
      refreshControl={<RefreshControl refreshing={!!bookings.data && bookings.loading} onRefresh={bookings.reload} tintColor={colors.gold} colors={[colors.gold]} />}>
      <PageIntro eyebrow={c.ticketsKicker} title={c.ticketsTitle} lead={all?.length ? c.ticketsLead : undefined} />

      {!bookings.data ? <Spinner /> : (
        <View style={{ gap: 10 }}>
          {bookings.data.accountFailed ? (
            <Notice role="alert" style={{ marginBottom: 6 }}>
              <Text style={[type.small, { color: colors.noticeInk, marginBottom: 10 }]}>{t.historyAccountFailed}</Text>
              <Button kind="soft" size="small" inline title={t.tryAgain} onPress={bookings.reload} />
            </Notice>
          ) : null}

          {all?.length ? all.map((b) => <BookingCard key={b.id} booking={b} />) : (
            <Panel testID="tickets-empty">
              <H3>{t.noTicketsTitle}</H3>
              <Text style={[type.small, { color: colors.muted, marginTop: 2, marginBottom: 13 }]}>{account ? t.historySignedInEmpty : t.noTicketsBody}</Text>
              <Button size="small" inline title={c.browseMovies} onPress={() => goTo('/')} />
            </Panel>
          )}
        </View>
      )}

      {/* Two cards side by side when signed out; the resale card alone spans the column. */}
      <CardGrid columns={ready && !account ? 2 : 1} style={{ marginTop: 27 }}>
        {ready && !account ? (
          <Panel testID="tickets-sign-in" style={{ flexGrow: 1 }}>
            <Eyebrow>{c.historySignInKicker}</Eyebrow>
            <CardTitle>{c.historySignInTitle}</CardTitle>
            <Text style={[type.small, { color: colors.muted, marginVertical: 13 }]}>{c.historySignInBody}</Text>
            <Button size="small" inline title={t.signIn} onPress={() => router.push(signInHref('/tickets'))} />
            {/* Guest bookings on this device made with the account's email join the account when signing in. */}
            <Text style={[type.micro, { marginTop: 14 }]}>{c.historyGuestNote}</Text>
          </Panel>
        ) : null}
        <TicketsCard style={{ flexGrow: 1 }} />
      </CardGrid>
    </Page>
  );
}
