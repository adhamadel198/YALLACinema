import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, type TextInput } from 'react-native';
import { ApiError } from '../api/client';
import type { SignUp as Details } from '../api/auth';
import { useAuth } from '../auth';
import { authErrorMessage, isEmail, isMobile, isName, MIN_PASSWORD } from '../auth/form';
import { leaveSignIn, safeNext, signInHref } from '../auth/routes';
import { Field, FormError, FormIntro, FormSwitch, SignedInNotice } from '../components/AccountForm';
import { Button } from '../components/ui';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

/** Account registration (BRD 7.3): name, email, mobile and password. Never required for booking. */
export default function SignUp() {
  const theme = useTheme();
  const { t } = useI18n();
  const { account, signUp } = useAuth();
  const params = useLocalSearchParams<{ next?: string; email?: string }>();
  const next = safeNext(params.next);
  const [details, setDetails] = useState<Details>({ name: '', email: typeof params.email === 'string' ? params.email : '', mobile: '', password: '' });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  // Enter in the password field submits too: a second submit while one is in flight is ignored.
  const submitting = useRef(false);
  const [error, setError] = useState<{ text: string; taken?: boolean }>();
  const refs = { email: useRef<TextInput>(null), mobile: useRef<TextInput>(null), password: useRef<TextInput>(null) };

  const problems = {
    name: isName(details.name) ? undefined : t.authNameInvalid,
    email: isEmail(details.email) ? undefined : t.authEmailInvalid,
    mobile: isMobile(details.mobile) ? undefined : t.authMobileInvalid,
    password: details.password.length >= MIN_PASSWORD ? undefined : t.authPasswordShort,
  };
  const set = (key: keyof Details) => (value: string) => setDetails((d) => ({ ...d, [key]: value }));
  const shown = (key: keyof Details) => (tried ? problems[key] : undefined);

  async function submit() {
    if (submitting.current) return;
    setTried(true);
    setError(undefined);
    if (Object.values(problems).some(Boolean)) return;
    submitting.current = true;
    setBusy(true);
    try {
      await signUp({ name: details.name.trim(), email: details.email.trim(), mobile: details.mobile.trim(), password: details.password });
      leaveSignIn(next);
    } catch (e) {
      setError({ text: authErrorMessage(e, t), taken: e instanceof ApiError && e.status === 409 });
      setBusy(false);
      submitting.current = false;
    }
  }

  const toSignIn = () => router.replace(signInHref(next, details.email.trim() || undefined));

  if (account && !busy) {
    return (
      <>
        <Stack.Screen options={{ title: t.authSignUpTitle }} />
        <SignedInNotice email={account.email} onContinue={() => leaveSignIn(next)} />
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: t.authSignUpTitle }} />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <FormIntro kicker={t.authSignUpKicker} heading={t.authSignUpHeading} body={t.authSignUpBody} />
        <Field label={t.fullName} value={details.name} onChangeText={set('name')} error={shown('name')}
          autoComplete="name" textContentType="name" returnKeyType="next" onSubmitEditing={() => refs.email.current?.focus()} />
        <Field ref={refs.email} label={t.email} value={details.email} onChangeText={set('email')} error={shown('email')} ltr
          autoComplete="email" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress"
          returnKeyType="next" onSubmitEditing={() => refs.mobile.current?.focus()} />
        <Field ref={refs.mobile} label={t.mobile} value={details.mobile} onChangeText={set('mobile')} error={shown('mobile')} ltr
          placeholder={t.mobilePlaceholder} autoComplete="tel" keyboardType="phone-pad" textContentType="telephoneNumber"
          returnKeyType="next" onSubmitEditing={() => refs.password.current?.focus()} />
        <Field ref={refs.password} label={t.authPassword} value={details.password} onChangeText={set('password')} error={shown('password')}
          hint={t.authPasswordHint} ltr secret autoComplete="new-password" autoCapitalize="none" autoCorrect={false} textContentType="newPassword"
          returnKeyType="go" onSubmitEditing={submit} />
        {error && <FormError text={error.text} action={error.taken ? { title: t.authSignInInstead, onPress: toSignIn } : undefined} />}
        <Button title={t.authCreate} onPress={submit} busy={busy} />
        <Text style={{ color: theme.muted, fontSize: 12, marginTop: 10, lineHeight: 18 }}>{t.authDeviceTickets}</Text>

        <FormSwitch prompt={t.authHaveAccount}>
          <Button title={t.signIn} kind="secondary" onPress={toSignIn} />
        </FormSwitch>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
