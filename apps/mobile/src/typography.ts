import { Platform, type TextStyle } from 'react-native';
import { useI18n } from './i18n';
import { colors } from './theme';

/**
 * Typography of the live site: DM Sans for everything, Manrope 800 for page and section titles.
 * Neither family has Arabic letters, so Arabic uses the system font (as on the live site), with no letter spacing
 * and no uppercase.
 *
 * Web: the fonts are registered as the CSS families "DM Sans" and "Manrope" with real weights (fonts.web.ts), and
 *      all plain Text defaults to DM Sans, so `fontWeight` works as usual.
 * iOS/Android: each weight is its own font (`DMSans_700Bold`, ...), so pick weights with `font()` or `type.*`
 *      and do not add `fontWeight` on top of them (Android would fake-bold an already bold face).
 */

export type Weight = 400 | 500 | 700 | 800;
export type Family = 'body' | 'display';

/** System fonts with Arabic letters, tried after DM Sans / Manrope on web. */
const SYSTEM_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "SF Arabic", "Geeza Pro", "Noto Sans Arabic", Tahoma, Arial, sans-serif';
export const WEB_BODY_FONT = `"DM Sans", ${SYSTEM_STACK}`;
export const WEB_DISPLAY_FONT = `Manrope, "DM Sans", ${SYSTEM_STACK}`;

/** Font names registered with expo-font on iOS/Android (see fonts.ts). */
export const NATIVE_FONTS: Record<Family, Record<Weight, string>> = {
  body: { 400: 'DMSans_400Regular', 500: 'DMSans_500Medium', 700: 'DMSans_700Bold', 800: 'DMSans_800ExtraBold' },
  // Manrope is only used heavy; lighter requests get the 700 face.
  display: { 400: 'Manrope_700Bold', 500: 'Manrope_700Bold', 700: 'Manrope_700Bold', 800: 'Manrope_800ExtraBold' },
};

const weightStyle = (w: Weight) => String(w) as TextStyle['fontWeight'];

/**
 * The font for a weight and family. Pass `rtl` for Arabic: on iOS/Android it then uses the system font (which has
 * Arabic letters) at that weight. Example: `<Text style={[font(800), { fontSize: 16 }]}>`.
 */
export function font(weight: Weight = 400, family: Family = 'body', rtl = false): TextStyle {
  if (Platform.OS === 'web') return { fontFamily: family === 'display' ? WEB_DISPLAY_FONT : WEB_BODY_FONT, fontWeight: weightStyle(weight) };
  if (rtl) return { fontWeight: weightStyle(weight) };
  return { fontFamily: NATIVE_FONTS[family][weight] };
}

/**
 * The type scale (live computed sizes). These are the English (LTR) styles; inside components prefer `useType()`,
 * which returns the same keys adjusted for Arabic. Colours are included where the live site always uses one.
 */
