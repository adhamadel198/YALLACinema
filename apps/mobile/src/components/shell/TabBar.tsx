import { router, usePathname } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { backdropBlur, colors, shadows } from '../../theme';
import { useType } from '../../typography';
import { Icon, type IconName } from './icons';

type TabName = 'index' | 'resale' | 'tickets' | 'account';

const ICONS: Record<string, IconName> = { index: 'movies', resale: 'resale', tickets: 'tickets', account: 'profile' };

type NavItem = { key: string; name: string; label: string; on: boolean; onPress: () => void; onLongPress?: () => void; a11yLabel?: string; testID?: string };

/** The bar itself (live `.mobile-nav`): dark, outline icons over 10px labels, the active item in gold. */
function BottomNav({ items, bottom }: { items: NavItem[]; bottom: number }) {
  const { font } = useType();
  return (
    <View role="tablist" style={[styles.bar, backdropBlur(16), { paddingBottom: bottom, minHeight: 76 + bottom }]}>
      {items.map((item) => {
        const color = item.on ? colors.navActive : colors.navIdle;
        return (
          <Pressable key={item.key} onPress={item.onPress} onLongPress={item.onLongPress}
            role="tab" aria-selected={item.on} accessibilityLabel={item.a11yLabel ?? item.label} testID={item.testID}
            style={styles.item}>
            <Icon name={ICONS[item.name] ?? 'home'} color={color} />
            <Text numberOfLines={1} style={[font(700), { color, fontSize: 10, lineHeight: 13 }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The phone bottom nav on the four tab screens. Hidden on wide web, where the header carries the nav links.
 */
export function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { desktop } = useLayout();
  if (desktop) return null;
  const items = state.routes.map((route, i): NavItem => {
    const { options } = descriptors[route.key];
    const label = typeof options.title === 'string' ? options.title : route.name;
    const on = state.index === i;
    return {
      key: route.key, name: route.name, label, on, a11yLabel: options.tabBarAccessibilityLabel, testID: options.tabBarButtonTestID,
      onPress: () => {
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!on && !event.defaultPrevented) navigation.navigate(route.name, route.params);
      },
      onLongPress: () => navigation.emit({ type: 'tabLongPress', target: route.key }),
    };
  });
  return <BottomNav items={items} bottom={insets.bottom} />;
}

const TAB_HREFS = { index: '/', resale: '/resale', tickets: '/tickets', account: '/account' } as const;

/** Which tab a customer page belongs to, as the live pages light up their bottom nav (`null`: none lit). */
function tabFor(path: string): TabName | null {
  if (/^\/(movie|showtime|checkout)\//.test(path)) return 'index';
  if (path.startsWith('/resale/')) return 'resale';
  if (path.startsWith('/ticket/')) return 'tickets';
  if (path === '/sign-in' || path === '/sign-up') return 'account';
  return null;
}

/** Customer pages outside the tabs that still show the bottom nav, like every page of the live site. */
const STACK_PAGES = /^\/(movie|showtime|checkout|ticket|resale)\/|^\/(sign-in|sign-up|support)$/;

/**
 * The same bottom nav under the customer pages that sit on top of the tabs (movie, seats, checkout, ticket, resale
 * pages, sign-in, help), on phone-size web only: the live site shows it on every page. Native apps keep the usual
 * pushed-screen look without it. The staff portal has its own navigation.
 */
export function StackBottomNav() {
  const { t } = useI18n();
  const { desktop } = useLayout();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'web' || desktop || !STACK_PAGES.test(path)) return null;
  const active = tabFor(path);
  const labels: Record<TabName, string> = { index: t.tabMovies, resale: t.tabResale, tickets: t.tabTickets, account: t.tabProfile };
  const items = (Object.keys(TAB_HREFS) as TabName[]).map((name): NavItem => ({
    key: name, name, label: labels[name], on: name === active,
    onPress: () => router.navigate(TAB_HREFS[name]),
  }));
  return <BottomNav items={items} bottom={insets.bottom} />;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', gap: 4, paddingTop: 7, paddingHorizontal: 10,
    backgroundColor: colors.tabBarBg, borderTopWidth: 1, borderTopColor: colors.lineHeader, ...shadows.tabBar,
  },
  item: { flex: 1, minWidth: 0, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 9 },
});
