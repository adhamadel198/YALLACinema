import type { BottomTabBarProps } from 'expo-router/tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLayout } from '../../layout';
import { backdropBlur, colors, shadows } from '../../theme';
import { useType } from '../../typography';
import { Icon, type IconName } from './icons';

const ICONS: Record<string, IconName> = { index: 'movies', resale: 'resale', tickets: 'tickets', account: 'profile' };

/**
 * The phone bottom nav (live `.mobile-nav`): dark bar, outline icons over 10px labels, active item in gold.
 * Hidden on wide web, where the header carries the nav links.
 */
export function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { desktop } = useLayout();
  const { font } = useType();
  if (desktop) return null;
  return (
    <View role="tablist" style={[styles.bar, backdropBlur(16), { paddingBottom: insets.bottom, minHeight: 76 + insets.bottom }]}>
      {state.routes.map((route, i) => {
        const { options } = descriptors[route.key];
        const label = typeof options.title === 'string' ? options.title : route.name;
        const on = state.index === i;
        const color = on ? colors.navActive : colors.navIdle;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!on && !event.defaultPrevented) navigation.navigate(route.name, route.params);
        };
        return (
          <Pressable key={route.key} onPress={onPress} onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
            role="tab" aria-selected={on} accessibilityLabel={options.tabBarAccessibilityLabel ?? label} testID={options.tabBarButtonTestID}
            style={styles.item}>
            <Icon name={ICONS[route.name] ?? 'home'} color={color} />
            <Text numberOfLines={1} style={[font(700), { color, fontSize: 10, lineHeight: 13 }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', gap: 4, paddingTop: 7, paddingHorizontal: 10,
    backgroundColor: colors.tabBarBg, borderTopWidth: 1, borderTopColor: colors.lineHeader, ...shadows.tabBar,
  },
  item: { flex: 1, minWidth: 0, minHeight: 56, alignItems: 'center', justifyContent: 'center', gap: 3, borderRadius: 9 },
});
