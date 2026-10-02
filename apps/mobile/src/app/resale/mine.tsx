import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import { Platform, RefreshControl, Text, View } from 'react-native';
import { resaleApi } from '../../api/resale';
import { useRequest } from '../../api/useRequest';
import { useAuth } from '../../auth';
import { signInHref } from '../../auth/routes';
import { Crumbs, Page } from '../../components/page';
import { ListingRow } from '../../components/resale/ListingRow';
import { PanelHead } from '../../components/resale/parts';
import { Button, Notice, Panel, Spinner } from '../../components/ui';
import { useI18n } from '../../i18n';
import { colors } from '../../theme';
import { useType } from '../../typography';

/** The seller's listings (BRD 11): what sold, what they receive, and withdrawing what hasn't sold. */
export default function MyListings() {
  const { t, lang } = useI18n();
  const { type } = useType();
  const { account, ready } = useAuth();
  // Loads once the saved session is restored, so "no listings" never shows before the seller's listings arrive.
  const listings = useRequest(() => (ready && account ? resaleApi.myListings() : Promise.resolve(null)), [lang, ready, account?.id]);
  useFocusEffect(useCallback(() => listings.reload(), [listings.reload]));

  const page = (children: ReactNode) => (
    <Page footer="resale" contentStyle={{ paddingTop: Platform.OS === 'web' ? 0 : 25 }}
      refreshControl={<RefreshControl refreshing={listings.loading && !!listings.data} onRefresh={listings.reload} tintColor={colors.gold} />}>
      <Stack.Screen options={{ title: t.resaleMyListings }} />
      <Crumbs items={[{ label: t.shell.crumbHome, href: '/' }, { label: t.resaleTitle, href: '/resale' }, { label: t.resaleUi.manageListings }]} />
      <Panel padding={18}>
        <PanelHead eyebrow={t.resaleUi.mineKicker} title={t.resaleUi.mineTitle} />
        {children}
      </Panel>
    </Page>
  );
  const notice = (message: string, action: ReactNode) => page(
    <View style={{ gap: 12 }}>
      <Notice role={action ? 'alert' : undefined}>{message}</Notice>
      <View style={{ flexDirection: 'row' }}>{action}</View>
    </View>,
  );

  if (!ready) return page(<Spinner />);
  if (!account) return notice(t.resaleSignInNote, <Button title={t.resaleGoSignIn} size="small" inline onPress={() => router.push(signInHref('/resale/mine'))} />);
  if (listings.error && !listings.data) return notice(t.loadFailed, <Button title={t.tryAgain} size="small" inline onPress={listings.reload} />);
  if (!listings.data) return page(<Spinner />);

  const all = listings.data;
  return page(
    all.length ? all.map((l, i) => <ListingRow key={l.id} listing={l} onChanged={listings.reload} last={i === all.length - 1} />)
      : <Text style={[type.body, { color: colors.muted }]}>{t.resaleUi.mineEmpty}</Text>,
  );
}
