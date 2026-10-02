import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View, type TextInput } from 'react-native';
import { useAuth } from '../../auth';
import { authErrorMessage, isEmail } from '../../auth/form';
import { signUpHref } from '../../auth/routes';
import { useI18n } from '../../i18n';
import { colors } from '../../theme';
import { useType } from '../../typography';
import { Field } from '../form';
import { Button, Eyebrow, Notice } from '../ui';
import { AccountPanel, PanelTitle } from './parts';

/**
 * The live account.html sign-in panel, inline on the Profile tab (BRD 7.3). Signing in here keeps the person on the
 * Profile tab, which then shows their account; guest bookings saved on this device join the account (AuthProvider).
 * The /sign-in screen keeps its own form, with the `next` and `email` params.
 */
export function SignInPanel() {
  const { t } = useI18n();
  const { type } = useType();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  // Enter in the password field submits too: a second submit while one is in flight is ignored.
  const submitting = useRef(false);
  const [error, setError] = useState<string>();
  const passwordRef = useRef<TextInput>(null);

  const problems = {
    email: isEmail(email) ? undefined : t.authEmailInvalid,
    password: password ? undefined : t.authPasswordMissing,
  };

  async function submit() {
    if (submitting.current) return;
    setTried(true);
    setError(undefined);
    if (problems.email || problems.password) return;
    submitting.current = true;
    setBusy(true);
    try {
      // On success the account shows and this panel goes away.
      await signIn(email.trim(), password);
    } catch (e) {
      setError(authErrorMessage(e, t));
      setBusy(false);
      submitting.current = false;
    }
  }

  return (
    <AccountPanel padding={28} testID="profile-sign-in">
      <Eyebrow>{t.authSignInKicker}</Eyebrow>
      <PanelTitle>{t.authSignInHeading}</PanelTitle>
      <Text style={[type.body, { color: colors.muted, marginTop: 15, marginBottom: 2 }]}>{t.accountUi.signInLead}</Text>

      <Field label={t.email} value={email} onChangeText={setEmail} error={tried ? problems.email : undefined} ltr
        placeholder={t.accountUi.emailPlaceholder} style={styles.field}
        autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress"
        returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
      <Field ref={passwordRef} label={t.authPassword} value={password} onChangeText={setPassword} error={tried ? problems.password : undefined} ltr secret
        placeholder={t.accountUi.passwordPlaceholder} style={styles.field}
        autoComplete="current-password" autoCapitalize="none" autoCorrect={false} textContentType="password"
        returnKeyType="go" onSubmitEditing={submit} />
      <Button title={t.signIn} onPress={submit} busy={busy} style={{ marginTop: 13 }} />
      {/* Where the live page writes its message (`.inlineNotice`): 11px under the button, at least 18px tall. */}
      <View style={styles.message}>
        {error ? <Notice tone="danger" role="alert">{error}</Notice> : null}
      </View>

      <View style={styles.switch}>
        <Text style={[type.small, { color: colors.muted, textAlign: 'center' }]}>{t.authNewHere}</Text>
        <Button kind="soft" size="small" inline title={t.createAccount}
          onPress={() => router.push(signUpHref(undefined, email.trim() || undefined))} />
      </View>
      <Text style={[type.micro, styles.note]}>{t.authDeviceTickets}</Text>
    </AccountPanel>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 13, marginBottom: 0 },
  message: { marginTop: 11, minHeight: 18 },
  switch: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10,
    borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 18, marginTop: 15,
  },
  note: { textAlign: 'center', marginTop: 17 },
});
