import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../auth';
import { signInHref, signUpHref } from '../../auth/routes';
import { Button, Line, Panel } from '../../components/ui';
import { useI18n } from '../../i18n';
import type { Lang } from '../../i18n/strings';
import { useTheme } from '../../theme';

const languages: { value: Lang; label: string }[] = [
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
];

/** Profile tab: the signed-in account (BRD 5.1, 7.3), or an invitation to sign in; language; help links. */
export default function Account() {
  const theme = useTheme();
  const { t, lang, setLang } = useI18n();
  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.wrap}>
      <Text style={[styles.title, { color: theme.ink }]}>{t.profileTitle}</Text>
      <AccountPanel />

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
    </ScrollView>
  );
}

function AccountPanel() {
  const theme = useTheme();
  const { t } = useI18n();
  const { account, ready, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!ready) return <Panel><ActivityIndicator color={theme.accent} /></Panel>;

  if (!account) {
    return (
      <Panel>
        <Text style={[styles.panelTitle, { color: theme.ink }]}>{t.accountInviteTitle}</Text>
        <Text style={[styles.body, { color: theme.muted, marginBottom: 16 }]}>{t.accountInviteBody}</Text>
        <Button title={t.signIn} onPress={() => router.push(signInHref())} />
        <Button title={t.createAccount} kind="secondary" onPress={() => router.push(signUpHref())} style={{ marginTop: 10 }} />
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 12, textAlign: 'center' }}>{t.profileBody}</Text>
      </Panel>
    );
  }

  return (
    <Panel>
      <View style={styles.who}>
        <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
          <Text style={{ color: theme.accentInk, fontSize: 20, fontWeight: '800' }}>{account.name.trim().charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={[styles.panelTitle, { color: theme.ink, flex: 1, marginBottom: 0 }]} numberOfLines={2}>{account.name}</Text>
      </View>
      <Line label={t.email} value={account.email} />
      <Line label={t.mobile} value={account.mobile} />
      <Button title={t.signOut} kind="secondary" busy={busy} style={{ marginTop: 16 }}
        onPress={async () => {
          setBusy(true);
          await signOut();
          setBusy(false);
        }} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 14 },
  panelTitle: { fontSize: 19, fontWeight: '800', marginBottom: 6 },
  body: { fontSize: 15, lineHeight: 22 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  h2: { fontSize: 18, fontWeight: '800', marginTop: 28, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 14, alignItems: 'center' },
  links: { marginTop: 28, borderTopWidth: StyleSheet.hairlineWidth },
  link: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
