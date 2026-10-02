import { useFonts } from 'expo-font';

/**
 * The live site's fonts (DM Sans for text, Manrope for titles), one file per weight. Only the weights the
 * design uses are bundled; names match NATIVE_FONTS in typography.ts. The web build loads the same files in
 * fonts.web.ts.
 */
const FILES = {
  DMSans_400Regular: require('@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf'),
  DMSans_500Medium: require('@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf'),
  DMSans_700Bold: require('@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf'),
  DMSans_800ExtraBold: require('@expo-google-fonts/dm-sans/800ExtraBold/DMSans_800ExtraBold.ttf'),
  Manrope_700Bold: require('@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf'),
  Manrope_800ExtraBold: require('@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf'),
};

/** True once the fonts are ready (or failed to load, in which case the system font is used). */
export function useAppFonts() {
  const [loaded, error] = useFonts(FILES);
  return loaded || !!error;
}
