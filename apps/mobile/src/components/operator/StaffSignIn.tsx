import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { operatorApi } from '../../api/operator';
import { useRequest } from '../../api/useRequest';
import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme';
import { Button, Panel } from '../ui';
import { Field, Kicker } from './parts';

/**
 * The portal's own sign-in (email and password through useAuth). On the development database it also
 * lists the demo staff accounts, one per cinema, so the portal can be tried.
 */
export function StaffSignIn() {
  const theme = useTheme();
  const { t } = useI18n();
  const { signIn } = useAuth();
  const demo = useRequest(() => operatorApi.demoAccounts().catch(() => null), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit() {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(undefined);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      setError(status === 401 ? t.op.wrongPassword : status === 429 ? t.op.tooManyTries : t.genericError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Panel>
        <Kicker>{t.op.kicker}</Kicker>
        <Text style={[styles.title, { color: theme.ink }]}>{t.op.signInTitle}</Text>
        <Text style={{ color: theme.muted, marginBottom: 18, lineHeight: 21 }}>{t.op.signInBody}</Text>
        <Field label={t.op.email} value={email} onChangeText={setEmail} ltr autoCapitalize="none" autoCorrect={false}
          keyboardType="email-address" autoComplete="email" textContentType="username" onSubmitEditing={submit} />
        <Field label={t.op.password} value={password} onChangeText={setPassword} ltr secureTextEntry
          autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
        {error ? <Text style={{ color: theme.accent, marginBottom: 12 }} accessibilityRole="alert">{error}</Text> : null}
        <Button title={t.op.signIn} onPress={submit} busy={busy} disabled={!email.trim() || !password} />
      </Panel>

      {demo.data ? (
        <Panel style={{ marginTop: 16 }}>
          <Text style={[styles.h2, { color: theme.ink }]}>{t.op.demoTitle}</Text>
          <Text style={{ color: theme.muted, marginBottom: 8, lineHeight: 20 }}>{t.op.demoBody(demo.data.password)}</Text>
          {demo.data.accounts.map((a, i) => (
            <Pressable key={a.email} accessibilityRole="button" accessibilityLabel={`${a.cinemaName}, ${a.email}`}
              onPress={() => { setEmail(a.email); setPassword(demo.data!.password); setError(undefined); }}
              style={[styles.demo, { borderColor: theme.line }, i === demo.data!.accounts.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={{ color: theme.ink, fontWeight: '700' }}>{a.cinemaName}</Text>
              <Text style={{ color: theme.muted, fontSize: 13 }}>{a.email}</Text>
            </Pressable>
          ))}
        </Panel>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '800', marginTop: 6, marginBottom: 6 },
  h2: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  demo: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
