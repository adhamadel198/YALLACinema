import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { resaleApi } from '../../api/resale';
import { useRequest } from '../../api/useRequest';
import { Parts, Pill, SignInPrompt } from '../../components/resale';
import { Button, Message, Panel } from '../../components/ui';
import { useAuth } from '../../auth';
import { showDate } from '../../format';
import { useI18n } from '../../i18n';
import { describeSeats } from '../../seats';
import { useTheme } from '../../theme';

/** Resale marketplace (BRD 11): open listings, soonest show first. Anyone can browse; buying needs an account. */
export default function Resale() {
  const theme = useTheme();
  const { t, lang, rtl } = useI18n();
  const { account } = useAuth();
  // Who is viewing changes the "Your listing" labels.
  const listings = useRequest(resaleApi.listings, [lang, account?.id]);
  useFocusEffect(useCallback(() => listings.reload(), [listings.reload]));

  if (listings.error && !listings.data) return <Message text={t.loadFailed} onRetry={listings.reload} />;
  if (!listings.data) return <ActivityIndicator style={{ flex: 1 }} color={theme.accent} />;

  return (
    <FlatList
      data={listings.data}
      keyExtractor={(l) => l.id}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
      refreshing={listings.loading}
      onRefresh={listings.reload}
      ListHeaderComponent={
        <View style={{ marginBottom: 4 }}>
          <Text style={[styles.kicker, { color: theme.accent }, rtl && styles.noTracking]}>{t.resaleKicker}</Text>
          <Text style={[styles.h1, { color: theme.ink }, rtl && styles.noTracking]}>{t.resaleHero}</Text>
          <Text style={{ color: theme.muted, marginTop: 6, lineHeight: 21 }}>{t.resaleIntro}</Text>
          {account ? (
            <>
              <Button title={t.resaleMyListings} kind="secondary" onPress={() => router.push('/resale/mine')} style={{ marginTop: 14 }} />
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>{t.resaleHowToSell}</Text>
            </>
          ) : (
            <SignInPrompt text={t.resaleSignInNote} style={{ marginTop: 14 }} />
          )}
        </View>
      }
      ListEmptyComponent={
        <Panel>
          <Text style={[styles.title, { color: theme.ink }]}>{t.resaleEmptyTitle}</Text>
          <Text style={{ color: theme.muted, marginTop: 4, lineHeight: 20 }}>{t.resaleEmptyBody}</Text>
        </Panel>
      }
      renderItem={({ item }) => (
        <Pressable onPress={() => router.push({ pathname: '/resale/[id]', params: { id: item.id } })}
          accessibilityRole="button" accessibilityLabel={`${item.showtime.movie.title}, ${item.showtime.cinema.name}, ${t.resalePlusFee(t.egp(item.price))}`}>
          <Panel>
            <View style={styles.row}>
              <View style={[styles.poster, { backgroundColor: item.showtime.movie.poster.from }]}>
                <Text style={styles.symbol}>{item.showtime.movie.poster.symbol}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.ink }]}>{item.showtime.movie.title}</Text>
                <Text style={{ color: theme.muted }}>{item.showtime.cinema.name}</Text>
                <Parts parts={[showDate(item.showtime.startsAt, t), item.showtime.format]} color={theme.ink} style={{ marginTop: 4 }} />
                <Parts parts={[t.seatsList(describeSeats(item.tickets.map((x) => x.seat))), t.resaleTicketCount(item.tickets.length)]}
                  color={theme.ink} style={{ marginTop: 2 }} />
              </View>
            </View>
            <View style={[styles.row, styles.footer, { borderColor: theme.line }]}>
              <Text style={{ color: theme.good, fontWeight: '800', fontSize: 16, flex: 1 }}>{t.resalePlusFee(t.egp(item.price))}</Text>
              {item.mine && <Pill label={t.resaleYours} tone="accent" />}
            </View>
          </Panel>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  kicker: { fontSize: 11, fontWeight: '800', letterSpacing: 1.8 },
  h1: { fontSize: 26, fontWeight: '800', letterSpacing: -0.6, marginTop: 4 },
  noTracking: { letterSpacing: 0 }, // Arabic is cursive; letter spacing breaks the joins.
  title: { fontSize: 17, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  poster: { width: 56, height: 76, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  symbol: { fontSize: 26, color: '#ffffffcc' },
  footer: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});
