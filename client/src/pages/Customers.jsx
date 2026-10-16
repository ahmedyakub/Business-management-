import { useNavigate } from 'react-router-dom';
import ResourcePage from '../components/ResourcePage.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { useMoney } from '../utils/format.js';

export const partyFields = (t, extra = []) => [
  { name: 'name', label: t('common.name'), required: true, full: true },
  ...extra,
  { name: 'phone', label: t('common.phone') },
  { name: 'email', label: t('common.email'), type: 'email' },
  { name: 'address', label: t('common.address'), full: true },
  { name: 'notes', label: t('common.notes'), type: 'textarea', full: true },
];

export default function Customers() {
  const navigate = useNavigate();
  const money = useMoney();
  const { t } = useLang();
  return (
    <ResourcePage
      title={t('nav.customers')}
      singular={t('customers.singular')}
      subtitle={t('customers.subtitle')}
      endpoint="/customers"
      resource="customers"
      emptyItem={{ name: '' }}
      fields={partyFields(t)}
      onRowClick={(c) => navigate(`/customers/${c._id}`)}
      columns={[
        { key: 'name', label: t('common.name') },
        { key: 'phone', label: t('common.phone') },
        { key: 'email', label: t('common.email') },
        { key: 'balance', label: t('customers.outstanding'), align: 'right', render: (c) => <span className={c.balance > 0 ? 'text-bad' : ''}>{money(c.balance)}</span> },
      ]}
    />
  );
}
