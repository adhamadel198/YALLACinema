import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, type TextInput } from 'react-native';
import { useAuth } from '../auth';
import { authErrorMessage, isEmail } from '../auth/form';
import { leaveSignIn, safeNext, signUpHref } from '../auth/routes';
import { Field, FormError, FormIntro, FormSwitch, SignedInNotice } from '../components/AccountForm';
import { Button } from '../components/ui';
import { useI18n } from '../i18n';

/**
 * Email and password sign-in (BRD 7.3). `next` is where to return afterwards, e.g. /sign-in?next=/tickets;
 * `email` prefills the address (when coming from "email already registered" on sign-up).
 */
export default function SignIn() {
  const { t } = useI18n();
  const { account, signIn } = useAuth();
  const params = useLocalSearchParams<{ next?: string; email?: string }>();
  const next = safeNext(params.next);
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
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
      await signIn(email.trim(), password);
      leaveSignIn(next);
    } catch (e) {
      setError(authErrorMessage(e, t));
      setBusy(false);
      submitting.current = false;
    }
  }

  // `busy` stays on from signing in until the screen has left, so this never flashes.
  if (account && !busy) {
    return (
      <>
        <Stack.Screen options={{ title: t.signIn }} />
        <SignedInNotice email={account.email} onContinue={() => leaveSignIn(next)} />
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t.signIn }} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <FormIntro kicker={t.authSignInKicker} heading={t.authSignInHeading} body={t.authSignInBody} />
        <Field label={t.email} value={email} onChangeText={setEmail} error={tried ? problems.email : undefined} ltr
          autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress"
          returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
        <Field ref={passwordRef} label={t.authPassword} value={password} onChangeText={setPassword} error={tried ? problems.password : undefined} ltr secret
          autoComplete="current-password" autoCapitalize="none" autoCorrect={false} textContentType="password"
          returnKeyType="go" onSubmitEditing={submit} />
        {error && <FormError text={error} />}
        <Button title={t.signIn} onPress={submit} busy={busy} />

        <FormSwitch prompt={t.authNewHere}>
          <Button title={t.createAccount} kind="secondary" onPress={() => router.replace(signUpHref(next, email.trim() || undefined))} />
        </FormSwitch>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
