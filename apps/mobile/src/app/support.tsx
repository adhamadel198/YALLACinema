import { Stack } from 'expo-router';
import { Placeholder } from '../components/Placeholder';
import { useI18n } from '../i18n';

export default function Support() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t.supportTitle }} />
      <Placeholder title={t.supportTitle} body={t.supportSoon} />
    </>
  );
}
