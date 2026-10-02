import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View, type StyleProp, type TextInput, type ViewStyle } from 'react-native';
import { useAuth } from '../auth';
import { authErrorMessage, isEmail } from '../auth/form';
import { signUpHref } from '../auth/routes';
import { useI18n } from '../i18n';
import { colors } from '../theme';
import { useType } from '../typography';
import { Field } from './form';
import { Page } from './page';
import { Button, Eyebrow, H2, Notice, Panel } from './ui';

// Sign-in and sign-up in the live account.html look: centred 480px panels on the dark page.

/** Older imports of the account form's field keep working; it is the shared cream field now. */
export { Field };

/** The account page scaffold: the column with 44px above the panels, the account footer, keyboard-aware on iOS. */
export function AuthPage({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Page footer="account" contentStyle={{ paddingTop: 44 }}>{children}</Page>
    </KeyboardAvoidingView>
  );
}

/** A centred account panel (live `.panel` with max-width 480). `padding` 28 for forms, 20 for small cards. */
export function AuthPanel({ children, padding = 28, style, testID }: { children: ReactNode; padding?: number; style?: StyleProp<ViewStyle>; testID?: string }) {
  return <Panel padding={padding} style={[styles.panel, style]} testID={testID}>{children}</Panel>;
}

/** Eyebrow, 36px title and muted lead at the top of the sign-in and sign-up panels. */
export function FormIntro({ kicker, heading, body }: { kicker: string; heading: string; body: string }) {
  const { type, font, rtl } = useType();
  return (
    <View>
      <Eyebrow>{kicker}</Eyebrow>
      <Text role="heading" aria-level={1} style={[font(800, 'display'), styles.heading, { letterSpacing: rtl ? 0 : -2, lineHeight: rtl ? 48 : 39 }]}>{heading}</Text>
      <Text style={[type.body, { color: colors.muted, marginBottom: 2 }]}>{body}</Text>
    </View>
  );
}

/** A failed submit in a cream notice, with an optional way forward (e.g. "Sign in instead"). */
export function FormError({ text, action }: { text: string; action?: { title: string; onPress: () => void } }) {
  const { font } = useType();
  return (
    <Notice tone="danger" role="alert" style={{ marginTop: 4, marginBottom: 14 }}>
      <Text style={[font(700), { color: colors.dangerOnCream, fontSize: 13, lineHeight: 20 }]}>{text}</Text>
      {action ? (
        <Text accessibilityRole="button" onPress={action.onPress} suppressHighlighting
          style={[font(800), { color: '#8b692c', fontSize: 13, lineHeight: 20, marginTop: 4, alignSelf: 'flex-start' }]}>
          {action.title}
        </Text>
      ) : null}
    </Notice>
  );
}

/** Shown instead of the form to someone already signed in (e.g. opening a saved sign-in link). */
export function SignedInNotice({ email, onContinue }: { email: string; onContinue: () => void }) {
  const { t } = useI18n();
  const { type } = useType();
  return (
    <AuthPanel testID="signed-in-notice">
      <Eyebrow>{t.authSignInKicker}</Eyebrow>
      <Text style={[type.body, { marginTop: 8, marginBottom: 18 }]}>{t.authAlreadyIn(email)}</Text>
      <Button title={t.authContinue} onPress={onContinue} />
    </AuthPanel>
  );
}

/** "New to YALLA? [Create an account]": a centred row under a hairline at the bottom of the panel. */
export function FormSwitch({ prompt, children }: { prompt: string; children: ReactNode }) {
  const { type } = useType();
  return (
    <View style={styles.switch}>
      <Text style={[type.small, { color: colors.muted }]}>{prompt}</Text>
      {children}
    </View>
  );
}

/** The 11px centred note at the bottom of an account panel. */
export function FormFootnote({ children }: { children: string }) {
  const { type } = useType();
  return <Text style={[type.micro, { textAlign: 'center', marginTop: 17 }]}>{children}</Text>;
}

/**
 * The live "Your tickets" card under the sign-in panel: what resale is for and a way in. Signed-in people also get
 * a link to their listings.
 */
export function TicketsCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const { t } = useI18n();
  const { type } = useType();
  const { account } = useAuth();
  return (
    <AuthPanel padding={20} style={[{ marginTop: 15 }, style]} testID="tickets-card">
      <Eyebrow>{t.checkoutUi.ticketsKicker}</Eyebrow>
      <H2 style={{ fontSize: 19, lineHeight: 24, marginBottom: 0 }}>{t.checkoutUi.ticketsTitle}</H2>
      <Text style={[type.small, { color: colors.muted, marginVertical: 13 }]}>{t.checkoutUi.ticketsBody}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Button size="small" inline title={t.checkoutUi.ticketsButton} onPress={() => router.push('/resale')} />
        {account ? <Button size="small" kind="soft" inline title={t.checkoutUi.myListings} onPress={() => router.push('/resale/mine')} /> : null}
      </View>
    </AuthPanel>
  );
}

/**
 * The sign-in panel: email, password, Sign in, and the way to create an account. Someone already signed in sees
 * `SignedInNotice` instead. Used by the /sign-in screen; the Profile tab can embed it too.
 * - `next`: where "Create an account" should return to afterwards.
 * - `onSignedIn`: called after a successful sign-in (and by Continue on the signed-in notice).
 * - `onCreateAccount`: opens sign-up with the typed email; defaults to pushing /sign-up.
 */
export function SignInForm({ next, initialEmail, onSignedIn, onCreateAccount }: {
  next?: string; initialEmail?: string; onSignedIn: () => void; onCreateAccount?: (email?: string) => void;
}) {
  const { t } = useI18n();
  const { account, signIn } = useAuth();
  const [email, setEmail] = useState(initialEmail ?? '');
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
      onSignedIn();
    } catch (e) {
      setError(authErrorMessage(e, t));
      setBusy(false);
      submitting.current = false;
    }
  }

  // `busy` stays on from signing in until the screen has left, so this never flashes.
  if (account && !busy) return <SignedInNotice email={account.email} onContinue={onSignedIn} />;

  const typed = email.trim() || undefined;
  return (
    <AuthPanel testID="sign-in-form">
      <FormIntro kicker={t.authSignInKicker} heading={t.authSignInHeading} body={t.checkoutUi.signInLead} />
      <Field label={t.email} value={email} onChangeText={setEmail} error={tried ? problems.email : undefined} ltr
        placeholder={t.checkoutUi.emailPlaceholder} autoComplete="email" keyboardType="email-address" autoCapitalize="none"
        autoCorrect={false} textContentType="emailAddress" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
      <Field ref={passwordRef} label={t.authPassword} value={password} onChangeText={setPassword} error={tried ? problems.password : undefined} ltr secret
        placeholder={t.checkoutUi.passwordPlaceholder} autoComplete="current-password" autoCapitalize="none" autoCorrect={false}
        textContentType="password" returnKeyType="go" onSubmitEditing={submit} style={{ marginTop: 0 }} />
      {error ? <FormError text={error} /> : null}
      <Button title={t.signIn} onPress={submit} busy={busy} testID="sign-in-submit" />

      <FormSwitch prompt={t.authNewHere}>
        <Button kind="soft" size="small" inline title={t.createAccount}
          onPress={() => (onCreateAccount ? onCreateAccount(typed) : router.push(signUpHref(next, typed)))} />
      </FormSwitch>
    </AuthPanel>
  );
}

const styles = StyleSheet.create({
  panel: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  heading: { color: colors.ink, fontSize: 36, marginTop: 7, marginBottom: 12 },
  switch: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10,
    borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 18, marginTop: 40,
  },
});
