import type { ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View,
  type PressableStateCallbackType, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { useI18n } from '../i18n';
import { colors, shadows } from '../theme';
import { h1Size, useType } from '../typography';

// Shared building blocks in the live site's black-and-gold look (see spec/foundation.md for usage).

type Hoverable = PressableStateCallbackType & { hovered?: boolean };

/** "→", or "←" in Arabic, for links like "All movies →". */
export const arrow = (rtl: boolean) => (rtl ? '←' : '→');

// ---------------------------------------------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------------------------------------------

export type ButtonKind = 'primary' | 'home' | 'dark' | 'secondary' | 'soft' | 'link';

const BUTTON: Record<ButtonKind, { box: ViewStyle; ink: string; ledge?: string; hoverLedge?: string }> = {
  /** `.btn`: gold with a solid darker ledge. */
  primary: { box: { backgroundColor: colors.gold, borderRadius: 12 }, ink: colors.onGold, ledge: '0 4px 0 #89672f', hoverLedge: '0 6px 0 #89672f' },
  /** index.html `.primary`: brighter gold, 5px ledge and a soft glow. */
  home: { box: { backgroundColor: colors.goldBright, borderRadius: 13 }, ink: '#17130b', ledge: '0 5px 0 #8c682c, 0 11px 23px rgba(213,177,95,0.15)', hoverLedge: '0 7px 0 #8c682c, 0 13px 26px rgba(213,177,95,0.2)' },
  /** `.btn.dark`: black with gold text and a black ledge. */
  dark: { box: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.lineDark }, ink: colors.goldText, ledge: '0 4px 0 #000', hoverLedge: '0 6px 0 #000' },
  /** The old outline button; now the dark button. */
  secondary: { box: { backgroundColor: colors.bg, borderRadius: 12, borderWidth: 1, borderColor: colors.lineDark }, ink: colors.goldText, ledge: '0 4px 0 #000', hoverLedge: '0 6px 0 #000' },
  /** `.btn.soft`: cream, no ledge. */
  soft: { box: { backgroundColor: colors.softBg, borderRadius: 12, borderWidth: 1, borderColor: colors.softLine }, ink: colors.softInk },
  /** Text only, gold (e.g. "↻ Refresh availability", "Clear filters"). */
  link: { box: { backgroundColor: 'transparent' }, ink: colors.link },
};

/**
 * A button. Kinds: `primary` (gold with a ledge, the default), `home` (the home hero's brighter gold),
 * `dark` (= `secondary`), `soft` (cream), `link` (gold text). `size="small"` is the live `.btn.small`.
 * By default it stretches like any block in a column; pass `inline` to size it to its label.
 */
export function Button({ title, onPress, disabled, busy, kind = 'primary', size = 'normal', inline, style, textStyle, accessibilityLabel, testID }: {
  title: string; onPress: () => void; disabled?: boolean; busy?: boolean; kind?: ButtonKind; size?: 'normal' | 'small';
  inline?: boolean; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>; accessibilityLabel?: string; testID?: string;
}) {
  const { type } = useType();
  const look = BUTTON[kind];
  const small = size === 'small';
  const link = kind === 'link';
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      onPress={onPress}
      disabled={off}
      aria-disabled={off}
      aria-busy={busy}
      style={(state: Hoverable) => {
        const lift = !off && !link && look.hoverLedge && (state.hovered || state.pressed);
        return [
          styles.button,
          small ? styles.small : kind === 'home' ? styles.homePad : styles.normal,
          link && styles.linkPad,
          look.box,
          look.ledge ? ({ boxShadow: lift ? look.hoverLedge : look.ledge } as ViewStyle) : null,
          lift ? { transform: [{ translateY: state.pressed ? 0 : -2 }] } : null,
          link && (state.hovered || state.pressed) ? { opacity: 0.8 } : null,
          inline && styles.inline,
          off && styles.off,
          style,
        ];
      }}
    >
      {busy ? <ActivityIndicator color={look.ink} />
        : <Text style={[small ? type.buttonSmall : type.button, { color: look.ink, textAlign: 'center' }, link && { textDecorationLine: 'none' }, textStyle]}>{title}</Text>}
    </Pressable>
  );
}

/**
 * A text link: gold by default, ink with a gold arrow for `tone="ink"` (the home "See today's shows →").
 * Pass `arrow` to add → (← in Arabic).
 */
