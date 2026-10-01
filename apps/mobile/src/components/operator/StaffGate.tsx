import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import type { Account } from '../../api/auth';
import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { useTheme } from '../../theme';
import { Button, Panel } from '../ui';
import { Kicker } from './parts';
import { StaffSignIn } from './StaffSignIn';

/**
 * Shows its children only to signed-in cinema staff. Others get the portal's sign-in form, or, when a
 * customer account is signed in, a note that the portal is for cinema staff.
 */
export function StaffGate({ children }: { children: (account: Account) => ReactNode }) {
  const theme = useTheme();
  const { t } = useI18n();
  const { account, ready, signOut } = useAuth();

  if (!ready) return <ActivityIndicator style={{ flex: 1 }} color={theme.accent} />;
  if (account?.role === 'operator') return children(account);
  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      {!account ? <StaffSignIn /> : (
        <Panel style={styles.notice}>
          <Kicker>{t.op.kicker}</Kicker>
          <Text style={[styles.title, { color: theme.ink }]}>{t.op.customerTitle}</Text>
          <Text style={{ color: theme.muted, lineHeight: 21, marginBottom: 18 }}>{t.op.customerBody(account.name, account.email)}</Text>
          <Button title={t.op.backToMovies} onPress={() => router.dismissTo('/')} />
          <Button title={t.op.signOut} kind="secondary" style={{ marginTop: 10 }} onPress={signOut} />
        </Panel>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, paddingTop: 24, paddingBottom: 40 },
  notice: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '800', marginTop: 6, marginBottom: 6 },
});
