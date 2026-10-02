import { Pressable, Text, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';
import { useI18n } from '../i18n';
import { colors } from '../theme';
import { font } from '../typography';

/**
 * The language switch as a header pill (live `.lang`): "عربي" in English, "English" in Arabic.
 * `compact` is the smaller pill used in the phone header.
 */
export function LanguageButton({ compact, style }: { compact?: boolean; style?: StyleProp<ViewStyle> }) {
  const { lang, t, setLang } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.switchLanguageLabel}
      onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      hitSlop={8}
      style={(state: PressableStateCallbackType & { hovered?: boolean }) => [pill(compact), state.hovered && { borderColor: colors.gold }, style]}
    >
      {/* The label is in the other language, so it uses that language's font. */}
      <Text style={[font(lang === 'ar' ? 700 : 500, 'body', lang !== 'ar'), { color: colors.inkPill, fontSize: compact ? 13 : 15, lineHeight: compact ? 18 : 22 }]}>
        {t.switchLanguage}
      </Text>
    </Pressable>
  );
}

/** The dark header pill box shared by the language switch and the sign-in / account pill. */
export const pill = (compact?: boolean): ViewStyle => ({
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.linePill,
  borderRadius: 10,
  paddingVertical: compact ? 6 : 9,
  paddingHorizontal: compact ? 10 : 13,
  minHeight: compact ? 34 : 43,
  justifyContent: 'center',
  alignItems: 'center',
});
