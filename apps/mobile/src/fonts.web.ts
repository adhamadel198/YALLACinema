import { Asset } from 'expo-asset';
import { useEffect, useState } from 'react';
import { colors } from './theme';
import { WEB_BODY_FONT } from './typography';

/**
 * Web: the fonts are registered as real CSS families ("DM Sans" 400/500/700/800, "Manrope" 700/800), as on the
 * live site, so `fontWeight` picks the right face and Arabic falls back to a system font at the same weight.
 */
const FACES: [family: string, weight: number, file: number][] = [
  ['DM Sans', 400, require('@expo-google-fonts/dm-sans/400Regular/DMSans_400Regular.ttf')],
  ['DM Sans', 500, require('@expo-google-fonts/dm-sans/500Medium/DMSans_500Medium.ttf')],
  ['DM Sans', 700, require('@expo-google-fonts/dm-sans/700Bold/DMSans_700Bold.ttf')],
  ['DM Sans', 800, require('@expo-google-fonts/dm-sans/800ExtraBold/DMSans_800ExtraBold.ttf')],
  ['Manrope', 700, require('@expo-google-fonts/manrope/700Bold/Manrope_700Bold.ttf')],
  ['Manrope', 800, require('@expo-google-fonts/manrope/800ExtraBold/Manrope_800ExtraBold.ttf')],
];

let loading: Promise<void> | undefined;

function loadFaces() {
  loading ??= Promise.all(FACES.map(([family, weight, file]) => {
    const face = new FontFace(family, `url("${Asset.fromModule(file).uri}")`, { weight: String(weight), style: 'normal', display: 'swap' });
    document.fonts.add(face);
    return face.load();
  })).then(() => undefined, () => undefined);
  return loading;
}

/**
 * react-native-web gives every Text and TextInput a reset class with the system font. Point those reset rules at
 * DM Sans, so text that sets no font of its own matches the live site. Styles that set fontFamily still win
 * (they come later in the same style sheet). Also paints the page itself dark, so overscroll never shows white.
 */
function applyPageDefaults() {
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule && rule.selectorText.startsWith('.css-') && rule.style.fontFamily.includes('-apple-system')) {
        rule.style.fontFamily = WEB_BODY_FONT;
      }
    }
  }
  if (!document.getElementById('yalla-page')) {
    const style = document.createElement('style');
    style.id = 'yalla-page';
    style.textContent = `html, body { background-color: ${colors.bg}; color-scheme: dark; }`;
    document.head.appendChild(style);
  }
}

/** True once the fonts are ready, or after 2.5 s at most (then text swaps to the fonts when they arrive). */
export function useAppFonts() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    applyPageDefaults();
    let live = true;
    const done = () => live && setReady(true);
    const timer = setTimeout(done, 2500);
    loadFaces().then(done);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, []);
  return ready;
}
