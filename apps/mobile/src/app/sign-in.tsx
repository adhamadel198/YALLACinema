import { router, Stack, useLocalSearchParams } from 'expo-router';
import { leaveSignIn, safeNext, signUpHref } from '../auth/routes';
import { AuthPage, SignInForm, TicketsCard } from '../components/AccountForm';
import { useI18n } from '../i18n';

/**
 * Email and password sign-in (BRD 7.3), in the live account.html look. `next` is where to return afterwards, e.g.
 * /sign-in?next=/tickets; `email` prefills the address (when coming from "email already registered" on sign-up).
 * Without `next` (opened from the header), the live page's "Your tickets" card follows the form.
 */
export default function SignIn() {
  const { t } = useI18n();
  const params = useLocalSearchParams<{ next?: string; email?: string }>();
  const next = safeNext(params.next);
  return (
    <AuthPage>
      <Stack.Screen options={{ title: t.signIn }} />
      <SignInForm
        next={next}
        initialEmail={typeof params.email === 'string' ? params.email : undefined}
        onSignedIn={() => leaveSignIn(next)}
        onCreateAccount={(email) => router.replace(signUpHref(next, email))}
      />
      {next ? null : <TicketsCard />}
    </AuthPage>
  );
}
