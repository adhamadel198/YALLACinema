import { Pressable, Text } from 'react-native';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

export function LanguageButton() {
  const theme = useTheme();
  const { lang, t, setLang } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.switchLanguageLabel}
      onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      hitSlop={8}
      style={{ marginHorizontal: 16, borderWidth: 1, borderColor: theme.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}
    >
      <Text style={{ color: theme.ink, fontWeight: '700' }}>{t.switchLanguage}</Text>
    </Pressable>
  );
}
