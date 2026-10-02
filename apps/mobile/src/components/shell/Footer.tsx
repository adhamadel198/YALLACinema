import type { Href } from 'expo-router';
import { Fragment } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import type { Strings } from '../../i18n/strings';
import { useLayout } from '../../layout';
import { colors, layout } from '../../theme';
import { useType } from '../../typography';
import { NavLink } from './nav';

/** Which links a page's footer shows (the live pages each have their own pair). */
export type FooterPreset = 'default' | 'home' | 'movie' | 'seats' | 'checkout' | 'ticket' | 'resale' | 'support' | 'account' | 'operator';

export type FooterLink = { label: string; href: Href };

function presetLinks(preset: FooterPreset, t: Strings, supportRef?: string): FooterLink[] {
  const s = t.shell;
  const support: Href = supportRef ? { pathname: '/support', params: { ref: supportRef } } : '/support';
  switch (preset) {
    case 'movie': return [{ label: s.helpSupport, href: '/support' }, { label: s.policies, href: '/support' }];
    case 'seats': return [{ label: s.bookingSupport, href: '/support' }, { label: s.cancellationPolicy, href: '/support' }];
    case 'checkout': return [{ label: s.needHelp, href: '/support' }];
    case 'ticket': return [{ label: s.needBookingHelp, href: support }];
    case 'resale': return [{ label: s.resaleHelp, href: '/support' }, { label: s.policies, href: '/support' }];
    case 'support': return [{ label: s.home, href: '/' }, { label: s.ticketResale, href: '/resale' }, { label: s.cinemaPortal, href: '/operator' }];
    case 'account': return [{ label: s.helpSupport, href: '/support' }];
    case 'operator': return [{ label: s.partnerSupport, href: '/support' }];
    default: return [{ label: s.helpSupport, href: '/support' }, { label: s.ticketResale, href: '/resale' }, { label: s.cinemaPortal, href: '/operator' }];
  }
}

/**
 * The site footer: "© 2026 YALLA Cinema · Cairo, Egypt" and the page's links. Web only (like the live site);
 * `Page` adds it for you. `home` uses the home page's gold links and wider column; `links` overrides the preset;
 * `supportRef` adds `?ref=` to the ticket page's help link.
 */
export function SiteFooter({ preset = 'default', links, home, supportRef, native }: {
  preset?: FooterPreset; links?: FooterLink[]; home?: boolean; supportRef?: string; native?: boolean;
}) {
  const { t } = useI18n();
  const { font } = useType();
  const l = useLayout();
  if (Platform.OS !== 'web' && !native) return null;
  const items = links ?? presetLinks(preset, t, supportRef);
  const gold = home || preset === 'home';
  const gutter = home ? l.homeGutter : l.gutter;
  const text = [font(400), { fontSize: 12, lineHeight: 18.6, color: colors.footerInk }];
  return (
    <View role="contentinfo" style={styles.footer}>
      <View style={[styles.inner, { maxWidth: (home ? layout.homeMaxWidth : layout.maxWidth) + 2 * gutter, paddingHorizontal: gutter }, l.narrow && styles.stacked]}>
        <Text style={text}>{preset === 'operator' ? t.shell.partnerPortal : t.shell.footerCopy}</Text>
        <View role="navigation" aria-label={t.shell.footerLinks} style={[styles.links, { gap: gold ? 0 : 18 }]}>
          {items.map((link, i) => (
            <Fragment key={link.label}>
              {gold && i > 0 ? <Text aria-hidden style={[text, { color: colors.goldBright }]}>{' · '}</Text> : null}
              <NavLink href={link.href} style={[text, gold && { color: colors.goldBright }]}>{link.label}</NavLink>
            </Fragment>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { backgroundColor: colors.bg, borderTopWidth: 1, borderTopColor: colors.lineFooter, paddingVertical: 27 },
  inner: { width: '100%', alignSelf: 'center', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
  stacked: { flexDirection: 'column', alignItems: 'flex-start', gap: 10 },
  links: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
});
