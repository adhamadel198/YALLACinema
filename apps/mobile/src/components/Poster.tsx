import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Movie } from '../api/types';
import { backgroundImage, colors, shadows } from '../theme';
import { useType } from '../typography';

/**
 * The live site's poster card (placeholder artwork until cinemas send real posters): the film's two colours as a
 * diagonal gradient, a soft white glow behind its symbol, a dark fade at the bottom, a white hairline, the rating
 * chip top right (in Arabic too, as on the live site) and the tagline at the bottom.
 * Give it a height (live: 276 desktop, 250 at ≤850px, 235 at ≤580px). `hovered` lifts and tilts it (web hover).
 */
export function Poster({ movie, style, hovered, compact }: {
  movie: Pick<Movie, 'poster'> & Partial<Pick<Movie, 'audienceScore' | 'tagline'>>; style?: StyleProp<ViewStyle>; hovered?: boolean;
  /** Small thumbnails: smaller symbol, no tagline or rating. */
  compact?: boolean;
}) {
  const { font, rtl } = useType();
  const { from, to, symbol } = movie.poster;
  return (
    <View
      style={[
        styles.poster,
        { backgroundColor: to },
        backgroundImage(`radial-gradient(ellipse at 50% 34%, #ffffff72, transparent 38%), linear-gradient(0deg, #21172dcc, transparent 67%), linear-gradient(160deg, ${from}, ${to} 68%, #171313)`),
        hovered && styles.hovered,
        style,
      ]}
    >
      <Text aria-hidden style={[styles.symbol, compact && styles.symbolCompact]}>{symbol}</Text>
      {!compact && movie.audienceScore != null ? (
        <View style={styles.score}>
          <Text style={[font(800), { color: colors.ratingInk, fontSize: 11, lineHeight: 15 }]}>★ {movie.audienceScore.toFixed(1)}</Text>
        </View>
      ) : null}
      {!compact && movie.tagline ? (
        <Text numberOfLines={2} style={[font(800), styles.tagline, rtl && { letterSpacing: 0, textTransform: 'none' }]}>{movie.tagline}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  poster: {
    borderRadius: 16, borderWidth: 1, borderColor: '#ffffffaa', overflow: 'hidden', justifyContent: 'flex-end', padding: 16, direction: 'ltr',
    ...shadows.poster,
    ...(Platform.OS === 'web' ? ({ transitionProperty: 'transform, box-shadow', transitionDuration: '220ms' } as ViewStyle) : null),
  },
  hovered: { transform: [{ translateY: -6 }, { rotate: '-1deg' }], boxShadow: '0 18px 30px rgba(75,58,42,0.19)' },
  symbol: {
    position: 'absolute', top: 25, left: 0, right: 0, textAlign: 'center', fontSize: 104, lineHeight: 112, color: '#ffffff99',
    textShadowColor: '#00000088', textShadowOffset: { width: 0, height: 10 }, textShadowRadius: 35,
  },
  symbolCompact: { top: '18%', fontSize: 40, lineHeight: 44 },
  // The live poster is always left-to-right, so the rating stays top right in Arabic.
  score: { position: 'absolute', top: 11, right: 11, backgroundColor: colors.ratingBg, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  tagline: {
    color: '#ffffff', fontSize: 10, lineHeight: 14, letterSpacing: 2, textTransform: 'uppercase',
    textShadowColor: '#00000088', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },
});
