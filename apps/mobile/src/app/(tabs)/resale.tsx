import { Placeholder } from '../../components/Placeholder';
import { useI18n } from '../../i18n';

export default function Resale() {
  const { t } = useI18n();
  return <Placeholder title={t.resaleTitle} body={t.resaleSoon} />;
}