export const type = {
  /** Inner-page eyebrow: 11/17, 800, uppercase, tracking 1.8, dark gold. Margin below 7 to the title. */
  eyebrow: { ...font(800), fontSize: 11, lineHeight: 17, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.eyebrow },
  /** Home kicker ("Pick your story"): like eyebrow, brighter gold. */
  kicker: { ...font(800), fontSize: 11, lineHeight: 17, letterSpacing: 1.8, textTransform: 'uppercase', color: colors.kicker },
  /** Page title, desktop: Manrope 800 54/58, tracking -2. Use `h1Size(width)` or `<H1>` for the responsive size. */
  h1: { ...font(800, 'display'), fontSize: 54, lineHeight: 58, letterSpacing: -2, color: colors.ink },
  /** Page title, phone (≤500px): 38/41. */
  h1Phone: { ...font(800, 'display'), fontSize: 38, lineHeight: 41, letterSpacing: -2, color: colors.ink },
  /** Section title: Manrope 800 27/32, tracking -0.7. */
  h2: { ...font(800, 'display'), fontSize: 27, lineHeight: 32, letterSpacing: -0.7, color: colors.ink },
  /** Panel title ("Booking summary", "Order summary", resale panels): Manrope 800 20/25. */
  h2Small: { ...font(800, 'display'), fontSize: 20, lineHeight: 25, letterSpacing: -0.5, color: colors.ink },
  /** Card title: DM Sans 700 16/24.8. */
  h3: { ...font(700), fontSize: 16, lineHeight: 24.8, color: colors.ink },
  /** Intro sentence under a page title: 16/24.8 muted, max width 650. */
  lead: { ...font(400), fontSize: 16, lineHeight: 24.8, color: colors.muted },
  /** Body copy: 15/23.25. */
  body: { ...font(400), fontSize: 15, lineHeight: 23.25, color: colors.ink },
  /** Summary lines, notices, step text: 13/20. */
  small: { ...font(400), fontSize: 13, lineHeight: 20, color: colors.ink },
  /** Crumb, card meta, footer: 12/18.6. */
  caption: { ...font(400), fontSize: 12, lineHeight: 18.6, color: colors.muted },
  /** Field labels: 12/18.6 800. */
  label: { ...font(800), fontSize: 12, lineHeight: 18.6, color: colors.fieldLabel },
  /** Badges, legend, subtle notes: 11/17. */
  micro: { ...font(400), fontSize: 11, lineHeight: 17, color: colors.muted },
  /** Poster tagline, tags, bottom-nav labels: 10/15. */
  tiny: { ...font(400), fontSize: 10, lineHeight: 15, color: colors.muted },
  /** Button label: 15/800. */
  button: { ...font(800), fontSize: 15, lineHeight: 20 },
  /** Small button label: 13/800. */
  buttonSmall: { ...font(800), fontSize: 13, lineHeight: 18 },
} satisfies Record<string, TextStyle>;

export type TypeKey = keyof typeof type;

/** Page-title size for a window width: 38 on phones (≤500), else clamp(34px, 5vw, 54px) like the live `.h1`. */
export function h1Size(width: number) {
  return width <= 500 ? 38 : Math.round(Math.min(54, Math.max(34, width * 0.05)));
}

/**
 * Arabic version of a text style: no letter spacing, no uppercase, the system font on iOS/Android, and room for
 * Arabic letters in tight display line heights. Returns the style unchanged when `rtl` is false.
 */
export function forLang<T extends TextStyle>(style: T, rtl: boolean): T {
  if (!rtl) return style;
  const out: TextStyle = { ...style, letterSpacing: 0, textTransform: 'none' };
  if (Platform.OS !== 'web' && style.fontFamily) {
    const w = Number(Object.entries(NATIVE_FONTS.body).concat(Object.entries(NATIVE_FONTS.display)).find(([, name]) => name === style.fontFamily)?.[0] ?? 400) as Weight;
    delete out.fontFamily;
    out.fontWeight = weightStyle(w);
  }
  if (style.fontSize && style.lineHeight && style.lineHeight < style.fontSize * 1.3) out.lineHeight = Math.round(style.fontSize * 1.3);
  return out as T;
}

/** Letter spacing that drops to 0 in Arabic: `letterSpacing: tracking(1.8, rtl)`. */
export const tracking = (value: number, rtl: boolean) => (rtl ? 0 : value);

/** Uppercase only in English (Arabic has no case, and the transform can break shaping in some browsers). */
export const upper = (rtl: boolean): TextStyle => (rtl ? {} : { textTransform: 'uppercase' });

const rtlType = Object.fromEntries(Object.entries(type).map(([k, v]) => [k, forLang(v, true)])) as typeof type;

/**
 * The type scale for the current language, plus `font()` bound to it.
 * Example: `const { type, font } = useType(); <Text style={type.h2}>…</Text> <Text style={[font(700), { fontSize: 14 }]}>`
 */
export function useType() {
  const { rtl } = useI18n();
  return {
    type: rtl ? rtlType : type,
    rtl,
    font: (weight: Weight = 400, family: Family = 'body') => font(weight, family, rtl),
    /** The same as `forLang(style, rtl)`. */
    lang: <T extends TextStyle>(style: T) => forLang(style, rtl),
  };
}
