import { Stack } from 'expo-router';
import { Placeholder } from '../../components/Placeholder';
import { useI18n } from '../../i18n';

export default function OperatorPortal() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t.operatorTitle }} />
      <Placeholder title={t.operatorTitle} body={t.operatorSoon} />
    </>
  );
}