export function TextLink({ title, onPress, tone = 'gold', arrow: withArrow, size = 15, style, accessibilityLabel }: {
  title: string; onPress: () => void; tone?: 'gold' | 'ink' | 'muted'; arrow?: boolean; size?: number;
  style?: StyleProp<TextStyle>; accessibilityLabel?: string;
}) {
  const { font, rtl } = useType();
  const color = tone === 'ink' ? colors.ink : tone === 'muted' ? colors.muted : colors.linkStrong;
  return (
    <Text accessibilityRole="link" accessibilityLabel={accessibilityLabel} onPress={onPress} suppressHighlighting
      style={[font(tone === 'ink' ? 700 : 800), { color, fontSize: size, lineHeight: Math.round(size * 1.4) }, style]}>
      {title}
      {withArrow ? <Text style={{ color: colors.goldBright }}>{` ${arrow(rtl)}`}</Text> : null}
    </Text>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------------------------------------------

/**
 * `.panel`: dark card, 1px bronze line, radius 18, deep shadow. `padding` defaults to 20.
 * `tone="cream"` is the cream sheet of the resale buy screen (radius 17, ink text is yours to set).
 */
export function Panel({ children, style, padding = 20, tone = 'dark', testID }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; padding?: number; tone?: 'dark' | 'cream'; testID?: string;
}) {
  return <View testID={testID} style={[styles.panel, { padding }, tone === 'cream' && styles.creamPanel, style]}>{children}</View>;
}

/** A small card (`.smallcard`): optional eyebrow, a 16px title, muted text, then any actions below. */
export function SmallCard({ eyebrow, title, body, children, style, bodyTone = 'muted' }: {
  eyebrow?: string; title: string; body?: string; children?: ReactNode; style?: StyleProp<ViewStyle>; bodyTone?: 'muted' | 'ink';
}) {
  const { type } = useType();
  return (
    <Panel padding={19} style={style}>
      {eyebrow ? <Text style={type.eyebrow}>{eyebrow}</Text> : null}
      <Text role="heading" style={[type.h3, { marginTop: 6, marginBottom: 6 }]}>{title}</Text>
      {body ? <Text style={[type.small, { color: bodyTone === 'ink' ? colors.ink : colors.muted }]}>{body}</Text> : null}
      {children ? <View style={{ marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>{children}</View> : null}
    </Panel>
  );
}

/** A 1px bronze rule. */
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: 1, backgroundColor: colors.line, alignSelf: 'stretch' }, style]} />;
}

/**
 * A summary line (`.sumline`): muted label, ink value. `hint` adds a small muted note after the label
 * ("5 EGP × tickets"). `strong` makes the value 800; `total` is the total row (rule above, 16px, 800).
 * `tone="cream"` for lines on a cream sheet.
 */
export function Line({ label, value, strong, total, hint, tone = 'dark' }: {
  label: string; value: ReactNode; strong?: boolean; total?: boolean; hint?: string; tone?: 'dark' | 'cream';
}) {
  const { font } = useType();
  const cream = tone === 'cream';
  const ink = cream ? colors.fieldInk : colors.ink;
  const muted = cream ? colors.creamMuted : colors.muted;
  const size = total ? 16 : 13;
  return (
    <View style={[styles.line, total && [styles.totalLine, cream && { borderTopColor: colors.creamLine }]]}>
      <Text style={[font(total ? 800 : 400), { color: total || strong ? ink : muted, fontSize: size, lineHeight: size * 1.5, flex: 1 }]}>
        {label}
        {hint ? <Text style={[font(400), { color: muted, fontSize: 11 }]}>{`  ${hint}`}</Text> : null}
      </Text>
      {typeof value === 'string' || typeof value === 'number'
        ? <Text style={[font(total || strong ? 800 : 700), { color: ink, fontSize: size, lineHeight: size * 1.5 }]}>{value}</Text>
        : value}
    </View>
  );
}

/** A centred message with an optional retry, for load failures and empty states. */
export function Message({ text, onRetry, retryLabel }: { text: string; onRetry?: () => void; retryLabel?: string }) {
  const { t: s } = useI18n();
  const { type } = useType();
  return (
    <View style={styles.center}>
      <Text style={[type.body, { textAlign: 'center', marginBottom: 14, maxWidth: 480 }]}>{text}</Text>
      {onRetry && <Button title={retryLabel ?? s.tryAgain} onPress={onRetry} inline />}
    </View>
  );
}

/** The gold loading spinner, centred. */
export function Spinner({ style, size = 'large' }: { style?: StyleProp<ViewStyle>; size?: 'small' | 'large' }) {
  return <ActivityIndicator size={size} color={colors.gold} style={[{ padding: 24 }, style]} />;
}

// ---------------------------------------------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------------------------------------------

/**
 * The small uppercase line above a title. `tone="home"` is the brighter home kicker; `rule` adds the home hero's
 * 22px gold rule before it. Arabic gets no tracking and no uppercase.
 */
export function Eyebrow({ children, tone = 'page', rule, style }: {
  children: ReactNode; tone?: 'page' | 'home'; rule?: boolean; style?: StyleProp<TextStyle>;
}) {
  const { type, rtl } = useType();
  const text = <Text style={[tone === 'home' ? type.kicker : type.eyebrow, rule && !rtl && { letterSpacing: 2.2 }, style]}>{children}</Text>;
  if (!rule) return text;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <View style={{ width: 22, height: 1, backgroundColor: colors.kicker }} />
      {text}
    </View>
  );
}

