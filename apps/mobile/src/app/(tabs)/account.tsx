import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../../i18n';
import type { Lang } from '../../i18n/strings';
import { useTheme } from '../../theme';

const languages: { value: Lang; label: string }[] = [
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
];

export default function Account() {
  const theme = useTheme();
  const { t, lang, setLang } = useI18n();
  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.ink }]}>{t.profileTitle}</Text>
      <Text style={[styles.body, { color: theme.muted }]}>{t.profileBody}</Text>

      <Text style={[styles.h2, { color: theme.ink }]}>{t.language}</Text>
      <View style={styles.row}>
        {languages.map((l) => {
          const on = l.value === lang;
          return (
            <Pressable key={l.value} onPress={() => setLang(l.value)} accessibilityRole="radio" accessibilityState={{ selected: on }}
              style={[styles.option, { borderColor: on ? theme.accent : theme.line, backgroundColor: theme.panel }]}>
              <Text style={{ color: theme.ink, fontWeight: on ? '800' : '500' }}>{l.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {Platform.OS !== 'web' && <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>{t.restartNote}</Text>}

      <View style={[styles.links, { borderColor: theme.line }]}>
        {[
          { label: t.supportTitle, href: '/support' as const },
          { label: t.operatorTitle, href: '/operator' as const },
        ].map((link) => (
          <Pressable key={link.href} onPress={() => router.push(link.href)} accessibilityRole="link"
            style={[styles.link, { borderColor: theme.line }]}>
            <Text style={{ color: theme.ink, fontSize: 16, fontWeight: '600' }}>{link.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 22 },
  h2: { fontSize: 18, fontWeight: '800', marginTop: 28, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14, alignItems: 'center' },
  links: { marginTop: 28, borderTopWidth: StyleSheet.hairlineWidth },
  link: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
