import { useNavigate } from 'react-router-dom';
import ResourcePage from '../components/ResourcePage.jsx';
import { useLang } from '../context/LanguageContext.jsx';
import { useMoney } from '../utils/format.js';
import { partyFields } from './Customers.jsx';

export default function Suppliers() {
  const navigate = useNavigate();
  const money = useMoney();
  const { t } = useLang();
  return (
    <ResourcePage
      title={t('nav.suppliers')}
      singular={t('suppliers.singular')}
      subtitle={t('suppliers.subtitle')}
      endpoint="/suppliers"
      resource="suppliers"
      emptyItem={{ name: '' }}
      fields={partyFields(t, [{ name: 'contactPerson', label: t('suppliers.contactPerson'), full: true }])}
      onRowClick={(s) => navigate(`/suppliers/${s._id}`)}
      columns={[
        { key: 'name', label: t('common.name') },
        { key: 'contactPerson', label: t('suppliers.contact') },
        { key: 'phone', label: t('common.phone') },
        { key: 'balance', label: t('suppliers.weOwe'), align: 'right', render: (s) => <span className={s.balance > 0 ? 'text-bad' : ''}>{money(s.balance)}</span> },
      ]}
    />
  );
}
