import { Tabs } from 'expo-router';
import { SiteHeader } from '../../components/shell/Header';
import { TabBar } from '../../components/shell/TabBar';
import { useI18n } from '../../i18n';
import { colors } from '../../theme';

/** The four tabs, with the site header on top and the live site's bottom nav on phones (none on wide web). */
export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      // Back (browser, Android) returns to the previously visited tab, like pages of the live site.
      backBehavior="history"
      screenOptions={{
        header: () => <SiteHeader />,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.tabMovies }} />
      <Tabs.Screen name="resale" options={{ title: t.tabResale }} />
      <Tabs.Screen name="tickets" options={{ title: t.tabTickets }} />
      <Tabs.Screen name="account" options={{ title: t.tabProfile }} />
    </Tabs>
  );
}
