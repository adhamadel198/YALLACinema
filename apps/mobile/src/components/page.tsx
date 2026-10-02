import { Link, type Href } from 'expo-router';
import { Fragment, type ReactNode, type Ref } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useI18n } from '../i18n';
import { useLayout } from '../layout';
import { colors, layout } from '../theme';
import { useType } from '../typography';
import { SiteFooter, type FooterPreset } from './shell/Footer';
import { Eyebrow, H1, H2, Lead } from './ui';

// Page structure of the live site: a centred content column, intro block, breadcrumb, booking steps.

/** The centred content column: max 1120 (1180 for `home`), 20px gutters (14 at ≤500; home 24 / 16 at ≤580). */
export function useColumnStyle(home?: boolean): ViewStyle {
  const l = useLayout();
  return {
    width: '100%',
    maxWidth: (home ? layout.homeMaxWidth : layout.maxWidth) + 2 * (home ? l.homeGutter : l.gutter),
    alignSelf: 'center',
    paddingHorizontal: home ? l.homeGutter : l.gutter,
  };
}

/** A View that is the content column. Use inside FlatList headers or full-bleed sections. */
export function PageColumn({ children, home, style }: { children: ReactNode; home?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View style={[useColumnStyle(home), style]}>{children}</View>;
}

/**
 * A scrolling page: the content column, 70px bottom space, then the site footer (web only).
 * - `footer`: a preset name for the footer links ('movie', 'seats', 'checkout', …), `false` for none. Default 'default'.
 * - `home`: the home page's wider column (1180).
 * - `before`: full-bleed content above the column (the home hero).
 * - `scrollRef`: to call scrollTo; any ScrollView prop (refreshControl, onScroll…) passes through.
 * Example: `<Page footer="checkout"><Crumbs items={…} /><PageIntro … /> … </Page>`
 */
export function Page({ children, home, footer = 'default', footerRef, before, scrollRef, contentStyle, ...scroll }: ScrollViewProps & {
  children: ReactNode; home?: boolean; footer?: FooterPreset | false; footerRef?: string; before?: ReactNode;
  scrollRef?: Ref<ScrollView>; contentStyle?: StyleProp<ViewStyle>;
}) {
  const column = useColumnStyle(home);
  return (
    <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" {...scroll}
      style={[{ flex: 1, backgroundColor: colors.bg }, scroll.style]} contentContainerStyle={[{ flexGrow: 1 }, scroll.contentContainerStyle]}>
      {before}
      <View style={[column, { flexGrow: 1, paddingBottom: layout.pageBottom }, contentStyle]}>{children}</View>
      {footer !== false ? <SiteFooter preset={footer} home={home} supportRef={footerRef} /> : null}
    </ScrollView>
  );
}

/**
 * The intro block (`.pageintro`): eyebrow, big title, muted lead, then any children. Padding 38/24 (28/18 on
 * phones). `center` for the ticket page's centred heading.
 */
export function PageIntro({ eyebrow, title, lead, children, center, style }: {
  eyebrow?: string; title: string; lead?: ReactNode; children?: ReactNode; center?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const { narrow } = useLayout();
  return (
    <View style={[{ paddingTop: narrow ? 28 : 38, paddingBottom: narrow ? 18 : 24 }, center && { alignItems: 'center' }, style]}>
      {eyebrow ? <Eyebrow style={[{ marginBottom: 7 }, center && { textAlign: 'center' }]}>{eyebrow}</Eyebrow> : null}
      {/* The live lead is a <p>: its 16px top margin collapses with the title's 12px, and it keeps 16px below. */}
      <H1 center={center} style={{ marginBottom: lead ? 16 : 12 }}>{title}</H1>
      {lead ? <Lead center={center} style={{ marginBottom: 16 }}>{lead}</Lead> : null}
      {children}
    </View>
  );
}

/**
 * A section heading: eyebrow (or the home kicker), H2, optional muted line, and an optional action on the
 * opposite side (e.g. a TextLink "All movies →"). `tone="home"` uses the home kicker colour and 29px title.
 */
export function SectionHead({ eyebrow, title, lead, action, tone = 'page', style }: {
  eyebrow?: string; title: string; lead?: ReactNode; action?: ReactNode; tone?: 'page' | 'home'; style?: StyleProp<ViewStyle>;
}) {
  const { type, rtl } = useType();
  const { width } = useLayout();
  const home = tone === 'home';
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: home ? 22 : 12 }, style]}>
      <View style={{ flexShrink: 1 }}>
        {eyebrow ? <Eyebrow tone={tone} style={{ marginBottom: home ? 4 : 7 }}>{eyebrow}</Eyebrow> : null}
        <H2 style={[home && { fontSize: width <= 850 ? 25 : 29, lineHeight: width <= 850 ? 32 : 38, letterSpacing: rtl ? 0 : -1 }, { marginBottom: lead ? 8 : 0 }]}>{title}</H2>
        {lead ? <Text style={type.body}>{lead}</Text> : null}
      </View>
      {action}
    </View>
  );
}

