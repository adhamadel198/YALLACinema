import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import { operatorApi } from '../../api/operator';
import { useRequest } from '../../api/useRequest';
import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { colors } from '../../theme';
import { useType } from '../../typography';
import { CheckRow, Field } from '../form';
import { arrow, Button, Eyebrow, Panel, StatusText } from '../ui';
import { PanelTitle } from './parts';

/**
 * The portal's own sign-in (email and password through useAuth), in the live account.html panel look. On the
 * development database it also lists the demo staff accounts, one per cinema, so the portal can be tried.
 */
export function StaffSignIn() {
  const { t } = useI18n();
  const { type, font, rtl } = useType();
  const { signIn } = useAuth();
  const demo = useRequest(() => operatorApi.demoAccounts().catch(() => null), []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  // Enter in either field submits too: a second submit while one is in flight is ignored.
  const submitting = useRef(false);
  const [error, setError] = useState<string>();

  async function submit() {
    if (!email.trim() || !password || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      const status = e instanceof ApiError ? e.status : 0;
      setError(status === 401 ? t.op.wrongPassword : status === 429 ? t.op.tooManyTries : t.genericError);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
      <Panel padding={28}>
        <Eyebrow>{t.operatorUi.kicker}</Eyebrow>
        <PanelTitle>{t.op.signInTitle}</PanelTitle>
        <Text style={[type.body, { color: colors.muted, marginTop: 3, marginBottom: 2 }]}>{t.op.signInBody}</Text>
        <Field label={t.op.email} value={email} onChangeText={setEmail} ltr autoCapitalize="none" autoCorrect={false}
          keyboardType="email-address" autoComplete="email" textContentType="username" onSubmitEditing={submit} />
        <Field label={t.op.password} value={password} onChangeText={setPassword} ltr secret
          autoComplete="current-password" textContentType="password" onSubmitEditing={submit} style={{ marginTop: 0 }} />
        {error ? <StatusText tone="danger" style={{ marginBottom: 10 }}>{error}</StatusText> : null}
        <Button title={t.op.signIn} onPress={submit} busy={busy} disabled={!email.trim() || !password} style={{ marginTop: 4 }} />
      </Panel>

      {demo.data ? (
        <Panel style={{ marginTop: 15 }}>
          <Eyebrow>{t.op.demoTitle}</Eyebrow>
          <Text style={[type.small, { color: colors.muted, marginTop: 6 }]}>{t.op.demoBody}</Text>
          <View style={{ backgroundColor: colors.verifyBg, borderWidth: 1, borderColor: colors.verifyLine, borderRadius: 11, padding: 13, marginVertical: 12 }}>
            <Text style={[font(400), { color: colors.verifyInk, fontSize: 12, lineHeight: 18.6 }]}>
              {`${t.operatorUi.demoPassword} `}
              <Text style={[font(800), { writingDirection: 'ltr' }]}>{demo.data.password}</Text>
            </Text>
          </View>
          {demo.data.accounts.map((a) => (
            <CheckRow key={a.email} hideBox title={a.cinemaName} sub={a.email} accessibilityLabel={`${a.cinemaName}, ${a.email}`}
              onToggle={() => { setEmail(a.email); setPassword(demo.data!.password); setError(undefined); }}
              trailing={<Text aria-hidden style={[font(800), { color: colors.goldBright, fontSize: 16 }]}>{arrow(rtl)}</Text>} />
          ))}
        </Panel>
      ) : null}
    </View>
  );
}
