import { Link, router, usePathname, type Href } from 'expo-router';
import type { MouseEvent, ReactNode } from 'react';
import { Platform, Pressable, type GestureResponderEvent, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

/** The tabs (Movies, Resale, Tickets, Profile); everything else is a stack screen above them. */
const TABS = ['/', '/resale', '/tickets', '/account'];

/**
 * Site-level navigation (header links, footer links, logo): go to a top-level page without stacking copies.
 * A tab is reached by closing the stack screens above the tabs; a stack page is pushed from there.
 */
export function goTo(href: Href) {
  const path = typeof href === 'string' ? href.split('?')[0] : href.pathname;
  const above = router.canDismiss();
  if (TABS.includes(path)) {
    // From a stack screen, close it (and any below) back to the tabs, on that tab; between tabs, switch tab.
    if (above) router.dismissTo(href);
    else router.navigate(href);
  } else {
    if (above) router.dismissAll();
    router.push(href);
  }
}

/** Which top-level section a path belongs to, for the active nav link. */
export type Section = 'movies' | 'resale' | 'tickets' | 'help' | 'profile' | 'portal';

export function sectionOf(path: string): Section | undefined {
  if (path === '/' || /^\/(movie|showtime|checkout)\b/.test(path)) return 'movies';
  if (path.startsWith('/resale')) return 'resale';
  if (/^\/tickets?\b/.test(path)) return 'tickets';
  if (path.startsWith('/support')) return 'help';
  if (/^\/(account|sign-in|sign-up)\b/.test(path)) return 'profile';
  if (path.startsWith('/operator')) return 'portal';
  return undefined;
}

export const useSection = () => sectionOf(usePathname());

type PressEvent = GestureResponderEvent | MouseEvent<HTMLAnchorElement>;

/** A left click without modifier keys (others open a new tab or window, so the browser handles them). */
const plainClick = (e: PressEvent) => {
  const m = e.nativeEvent as unknown as { metaKey?: boolean; ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean; button?: number };
  return !m.metaKey && !m.ctrlKey && !m.shiftKey && !m.altKey && (m.button == null || m.button === 0);
};

/**
 * A link to a top-level page. On web it is a real <a href> (open in a new tab works); a plain click navigates
 * inside the app with goTo. `children` is text unless `box` is set: then it is a box (a pill, the logo) holding
 * any content.
 */
export function NavLink({ href, children, style, box, accessibilityLabel, current }: {
  href: Href; children: ReactNode; style?: StyleProp<TextStyle>; box?: StyleProp<ViewStyle>; accessibilityLabel?: string; current?: boolean;
}) {
  const onPress = (e: PressEvent) => {
    if (Platform.OS === 'web' && !plainClick(e)) return;
    e.preventDefault();
    goTo(href);
  };
  if (box && Platform.OS !== 'web') {
    return (
      <Pressable onPress={() => goTo(href)} accessibilityRole="link" accessibilityLabel={accessibilityLabel} aria-current={current ? 'page' : undefined} style={box}>
        {children}
      </Pressable>
    );
  }
  return (
    <Link href={href} onPress={onPress} accessibilityLabel={accessibilityLabel} aria-current={current ? 'page' : undefined}
      style={box ? [{ display: 'flex', flexDirection: 'row' }, box as StyleProp<TextStyle>] : style}>
      {children}
    </Link>
  );
}
