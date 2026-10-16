import { useEffect, useMemo, useState } from 'react';
import api from '../api/client.js';
import ResourcePage from '../components/ResourcePage.jsx';
import { DateRange } from '../components/ui.jsx';
import { capitalize, fmtDate, monthStart, toInputDate, useMoney } from '../utils/format.js';

export default function Expenses() {
  const money = useMoney();
  const [categories, setCategories] = useState([]);
  const [range, setRange] = useState({ from: monthStart(), to: toInputDate() });
  const params = useMemo(() => ({ from: range.from || undefined, to: range.to || undefined }), [range]);

  useEffect(() => {
    api.get('/expenses/categories').then(({ data }) => setCategories(data)).catch(() => {});
  }, []);

  return (
    <ResourcePage
      title="Expenses"
      subtitle="Rent, utilities, salaries and other business costs"
      endpoint="/expenses"
      resource="expenses"
      extraParams={params}
      toolbar={<DateRange {...range} onChange={setRange} />}
      emptyItem={{ date: toInputDate(), category: categories[0] || 'Other', amount: '', description: '', paymentMethod: 'cash' }}
      fields={[
        { name: 'date', label: 'Date', type: 'date', required: true },
        { name: 'category', label: 'Category', type: 'select', options: categories, required: true },
        { name: 'amount', label: 'Amount', type: 'number', min: 0, required: true },
        { name: 'paymentMethod', label: 'Paid via', type: 'select', required: true, options: ['cash', 'card', 'bank', 'mobile'].map((m) => ({ value: m, label: capitalize(m) })) },
        { name: 'description', label: 'Description', type: 'textarea', full: true },
      ]}
      columns={[
        { key: 'date', label: 'Date', render: (e) => fmtDate(e.date) },
        { key: 'category', label: 'Category' },
        { key: 'description', label: 'Description' },
        { key: 'paymentMethod', label: 'Paid via', render: (e) => capitalize(e.paymentMethod) },
        { key: 'createdBy', label: 'Recorded by', render: (e) => e.createdBy?.name || '' },
        { key: 'amount', label: 'Amount', align: 'right', render: (e) => money(e.amount) },
      ]}
    />
  );
}