/**
 * Two columns on wide screens (>760px), stacked on phones. `ratio` is [start, end] flex (seats 1.2/0.8, checkout
 * 1.25/0.75, movie 1/1, resale 1.1/0.9). `stickyEnd` keeps the end column (a summary) in view on web while scrolling.
 * `endMin` is the end column's minimum width on wide screens (seats summary: 260).
 */
export function Columns({ children, ratio = [1, 1], gap = 22, stickyEnd, endMin, align = 'flex-start', style }: {
  children: [ReactNode, ReactNode]; ratio?: [number, number]; gap?: number; stickyEnd?: boolean; endMin?: number;
  align?: ViewStyle['alignItems']; style?: StyleProp<ViewStyle>;
}) {
  const { wide } = useLayout();
  if (!wide) return <View style={[{ gap }, style]}>{children[0]}{children[1]}</View>;
  return (
    <View style={[{ flexDirection: 'row', gap, alignItems: align }, style]}>
      <View style={{ flex: ratio[0], minWidth: 0 }}>{children[0]}</View>
      <View style={[{ flex: ratio[1], minWidth: endMin ?? 0 }, stickyEnd && Platform.OS === 'web' && ({ position: 'sticky', top: 20 } as unknown as ViewStyle)]}>
        {children[1]}
      </View>
    </View>
  );
}

export type Crumb = { label: string; href?: Href };

/**
 * The breadcrumb ("Home / The Last Light / Choose seats"), web only like the live site's (native has the back
 * button). Earlier parts are links; the last part is the current page. Links go back to a screen already open
 * (dismissTo) instead of stacking a new copy.
 * Example: `<Crumbs items={[{ label: t.shell.crumbHome, href: '/' }, { label: movie.title, href: `/movie/${id}` }, { label: t.booking.chooseSeats }]} />`
 */
export function Crumbs({ items, style }: { items: Crumb[]; style?: StyleProp<ViewStyle> }) {
  const { t } = useI18n();
  const { type, font } = useType();
  if (Platform.OS !== 'web') return null;
  return (
    <View role="navigation" aria-label={t.shell.crumbLabel} style={[{ marginVertical: 25 }, style]}>
      <Text style={type.caption}>
        {items.map((c, i) => (
          <Fragment key={`${i}-${c.label}`}>
            {i > 0 ? <Text aria-hidden>{' / '}</Text> : null}
            {c.href && i < items.length - 1
              ? <Link dismissTo href={c.href} style={[font(500), { color: colors.link }]}>{c.label}</Link>
              : <Text aria-current={i === items.length - 1 ? 'page' : undefined} style={{ color: colors.navText }}>{c.label}</Text>}
          </Fragment>
        ))}
      </Text>
    </View>
  );
}

/**
 * The booking steps "① Seats — ② Checkout — ③ Ticket" (`.progress`). Steps up to the current one are gold, as on
 * the live pages. Example: `<Steps step={2} />`
 */
export function Steps({ step, style }: { step: 1 | 2 | 3; style?: StyleProp<ViewStyle> }) {
  const { t } = useI18n();
  const { font } = useType();
  const { narrow } = useLayout();
  const names = [t.shell.stepSeats, t.shell.stepCheckout, t.shell.stepTicket];
  return (
    <View role="list" aria-label={t.shell.stepsLabel} style={[styles.steps, { gap: narrow ? 5 : 9 }, style]}>
      {names.map((name, i) => {
        const n = i + 1;
        const state = n < step ? 'done' : n === step ? 'current' : 'next';
        const on = state !== 'next';
        return (
          <Fragment key={name}>
            {i > 0 ? <View aria-hidden style={{ height: 1, width: narrow ? 13 : 32, backgroundColor: STEP_LINE }} /> : null}
            <View role="listitem" aria-current={state === 'current' ? 'step' : undefined} accessibilityLabel={t.shell.stepState(n, name, state)}
              style={styles.step}>
              <View style={[styles.dot, { backgroundColor: on ? colors.gold : STEP_DOT }]}>
                <Text style={[font(800), { color: on ? '#ffffff' : STEP_TEXT, fontSize: 12 }]}>{n}</Text>
              </View>
              <Text style={[font(700), { color: on ? colors.goldText : STEP_TEXT, fontSize: narrow ? 10 : 12 }]}>{name}</Text>
            </View>
          </Fragment>
        );
      })}
    </View>
  );
}

// The live `.progress` colours: steps reached are gold with a white number, later ones a cream dot with greyed
// text, joined by light hairlines.
const STEP_DOT = '#eee8e0';
const STEP_TEXT = '#948c9f';
const STEP_LINE = '#e5dbcf';

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 6, marginBottom: 22 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 25, height: 25, borderRadius: 12.5, alignItems: 'center', justifyContent: 'center' },
});