/** Page title: Manrope 800, 54px on desktop down to 38px on phones (the live `.h1`). */
export function H1({ children, style, size, center, numberOfLines }: {
  children: ReactNode; style?: StyleProp<TextStyle>; size?: number; center?: boolean; numberOfLines?: number;
}) {
  const { type } = useType();
  const { width } = useWindowDimensions();
  const fontSize = size ?? h1Size(width);
  const base = fontSize <= 40 ? type.h1Phone : type.h1;
  return (
    <Text role="heading" aria-level={1} numberOfLines={numberOfLines}
      style={[base, { fontSize, lineHeight: Math.round(fontSize * (base.lineHeight / base.fontSize)) }, center && styles.centerText, style]}>
      {children}
    </Text>
  );
}

/** Same as H1. */
export const PageTitle = H1;

/** Section title: Manrope 800 27px. `small` is the 20px panel title ("Booking summary"). */
export function H2({ children, small, style, center }: { children: ReactNode; small?: boolean; style?: StyleProp<TextStyle>; center?: boolean }) {
  const { type } = useType();
  return <Text role="heading" aria-level={2} style={[small ? type.h2Small : type.h2, { marginBottom: small ? 10 : 12 }, center && styles.centerText, style]}>{children}</Text>;
}

/** Card title: DM Sans 700 16px. */
export function H3({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { type } = useType();
  return <Text role="heading" aria-level={3} style={[type.h3, style]}>{children}</Text>;
}

/** The muted sentence under a page title (16px, max 650 wide). */
export function Lead({ children, style, center }: { children: ReactNode; style?: StyleProp<TextStyle>; center?: boolean }) {
  const { type } = useType();
  return <Text style={[type.lead, { maxWidth: 650 }, center && [styles.centerText, { alignSelf: 'center' }], style]}>{children}</Text>;
}

// ---------------------------------------------------------------------------------------------------------------
// Badges, pills, tags, notices
// ---------------------------------------------------------------------------------------------------------------

export type BadgeTone = 'cream' | 'good' | 'sep' | 'alert' | 'rating' | 'dark';

const BADGE: Record<BadgeTone, { bg: string; ink: string; line?: string; size: number; padV: number; padH: number; radius: number }> = {
  /** `.badge`: "✓ Booking confirmed", "★ 8.4 audience rating", "Your listing", "Sold". */
  cream: { bg: colors.badgeBg, ink: colors.badgeInk, size: 11, padV: 5, padH: 9, radius: 99 },
  /** Green status pill: "Verified ticket", "On sale", "Connected group · 2". */
  good: { bg: colors.goodPillBg, ink: colors.goodPillInk, size: 10, padV: 4, padH: 8, radius: 99 },
  /** Gold pill: "Separated groups · 1+1". */
  sep: { bg: colors.sepPillBg, ink: colors.sepPillInk, size: 11, padV: 5, padH: 9, radius: 99 },
  /** App-only alert pill: "Cancelled", "Show cancelled". */
  alert: { bg: colors.alertBg, ink: colors.alertInk, line: colors.alertLine, size: 11, padV: 4, padH: 9, radius: 99 },
  /** Poster rating chip: "★ 8.4". */
  rating: { bg: colors.ratingBg, ink: colors.ratingInk, size: 11, padV: 5, padH: 8, radius: 7 },
  /** Dark tag as a pill. */
  dark: { bg: colors.tagBg, ink: colors.tagInk, size: 11, padV: 5, padH: 9, radius: 99 },
};

/** A small pill. Tones: cream (default `.badge`), good, sep, alert, rating, dark. */
export function Badge({ label, tone = 'cream', style, accessibilityLabel }: {
  label: string; tone?: BadgeTone; style?: StyleProp<ViewStyle>; accessibilityLabel?: string;
}) {
  const { font } = useType();
  const b = BADGE[tone];
  return (
    <View accessibilityLabel={accessibilityLabel}
      style={[styles.badge, { backgroundColor: b.bg, borderRadius: b.radius, paddingVertical: b.padV, paddingHorizontal: b.padH }, b.line ? { borderWidth: 1, borderColor: b.line } : null, style]}>
      <Text numberOfLines={1} style={[font(800), { color: b.ink, fontSize: b.size, lineHeight: Math.round(b.size * 1.4) }]}>{label}</Text>
    </View>
  );
}

/** Green status pill ("Verified ticket", "On sale"). */
export const StatusPill = (props: { label: string; style?: StyleProp<ViewStyle> }) => <Badge tone="good" {...props} />;
/** Red-brown alert pill ("Cancelled"). */
export const AlertPill = (props: { label: string; style?: StyleProp<ViewStyle> }) => <Badge tone="alert" {...props} />;

/** A dark tag (home show card tags, movie facts, seat states). `size="page"` is the bigger 11px movie-page tag. */
export function Tag({ label, size = 'small', style }: { label: string; size?: 'small' | 'page'; style?: StyleProp<ViewStyle> }) {
  const { font } = useType();
  const page = size === 'page';
  return (
    <View style={[{ backgroundColor: colors.tagBg, borderRadius: page ? 7 : 5, paddingVertical: page ? 5 : 4, paddingHorizontal: page ? 9 : 7, alignSelf: 'flex-start' }, style]}>
      <Text numberOfLines={1} style={[font(page ? 500 : 400), { color: colors.tagInk, fontSize: page ? 11 : 10, lineHeight: page ? 15 : 14 }]}>{label}</Text>
    </View>
  );
}

export type NoticeTone = 'cream' | 'danger' | 'verify' | 'fee';

const NOTICE: Record<NoticeTone, { bg: string; ink: string; strong: string; line?: string; size: number; radius: number; padV: number; padH: number }> = {
  /** `.notice`: cream info box. */
  cream: { bg: colors.noticeBg, ink: colors.noticeInk, strong: colors.noticeInk, size: 13, radius: 11, padV: 12, padH: 14 },
  /** Cream box with an error (form errors). */
  danger: { bg: colors.noticeBg, ink: colors.dangerOnCream, strong: colors.dangerOnCream, size: 13, radius: 11, padV: 12, padH: 14 },
  /** `.verify`: cream box with a gold line (payout details, booking reference, staff search result). */
  verify: { bg: colors.verifyBg, ink: colors.verifyInk, strong: colors.verifyInk, line: colors.verifyLine, size: 12, radius: 11, padV: 13, padH: 13 },
  /** Dark fee box (home fee note, resale "Fair-price promise"). */
  fee: { bg: colors.feeBg, ink: colors.feeInk, strong: colors.feeStrong, line: colors.feeLine, size: 12, radius: 11, padV: 12, padH: 15 },
};

/**
 * A notice box. `children` may be a string or any content; `title` adds a bold first part ("Fair-price promise:").
 * Tones: cream (default), danger, verify, fee. Pass `role="alert"` for errors, `role="status"` for live updates.
 */
export function Notice({ children, title, tone = 'cream', style, role }: {
  children?: ReactNode; title?: string; tone?: NoticeTone; style?: StyleProp<ViewStyle>; role?: 'alert' | 'status';
}) {
  const { font } = useType();
  const n = NOTICE[tone];
  const text = [font(400), { color: n.ink, fontSize: n.size, lineHeight: Math.round(n.size * 1.55) }];
  return (
    <View role={role} aria-live={role === 'status' ? 'polite' : undefined}
      style={[{ backgroundColor: n.bg, borderRadius: n.radius, paddingVertical: n.padV, paddingHorizontal: n.padH }, n.line ? { borderWidth: 1, borderColor: n.line } : null, style]}>
      {typeof children === 'string' || typeof children === 'number' || title ? (
        <Text style={text}>
          {title ? <Text style={[font(tone === 'fee' ? 800 : 700), { color: n.strong }]}>{`${title} `}</Text> : null}
          {children}
        </Text>
      ) : children}
    </View>
  );
}

/**
 * A one-line status under a form or action (`.inlineNotice` / `.resale-message`): 12px.
 * Tones: info (gold), success (green), danger (salmon on dark).
 */
export function StatusText({ children, tone = 'info', style }: { children: ReactNode; tone?: 'info' | 'success' | 'danger'; style?: StyleProp<TextStyle> }) {
  const { font } = useType();
  const color = tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : colors.link;
  return (
    <Text role={tone === 'danger' ? 'alert' : 'status'} aria-live="polite" style={[font(tone === 'danger' ? 700 : 400), { color, fontSize: 12, lineHeight: 18, minHeight: 18 }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  normal: { minHeight: 49, paddingVertical: 13, paddingHorizontal: 19 },
  homePad: { minHeight: 46, paddingVertical: 13, paddingHorizontal: 21 },
  small: { minHeight: 38, paddingVertical: 9, paddingHorizontal: 12 },
  linkPad: { minHeight: 0, paddingVertical: 8, paddingHorizontal: 0, alignSelf: 'flex-start' },
  inline: { alignSelf: 'flex-start' },
  off: { opacity: 0.5 },
  panel: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line, borderRadius: 18, ...shadows.panel },
  creamPanel: { backgroundColor: colors.fieldBg, borderColor: colors.creamLine, borderRadius: 17 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginVertical: 4.5, gap: 10 },
  totalLine: { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 13, marginTop: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  centerText: { textAlign: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5 },
});
