import { useNavigate } from 'react-router-dom';
import ResourcePage from '../components/ResourcePage.jsx';
import { useMoney } from '../utils/format.js';

export const partyFields = (extra = []) => [
  { name: 'name', label: 'Name', required: true, full: true },
  ...extra,
  { name: 'phone', label: 'Phone' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'address', label: 'Address', full: true },
  { name: 'notes', label: 'Notes', type: 'textarea', full: true },
];

export default function Customers() {
  const navigate = useNavigate();
  const money = useMoney();
  return (
    <ResourcePage
      title="Customers"
      subtitle="Click a customer to see their purchase and payment history"
      endpoint="/customers"
      resource="customers"
      emptyItem={{ name: '' }}
      fields={partyFields()}
      onRowClick={(c) => navigate(`/customers/${c._id}`)}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'balance', label: 'Outstanding', align: 'right', render: (c) => <span className={c.balance > 0 ? 'text-bad' : ''}>{money(c.balance)}</span> },
      ]}
    />
  );
}
