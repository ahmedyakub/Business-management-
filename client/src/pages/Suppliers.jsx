import { useNavigate } from 'react-router-dom';
import ResourcePage from '../components/ResourcePage.jsx';
import { useMoney } from '../utils/format.js';
import { partyFields } from './Customers.jsx';

export default function Suppliers() {
  const navigate = useNavigate();
  const money = useMoney();
  return (
    <ResourcePage
      title="Suppliers"
      subtitle="Click a supplier to see purchases and payments"
      endpoint="/suppliers"
      resource="suppliers"
      emptyItem={{ name: '' }}
      fields={partyFields([{ name: 'contactPerson', label: 'Contact person', full: true }])}
      onRowClick={(s) => navigate(`/suppliers/${s._id}`)}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'contactPerson', label: 'Contact' },
        { key: 'phone', label: 'Phone' },
        { key: 'balance', label: 'We owe', align: 'right', render: (s) => <span className={s.balance > 0 ? 'text-bad' : ''}>{money(s.balance)}</span> },
      ]}
    />
  );
}
