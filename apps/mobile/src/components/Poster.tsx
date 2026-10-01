import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { Movie } from '../api/types';

/** Placeholder artwork until real poster images come from cinema listings. */
export function Poster({ movie, style }: { movie: Movie; style?: ViewStyle }) {
  return (
    <View style={[styles.poster, { backgroundColor: movie.poster.from }, style]}>
      <View style={[styles.fade, { backgroundColor: movie.poster.to }]} />
      <Text style={styles.symbol}>{movie.poster.symbol}</Text>
      <Text style={styles.score}>★ {movie.audienceScore.toFixed(1)}</Text>
      <Text style={styles.tagline}>{movie.tagline.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  poster: { borderRadius: 16, overflow: 'hidden', justifyContent: 'flex-end', padding: 12 },
  fade: { ...StyleSheet.absoluteFill, top: '55%', opacity: 0.85 },
  symbol: { position: 'absolute', top: '18%', alignSelf: 'center', fontSize: 72, color: '#ffffffaa' },
  score: { position: 'absolute', top: 10, right: 10, backgroundColor: '#fffaf1ee', color: '#30283e', fontWeight: '800', fontSize: 11, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, overflow: 'hidden' },
  tagline: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
});
