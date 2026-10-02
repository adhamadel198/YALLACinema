import type { Href } from 'expo-router';
import { Children, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { colors } from '../../theme';
import { font, upper, useType } from '../../typography';
import { goTo, NavLink } from '../shell/nav';
import { arrow, Button, Eyebrow, Panel } from '../ui';

// Pieces of the live account.html and support.html shared by the Profile, My Tickets and Help screens.
// (Candidates for the shared ui.tsx later: AccountPanel, PanelTitle, CardTitle, DetailRow, Facts, CardGrid.)

/** The account page's panel: max 480 wide, centred (live `.panel` with `max-width:480px;margin:auto`). */
export function AccountPanel({ children, padding = 20, style, testID }: {
  children: ReactNode; padding?: number; style?: StyleProp<ViewStyle>; testID?: string;
}) {
  return <Panel padding={padding} testID={testID} style={[styles.narrow, style]}>{children}</Panel>;
}

/** The big title of an account panel: Manrope 800 36/39, tracking -2 (live `.h1` at 36px). */
export function PanelTitle({ children, numberOfLines }: { children: ReactNode; numberOfLines?: number }) {
  const { lang } = useType();
  return (
    <Text role="heading" aria-level={1} numberOfLines={numberOfLines}
      style={lang({ ...font(800, 'display'), fontSize: 36, lineHeight: 39, letterSpacing: -2, color: colors.ink, marginTop: 7 })}>
      {children}
    </Text>
  );
}

/** A card title: Manrope 800 19/23 ("Need to pass a ticket on?", live `.h2` at 19px). */
export function CardTitle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { lang } = useType();
  return (
    <Text role="heading" aria-level={2}
      style={[lang({ ...font(800, 'display'), fontSize: 19, lineHeight: 23, letterSpacing: -0.7, color: colors.ink }), style]}>
      {children}
    </Text>
  );
}

/** A 1px dashed rule (the e-ticket's `.ticketrow` border). Drawn by clipping a dashed box, which works on every platform. */
export function DashedRule({ color = colors.line }: { color?: string }) {
  return (
    <View aria-hidden style={styles.dashClip}>
      <View style={[styles.dash, { borderColor: color }]} />
    </View>
  );
}

/**
 * One label/value row in the e-ticket style: label 12/800 muted (uppercase in English), value 15/700 ink, a dashed
 * rule under it. The value reads left to right (emails, phone numbers) and drops under the label when it doesn't fit.
 */
export function DetailRow({ label, value }: { label: string; value: string }) {
  const { type, font: f, rtl } = useType();
  return (
    <View>
      <View style={styles.detail}>
        <Text style={[type.label, { color: colors.muted }, upper(rtl)]}>{label}</Text>
        <Text selectable style={[f(700), styles.detailValue]}>{value}</Text>
      </View>
      <DashedRule />
    </View>
  );
}

/**
 * One line of facts joined by " · " (cinema · date · seats). Each part is its own Text, so Latin names, seat ids and
 * Arabic words keep their own direction, and the row flips in Arabic.
 */
export function Facts({ parts, style, textStyle }: { parts: string[]; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  const { type } = useType();
  const text = [type.caption, textStyle];
  return (
    <View style={[styles.facts, style]}>
      {parts.flatMap((part, i) => [
        ...(i ? [<Text key={`dot${i}`} aria-hidden style={text}>·</Text>] : []),
        <Text key={i} style={text}>{part}</Text>,
      ])}
    </View>
  );
}

/** The live `.cardgrid`: 3 equal columns (gap 16) on wide screens, one column on phones. */
export function CardGrid({ children, columns = 3, gap = 16, style }: {
  children: ReactNode; columns?: number; gap?: number; style?: StyleProp<ViewStyle>;
}) {
  const { wide } = useLayout();
  const items = Children.toArray(children);
  if (!wide) return <View style={[{ gap }, style]}>{items}</View>;
  const rows: ReactNode[][] = [];
  items.forEach((item, i) => (i % columns ? rows[rows.length - 1].push(item) : rows.push([item])));
  return (
    <View style={[{ gap }, style]}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap }}>
          {row.map((item, i) => <View key={i} style={styles.cell}>{item}</View>)}
          {Array.from({ length: columns - row.length }, (_, i) => <View key={`pad${i}`} style={styles.cell} />)}
        </View>
      ))}
    </View>
  );
}

/**
 * The live "Your tickets" card (account.html#tickets): resale for tickets you can't use. Signed in, it also links to
 * the person's listings.
 */
export function TicketsCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const { t } = useI18n();
  const { type } = useType();
  const { account } = useAuth();
  const c = t.accountUi;
  return (
    <Panel style={style} testID="tickets-card">
      <Eyebrow>{c.ticketsCardKicker}</Eyebrow>
      <CardTitle>{c.ticketsCardTitle}</CardTitle>
      <Text style={[type.small, { color: colors.muted, marginVertical: 13 }]}>{c.ticketsCardBody}</Text>
      <View style={styles.actions}>
        <Button size="small" inline title={c.ticketsCardButton} onPress={() => goTo('/resale')} />
        {account ? <Button kind="soft" size="small" inline title={c.myListings} onPress={() => goTo('/resale/mine')} /> : null}
      </View>
    </Panel>
  );
}

/** A panel of links: rows 15×20, a hairline between them, label 15/700 and a gold arrow at the end. */
export function LinkList({ links, label, style }: { links: { label: string; href: Href }[]; label?: string; style?: StyleProp<ViewStyle> }) {
  const { font: f, rtl } = useType();
  return (
    <Panel padding={0} style={[{ overflow: 'hidden' }, style]}>
      <View role="navigation" aria-label={label}>
        {links.map((link, i) => (
          <NavLink key={link.label} href={link.href}
            box={[styles.linkRow, i > 0 && styles.linkRule]}>
            <Text style={[f(700), { color: colors.ink, fontSize: 15, lineHeight: 23, flexShrink: 1 }]}>{link.label}</Text>
            <Text aria-hidden style={[f(700), { color: colors.goldBright, fontSize: 15, lineHeight: 23 }]}>{arrow(rtl)}</Text>
          </NavLink>
        ))}
      </View>
    </Panel>
  );
}

const styles = StyleSheet.create({
  narrow: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  dashClip: { height: 1, overflow: 'hidden' },
  dash: { height: 3, borderWidth: 1, borderStyle: 'dashed' },
  detail: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: 15, rowGap: 2, paddingVertical: 11 },
  detailValue: {
    color: colors.ink, fontSize: 15, lineHeight: 23, writingDirection: 'ltr', flexShrink: 1,
    ...(Platform.OS === 'web' ? ({ overflowWrap: 'anywhere' } as object) : null),
  },
  facts: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 5 },
  cell: { flex: 1, flexBasis: 0, minWidth: 0 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 15, paddingHorizontal: 20 },
  linkRule: { borderTopWidth: 1, borderTopColor: colors.line },
});
