import { Platform, StyleSheet, Text, View, type DimensionValue, type ViewStyle } from 'react-native';
import { useI18n } from '../../i18n';
import { useLayout } from '../../layout';
import { backgroundImage, colors } from '../../theme';
import { useType } from '../../typography';
import { useColumnStyle } from '../page';
import { Button, Eyebrow, TextLink } from '../ui';

/**
 * The home hero (index.html `.hero`): a full-bleed dark band with a warm glow, the tilted gold arch on the far side
 * (faded behind the copy), and the copy: eyebrow with a gold rule, the two-line title, the lead and two actions.
 */
export function Hero({ onExplore, onShows }: { onExplore: () => void; onShows: () => void }) {
  const { t, rtl } = useI18n();
  const { font, lang } = useType();
  const { width, homeWide } = useLayout();
  const column = useColumnStyle(true);
  const phone = width <= 580;
  const titleSize = phone ? 49 : Math.round(Math.min(68, Math.max(42, width * 0.06)));
  const title = lang({ ...font(800, 'display'), fontSize: titleSize, lineHeight: titleSize * 0.99, letterSpacing: phone ? -2 : -2.6, color: colors.ink });
  // The live overlay fades the band to black on the copy side (mirrored in Arabic).
  const fade = phone ? '#11100e 0%, #11100eee 47%, #11100e55 100%' : '#11100e 0%, #11100e 32%, #11100edb 54%, transparent 100%';
  return (
    <View style={[styles.hero, { minHeight: phone ? 400 : 420 }, backgroundImage('radial-gradient(ellipse at 78% 53%, #5b4824 0, #2c2417 29%, #171511 60%, #11100e 84%)')]}>
      <Arch phone={phone} mid={!homeWide && !phone} rtl={rtl} />
      <View aria-hidden pointerEvents="none" style={[StyleSheet.absoluteFill, backgroundImage(`linear-gradient(${rtl ? 270 : 90}deg, ${fade})`)]} />
      <View style={column}>
        {/* The live buttons are inline links whose padding overflows their 22.5px line, so the copy block is
            shorter than its contents: the bottom padding makes up for it to keep the live positions. */}
        <View style={{ maxWidth: homeWide ? 555 : 470, paddingTop: phone ? 55 : 58, paddingBottom: phone ? 66 : 46 }}>
          <Eyebrow tone="home" rule>{t.home.heroEyebrow}</Eyebrow>
          <Text role="heading" aria-level={1} style={[title, rtl && { lineHeight: Math.round(titleSize * 1.15) }, { marginVertical: 18 }]}>
            {t.home.heroTitle}
          </Text>
          <Text style={[font(400), { color: colors.heroText, fontSize: phone ? 14 : 16, lineHeight: phone ? 21 : 24, maxWidth: phone ? 320 : 410, marginBottom: 15 }]}>
            {t.home.heroLead}
          </Text>
          <View style={styles.actions}>
            <Button kind="home" inline title={t.home.exploreMovies} onPress={onExplore} />
            <TextLink tone="ink" arrow title={t.home.seeTodaysShows} onPress={onShows} />
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * The decorative arch (`.hero-art`): gold gradient in a cream 8px frame with round top corners, tilted 3deg, an
 * inner arch and a star. Phones show it large and faint; in Arabic it sits on the left, as on the live site.
 */
function Arch({ phone, mid, rtl }: { phone: boolean; mid: boolean; rtl: boolean }) {
  const box: { top: DimensionValue; height: DimensionValue; width: DimensionValue; side: DimensionValue; opacity: number } = phone
    ? { top: '18%', height: '67%', width: '75%', side: '-22%', opacity: 0.47 }
    : mid ? { top: '7%', height: '88%', width: '54%', side: '-5%', opacity: 0.78 }
      : { top: '7%', height: '88%', width: '41%', side: '8%', opacity: 1 };
  // Arabic: `[dir=rtl] .hero-art { right: auto; left: 6% }` at every width. The web build sets the side
  // physically; iOS/Android flip `end` themselves once the app runs right to left.
  const side = rtl ? '6%' : box.side;
  const place: ViewStyle = Platform.OS === 'web' ? (rtl ? { left: side } : { right: side }) : { end: side };
  return (
    <View aria-hidden pointerEvents="none"
      style={[styles.arch, { top: box.top, height: box.height, width: box.width, opacity: box.opacity }, place,
        backgroundImage('linear-gradient(145deg, #e1c47a, #80612b 38%, #211b11 79%)')]}>
      <View style={[styles.inner, backgroundImage('linear-gradient(120deg, #e7d29b, #514126 62%)')]} />
      <Text style={styles.star}>✦</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { position: 'relative', overflow: 'hidden', justifyContent: 'center', backgroundColor: colors.bg },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 16, rowGap: 12 },
  arch: {
    position: 'absolute', overflow: 'hidden', backgroundColor: '#80612b', borderWidth: 8, borderColor: '#fffaf1',
    borderTopLeftRadius: '48%', borderTopRightRadius: '48%', borderBottomLeftRadius: 22, borderBottomRightRadius: 22,
    boxShadow: '0 0 110px rgba(213,177,95,0.16)', transform: [{ rotate: '3deg' }],
  },
  inner: {
    position: 'absolute', width: '40%', height: '61%', left: '30%', bottom: '-7%', backgroundColor: '#9b875a',
    borderTopLeftRadius: '48%', borderTopRightRadius: '48%', borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
    boxShadow: '30px 10px 50px rgba(0,0,0,0.53)',
  },
  star: {
    position: 'absolute', right: '15%', top: '13%', fontSize: 62, lineHeight: 70, color: '#fff0c2',
    textShadowColor: '#ffffff', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 25,
  },
});
