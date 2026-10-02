import type { ReactNode } from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { clock } from '../../format';
import { useI18n } from '../../i18n';
import type { Strings } from '../../i18n/strings';
import { useLayout } from '../../layout';
import { backgroundImage, colors } from '../../theme';
import { tracking, useType } from '../../typography';
import { Badge } from '../ui';

// Pieces of the live resale page (resale.html) shared by the resale screens.

/** "Fri 2 Oct · 7:45 PM" from a showtime's ISO timestamp (cinema-local time), as the live site writes show times. */
export function showWhen(iso: string, t: Strings) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const weekday = t.weekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${weekday} ${d} ${t.months[m - 1]} · ${clock(iso, t)}`;
}

/**
 * The bronze hero card (`.resale-hero`): badge, two-line gold title, lead and the dark "Fair-price promise" box.
 */
export function ResaleHero() {
  const { t } = useI18n();
  const { type, font, rtl } = useType();
  const { width } = useLayout();
  const size = Math.round(Math.min(49, Math.max(33, width * 0.05)));
  return (
    <View style={[{ backgroundColor: '#292113', borderWidth: 1, borderColor: '#796137', borderRadius: 22, padding: 30, marginTop: 25, marginBottom: 28 },
      backgroundImage(`linear-gradient(${rtl ? 235 : 125}deg, #17140f, #292113 58%, #493820)`)]}>
      <Badge label={t.resaleUi.heroBadge} />
      <Text role="heading" aria-level={1}
        style={[font(800, 'display'), { fontSize: size, lineHeight: Math.round(size * (rtl ? 1.3 : 1.05)), letterSpacing: tracking(-1.8, rtl), color: colors.heroGold, marginVertical: 10 }]}>
        {t.resaleUi.heroTitle}
      </Text>
      <Text style={[type.lead, { color: '#d1c4a7', maxWidth: 650, marginTop: 6, marginBottom: 16 }]}>{t.resaleUi.heroLead}</Text>
      <FeeBox label={t.resaleUi.fairPriceLabel}>{t.resaleUi.fairPrice}</FeeBox>
    </View>
  );
}

/** The dark fee box inside the hero (`.resale-hero .fee-box`): bold label, then the sentence. */
export function FeeBox({ label, children }: { label: string; children: ReactNode }) {
  const { font } = useType();
  return (
    <View style={{ backgroundColor: '#211d15', borderWidth: 1, borderColor: '#554629', borderRadius: 12, padding: 13 }}>
      <Text style={[font(400), { color: '#e3d6b8', fontSize: 12, lineHeight: 18.6 }]}>
        <Text style={font(700)}>{`${label} `}</Text>
        {children}
      </Text>
    </View>
  );
}

/** The cream "verify" box (`.verify`): account and payout state on the owners panel and the sell screen. */
export function VerifyBox({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ backgroundColor: colors.verifyBg, borderWidth: 1, borderColor: colors.verifyLine, borderRadius: 11, padding: 13, marginVertical: 12, gap: 7 }, style]}>
      {children}
    </View>
  );
}

/** A 12px line inside a VerifyBox, with an optional bold label first ("Account: Salma Hassan"). */
export function VerifyLine({ label, children, tone = 'ink', style }: {
  label?: string; children?: ReactNode; tone?: 'ink' | 'danger' | 'good'; style?: StyleProp<TextStyle>;
}) {
  const { font } = useType();
  const color = tone === 'danger' ? colors.dangerOnCream : tone === 'good' ? colors.goodPillInk : colors.verifyInk;
  return (
    <Text role={tone === 'danger' ? 'alert' : undefined} style={[font(400), { color, fontSize: 12, lineHeight: 18.6 }, style]}>
      {label ? <Text style={font(700)}>{`${label} `}</Text> : null}
      {children}
    </Text>
  );
}

/** The live `.subtle` paragraph: plain 15px body text, margin 15 above and below. */
export function Subtle({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const { type } = useType();
  return <Text style={[type.body, { marginVertical: 15 }, style]}>{children}</Text>;
}

/** Eyebrow + 21px panel title (`.owner-panel h2`, `.resale-list h2`). */
export function PanelHead({ eyebrow, title, style }: { eyebrow: string; title: string; style?: StyleProp<ViewStyle> }) {
  const { type, font, rtl } = useType();
  return (
    <View style={style}>
      <Text style={type.eyebrow}>{eyebrow}</Text>
      <Text role="heading" aria-level={2}
        style={[font(800, 'display'), { fontSize: 21, lineHeight: rtl ? 30 : 25.2, letterSpacing: tracking(-0.7, rtl), color: colors.ink, marginBottom: 12 }]}>
        {title}
      </Text>
    </View>
  );
}
