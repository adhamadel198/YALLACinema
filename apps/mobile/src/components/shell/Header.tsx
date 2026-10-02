import { usePathname, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View, type PressableStateCallbackType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { backdropBlur, colors, layout } from '../../theme';
import { useType } from '../../typography';
import { LanguageButton, pill } from '../LanguageButton';
import { Icon } from './icons';
import { NavLink, sectionOf, type Section } from './nav';

const LOGO = require('../../../assets/yalla-logo.png');
/** The logo file is 828×574. */
const LOGO_RATIO = 828 / 574;

/** Phone header heights: the live 96px bar on the web; a little shorter in the native app, under the status bar. */
const PHONE_BAR = Platform.OS === 'web' ? 96 : 80;

function Logo({ width, height }: { width: number; height: number }) {
  const { t } = useI18n();
  const w = Math.min(width, height * LOGO_RATIO);
  return (
    <NavLink href="/" accessibilityLabel={t.shell.homeLink} box={{ width, height, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={LOGO} style={{ width: w, height: w / LOGO_RATIO }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </NavLink>
  );
}

type Hoverable = PressableStateCallbackType & { hovered?: boolean };

/**
 * The site header. Wide web (>760px): logo, nav links, language pill and Sign in / account pill, like the live
 * desktop bar. Phones and the native app: the logo centred, a back button at the start when there is somewhere to
 * go back to, and the language pill at the end.
 * Used by the root stack and the tabs (src/app/_layout.tsx, src/app/(tabs)/_layout.tsx); screens don't render it.
 */
export function SiteHeader({ onBack, left }: { onBack?: () => void; left?: ReactNode }) {
  const { desktop } = useLayout();
  return desktop ? <DesktopHeader /> : <PhoneHeader onBack={onBack} left={left} />;
}

function DesktopHeader() {
  const { t } = useI18n();
  const { font } = useType();
  const { account } = useAuth();
  const insets = useSafeAreaInsets();
  const { gutter, homeGutter } = useLayout();
  const path = usePathname();
  const section = sectionOf(path);
  const home = path === '/';
  const portal = section === 'portal';
  const items: { key: Section | 'customer'; label: string; href: Href }[] = portal
    ? [{ key: 'customer', label: t.shell.customerSite, href: '/' }, { key: 'portal', label: t.shell.cinemaPortal, href: '/operator' }]
    : [
      { key: 'movies', label: t.shell.navMovies, href: '/' },
      { key: 'resale', label: t.shell.navResale, href: '/resale' },
      { key: 'tickets', label: t.shell.navTickets, href: '/tickets' },
      { key: 'help', label: t.shell.navHelp, href: '/support' },
    ];
  const g = home ? homeGutter : gutter;
  const accountHref: Href = account?.role === 'operator' ? '/operator' : '/account';
  return (
    <View style={[styles.bar, backdropBlur(12), { paddingTop: insets.top }]}>
      <View style={[styles.row, { height: home ? 76 : 72, maxWidth: (home ? layout.homeMaxWidth : layout.maxWidth) + 2 * g, paddingHorizontal: g }]}>
        <Logo width={98} height={68} />
        <View role="navigation" aria-label={t.shell.mainNav} style={[styles.nav, { gap: home ? 30 : 26 }]}>
          {items.map((item) => {
            const on = item.key === section;
            return (
              <NavLink key={item.key} href={item.href} current={on}
                style={[font(on ? 500 : 400), { fontSize: home ? 15 : 14, lineHeight: 22, color: on ? colors.goldText : colors.navText }]}>
                {item.label}
              </NavLink>
            );
          })}
        </View>
        <View style={styles.side}>
          <LanguageButton />
          <NavLink href={accountHref} current={section === 'profile'}
            accessibilityLabel={account ? t.shell.accountPill(account.name) : undefined}
            box={[pill(), { maxWidth: 190 }]}>
            <Text numberOfLines={1} style={[font(account ? 700 : 800), { color: colors.inkPill, fontSize: 15, lineHeight: 22 }]}>
              {account ? account.name.split(' ')[0] : t.shell.navSignIn}
            </Text>
          </NavLink>
        </View>
      </View>
    </View>
  );
}

function PhoneHeader({ onBack, left }: { onBack?: () => void; left?: ReactNode }) {
  const { t, rtl } = useI18n();
  const insets = useSafeAreaInsets();
  const logoH = PHONE_BAR;
  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={[styles.phoneRow, { height: PHONE_BAR }]}>
        <View style={styles.slot}>
          {left ?? (onBack ? (
            <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={t.shell.back} hitSlop={8}
              style={(state: Hoverable) => [styles.back, (state.hovered || state.pressed) && { backgroundColor: colors.surface }]}>
              <Icon name="back" color={colors.ink} size={24} flip={rtl} />
            </Pressable>
          ) : null)}
        </View>
        <View style={styles.center} pointerEvents="box-none">
          <Logo width={Math.round(logoH * 1.375)} height={logoH} />
        </View>
        <View style={[styles.slot, { alignItems: 'flex-end' }]}>
          <LanguageButton compact />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: colors.headerBg, borderBottomWidth: 1, borderBottomColor: colors.lineHeader, zIndex: 5 },
  row: { width: '100%', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  nav: { flexDirection: 'row', alignItems: 'center' },
  side: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  slot: { width: 90, alignItems: 'flex-start', justifyContent: 'center', zIndex: 1 },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  back: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
