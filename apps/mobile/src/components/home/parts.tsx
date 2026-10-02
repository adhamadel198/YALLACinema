import type { ReactNode } from 'react';
import { Platform, Pressable, Text, View, type PressableStateCallbackType, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useLayout } from '../../layout';
import { colors } from '../../theme';
import { useType } from '../../typography';
import { Eyebrow } from '../ui';

// Small pieces used only by the home screen (index.html's own sizes, which differ from the inner pages).

type Hoverable = PressableStateCallbackType & { hovered?: boolean };

/** Ink on the home page's brighter gold (`.book`, the search button). */
export const ON_HOME_GOLD = '#17130b';

/**
 * A home section heading: gold kicker, title, optional line under it, and an action on the far side.
 * `size="large"` is "Now showing" (29px, 25 on phones); `size="small"` is the 22.5px title the live page gives
 * "Popular showtimes" and "Your seat is waiting." (with the browser's default h2 margins around it).
 */
export function HomeHead({ kicker, title, sub, action, size = 'large', style }: {
  kicker: string; title: string; sub?: ReactNode; action?: ReactNode; size?: 'large' | 'small'; style?: StyleProp<ViewStyle>;
}) {
  const { font, rtl, lang } = useType();
  const { width } = useLayout();
  const large = size === 'large';
  const fontSize = large ? (width <= 580 ? 25 : 29) : 22.5;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22 }, style]}>
      <View style={{ flexShrink: 1 }}>
        <Eyebrow tone="home">{kicker}</Eyebrow>
        <Text role="heading" aria-level={2}
          style={[lang({ ...font(800, 'display'), fontSize, lineHeight: fontSize * 1.5, color: colors.ink, letterSpacing: large && !rtl ? -1 : -0.3 }),
            large ? { marginTop: 3 } : { marginTop: 18.7, marginBottom: sub ? 0 : 18.7 }]}>
          {title}
        </Text>
        {sub ? <Text style={[font(400), { fontSize: 13, lineHeight: 19.5, color: colors.muted, marginBottom: large ? 0 : 12 }]}>{sub}</Text> : null}
      </View>
      {action}
    </View>
  );
}

/**
 * The home page's flat gold button (`.book` "Find seats", and the search bar's "Find matching shows"): brighter
 * gold, no ledge, 12px 800 label. Lighter gold on hover.
 */
export function HomeGoldButton({ title, onPress, radius = 10, style, textStyle, accessibilityLabel, testID }: {
  title: string; onPress: () => void; radius?: number; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string; testID?: string;
}) {
  const { font } = useType();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel} testID={testID}
      style={(state: Hoverable) => [
        { backgroundColor: state.hovered || state.pressed ? colors.goldHover : colors.goldBright, borderRadius: radius, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
        Platform.OS === 'web' && ({ transitionProperty: 'background-color', transitionDuration: '180ms' } as ViewStyle),
        style,
      ]}>
      <Text style={[font(800), { color: ON_HOME_GOLD, fontSize: 12, lineHeight: 18, textAlign: 'center' }, textStyle]}>{title}</Text>
    </Pressable>
  );
}
