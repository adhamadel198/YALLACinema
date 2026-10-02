import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, Text, View } from 'react-native';
import { accountsApi } from '../../api/accounts';
import { api } from '../../api/client';
import { resaleApi } from '../../api/resale';
import { useRequest } from '../../api/useRequest';
import { useAuth } from '../../auth';
import { Chips } from '../../components/Chips';
import { Columns, Page } from '../../components/page';
import { ListingRow } from '../../components/resale/ListingRow';
import { MarketCard } from '../../components/resale/MarketCard';
import { OwnersPanel } from '../../components/resale/OwnersPanel';
import { PanelHead, ResaleHero, Subtle } from '../../components/resale/parts';
import { Button, Eyebrow, H2, H3, Notice, Panel, SmallCard, Spinner } from '../../components/ui';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { colors } from '../../theme';
import { useType } from '../../typography';

const ALL = 'all';

/**
 * Resale marketplace (BRD 11), laid out as the live resale.html: the hero, open listings (soonest show first) with
 * area tabs beside the "For ticket owners" panel, the seller's open listings, and how resale protects both sides.
 * Anyone can browse; buying and selling need an account.
 */
export default function Resale() {
  const { t, lang } = useI18n();
  const { type } = useType();
  const { wide } = useLayout();
  const { account, ready } = useAuth();
  const [area, setArea] = useState(ALL);
  // Who is viewing changes the "Your listing" labels.
  const listings = useRequest(resaleApi.listings, [lang, account?.id]);
  // Listings carry the cinema but not its area: the cinema list maps one to the other for the area tabs.
  const cinemas = useRequest(() => api.cinemas().catch(() => []), [lang]);
  const owner = useRequest(async () => {
    if (!ready || !account) return null;
    const [bookings, payout, mine] = await Promise.all([accountsApi.bookings(), resaleApi.payoutMethod(), resaleApi.myListings()]);
    return { bookings, payout, mine };
  }, [lang, ready, account?.id]);
  const reloadAll = useCallback(() => {
    listings.reload();
    owner.reload();
  }, [listings.reload, owner.reload]);
  useFocusEffect(reloadAll);

  const areaOf = useMemo(() => new Map((cinemas.data ?? []).map((c) => [c.id, c.area as string])), [cinemas.data]);
  // The areas that have a cinema, in the app's area order (Maadi, New Cairo, 6th of October).
  const areas = Object.keys(t.areas).filter((a) => [...areaOf.values()].includes(a));
  const shown = (listings.data ?? []).filter((l) => area === ALL || areaOf.get(l.showtime.cinema.id) === area);
  const open = (owner.data?.mine ?? []).filter((l) => l.status === 'open');

  const market = (
    <View>
      <Eyebrow>{t.resaleUi.marketKicker}</Eyebrow>
      <H2>{t.resaleUi.marketTitle}</H2>
      <Text style={[type.body, { color: colors.muted, marginTop: 3, marginBottom: 15 }]}>{t.resaleUi.marketLead}</Text>
      {areas.length ? (
        <Chips variant="tab" scroll label={t.resaleUi.areaFilter} value={area} onChange={setArea} style={{ marginBottom: 13, flexGrow: 0 }}
          options={[{ value: ALL, label: t.resaleUi.allTickets }, ...areas.map((a) => ({ value: a, label: t.areas[a] ?? a }))]} />
      ) : null}
      {listings.error && !listings.data ? (
        <Panel>
          <Text style={[type.body, { marginBottom: 12 }]}>{t.loadFailed}</Text>
          <Button title={t.tryAgain} size="small" inline onPress={listings.reload} />
        </Panel>
      ) : !listings.data ? <Spinner /> : shown.length ? (
        <View style={{ gap: 10 }}>
          {shown.map((item) => (
            <MarketCard key={item.id} item={item} onOpen={() => router.push({ pathname: '/resale/[id]', params: { id: item.id } })} />
          ))}
        </View>
      ) : (
        <Panel>
          <H3 style={{ marginBottom: 4 }}>{area === ALL ? t.resaleEmptyTitle : t.resaleUi.noneInArea(t.areas[area] ?? area)}</H3>
          <Text style={[type.small, { color: colors.muted }]}>{area === ALL ? t.resaleEmptyBody : t.resaleUi.tryAnotherArea}</Text>
        </Panel>
      )}
      <Subtle>{t.resaleUi.refundsPolicy}</Subtle>
    </View>
  );

  return (
    <Page footer="resale" refreshControl={<RefreshControl refreshing={listings.loading && !!listings.data} onRefresh={reloadAll} tintColor={colors.gold} />}>
      <ResaleHero />
      <Columns ratio={[1.1, 0.9]} gap={20}>
        {[
          <View key="market">{market}</View>,
          <OwnersPanel key="owners" account={ready ? account : null}
            bookings={owner.data?.bookings ?? (owner.error ? [] : undefined)}
            payout={owner.data ? owner.data.payout : owner.error ? null : undefined} />,
        ]}
      </Columns>

      {account ? (
        <Panel padding={18} style={{ marginTop: 27 }}>
          <PanelHead eyebrow={t.resaleUi.mineKicker} title={t.resaleUi.mineTitle} />
          {!owner.data ? (owner.error ? <Text style={[type.body, { color: colors.muted }]}>{t.loadFailed}</Text> : <Spinner size="small" />)
            : open.length ? open.slice(0, 3).map((l, i) => (
              <ListingRow key={l.id} listing={l} onChanged={reloadAll} last={i === Math.min(open.length, 3) - 1} />
            )) : <Text style={[type.body, { color: colors.muted }]}>{t.resaleUi.mineEmpty}</Text>}
          {owner.data?.mine.length ? (
            <Button title={t.resaleUi.manageListings} kind="soft" size="small" inline onPress={() => router.push('/resale/mine')} style={{ marginTop: 12 }} />
          ) : null}
        </Panel>
      ) : null}

      <View style={{ paddingTop: 34 }}>
        <Eyebrow>{t.resaleUi.protectKicker}</Eyebrow>
        <View style={[{ marginTop: 13, gap: 16 }, wide && { flexDirection: 'row' }]}>
          {t.resaleUi.protect.map((c) => <SmallCard key={c.title} title={c.title} body={c.body} style={wide ? { flex: 1 } : undefined} />)}
        </View>
        <Notice style={{ marginTop: 14 }}>{t.resaleUi.showChangeNotice}</Notice>
      </View>
    </Page>
  );
}
