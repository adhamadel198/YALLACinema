import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import type { Account } from '../../api/auth';
import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { colors } from '../../theme';
import { useType } from '../../typography';
import { Page } from '../page';
import { Button, Eyebrow, Panel, Spinner } from '../ui';
import { PanelTitle } from './parts';
import { StaffSignIn } from './StaffSignIn';

/**
 * Shows its children only to signed-in cinema staff. Others get the portal's sign-in form, or, when a
 * customer account is signed in, a note that the portal is for cinema staff.
 */
export function StaffGate({ children }: { children: (account: Account) => ReactNode }) {
  const { t } = useI18n();
  const { type } = useType();
  const { account, ready, signOut } = useAuth();

  if (!ready) return <Page footer="operator"><Spinner /></Page>;
  if (account?.role === 'operator') return children(account);
  return (
    <Page footer="operator" contentStyle={{ paddingTop: 44 }}>
      {!account ? <StaffSignIn /> : (
        <Panel padding={28} style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <Eyebrow>{t.operatorUi.kicker}</Eyebrow>
          <PanelTitle>{t.op.customerTitle}</PanelTitle>
          <Text style={[type.body, { color: colors.muted, marginBottom: 18 }]}>{t.op.customerBody(account.name, account.email)}</Text>
          <View style={{ gap: 12 }}>
            <Button title={t.op.backToMovies} onPress={() => router.dismissTo('/')} />
            <Button title={t.op.signOut} kind="soft" onPress={signOut} />
          </View>
        </Panel>
      )}
    </Page>
  );
}
