import { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { useAuth } from '../../auth';
import { AccountPanel, DetailRow, LinkList, PanelTitle, TicketsCard } from '../../components/account/parts';
import { SignInPanel } from '../../components/account/SignInPanel';
import { Chips } from '../../components/Chips';
import { Page } from '../../components/page';
import { Button, Eyebrow, Spinner } from '../../components/ui';
import { useI18n } from '../../i18n';
import type { Lang } from '../../i18n/strings';
import { useType } from '../../typography';

const languages: { value: Lang; label: string }[] = [
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
];

/**
 * Profile tab, laid out like the live account.html: centred 480px panels. Signed out it is the live sign-in panel;
 * signed in, the account (BRD 5.1, 7.3). Then the live "Your tickets" card, the language and help links.
 */
export default function Account() {
  const { t, lang, setLang } = useI18n();
  const { type } = useType();
  return (
    <Page footer="account" contentStyle={{ paddingTop: 44, gap: 15 }}>
      <AccountSection />
      <TicketsCard style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }} />

      <AccountPanel>
        <Eyebrow style={{ marginBottom: 10 }}>{t.language}</Eyebrow>
        <Chips variant="pay" options={languages} value={lang} onChange={setLang} label={t.language} />
        {Platform.OS !== 'web' && <Text style={[type.micro, { marginTop: 10 }]}>{t.restartNote}</Text>}
      </AccountPanel>

      <LinkList label={t.accountUi.linksLabel} style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }} links={[
        { label: t.supportTitle, href: '/support' },
        { label: t.shell.cinemaPortal, href: '/operator' },
      ]} />
    </Page>
  );
}

/** The sign-in panel for a guest, or the signed-in account with its details and Sign out. */
function AccountSection() {
  const { t } = useI18n();
  const { account, ready, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!ready) return <AccountPanel padding={28}><Spinner /></AccountPanel>;
  if (!account) return <SignInPanel />;

  return (
    <AccountPanel padding={28} testID="profile-account">
      <Eyebrow>{t.accountUi.profileKicker}</Eyebrow>
      <PanelTitle numberOfLines={2}>{account.name}</PanelTitle>
      <View style={{ height: 14 }} />
      <DetailRow label={t.email} value={account.email} />
      <DetailRow label={t.mobile} value={account.mobile} />
      <Button title={t.signOut} kind="soft" busy={busy} style={{ marginTop: 22 }}
        onPress={async () => {
          setBusy(true);
          await signOut();
          setBusy(false);
        }} />
    </AccountPanel>
  );
}
